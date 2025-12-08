import React, { useRef, useEffect } from 'react';
import { ShipState, WeatherType } from '../types';

interface SimulationCanvasProps {
  tilt: number;
  weather: WeatherType;
  isFishing: boolean;
  caughtFishColor?: string | null;
  mode: string;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ 
  tilt, 
  weather, 
  isFishing,
  caughtFishColor,
  mode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Physics State
  const shipRef = useRef<ShipState>({ x: 0, y: 0, angle: 0, velocityX: 0, velocityY: 0 });
  const timeRef = useRef(0);
  const cloudsRef = useRef<{x: number, y: number, scale: number, type: number}[]>([]);
  
  // Generate clouds once
  useEffect(() => {
    cloudsRef.current = Array.from({ length: 6 }).map(() => ({
      x: Math.random() * 2000, 
      y: Math.random() * 200 + 50, 
      scale: 0.8 + Math.random() * 0.5,
      type: Math.floor(Math.random() * 3)
    }));
  }, []);

  // Utility to create noise pattern for texture
  const createNoisePattern = (ctx: CanvasRenderingContext2D) => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const c = canvas.getContext('2d');
    if (!c) return null;
    
    // Fill white
    c.fillStyle = '#ffffff';
    c.fillRect(0,0,100,100);
    
