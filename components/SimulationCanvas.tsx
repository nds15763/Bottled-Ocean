
import React, { useRef, useEffect } from 'react';
import { ShipState, WeatherType, AtmosphereState } from '../types';

interface SimulationCanvasProps {
  tilt: number;
  atmosphere: AtmosphereState;
  isFishing: boolean;
  caughtFishColor?: string | null;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ 
  tilt, 
  atmosphere, 
  isFishing,
  caughtFishColor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Physics State
  const shipRef = useRef<ShipState & { targetAngle: number }>({ 
    x: 0, 
    y: 0, 
    angle: 0, 
    targetAngle: 0, 
    velocityX: 0, 
    velocityY: 0 
  });
  
  // Timers and Accumulators
  const timeRef = useRef(0);         // Global steady clock for sun/smoke (independent of wind)
  const wavePhaseRef = useRef(0);    // Accumulated wave travel distance (prevents jumps)
  const lightningRef = useRef(0);    // Timer for lightning flash
  
  // Store clouds
  const cloudsRef = useRef<{x: number, yPct: number, scale: number, type: number}[]>([]);
  
  // Generate clouds once
  useEffect(() => {
    // Generate 4 clouds distributed horizontally to prevent stacking
    const count = 4;
    const spacing = 400; // Base spacing
    cloudsRef.current = Array.from({ length: count }).map((_, i) => ({
      // Start spaced out: e.g. 0, 400, 800, 1200 + random jitter
      x: (i * spacing) + (Math.random() * 200), 
      yPct: Math.random() * 0.3 + 0.05, // Top 5% to 35% of screen
      scale: 0.8 + Math.random() * 0.4,
      type: i % 3 // Cycle through 0, 1, 2 types
    }));
  }, []);

  // Utility to create noise pattern for texture
  const createNoisePattern = (ctx: CanvasRenderingContext2D) => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const c = canvas.getContext('2d');
    if (!c) return null;
    
    c.fillStyle = '#ffffff';
    c.fillRect(0,0,100,100);
    
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

    const noisePattern = createNoisePattern(ctx);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // 1. Time & Phase Accumulation
      // Constant time for steady animations (Sun breathing, Smoke puffs)
      timeRef.current += 0.01;
      const t = timeRef.current;

      // Accumulate Wave Phase based on current speed
      // This prevents "Jumping" when speed changes dynamically
      // Speed factor adjusted for visual feel (0.05 is base multiplier)
      wavePhaseRef.current += atmosphere.waveSpeed * 0.05;
      const wavePhase = wavePhaseRef.current;

      // Lightning Logic
      if (atmosphere.lightning && Math.random() < 0.005) {
          lightningRef.current = 10; // Flash for 10 frames
      }
      if (lightningRef.current > 0) lightningRef.current--;

      // --- Physics Update ---
      const ship = shipRef.current;
      
      // Horizontal Movement
      let effectiveTilt = tilt;
      if (Math.abs(effectiveTilt) < 0.05) effectiveTilt = 0;
      const targetVelX = effectiveTilt * 8;
      ship.velocityX += (targetVelX - ship.velocityX) * 0.08;
      ship.velocityX *= 0.95; 
      ship.x += ship.velocityX;
      
      const padding = 80;
      if (ship.x < padding) { ship.x = padding; ship.velocityX *= -0.2; }
      if (ship.x > width - padding) { ship.x = width - padding; ship.velocityX *= -0.2; }

      // Vertical (Wave Following)
      const waveLayerIndex = 1; 
      const waveBaseYOffset = 20;
      const waveAmp = atmosphere.waveAmp * 1.2; 
      const waveFreq = 0.0015; 
      
      // Calculate ship Y based on the accumulated phase
      const shipWavePhase = ship.x * waveFreq + wavePhase + waveLayerIndex;
      const waterHeightAtShip = Math.sin(shipWavePhase) * waveAmp;
      
      const waterBaseY = height * 0.6 + waveBaseYOffset;
      const shipDraft = 10; 
      ship.y = waterBaseY + waterHeightAtShip - shipDraft;

