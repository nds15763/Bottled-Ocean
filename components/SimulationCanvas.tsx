import React, { useRef, useEffect } from 'react';
import { WaveSpring, ShipState, Bubble } from '../types';

interface SimulationCanvasProps {
  tilt: number; // Fluid surface angle in radians (0 is flat)
  onTurbulenceChange: (turbulence: number) => void;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ tilt, onTurbulenceChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Physics constants
  const SPRING_COUNT = 150;
  const SPREAD = 0.2; 
  const TENSION = 0.02; 
  const DAMPING = 0.05;
  const FLUID_INERTIA = 0.96;
  const FLUID_STIFFNESS = 0.05;
  
  // Mutable State
  const springsRef = useRef<WaveSpring[]>([]);
  const shipRef = useRef<ShipState>({ x: 0, y: 0, angle: 0, velocityX: 0, velocityY: 0 });
  const bubblesRef = useRef<Bubble[]>([]);
  const fluidPhysicsRef = useRef({
    angle: 0,        
    velocity: 0,     
    level: 0         
  });
  const turbulenceRef = useRef<number>(0);

  // Initialize function to reset/resize simulation
  const initSimulation = () => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Update canvas size
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    
    const spacing = width / (SPRING_COUNT - 1);
    const initialSprings: WaveSpring[] = [];
    for (let i = 0; i < SPRING_COUNT; i++) {
      initialSprings.push({
        x: i * spacing,
        height: height * 0.5,
        targetHeight: height * 0.5,
        velocity: 0,
      });
    }
    springsRef.current = initialSprings;
    
    // Only reset ship if it's off screen or first run
    if (shipRef.current.x === 0 || shipRef.current.x > width) {
        shipRef.current = {
            x: width / 2,
            y: height * 0.5,
            angle: 0,
            velocityX: 0,
            velocityY: 0
        };
    }
    
