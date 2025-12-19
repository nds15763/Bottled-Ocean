
import React, { useRef, useEffect, useState } from 'react';
import { AquariumFish, PlacedDecoration } from '../types';
import { FISH_DB, DECOR_DB } from '../utils/gameData';

interface AquariumCanvasProps {
  fishList: AquariumFish[];
  decorationList: PlacedDecoration[];
  lightRayAlpha?: number;
}

// Helper to pre-load images
const useImagePreloader = (sources: string[]) => {
    const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

    useEffect(() => {
        const loaded: Record<string, HTMLImageElement> = {};
        let count = 0;
        
        sources.forEach(src => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                loaded[src] = img;
                count++;
                if (count === sources.length) {
                    setImages(loaded);
                }
            };
        });
    }, []); // Run once to load all assets
    return images;
};

const AquariumCanvas: React.FC<AquariumCanvasProps> = ({ fishList, decorationList }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Physics & Game State Refs
  const fishesRef = useRef<AquariumFish[]>([]);
  const decorRef = useRef<PlacedDecoration[]>([]);
  const initializedRef = useRef(false);

  // Interaction State
  const interactionRef = useRef<{
      isPressing: boolean;
      x: number;
      y: number;
  }>({ isPressing: false, x: 0, y: 0 });

  // Gather all image sources needed
  const allFishSprites = FISH_DB.map(f => f.spriteUrl);
  const allDecorSprites = DECOR_DB.map(d => d.spriteUrl);
  const loadedImages = useImagePreloader([...allFishSprites, ...allDecorSprites]);

  // Canvas Dimensions - 3x Width, 2x Height
  const getDimensions = () => ({
      width: window.innerWidth * 3.0, 
      height: window.innerHeight * 2.0 
  });

  // Init World (Place Decor)
  useEffect(() => {
      if (initializedRef.current) return;
      
      // Removed auto-generated floating decorations as requested by user
      const newDecor: Decoration[] = [];
      
      decorRef.current = newDecor;
      initializedRef.current = true;
  }, []);

  // Sync Fish & Decor Props
  useEffect(() => {
      const { width, height } = getDimensions();
      
      // Sync Fish
      const newFishes: AquariumFish[] = fishList.map(f => {
          const existing = fishesRef.current.find(ex => ex.instanceId === f.instanceId);
          if (existing) return existing; 
          
          return {
              ...f,
              x: Math.random() * width, 
              y: Math.random() * (height - 300),
              targetX: Math.random() * width,
              targetY: Math.random() * (height - 300),
              speed: 0.5 + Math.random() * 0.5,
              flipX: false,
              state: 'swimming',
              stateStartTime: Date.now()
          };
      });
      fishesRef.current = newFishes;

      // Sync Decor
      decorRef.current = decorationList;
  }, [fishList, decorationList]);

  // Handle Input
  const updatePointer = (e: React.PointerEvent | PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      interactionRef.current.x = e.clientX - rect.left;
      interactionRef.current.y = e.clientY - rect.top;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      interactionRef.current.isPressing = true;
      updatePointer(e);
  };
  
  const handlePointerMove = (e: React.PointerEvent) => {
      if (interactionRef.current.isPressing) updatePointer(e);
  };

  const handlePointerUp = () => {
      interactionRef.current.isPressing = false;
  };

  // --- RENDER LOOP ---
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { width, height } = getDimensions();
    canvas.width = width;
    canvas.height = height;

    let time = 0;
    const bubbles = Array.from({ length: 50 }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 5,
        speed: 1 + Math.random() * 2,
        offset: Math.random() * 100
    }));

    const render = () => {
      time += 0.01;
      
      // 1. Draw Background (Room Style - Wall and Floor)
      
      // Wall Gradient
      const wallH = height - 150;
      const grad = ctx.createLinearGradient(0, 0, 0, wallH);
      grad.addColorStop(0, '#D6EAF8'); // Light Blue Top
      grad.addColorStop(1, '#85C1E9'); // Darker Blue Bottom
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, wallH);

      // Floor (Sand)
      ctx.fillStyle = '#FAE5D3'; // Beige Sand
      ctx.fillRect(0, wallH, width, 150);
      
      // Floor Texture (Dots)
      ctx.fillStyle = 'rgba(211, 84, 0, 0.1)';
      for(let i=0; i<width; i+=40) {
          ctx.beginPath();
          ctx.arc(i, wallH + 20 + (i%3)*10, 3, 0, Math.PI*2);
          ctx.fill();
      }

      // God Rays
      ctx.save();
      for(let i=0; i<5; i++) {
        const rayX = (width/5) * i + Math.sin(time*0.2)*50;
        const rayG = ctx.createLinearGradient(rayX, -100, rayX - 200, height);
        rayG.addColorStop(0, 'rgba(255,255,255,0.15)');
        rayG.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rayG;
        ctx.beginPath();
        ctx.moveTo(rayX - 50, -100);
        ctx.lineTo(rayX + 50, -100);
        ctx.lineTo(rayX - 150, height);
        ctx.lineTo(rayX - 250, height);
        ctx.fill();
      }
      ctx.restore();

      // 2. Draw Decorations (Sorted by Y/Z)
      decorRef.current.forEach(placed => {
          const dbDecor = DECOR_DB.find(d => d.id === placed.decorId);
          if (!dbDecor) return;

          const img = loadedImages[dbDecor.spriteUrl];
          if (img) {
              const scale = placed.scale || 1.0;
              const size = 120 * scale;
              // Simple bobbing for weeds
              const yOff = dbDecor.type === 'weed' ? Math.sin(time*2 + placed.x)*5 : 0;
              
              ctx.save();
              ctx.translate(placed.x, placed.y);
              if (placed.flipped) ctx.scale(-1, 1);
              
              ctx.drawImage(img, -size/2, -size + yOff, size, size);
              
              // Shadow
              ctx.fillStyle = 'rgba(0,0,0,0.1)';
              ctx.beginPath();
              ctx.ellipse(0, yOff + 5, size/3, size/10, 0, 0, Math.PI*2);
              ctx.fill();
              ctx.restore();
          }
      });

      // 3. Draw Fish (Sprites + Procedural Animation)
      fishesRef.current.forEach(fish => {
          let targetX = fish.targetX;
          let targetY = fish.targetY;
          let speedMult = 1.0;

          // Interaction Attraction
          if (interactionRef.current.isPressing) {
              targetX = interactionRef.current.x;
              targetY = interactionRef.current.y;
              
              const dx = targetX - fish.x;
              const dy = targetY - fish.y;
              const dist = Math.hypot(dx, dy);
              if (dist < 100) speedMult = 0.5; // Slow down near food
              else speedMult = 2.0; // Rush to food
          } else {
              // Wander
              const dist = Math.hypot(fish.x - targetX, fish.y - targetY);
              if (dist < 50) {
                  fish.targetX = Math.random() * width;
                  fish.targetY = Math.random() * (height - 200);
              }
          }

          // Move Physics
          const dx = targetX - fish.x;
          const dy = targetY - fish.y;
          const moveAngle = Math.atan2(dy, dx);
          
          fish.x += Math.cos(moveAngle) * fish.speed * speedMult;
          fish.y += Math.sin(moveAngle) * fish.speed * speedMult;

          // Flip Logic (Face direction of movement)
          if (dx > 0) fish.flipX = true; // Right
          if (dx < 0) fish.flipX = false; // Left

          // Draw Sprite with Procedural Animation
          const dbFish = FISH_DB.find(f => f.id === fish.fishId);
          if (dbFish && loadedImages[dbFish.spriteUrl]) {
              const img = loadedImages[dbFish.spriteUrl];
              const { width: w, height: h, animation: anim } = dbFish;
              
              ctx.save();
              ctx.translate(fish.x, fish.y);
              
              // A. Directional Tilt (Up/Down movement)
              // Only tilt if moving horizontally significantly
              const tilt = Math.atan2(dy, Math.abs(dx)) * anim.tiltFactor;
              ctx.rotate(tilt);

              // B. Flip
              if (!fish.flipX) {
                  ctx.scale(-1, 1);
              }
              
              // C. Body Wiggle (Procedural)
              const wiggle = Math.sin(time * anim.wiggleSpeed + fish.stateStartTime) * anim.wiggleAmount;
              ctx.scale(1 + wiggle, 1 - wiggle);

              // D. Idle Bobbing (Procedural)
              const bob = Math.sin(time * anim.bobSpeed + fish.stateStartTime) * anim.bobAmount;
              
              // Draw Image centered
              ctx.drawImage(img, -w/2, -h/2 + bob, w, h);
              
              ctx.restore();
          }
      });

      // 4. Bubbles (Foreground)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      bubbles.forEach(b => {
          b.y -= b.speed;
          b.x += Math.sin(time + b.offset) * 0.5;
          if (b.y < -10) {
              b.y = height + 10;
              b.x = Math.random() * width;
          }
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
          ctx.fill();
      });

      // 5. Interaction Ripple
      if (interactionRef.current.isPressing) {
          const fx = interactionRef.current.x;
          const fy = interactionRef.current.y;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 3;
          const r = 20 + Math.sin(time * 10) * 5;
          ctx.beginPath();
          ctx.arc(fx, fy, r, 0, Math.PI * 2);
          ctx.stroke();
          
          // Food Pellets
          ctx.fillStyle = '#D4AC0D';
          for(let i=0; i<3; i++) {
              ctx.beginPath();
              ctx.arc(fx + Math.sin(time*10+i)*15, fy + Math.cos(time*10+i)*15, 4, 0, Math.PI*2);
              ctx.fill();
          }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [loadedImages]); // Re-start render loop when images load

  return (
    <div 
        ref={containerRef}
        className="absolute inset-0 w-full h-full cursor-pointer overflow-auto no-scrollbar touch-pan-x touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
    >
      <canvas ref={canvasRef} className="block" style={{ touchAction: 'none' }} />
    </div>
  );
};

export default AquariumCanvas;