      // Rotation (Tangent to wave)
      const waveSlope = waveAmp * waveFreq * Math.cos(shipWavePhase);
      let targetAngle = Math.atan(waveSlope);
      targetAngle += (ship.velocityX * 0.005);
      ship.angle += (targetAngle - ship.angle) * 0.1;


      // --- Drawing ---
      ctx.clearRect(0, 0, width, height);

      // 1. SKY
      const hour = atmosphere.localHour;
      let skyColor1, skyColor2;

      if (atmosphere.type === WeatherType.RAINY || atmosphere.type === WeatherType.STORM) {
           skyColor1 = '#7f8c8d'; skyColor2 = '#2c3e50';
      } else {
           if (hour < 5 || hour >= 20) {
               skyColor1 = '#1a252f'; skyColor2 = '#000000';
           } else if (hour >= 5 && hour < 7) {
               skyColor1 = '#8E44AD'; skyColor2 = '#E67E22';
           } else if (hour >= 7 && hour < 17) {
               skyColor1 = '#5B9BD5'; skyColor2 = '#82B4E3';
           } else {
               skyColor1 = '#D35400'; skyColor2 = '#2C3E50';
           }
      }
      
      if (lightningRef.current > 0) {
          skyColor1 = '#ffffff'; skyColor2 = '#bdc3c7';
      }

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, skyColor1);
      grad.addColorStop(1, skyColor2);
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,width,height);

      // 2. CELESTIAL BODIES
      ctx.save();
      
      if (atmosphere.hasRainbow) {
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = 0.6;
          const cx = width * 0.5;
          const cy = height * 0.9;
          const r = Math.min(width, height) * 0.8;
          const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
          
          colors.forEach((c, i) => {
             ctx.beginPath();
             ctx.arc(cx, cy, r - i * 10, Math.PI, 0);
             ctx.strokeStyle = c;
             ctx.lineWidth = 10;
             ctx.stroke(); 
          });
          ctx.globalAlpha = 1.0;
          ctx.globalCompositeOperation = 'source-over';
      }

      const drawCelestial = (type: 'SUN' | 'MOON') => {
           let progress = 0; 
           let isVisible = false;

           if (type === 'SUN') {
               if (hour >= 5 && hour <= 19) {
                   progress = (hour - 5) / 14; 
                   isVisible = true;
               }
           } else {
               if (hour >= 17) {
                   progress = (hour - 17) / 14;
                   isVisible = true;
               } else if (hour <= 7) {
                   progress = (hour + 7) / 14; 
                   isVisible = true;
               }
           }

           if (isVisible) {
               const cx = width * progress;
               const orbitHeight = height * 0.7; 
               const topMargin = height * 0.1;
               const cy = height - (Math.sin(progress * Math.PI) * orbitHeight) - topMargin;
               
               ctx.translate(cx, cy);

               if (type === 'SUN') {
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
                   
                   ctx.fillStyle = '#E74C3C';
                   ctx.beginPath();
                   const r = 45 + Math.sin(t*2)*2; 
                   ctx.arc(0, 0, r, 0, Math.PI*2);
                   ctx.fill();
               } else {
                   ctx.rotate(-0.5); 
                   ctx.fillStyle = '#F1C40F';
                   ctx.beginPath();
                   ctx.arc(0, 0, 40, 0, Math.PI*2);
                   ctx.fill();
                   if (noisePattern) { ctx.fillStyle = noisePattern; ctx.globalAlpha=0.2; ctx.fill(); ctx.globalAlpha=1; }
               }
               ctx.translate(-cx, -cy);
           }
      };

      if (atmosphere.type === WeatherType.SUNNY) {
          drawCelestial('SUN');
      } 
      if (atmosphere.type === WeatherType.NIGHT || (!atmosphere.isDay && atmosphere.type !== WeatherType.STORM)) {
          drawCelestial('MOON');
      }

      ctx.restore();

      // 3. CLOUDS
      ctx.fillStyle = (atmosphere.type === WeatherType.RAINY || atmosphere.type === WeatherType.STORM) 
          ? '#95a5a6' 
          : '#ECF0F1'; 

      const windFactor = atmosphere.windSpeed ? (atmosphere.windSpeed / 20) : 0;
      const cloudMoveSpeed = 0.1 + windFactor; 

      cloudsRef.current.forEach((cloud) => {
          // Delta movement
          cloud.x += cloudMoveSpeed;
          // Wrap around logic with ample buffer to ensure they start off-screen right
          if (cloud.x > width + 200) cloud.x = -200;

          let cx = cloud.x;
          let cy = cloud.yPct * height; 

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(cloud.scale, cloud.scale);
          ctx.beginPath();
          
          if (cloud.type === 0) {
              // Classic Puff
              ctx.arc(0, 0, 30, 0, Math.PI*2);
              ctx.arc(25, -10, 35, 0, Math.PI*2);
              ctx.arc(50, 0, 30, 0, Math.PI*2);
          } else if (cloud.type === 1) {
              // Long Flat
              ctx.arc(0, 0, 25, 0, Math.PI*2);
              ctx.arc(40, -5, 30, 0, Math.PI*2);
              ctx.arc(80, 0, 25, 0, Math.PI*2);
              ctx.rect(0, 0, 80, 20); // Flat bottom fill
          } else {
              // Big Fluffy
              ctx.arc(0, 0, 40, 0, Math.PI*2);
              ctx.arc(40, -20, 50, 0, Math.PI*2);
              ctx.arc(80, 0, 40, 0, Math.PI*2);
              ctx.arc(40, 20, 40, 0, Math.PI*2);
          }
          
          ctx.fill();
          ctx.restore();
      });
      
      if (lightningRef.current > 5) {
          ctx.save();
          ctx.strokeStyle = '#FFF';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#FFF';
          ctx.beginPath();
          let lx = Math.random() * width;
          let ly = 0;
          ctx.moveTo(lx, ly);
          while(ly < height * 0.7) {
              lx += (Math.random() - 0.5) * 50;
              ly += Math.random() * 50;
              ctx.lineTo(lx, ly);
          }
          ctx.stroke();
          ctx.restore();
      }

      // 4. WATER LAYERS (Accumulated Phase)
      const layers = [
          { color: '#5DADE2', yOff: 0, ampMult: 1.0, speedRatio: 0.8 }, 
          { color: '#3498DB', yOff: 20, ampMult: 1.2, speedRatio: 1.0 }, 
          { color: '#2980B9', yOff: 45, ampMult: 1.0, speedRatio: 1.2 },  
      ];

      if (hour >= 18 || hour < 6 || atmosphere.type === WeatherType.NIGHT) {
          layers[0].color = '#2471A3';
          layers[1].color = '#1A5276';
          layers[2].color = '#154360';
      } else if (atmosphere.type === WeatherType.STORM) {
          layers[0].color = '#546E7A';
          layers[1].color = '#455A64';
          layers[2].color = '#37474F';
      } else if (hour >= 17 && hour < 18) {
          layers[0].color = '#EB984E';
          layers[1].color = '#D35400';
          layers[2].color = '#A04000';
      }

      layers.forEach((layer, i) => {
          ctx.fillStyle = layer.color;
          ctx.beginPath();
          const baseY = height * 0.6 + layer.yOff;
          ctx.moveTo(0, height);
          ctx.lineTo(0, baseY);
          
          const freq = 0.0015; 
          const layerAmp = atmosphere.waveAmp * layer.ampMult;
          
          // Use accumulated phase + x-offset
          // phase = wavePhaseRef.current * layer.speedRatio
          const currentPhase = wavePhaseRef.current * layer.speedRatio + i;

          for(let x=0; x<=width + 20; x+=10) {
              const y = baseY + Math.sin(x * freq + currentPhase) * layerAmp;
              ctx.lineTo(x, y);
          }
          
          ctx.lineTo(width + 20, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 2;
          ctx.stroke();

          if (noisePattern) {
              ctx.fillStyle = noisePattern;
              ctx.globalAlpha = 0.1;
              ctx.fill();
              ctx.globalAlpha = 1.0;
          }

          if (i === 1) {
              // Pass the independent 't' for smoke/sun animations
              renderShip(ctx, ship, t, width, height, isFishing, caughtFishColor, noisePattern);
          }
      });

      // 5. PRECIPITATION
      if (atmosphere.type === WeatherType.RAINY || atmosphere.type === WeatherType.STORM) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const rainCount = atmosphere.type === WeatherType.STORM ? 100 : 40;
          const rainSpeed = atmosphere.type === WeatherType.STORM ? 50 : 25;
          for(let i=0; i<rainCount; i++) {
              // Use t for rain cycle, wrapped
              const rx = (Math.random() * width * 1.5) - (t * 400 % width);
              const ry = Math.random() * height;
              const windTilt = atmosphere.windSpeed * 0.5;
              ctx.moveTo(rx, ry);
              ctx.lineTo(rx - 8 - windTilt, ry + rainSpeed);
          }
          ctx.stroke();
      }

      // FIX: Capture the ID so it can be cancelled properly on re-render
      animationFrameId = requestAnimationFrame(render);
    };

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
        const s = 1.2;
        ctx.scale(s, s);

        // Hull
        ctx.fillStyle = '#FDFBF7'; 
        ctx.beginPath();
        ctx.moveTo(-45, 0); 
        ctx.lineTo(45, 0);
        ctx.bezierCurveTo(45, 35, -45, 35, -45, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (texture) { ctx.fillStyle = texture; ctx.globalAlpha = 0.1; ctx.fill(); ctx.globalAlpha = 1; }
        
        // Stripe
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.rect(-42, 6, 84, 8);
        ctx.fill();

        // Cabin
        ctx.fillStyle = '#FDFBF7';
        ctx.fillRect(-20, -25, 35, 25);
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath(); ctx.arc(-10, -12, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -12, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(10, -12, 2.5, 0, Math.PI*2); ctx.fill();

        // Funnel
        ctx.fillStyle = '#2C3E50'; 
        ctx.fillRect(0, -40, 12, 15);
        ctx.fillStyle = '#E74C3C'; 
        ctx.fillRect(0, -40, 12, 4);

        // Smoke (Uses independent t)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const smokeY = -45 - Math.sin(t*3)*3;
        ctx.beginPath();
        ctx.arc(5 + Math.sin(t)*3, smokeY, 6, 0, Math.PI*2); 
        ctx.arc(12 + Math.sin(t*1.5)*3, smokeY - 10, 8 + Math.sin(t*2)*2, 0, Math.PI*2); 
        ctx.fill();

        // Fisherman
        ctx.fillStyle = '#E67E22'; 
        ctx.beginPath();
        ctx.moveTo(35, 0);
        ctx.lineTo(45, 0);
        ctx.lineTo(40, -15);
        ctx.fill();
        ctx.fillStyle = '#F1C40F'; 
        ctx.beginPath();
        ctx.arc(40, -18, 5, 0, Math.PI*2);
        ctx.fill();

        // Rod
        if (fishing || fishColor) {
            ctx.strokeStyle = '#5D6D7E';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(40, -15); 
            ctx.lineTo(60, -35); 
            ctx.stroke();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(60, -35);
            const lineSlack = fishColor ? 0 : Math.sin(t*2)*3 + 5;
            const bobberX = 75; 
            const bobberY = 15; 
            ctx.quadraticCurveTo(65, -15 + lineSlack, bobberX, bobberY);
            ctx.stroke();

            if (fishColor) {
                ctx.fillStyle = fishColor;
                ctx.beginPath();
                ctx.ellipse(bobberX, bobberY, 4, 8, 0, 0, Math.PI*2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#E74C3C';
                ctx.beginPath();
                ctx.arc(bobberX, bobberY, 2.5, 0, Math.PI*2);
                ctx.fill();
            }
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

    // Fix: Capture the ID initially as well
    animationFrameId = requestAnimationFrame(render);
    
    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
    };
  }, [tilt, atmosphere, isFishing, caughtFishColor]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default SimulationCanvas;