    // Re-seed bubbles if needed or just keep them
    if (bubblesRef.current.length === 0) {
        const bubbles: Bubble[] = [];
        for(let i=0; i<30; i++) {
            bubbles.push({
                x: Math.random() * width,
                y: height - Math.random() * (height * 0.4),
                size: Math.random() * 8 + 2,
                speed: Math.random() * 1 + 0.5,
                alpha: Math.random() * 0.4 + 0.1
            });
        }
        bubblesRef.current = bubbles;
    }
  };
  
  // Handle Resize / Init
  useEffect(() => {
    initSimulation();
    
    const handleResize = () => {
        initSimulation();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const springs = springsRef.current;
      const ship = shipRef.current;
      const fluid = fluidPhysicsRef.current;
      
      if (springs.length === 0) return;

      // --- 1. Fluid Dynamics ---
      // 'tilt' passed in is the gravity angle. 
      // If gravity pulls "Right", tilt is positive. Water should tilt "Left" (Negative angle) to stay level.
      // We clamp it to prevent the water from flipping over completely in UI
      const clampedTilt = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, tilt));
      
      // Target angle for the water surface is negative of the device tilt
      const targetAngle = -clampedTilt;

      const displacement = targetAngle - fluid.angle;
      const acceleration = displacement * FLUID_STIFFNESS;
      
      fluid.velocity += acceleration;
      fluid.velocity *= FLUID_INERTIA;
      fluid.angle += fluid.velocity;

      const currentTurbulence = Math.abs(fluid.velocity) * 100 + Math.abs(displacement) * 10;
      turbulenceRef.current = currentTurbulence;
      onTurbulenceChange(currentTurbulence);

      // --- 2. Update Springs ---
      const baseWaterLevel = height * 0.55; 
      const centerX = width / 2;

      for (let i = 0; i < SPRING_COUNT; i++) {
        const spring = springs[i];
        
        // Calculate target height based on tilted plane equation
        const distanceFromCenter = spring.x - centerX;
        const tiltOffset = distanceFromCenter * Math.tan(fluid.angle);
        
        spring.targetHeight = baseWaterLevel + tiltOffset;

        // Turbulence Choppiness
        if (Math.abs(fluid.velocity) > 0.001) {
            spring.velocity += (Math.random() - 0.5) * Math.abs(fluid.velocity) * 150;
        }
        
        // Idle ambient wave
        const time = Date.now() / 500;
        const gentleWave = Math.sin(spring.x * 0.02 + time) * 2;
        spring.targetHeight += gentleWave;

        // Hooke's Law
        const x = spring.targetHeight - spring.height;
        const acc = TENSION * x - DAMPING * spring.velocity;
        
        spring.velocity += acc;
        spring.height += spring.velocity;
      }

      // Spread
      const lDeltas = new Array(SPRING_COUNT).fill(0);
      const rDeltas = new Array(SPRING_COUNT).fill(0);

      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < SPRING_COUNT; i++) {
          if (i > 0) {
            lDeltas[i] = SPREAD * (springs[i].height - springs[i - 1].height);
            springs[i - 1].velocity += lDeltas[i];
          }
          if (i < SPRING_COUNT - 1) {
            rDeltas[i] = SPREAD * (springs[i].height - springs[i + 1].height);
            springs[i + 1].velocity += rDeltas[i];
          }
        }
        for (let i = 0; i < SPRING_COUNT; i++) {
          if (i > 0) springs[i - 1].height += lDeltas[i];
          if (i < SPRING_COUNT - 1) springs[i + 1].height += rDeltas[i];
        }
      }

      // --- 3. Ship Physics ---
      const springIndex = Math.floor((ship.x / width) * (SPRING_COUNT - 1));
      const safeIndex = Math.max(1, Math.min(SPRING_COUNT - 2, springIndex));
      
      const p0 = springs[safeIndex - 1];
      const p1 = springs[safeIndex];
      const p2 = springs[safeIndex + 1];
      
      // Interpolate water height
      const t = (ship.x - p0.x) / (p2.x - p0.x);
      // const waterHeightAtShip = p1.height; // Simple
      const waterHeightAtShip = (1-t)*p0.height + t*p2.height; // Slightly better lerp? Close enough.

      // Calculate slope
      const dx = p2.x - p0.x;
      const dy = p2.height - p0.height;
      const waveSlope = Math.atan2(dy, dx);

      // Slide Physics
      const gravitySlide = Math.sin(waveSlope) * 0.8; 
      ship.velocityX += gravitySlide;
      ship.velocityX *= 0.95;

      ship.x += ship.velocityX;

      // Walls
      if (ship.x < 50) {
          ship.x = 50;
          ship.velocityX = Math.abs(ship.velocityX) * 0.5 + 2;
      } else if (ship.x > width - 50) {
          ship.x = width - 50;
          ship.velocityX = -Math.abs(ship.velocityX) * 0.5 - 2;
      }

      // Buoyancy
      const targetY = waterHeightAtShip - 15;
      ship.velocityY += (targetY - ship.y) * 0.1;
      ship.velocityY *= 0.8;
      ship.y += ship.velocityY;

      // Rotation
      const targetShipAngle = waveSlope + (ship.velocityX * 0.02);
      ship.angle = ship.angle + (targetShipAngle - ship.angle) * 0.15;

      // --- 4. Draw ---
      ctx.clearRect(0, 0, width, height);

      // Bubbles
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      bubblesRef.current.forEach(b => {
        b.y -= b.speed;
        b.x += Math.sin(b.y * 0.02 + fluid.angle) * 2;
        // Reset if OOB
        const col = Math.floor(b.x / width * (SPRING_COUNT -1));
        const safeCol = Math.max(0, Math.min(SPRING_COUNT-1, col));
        
        if (b.y < springs[safeCol].height || b.y < 0) {
            b.y = height + 10;
            b.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Water Body
      ctx.beginPath();
      ctx.moveTo(0, height); 
      ctx.lineTo(springs[0].x, springs[0].height);
      for (let i = 0; i < SPRING_COUNT - 1; i++) {
           const p0 = springs[i];
           const p1 = springs[i + 1];
           const midX = (p0.x + p1.x) / 2;
           const midY = (p0.height + p1.height) / 2;
           ctx.quadraticCurveTo(p0.x, p0.height, midX, midY);
      }
      ctx.lineTo(springs[SPRING_COUNT-1].x, springs[SPRING_COUNT-1].height);
      ctx.lineTo(width, height);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, height * 0.2, 0, height);
      gradient.addColorStop(0, '#38bdf8'); 
      gradient.addColorStop(0.5, '#0284c7'); 
      gradient.addColorStop(1, '#0c4a6e'); 
      ctx.fillStyle = gradient;
      ctx.fill();

      // Foam
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Ship
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);
      const scale = 1.0; 
      ctx.scale(scale, scale);

      // Hull
      ctx.beginPath();
      ctx.moveTo(-40, -15);
      ctx.quadraticCurveTo(-45, 20, 0, 25); 
      ctx.quadraticCurveTo(45, 20, 40, -15); 
      ctx.quadraticCurveTo(0, -10, -40, -15); 
      ctx.fillStyle = '#f97316';
      ctx.fill();
      
      // Shine
      ctx.beginPath();
      ctx.ellipse(-20, 5, 10, 5, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();

      // Stripe
      ctx.beginPath();
      ctx.moveTo(-42, 5);
      ctx.quadraticCurveTo(0, 10, 42, 5);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fff7ed';
      ctx.stroke();

      // Cabin
      ctx.fillStyle = '#facc15'; 
      ctx.beginPath();
      ctx.roundRect(-25, -45, 50, 35, 8);
      ctx.fill();
      
      // Roof
      ctx.fillStyle = '#ef4444'; 
      ctx.beginPath();
      ctx.roundRect(-28, -50, 56, 8, 4);
      ctx.fill();

      // Windows
      ctx.fillStyle = '#38bdf8'; 
      ctx.beginPath();
      ctx.arc(-12, -28, 6, 0, Math.PI * 2);
      ctx.arc(12, -28, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Smokestack
      ctx.fillStyle = '#475569'; 
      ctx.beginPath();
      ctx.moveTo(-5, -50);
      ctx.lineTo(-8, -75);
      ctx.lineTo(8, -75);
      ctx.lineTo(5, -50);
      ctx.fill();

      // Smoke
      const smokeTime = Date.now() / 200;
      const puffY = -85 - (smokeTime % 20);
      const puffAlpha = 1 - ((smokeTime % 20) / 20);
      ctx.fillStyle = `rgba(255, 255, 255, ${puffAlpha})`;
      ctx.beginPath();
      ctx.arc(0, puffY, 8 + (Math.sin(smokeTime) * 2), 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [tilt, onTurbulenceChange]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default SimulationCanvas;