    // Add noise
    for(let i=0; i<500; i++) {
        c.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        c.beginPath();
        c.arc(Math.random()*100, Math.random()*100, Math.random()*2, 0, Math.PI*2);
        c.fill();
    }
    return ctx.createPattern(canvas, 'repeat');
  };

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    // Initialize Texture Pattern
    const noisePattern = createNoisePattern(ctx);

    const render = () => {
      timeRef.current += 0.01;
      const width = canvas.width;
      const height = canvas.height;
      const t = timeRef.current;

      // --- Physics Update ---
      const ship = shipRef.current;
      
      // Ship moves based on tilt (gravity)
      const targetVelX = tilt * 15;
      ship.velocityX += (targetVelX - ship.velocityX) * 0.05;
      ship.x += ship.velocityX;

      // Boundary check
      if (ship.x < 100) { ship.x = 100; ship.velocityX *= -0.5; }
      if (ship.x > width - 100) { ship.x = width - 100; ship.velocityX *= -0.5; }

      // Wave calculation for ship height/angle
      // We simulate the "Main" wave layer for ship physics
      const waveFreq = 0.002;
      const waveAmp = 20;
      const waveY = Math.sin(ship.x * waveFreq + t * 2) * waveAmp + (Math.sin(ship.x * 0.01 + t) * 10);
      
      const targetY = height * 0.6 + waveY - 20;
      ship.y += (targetY - ship.y) * 0.1;

      // Calculate angle based on wave slope
      const nextY = Math.sin((ship.x + 5) * waveFreq + t * 2) * waveAmp;
      const slope = (nextY - waveY) / 5;
      const targetAngle = Math.atan(slope) + (ship.velocityX * 0.002);
      ship.angle += (targetAngle - ship.angle) * 0.1;

      // --- Drawing ---
      ctx.clearRect(0, 0, width, height);

      // 1. SKY
      let skyColor1, skyColor2;
      if (weather === WeatherType.NIGHT) {
          skyColor1 = '#2c3e50'; skyColor2 = '#000000';
      } else if (weather === WeatherType.RAINY) {
          skyColor1 = '#bdc3c7'; skyColor2 = '#2c3e50';
      } else {
          skyColor1 = '#5B9BD5'; skyColor2 = '#82B4E3'; // Crayon Blue
      }
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, skyColor1);
      grad.addColorStop(1, skyColor2);
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,width,height);

      // 2. CELESTIAL BODY
      ctx.save();
      if (weather === WeatherType.NIGHT) {
          // Moon
          ctx.translate(width * 0.8, height * 0.2);
          ctx.fillStyle = '#F1C40F';
          ctx.beginPath();
          ctx.arc(0, 0, 40, 0, Math.PI*2);
          ctx.fill();
          // Texture overlay
          if (noisePattern) { ctx.fillStyle = noisePattern; ctx.globalAlpha=0.2; ctx.fill(); ctx.globalAlpha=1; }
      } else if (weather === WeatherType.SUNNY) {
          // Red Sun (Paper Cutout Style)
          ctx.translate(width * 0.8, height * 0.2);
          // Rays
          ctx.strokeStyle = '#E74C3C';
          ctx.lineWidth = 4;
          ctx.setLineDash([10, 10]);
          ctx.beginPath();
          for(let i=0; i<8; i++) {
              const ang = (i/8)*Math.PI*2 + t * 0.1;
              ctx.moveTo(Math.cos(ang)*50, Math.sin(ang)*50);
              ctx.lineTo(Math.cos(ang)*70, Math.sin(ang)*70);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Sun Body
          ctx.fillStyle = '#E74C3C';
          ctx.beginPath();
          const r = 45 + Math.sin(t*2)*2;
          ctx.arc(0, 0, r, 0, Math.PI*2);
          ctx.fill();
          if (noisePattern) { ctx.fillStyle = noisePattern; ctx.globalAlpha=0.2; ctx.fill(); ctx.globalAlpha=1; }
      }
      ctx.restore();

      // 3. CLOUDS (Blobs)
      ctx.fillStyle = '#ECF0F1'; // Off white
      cloudsRef.current.forEach((cloud, i) => {
          let cx = (cloud.x + t * 10) % (width + 400) - 200;
          let cy = cloud.y;
          
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(cloud.scale, cloud.scale);
          
          // Draw Cloud Blob
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI*2);
          ctx.arc(25, -10, 35, 0, Math.PI*2);
          ctx.arc(50, 0, 30, 0, Math.PI*2);
          ctx.fill();
          
          // Add subtle shadow/texture
          ctx.strokeStyle = '#BDC3C7';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.restore();
      });

      // 4. WATER LAYERS (Paper Waves)
      const layers = [
          { color: '#2980B9', yOff: 40, amp: 25, speed: 1.0 }, // Back
          { color: '#3498DB', yOff: 20, amp: 30, speed: 1.2 }, // Mid
          { color: '#5DADE2', yOff: 0, amp: 20, speed: 0.8 },  // Front (Ship sits here)
      ];

      if (weather === WeatherType.NIGHT) {
          layers[0].color = '#1A5276';
          layers[1].color = '#2471A3';
          layers[2].color = '#2980B9';
      }

      layers.forEach((layer, i) => {
          ctx.fillStyle = layer.color;
          ctx.beginPath();
          const baseY = height * 0.6 + layer.yOff;
          
          ctx.moveTo(0, height);
          ctx.lineTo(0, baseY);
          
          // Draw Sine Wave
          for(let x=0; x<=width; x+=10) {
              const y = baseY + Math.sin(x * 0.003 + t * layer.speed + i) * layer.amp;
              ctx.lineTo(x, y);
          }
          
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fill();

          // Top edge highlight (Paper thickness)
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Texture
          if (noisePattern) {
              ctx.fillStyle = noisePattern;
              ctx.globalAlpha = 0.1;
              ctx.fill();
              ctx.globalAlpha = 1.0;
          }

          // Draw Ship after the 2nd layer (so it sits inside/behind front wave)
          if (i === 1) {
              renderShip(ctx, ship, t, width, height, isFishing, caughtFishColor, noisePattern);
          }
      });

      // 5. WEATHER OVERLAYS
      if (weather === WeatherType.RAINY) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for(let i=0; i<50; i++) {
              const rx = (Math.random() * width * 1.5) - (t * 500 % width);
              const ry = Math.random() * height;
              // Rain slant
              ctx.moveTo(rx, ry);
              ctx.lineTo(rx - 10, ry + 20);
          }
          ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // --- Helper: Render Ship ---
    const renderShip = (
        ctx: CanvasRenderingContext2D, 
        ship: ShipState, 
        t: number,
        w: number, 
        h: number,
        fishing: boolean,
        fishColor: string | null | undefined,
        texture: CanvasPattern | null
    ) => {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        // -- The Boat --
        // Hull
        ctx.fillStyle = '#F4F6F7'; // White paper
        ctx.beginPath();
        ctx.moveTo(-50, -20);
        ctx.bezierCurveTo(-40, 30, 40, 30, 50, -20); // U shape
        ctx.closePath();
        ctx.fill();
        if (texture) { ctx.fillStyle = texture; ctx.globalAlpha = 0.1; ctx.fill(); ctx.globalAlpha = 1; }
        
        // Red Stripe
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.rect(-45, -15, 90, 8);
        ctx.fill();

        // Cabin / Funnel
        ctx.fillStyle = '#2C3E50'; // Black/Dark Blue
        ctx.beginPath();
        ctx.rect(-10, -45, 20, 25);
        ctx.fill();

        // Smoke
        ctx.fillStyle = 'rgba(236, 240, 241, 0.8)';
        const smokeY = -55 - Math.sin(t*5)*5;
        ctx.beginPath();
        ctx.arc(5 + Math.sin(t)*5, smokeY, 8 + Math.sin(t*3)*2, 0, Math.PI*2);
        ctx.arc(15 + Math.sin(t+1)*5, smokeY-15, 12 + Math.sin(t*2)*3, 0, Math.PI*2);
        ctx.fill();

        // -- The Fisherman --
        ctx.fillStyle = '#E67E22'; // Orange Shirt
        ctx.beginPath();
        ctx.arc(0, -25, 10, Math.PI, 0); // Torso
        ctx.fill();
        
        ctx.fillStyle = '#F1C40F'; // Yellow Hat
        ctx.beginPath();
        ctx.moveTo(-10, -32);
        ctx.lineTo(10, -32);
        ctx.lineTo(0, -42);
        ctx.fill();

        // -- Fishing Rod --
        if (fishing || fishColor) {
            ctx.strokeStyle = '#7F8C8D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(5, -30); // Hand pos
            ctx.lineTo(35, -50); // Rod tip
            ctx.stroke();

            // Line
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(35, -50);
            
            // Calculate bobber pos in local space (rough approx)
            const lineSlack = fishColor ? 0 : Math.sin(t*3)*5 + 10;
            const bobberX = 50; 
            const bobberY = 10; // Water level relative to ship center roughly
            
            ctx.quadraticCurveTo(45, -20 + lineSlack, bobberX, bobberY);
            ctx.stroke();

            // Bobber or Fish
            if (fishColor) {
                // Draw Fish hanging
                ctx.fillStyle = fishColor;
                ctx.beginPath();
                ctx.arc(bobberX, bobberY, 8, 0, Math.PI*2);
                ctx.fill();
            } else {
                // Bobber
                ctx.fillStyle = '#E74C3C';
                ctx.beginPath();
                ctx.arc(bobberX, bobberY, 3, 0, Math.PI*2);
                ctx.fill();
            }
        } else if (mode === 'ZEN') {
            // Wave hand interaction in Zen mode?
            // Just static for now
        }

        ctx.restore();
    };

    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
        }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    requestAnimationFrame(render);
    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
    };
  }, [tilt, weather, isFishing, caughtFishColor, mode]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default SimulationCanvas;