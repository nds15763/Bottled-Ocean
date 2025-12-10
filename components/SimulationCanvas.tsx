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
  
  // Fishing Animation State
  const fishingAnimRef = useRef({
      phase: 'IDLE' as 'IDLE' | 'CASTING' | 'FISHING' | 'REELING',
      phaseStartTime: 0,
      lastCycleTime: 0,
      targetDist: 100,   
      startDist: 0,      
      bobberX: 45,        // Init at Rod Tip X
      bobberY: -30        // Init at Rod Tip Y
  });

  // Timers and Accumulators
  const timeRef = useRef(0);         
  const wavePhaseRef = useRef(0);    
  const lightningRef = useRef(0);    
  
  // Store clouds & stars
  const cloudsRef = useRef<{x: number, yPct: number, scale: number, type: number}[]>([]);
  const starsRef = useRef<{x: number, y: number, size: number, rot: number, opacity: number}[]>([]);
  const moonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Generate static assets once
  useEffect(() => {
    // 1. Generate Clouds
    const count = 4;
    const spacing = 400; // Base spacing
    cloudsRef.current = Array.from({ length: count }).map((_, i) => ({
      x: (i * spacing) + (Math.random() * 200), 
      yPct: Math.random() * 0.3 + 0.05, 
      scale: 0.8 + Math.random() * 0.4,
      type: i % 3 
    }));

    // 2. Generate Stars
    starsRef.current = Array.from({ length: 60 }).map(() => ({
      x: Math.random(), // 0-1 pct
      y: Math.random() * 0.65, // Top 65%
      size: 2 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      opacity: 0.4 + Math.random() * 0.6
    }));

    // 3. Generate Moon Sprite (Crescent)
    if (!moonCanvasRef.current) {
        const mCanvas = document.createElement('canvas');
        mCanvas.width = 200;
        mCanvas.height = 200;
        const mCtx = mCanvas.getContext('2d');
        if (mCtx) {
            const cx = 100, cy = 100, r = 80;
            
            // Draw Base Moon (Yellow)
            mCtx.fillStyle = '#F4D03F'; 
            mCtx.beginPath();
            mCtx.arc(cx, cy, r, 0, Math.PI * 2);
            mCtx.fill();
            
            // Cutout (Clear mode)
            mCtx.globalCompositeOperation = 'destination-out';
            mCtx.beginPath();
            mCtx.arc(cx + 20, cy - 20, r * 0.95, 0, Math.PI * 2);
            mCtx.fill();
            
            mCtx.globalCompositeOperation = 'source-over';
            moonCanvasRef.current = mCanvas;
        }
    }
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

  // Interaction Handler: Click to Reel
  const handlePointerDown = (e: React.PointerEvent) => {
      // Only allow interaction if fishing and waiting for fish
      if (!isFishing || fishingAnimRef.current.phase !== 'FISHING') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const ship = shipRef.current;
      const anim = fishingAnimRef.current;

      // Coordinate Transformation:
      // Translate click to be relative to ship center
      const dx = clickX - ship.x;
      const dy = clickY - ship.y;

      // Rotate click BACKWARDS by ship angle to align with local coordinates
      const cos = Math.cos(-ship.angle);
      const sin = Math.sin(-ship.angle);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      // Calculate distance to bobber
      const dist = Math.sqrt(Math.pow(localX - anim.bobberX, 2) + Math.pow(localY - anim.bobberY, 2));

      // Hit Test (Radius 60px for generous touch target)
      if (dist < 60) {
          anim.phase = 'REELING';
          anim.phaseStartTime = timeRef.current;
      }
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
      timeRef.current += 0.01;
      const t = timeRef.current;

      wavePhaseRef.current += atmosphere.waveSpeed * 0.05;
      const wavePhase = wavePhaseRef.current;

      // Lightning Logic
      if (atmosphere.lightning && Math.random() < 0.005) {
          lightningRef.current = 10; 
      }
      if (lightningRef.current > 0) lightningRef.current--;

      // --- Physics Update ---
      const ship = shipRef.current;
      
      let effectiveTilt = tilt;
      
      // --- REFACTORED DEAD ZONE & MOVEMENT LOGIC ---
      // Increased Dead Zone to 0.20 (~11.5 degrees) for better stability
      const DEAD_ZONE = 0.20; 
      const absTilt = Math.abs(effectiveTilt);
      let targetVelX = 0;

      if (absTilt < DEAD_ZONE) {
          // ZONE: Inside Dead Zone
          // Action: STRONG Active Braking
          // 0.6 multiplier kills velocity very fast.
          ship.velocityX *= 0.6; 
          if (Math.abs(ship.velocityX) < 0.05) ship.velocityX = 0; // Snap to stop
      } else {
          // ZONE: Moving
          // Action: Smooth Acceleration
          // We subtract the dead zone so the force starts at 0 right at the edge of the zone.
          // This prevents the "Jump" where the ship suddenly takes off at full speed.
          // Formula: (Tilt - DeadZone) * Multiplier
          const magnitude = absTilt - DEAD_ZONE; 
          const sign = Math.sign(effectiveTilt);
          
          const MAX_SPEED = 2.5; // Reduced from 8.0 for slow movement
          const FORCE_MULTIPLIER = 6.0; // Reduced from 15.0 for gentler acceleration

          // Target velocity based on how far past the dead zone we are
          const rawTarget = sign * magnitude * FORCE_MULTIPLIER;
          
          // Clamp max speed
          targetVelX = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, rawTarget));
          
          // Apply Inertia (Smoothing)
          const ACCEL = 0.05; // How fast it ramps up to target speed
          ship.velocityX += (targetVelX - ship.velocityX) * ACCEL;
      }

      // General Drag (Water Resistance)
      const WATER_DRAG = 0.95;
      ship.velocityX *= WATER_DRAG;
      
      // Apply Velocity
      ship.x += ship.velocityX;
      
      const padding = 80;
      if (ship.x < padding) { ship.x = padding; ship.velocityX *= -0.2; }
      if (ship.x > width - padding) { ship.x = width - padding; ship.velocityX *= -0.2; }

      // Vertical (Wave Following)
      const waveLayerIndex = 1; 
      const waveBaseYOffset = 20;
      const waveAmp = atmosphere.waveAmp * 1.2; 
      const waveFreq = 0.0015; 
      
      const shipWavePhase = ship.x * waveFreq + wavePhase + waveLayerIndex;
      const waterHeightAtShip = Math.sin(shipWavePhase) * waveAmp;
      
      const waterBaseY = height * 0.6 + waveBaseYOffset;
      const shipDraft = 12; // Adjusted for new ship hull
      ship.y = waterBaseY + waterHeightAtShip - shipDraft;

      // Rotation
      const waveSlope = waveAmp * waveFreq * Math.cos(shipWavePhase);
      let targetAngle = Math.atan(waveSlope);
      targetAngle += (ship.velocityX * 0.02);
      ship.angle += (targetAngle - ship.angle) * 0.05;


      // --- Fishing Animation Logic ---
      const anim = fishingAnimRef.current;
      
      // Reset if not fishing
      if (!isFishing && !caughtFishColor) {
          anim.phase = 'IDLE';
          // Park bobber at rod tip
          anim.bobberX = 45;
          anim.bobberY = -30;
      } else if (isFishing) {
          // Initialize Cycle
          if (anim.phase === 'IDLE') {
              anim.phase = 'CASTING';
              anim.phaseStartTime = t;
              anim.lastCycleTime = t;
              anim.targetDist = 60 + Math.random() * 250; 
          }

          // Check 30s Cycle (Approx check using t, where 1 sec ~ 0.6t. 30s ~ 18t)
          if (anim.phase === 'FISHING' && (t - anim.lastCycleTime > 18.0)) {
              anim.phase = 'REELING';
              anim.phaseStartTime = t;
          }

          // State Machine
          if (anim.phase === 'CASTING') {
              const duration = 1.0; // t units
              const progress = Math.min(1, (t - anim.phaseStartTime) / duration);
              
              const startX = 45; 
              const startY = -30;
              const endX = 45 + anim.targetDist;
              const endY = 15; // Water level relative to ship center
              
              const x = startX + (endX - startX) * progress;
              
              // Arc Height
              const arcHeight = 100;
              const yBase = startY + (endY - startY) * progress;
              const arc = Math.sin(progress * Math.PI) * arcHeight;
              const y = yBase - arc;

              anim.bobberX = x;
              anim.bobberY = y;

              if (progress >= 1) {
                  anim.phase = 'FISHING';
              }
          } 
          else if (anim.phase === 'FISHING') {
              // Floating on water
              anim.bobberX = 45 + anim.targetDist;
              // Add slight bobbing
              anim.bobberY = 15 + Math.sin(t * 3) * 3;
          }
          else if (anim.phase === 'REELING') {
              const duration = 1.5; // Slower reel
              const progress = Math.min(1, (t - anim.phaseStartTime) / duration);
              
              const startX = 45 + anim.targetDist;
              const waterLevel = 15;
              const rodTipX = 45; 
              const rodTipY = -30;

              // 1. Horizontal Drag (Linear)
              anim.bobberX = startX + (rodTipX - startX) * progress;
              
              // 2. Vertical Lift (Power Curve)
              const liftProgress = Math.pow(progress, 8);
              anim.bobberY = waterLevel + (rodTipY - waterLevel) * liftProgress;

              // 3. Water Turbulence
              if (anim.bobberY > 5) {
                 anim.bobberY += Math.sin(t * 30) * 1.5; 
              }

              if (progress >= 1) {
                  anim.phase = 'CASTING';
                  anim.phaseStartTime = t;
                  anim.lastCycleTime = t;
                  anim.targetDist = 60 + Math.random() * 250;
              }
          }
      }


      // --- Drawing ---
      ctx.clearRect(0, 0, width, height);

      // --- PHASE 1: BACKGROUND (Fixed) ---
      
      // 1. SKY
      const hour = atmosphere.localHour;
      let skyColor1, skyColor2;

      const isNightVisual = atmosphere.type === WeatherType.NIGHT || (!atmosphere.isDay && atmosphere.type !== WeatherType.STORM && atmosphere.type !== WeatherType.SNOW);
      const isDeepNight = hour < 5 || hour >= 20;

      if (atmosphere.type === WeatherType.SNOW) {
          if (hour < 6 || hour >= 18) {
              skyColor1 = '#2C3E50'; skyColor2 = '#95A5A6'; 
          } else {
              skyColor1 = '#ECF0F1'; skyColor2 = '#BDC3C7'; 
          }
      } else if (atmosphere.type === WeatherType.RAINY || atmosphere.type === WeatherType.STORM) {
           skyColor1 = '#7f8c8d'; skyColor2 = '#2c3e50';
      } else {
           if (isDeepNight) {
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
      ctx.fillRect(0, 0, width, height);

      // 2. STARS
      if (isNightVisual || isDeepNight) {
          ctx.save();
          ctx.fillStyle = '#F4D03F';
          starsRef.current.forEach(star => {
              const sx = star.x * width;
              const sy = star.y * height;
              const size = star.size * (0.8 + Math.sin(t * 2 + star.x * 10) * 0.2); // Twinkle
              
              ctx.save();
              ctx.translate(sx, sy);
              ctx.rotate(star.rot);
              ctx.globalAlpha = star.opacity;
              
              ctx.beginPath();
              const spikes = 5;
              const outerRadius = size;
              const innerRadius = size / 2.5;
              let rot = Math.PI / 2 * 3;
              let x = 0; 
              let y = 0;
              const step = Math.PI / spikes;

              ctx.moveTo(0, 0 - outerRadius);
              for (let i = 0; i < spikes; i++) {
                x = Math.cos(rot) * outerRadius;
                y = Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = Math.cos(rot) * innerRadius;
                y = Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
              }
              ctx.lineTo(0, 0 - outerRadius);
              ctx.closePath();
              ctx.fill();
              
              ctx.restore();
          });
          ctx.restore();
      }

      // 3. CELESTIAL BODIES
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
               if (hour >= 18) {
                   progress = (hour - 18) / 12; 
                   isVisible = true;
               } else if (hour <= 6) {
                   progress = (hour + 6) / 12; 
                   isVisible = true;
               }
           }

           if (isVisible) {
               const cx = width * progress;
               const orbitHeight = height * 0.6; 
               const topMargin = height * 0.15;
               const cy = height - (Math.sin(progress * Math.PI) * orbitHeight) - topMargin;
               
               ctx.translate(cx, cy);

               if (type === 'SUN') {
                   const isSnow = atmosphere.type === WeatherType.SNOW;
                   ctx.strokeStyle = isSnow ? '#F39C12' : '#E74C3C';
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
                   
                   ctx.fillStyle = isSnow ? '#F1C40F' : '#E74C3C';
                   ctx.beginPath();
                   const r = 45 + Math.sin(t*2)*2; 
                   ctx.arc(0, 0, r, 0, Math.PI*2);
                   ctx.fill();
               } else {
                   if (moonCanvasRef.current) {
                       ctx.rotate(-0.3); 
                       const size = 100;
                       ctx.drawImage(moonCanvasRef.current, -size/2, -size/2, size, size);
                   } else {
                       ctx.fillStyle = '#F4D03F';
                       ctx.beginPath();
                       ctx.arc(0, 0, 40, 0, Math.PI*2);
                       ctx.fill();
                   }
               }
               ctx.translate(-cx, -cy);
           }
      };

      if (atmosphere.type === WeatherType.SUNNY || atmosphere.type === WeatherType.SNOW || (atmosphere.isDay && atmosphere.type !== WeatherType.RAINY)) {
          drawCelestial('SUN');
      } 
      
      if (isNightVisual || isDeepNight) {
          drawCelestial('MOON');
      }

      ctx.restore();

      // 4. CLOUDS (Static)
      if (atmosphere.type === WeatherType.SNOW) {
          ctx.fillStyle = '#E8E8E8'; 
      } else if (atmosphere.type === WeatherType.RAINY || atmosphere.type === WeatherType.STORM) {
          ctx.fillStyle = '#95a5a6';
      } else {
          ctx.fillStyle = '#ECF0F1'; 
      }

      const windFactor = atmosphere.windSpeed ? (atmosphere.windSpeed / 20) : 0;
      const cloudMoveSpeed = 0.1 + windFactor; 

      cloudsRef.current.forEach((cloud) => {
          cloud.x -= cloudMoveSpeed; // Move Left
          if (cloud.x < -200) cloud.x = width + 200;

          let cx = cloud.x;
          let cy = cloud.yPct * height; 

          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(cloud.scale, cloud.scale);
          ctx.beginPath();
          
          if (cloud.type === 0) {
              ctx.arc(0, 0, 30, 0, Math.PI*2);
              ctx.arc(25, -10, 35, 0, Math.PI*2);
              ctx.arc(50, 0, 30, 0, Math.PI*2);
          } else if (cloud.type === 1) {
              ctx.arc(0, 0, 25, 0, Math.PI*2);
              ctx.arc(40, -5, 30, 0, Math.PI*2);
              ctx.arc(80, 0, 25, 0, Math.PI*2);
              ctx.rect(0, 0, 80, 20); 
          } else {
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

      // --- PHASE 2: FOREGROUND ---
      ctx.save();

      const renderW = width * 1.5;
      const renderH = height * 1.5;
      const offsetX = -width * 0.25;

      // 5. WATER LAYERS
      const layers = [
          { color: '#5DADE2', yOff: 0, ampMult: 1.0, speedRatio: 0.8 }, 
          { color: '#3498DB', yOff: 20, ampMult: 1.2, speedRatio: 1.0 }, 
          { color: '#2980B9', yOff: 45, ampMult: 1.0, speedRatio: 1.2 },  
      ];

      if (isDeepNight || isNightVisual) {
          layers[0].color = '#2471A3';
          layers[1].color = '#1A5276';
          layers[2].color = '#154360';
      } else if (atmosphere.type === WeatherType.STORM) {
          layers[0].color = '#546E7A';
          layers[1].color = '#455A64';
          layers[2].color = '#37474F';
      } else if (atmosphere.type === WeatherType.SNOW) {
          layers[0].color = '#AED6F1';
          layers[1].color = '#85C1E9';
          layers[2].color = '#5DADE2';
      } else if (hour >= 17 && hour < 18) {
          layers[0].color = '#EB984E';
          layers[1].color = '#D35400';
          layers[2].color = '#A04000';
      }

      layers.forEach((layer, i) => {
          ctx.fillStyle = layer.color;
          ctx.beginPath();
          const baseY = height * 0.6 + layer.yOff;
          
          ctx.moveTo(offsetX, height * 1.5);
          ctx.lineTo(offsetX, baseY);
          
          const freq = 0.0015; 
          const layerAmp = atmosphere.waveAmp * layer.ampMult;
          const currentPhase = wavePhaseRef.current * layer.speedRatio + i;

          for(let x = offsetX; x <= renderW; x+=10) {
              const y = baseY + Math.sin(x * freq + currentPhase) * layerAmp;
              ctx.lineTo(x, y);
          }
          
          ctx.lineTo(renderW, renderH);
          ctx.lineTo(offsetX, renderH);
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
              renderShip(ctx, ship, t, width, height, isFishing, caughtFishColor, noisePattern, atmosphere.windSpeed, fishingAnimRef.current);
          }
      });

      // 6. PRECIPITATION
      const offsetY_Rain = -height * 0.25; 

      if (atmosphere.type === WeatherType.RAINY || atmosphere.type === WeatherType.STORM) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const rainCount = atmosphere.type === WeatherType.STORM ? 100 : 40;
          const rainSpeed = atmosphere.type === WeatherType.STORM ? 50 : 25;
          for(let i=0; i<rainCount; i++) {
              const rx = (Math.random() * renderW) + offsetX - (t * 400 % width);
              const ry = (Math.random() * renderH) + offsetY_Rain;
              const windTilt = atmosphere.windSpeed * 0.5;
              ctx.moveTo(rx, ry);
              ctx.lineTo(rx - 8 - windTilt, ry + rainSpeed);
          }
          ctx.stroke();
      } else if (atmosphere.type === WeatherType.SNOW) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          const snowCount = 50;
          for(let i=0; i<snowCount; i++) {
              const fallSpeed = 2 + (i % 3);
              const drift = Math.sin(t + i) * 20 - t * 10; // Left drift
              
              const sx = ((i * 37 + t * 20) % (renderW)) + offsetX + drift;
              const sy = ((i * 91 + t * fallSpeed * 10) % (renderH)) + offsetY_Rain;
              
              const size = (i % 3) + 2; 
              
              ctx.moveTo(sx, sy);
              ctx.arc(sx, sy, size, 0, Math.PI*2);
          }
          ctx.fill();
      }

      ctx.restore();
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
        texture: CanvasPattern | null,
        windSpeed: number,
        animState: { phase: string, bobberX: number, bobberY: number }
    ) => {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);
        const s = 1.0; 
        ctx.scale(s, s);

        // --- SMOKE LOGIC ---
        // Funnel Top Center relative to ship center
        // Fixed: Adjusted to -75 to align with visual top of black funnel cap
        const funnelX = -2;
        const funnelY = -75;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        
        // Use Puffs for wind <= 20, Stream for wind > 20
        if (windSpeed <= 20) {
            // MODE 1: Puffs (Low/Medium Wind)
            const puffCount = 4;
            for(let i=0; i < puffCount; i++) {
                const cycleDuration = 3.0; 
                const puffTime = (t * 1.5 + i * (cycleDuration / puffCount)) % cycleDuration;
                
                // Drift Left (Negative X)
                const driftX = -(windSpeed * 3) * puffTime; 
                const riseY = -25 * puffTime;
                
                const alpha = Math.max(0, 1 - puffTime / 1.5);
                const scale = 1 + puffTime * 1.5;
                
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                // Ensure origin is exactly centered (funnelX) and drift applies over time
                ctx.arc(funnelX + driftX, funnelY + riseY, 6 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // MODE 2: Continuous Stream (High Wind)
            // Stream extends to the LEFT
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            
            const points = [];
            const segments = 20;
            const lengthBase = Math.min(250, windSpeed * 4); // Length based on wind
            
            // Generate spine points
            for(let i=0; i<=segments; i++) {
                const progress = i / segments; // 0 to 1
                const x = funnelX - (progress * lengthBase); // Extend Left
                
                // Add wave/turbulence
                const waveAmp = 5 + (progress * 15);
                const waveFreq = 10;
                const waveY = Math.sin(t * 5 + progress * waveFreq) * (progress * 5); // 0 at source
                
                const y = funnelY + waveY - (progress * 20); // Slight rise
                
                // Width grows
                const width = 6 + (progress * 15);
                
                points.push({x, y, w: width});
            }
            
            // Draw Top Edge
            ctx.moveTo(points[0].x, points[0].y - points[0].w/2);
            for(let i=1; i<points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y - points[i].w/2);
            }
            
            // Round Tip Cap (Left side)
            const last = points[points.length-1];
            ctx.arc(last.x, last.y, last.w/2, 1.5 * Math.PI, 0.5 * Math.PI, true);
            
            // Draw Bottom Edge (Backwards)
            for(let i=points.length-1; i>=0; i--) {
                ctx.lineTo(points[i].x, points[i].y + points[i].w/2);
            }
            
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;

        // --- SHIP VECTOR DRAWING (Flat Style) ---
        
        // 1. HULL
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-60, -20); // Top Left Deck
        ctx.lineTo(60, -20);  // Top Right Deck (Bow)
        // Bow Curve
        ctx.quadraticCurveTo(75, -20, 65, 10);
        ctx.lineTo(50, 25);
        ctx.lineTo(-50, 25);
        // Stern Curve
        ctx.quadraticCurveTo(-65, 10, -60, -20);
        ctx.fill();
        
        // 2. RED STRIPE (Bottom)
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(-50, 25);
        ctx.lineTo(50, 25);
        ctx.lineTo(58, 17); // Waterline approx
        ctx.lineTo(-58, 17);
        ctx.fill();

        // 3. CABIN
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-45, -50, 65, 30); // Main block
        
        // 4. WINDOWS (Blue Circles)
        ctx.fillStyle = '#5DADE2';
        ctx.beginPath(); ctx.arc(-30, -35, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(-12, -35, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(6, -35, 6, 0, Math.PI*2); ctx.fill();

        // 5. FUNNEL
        const fx = -12; 
        const fy = -50;
        const fw = 14;
        const fh = 20;
        
        // Funnel Body (Red)
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(fx, fy - fh, fw, fh);
        
        // Funnel Top (Black)
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(fx - 1, fy - fh - 5, fw + 2, 5);

        // 6. FLAG (Red, Facing Left)
        ctx.fillStyle = '#C0392B';
        ctx.beginPath();
        ctx.moveTo(-45, -50); // Mast base on cabin
        ctx.lineTo(-45, -70); // Mast top
        ctx.lineTo(-65, -60); // Flag Tip (Left)
        ctx.lineTo(-45, -50); 
        ctx.fill();
        
        // Mast Line
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-45, -50);
        ctx.lineTo(-45, -70);
        ctx.stroke();

        // 7. ANCHOR ICON (Visual on Bow)
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const ax = 45; 
        const ay = 0;
        // Shank
        ctx.moveTo(ax, ay - 8);
        ctx.lineTo(ax, ay + 5);
        // Arms
        ctx.moveTo(ax - 4, ay + 2);
        ctx.quadraticCurveTo(ax, ay + 8, ax + 4, ay + 2);
        // Ring
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ax, ay - 10, 2, 0, Math.PI*2);
        ctx.stroke();


        // --- FISHING ROD ---
        if (fishing || fishColor) {
            ctx.strokeStyle = '#7F8C8D';
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Rod Base (Deck)
            ctx.moveTo(35, -20);
            // Rod Tip
            ctx.lineTo(45, -30);
            ctx.stroke();
            
            // Line & Bobber
            if (!caughtFishColor) {
                // Determine Line End Point
                const bobberX = animState.bobberX;
                const bobberY = animState.bobberY;

                // Draw Line
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(45, -30); // Rod Tip

                // If fishing (waiting), add slack curve
                if (animState.phase === 'FISHING') {
                   ctx.quadraticCurveTo(45 + (bobberX - 45)/2, bobberY + 20, bobberX, bobberY);
                } else {
                   ctx.lineTo(bobberX, bobberY); 
                }
                ctx.stroke();

                // Draw Bobber (Red circle)
                ctx.fillStyle = '#E74C3C';
                ctx.beginPath();
                ctx.arc(bobberX, bobberY, 4, 0, Math.PI*2);
                ctx.fill();
            }
        }
        
        // Caught Fish Overlay
        if (caughtFishColor) {
             // Line tight to water
             ctx.strokeStyle = '#FFFFFF';
             ctx.lineWidth = 1.5;
             ctx.beginPath();
             ctx.moveTo(45, -30);
             ctx.lineTo(60, 15);
             ctx.stroke();
             
             // Fish hanging
             ctx.fillStyle = fishColor;
             ctx.beginPath();
             ctx.ellipse(60, 15, 8, 5, Math.PI/2, 0, Math.PI*2);
             ctx.fill();
        }

        ctx.restore();
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
        cancelAnimationFrame(animationFrameId);
    };
  }, [tilt, atmosphere, isFishing, caughtFishColor]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none" ref={containerRef} onPointerDown={handlePointerDown}>
      <canvas 
        ref={canvasRef} 
        width={window.innerWidth} 
        height={window.innerHeight}
        className={`block w-full h-full ${isFishing ? 'pointer-events-auto cursor-crosshair' : ''}`}
      />
    </div>
  );
};

export default SimulationCanvas;