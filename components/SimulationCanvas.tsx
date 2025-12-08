
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
  const timeRef = useRef(0);
  const lightningRef = useRef(0); // Timer for lightning flash
  
  // Store clouds with relative Y positions (0.0 to 0.4 of screen height)
  // And accumulate X position manually to avoid speed-change jumps
  const cloudsRef = useRef<{x: number, yPct: number, scale: number, type: number}[]>([]);
  
  // Generate clouds once
  useEffect(() => {
    cloudsRef.current = Array.from({ length: 6 }).map(() => ({
      x: Math.random() * 2000, 
      yPct: Math.random() * 0.35 + 0.05, // Top 5% to 40% of screen
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
      // Global time increments constantly for wave phases, sun rotation, etc.
      // Independent of wind speed to prevent jitter.
      timeRef.current += 0.01;
      const width = canvas.width;
      const height = canvas.height;
      const t = timeRef.current;

      // Lightning Logic
      if (atmosphere.lightning && Math.random() < 0.005) {
          lightningRef.current = 10; // Flash for 10 frames
      }
      if (lightningRef.current > 0) lightningRef.current--;

      // --- Physics Update ---
      const ship = shipRef.current;
      
      // Horizontal
      let effectiveTilt = tilt;
      if (Math.abs(effectiveTilt) < 0.05) effectiveTilt = 0;
      const targetVelX = effectiveTilt * 8;
      ship.velocityX += (targetVelX - ship.velocityX) * 0.08;
      ship.velocityX *= 0.95; 
      ship.x += ship.velocityX;
      
      const padding = 80;
      if (ship.x < padding) { ship.x = padding; ship.velocityX *= -0.2; }
      if (ship.x > width - padding) { ship.x = width - padding; ship.velocityX *= -0.2; }

      // Vertical (Using Dynamic Atmosphere Params)
      const waveLayerIndex = 1; 
      const waveBaseYOffset = 20;
      // DYNAMIC: Use atmosphere.waveAmp and atmosphere.waveSpeed
      const waveAmp = atmosphere.waveAmp * 1.2; // Mid layer usually slightly higher amp
      const waveSpeed = atmosphere.waveSpeed;
      const waveFreq = 0.0015; // Lower frequency for smoother/wider waves
      
      const wavePhase = ship.x * waveFreq + t * waveSpeed + waveLayerIndex;
      const waterHeightAtShip = Math.sin(wavePhase) * waveAmp;
      
      const waterBaseY = height * 0.6 + waveBaseYOffset;
      const shipDraft = 10; 
      ship.y = waterBaseY + waterHeightAtShip - shipDraft;

      // Rotation
      const waveSlope = waveAmp * waveFreq * Math.cos(wavePhase);
      let targetAngle = Math.atan(waveSlope);
      targetAngle += (ship.velocityX * 0.005);
      ship.angle += (targetAngle - ship.angle) * 0.1;


      // --- Drawing ---
      ctx.clearRect(0, 0, width, height);

      // 1. SKY (Dynamic 4-Stage Gradient)
      const hour = atmosphere.localHour;
      let skyColor1, skyColor2;

      // Storm Override
      if (atmosphere.type === WeatherType.RAINY || atmosphere.type === WeatherType.STORM) {
           skyColor1 = '#7f8c8d'; skyColor2 = '#2c3e50';
      } else {
           // Clear sky interpolation
           if (hour < 5 || hour >= 20) {
               // Night
               skyColor1 = '#1a252f'; skyColor2 = '#000000';
           } else if (hour >= 5 && hour < 7) {
               // Dawn (Purple to Orange)
               skyColor1 = '#8E44AD'; skyColor2 = '#E67E22';
           } else if (hour >= 7 && hour < 17) {
               // Day (Blue to Light Blue)
               skyColor1 = '#5B9BD5'; skyColor2 = '#82B4E3';
           } else {
               // Dusk (Orange to Purple/Dark Blue)
               skyColor1 = '#D35400'; skyColor2 = '#2C3E50';
           }
      }
      
      // Flash effect
      if (lightningRef.current > 0) {
          skyColor1 = '#ffffff'; skyColor2 = '#bdc3c7';
      }

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, skyColor1);
      grad.addColorStop(1, skyColor2);
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,width,height);

      // 2. CELESTIAL BODIES (Orbit Logic)
      ctx.save();
      
      // Rainbow
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

      // Celestial Orbit Calculation
      const drawCelestial = (type: 'SUN' | 'MOON') => {
           let progress = 0; // 0 to 1
           let isVisible = false;

           if (type === 'SUN') {
               // 6 to 18
               if (hour >= 5 && hour <= 19) {
                   progress = (hour - 5) / 14; 
                   isVisible = true;
               }
           } else {
               // 17 to 24, or 0 to 7
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
               // Parabola: y = 4 * h * x * (1-x) 
               // Invert for canvas Y (0 is top)
               const orbitHeight = height * 0.7; // How high it goes
               const topMargin = height * 0.1;
               const cy = height - (Math.sin(progress * Math.PI) * orbitHeight) - topMargin;
               
               ctx.translate(cx, cy);

               if (type === 'SUN') {
                   // Draw Sun
                   ctx.strokeStyle = '#E74C3C';
                   ctx.lineWidth = 4;
                   ctx.setLineDash([10, 10]);
                   ctx.beginPath();
                   for(let i=0; i<8; i++) {
                       const ang = (i/8)*Math.PI*2 + t * 0.1; // Independent rotation
                       ctx.moveTo(Math.cos(ang)*50, Math.sin(ang)*50);
                       ctx.lineTo(Math.cos(ang)*70, Math.sin(ang)*70);
                   }
                   ctx.stroke();
                   ctx.setLineDash([]);
                   
                   ctx.fillStyle = '#E74C3C';
                   ctx.beginPath();
                   const r = 45 + Math.sin(t*2)*2; // Breathing independently
                   ctx.arc(0, 0, r, 0, Math.PI*2);
                   ctx.fill();
               } else {
                   // Draw Moon
                   ctx.rotate(-0.5); // Tilt
                   ctx.fillStyle = '#F1C40F';
                   ctx.beginPath();
                   ctx.arc(0, 0, 40, 0, Math.PI*2);
                   ctx.fill();
                   // Crater texture
                   if (noisePattern) { ctx.fillStyle = noisePattern; ctx.globalAlpha=0.2; ctx.fill(); ctx.globalAlpha=1; }
               }
               // Reset
               ctx.translate(-cx, -cy);
           }
      };

      // Only draw sun if NOT rainy/stormy
      if (atmosphere.type === WeatherType.SUNNY) {
          drawCelestial('SUN');
      } 
      // Always try to draw moon if it's night time logic, unless forced storm
      if (atmosphere.type === WeatherType.NIGHT || (!atmosphere.isDay && atmosphere.type !== WeatherType.STORM)) {
          drawCelestial('MOON');
      }

      ctx.restore();

      // 3. CLOUDS
      ctx.fillStyle = (atmosphere.type === WeatherType.RAINY || atmosphere.type === WeatherType.STORM) 
          ? '#95a5a6' 
          : '#ECF0F1'; 

      // Update cloud positions (Delta movement)
      const windFactor = atmosphere.windSpeed ? (atmosphere.windSpeed / 20) : 0;
      // Base speed is very slow (0.1) + wind influence
      const cloudMoveSpeed = 0.1 + windFactor; 

      cloudsRef.current.forEach((cloud) => {
          // Increment position
          cloud.x += cloudMoveSpeed;
          // Wrap around
          if (cloud.x > width + 200) cloud.x = -200;

          let cx = cloud.x;
          let cy = cloud.yPct * height; // Fixed height relative to screen

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(cloud.scale, cloud.scale);
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI*2);
          ctx.arc(25, -10, 35, 0, Math.PI*2);
          ctx.arc(50, 0, 30, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
      });
      
      // Lightning Bolt drawing
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

      // 4. WATER LAYERS (Dynamic)
      const layers = [
          { color: '#5DADE2', yOff: 0, amp: atmosphere.waveAmp, speed: atmosphere.waveSpeed * 0.8 }, 
          { color: '#3498DB', yOff: 20, amp: atmosphere.waveAmp * 1.2, speed: atmosphere.waveSpeed }, 
          { color: '#2980B9', yOff: 45, amp: atmosphere.waveAmp, speed: atmosphere.waveSpeed * 1.2 },  
      ];

      // Dusk/Night overrides for water color
      if (hour >= 18 || hour < 6 || atmosphere.type === WeatherType.NIGHT) {
          layers[0].color = '#2471A3';
          layers[1].color = '#1A5276';
          layers[2].color = '#154360';
      } else if (atmosphere.type === WeatherType.STORM) {
          layers[0].color = '#546E7A';
          layers[1].color = '#455A64';
          layers[2].color = '#37474F';
      } else if (hour >= 17 && hour < 18) {
          // Sunset reflection
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
          
          const freq = 0.0015; // Lower freq for smoother look
          
          // Draw slightly past width to prevent right-edge gaps
          for(let x=0; x<=width + 20; x+=10) {
              const y = baseY + Math.sin(x * freq + t * layer.speed + i) * layer.amp;
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
              const rx = (Math.random() * width * 1.5) - (t * 400 % width);
              const ry = Math.random() * height;
              // Wind affects rain angle
              const windTilt = atmosphere.windSpeed * 0.5;
              ctx.moveTo(rx, ry);
              ctx.lineTo(rx - 8 - windTilt, ry + rainSpeed);
          }
          ctx.stroke();
      }

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
            // Slight buffer to prevent rounding errors
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
  }, [tilt, atmosphere, isFishing, caughtFishColor]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default SimulationCanvas;
