import React, { useRef, useEffect } from 'react';
import { ShipState, AtmosphereState } from '../types';
import {
  createNordicOceanRenderer,
  SCENE_WIDTH,
  SCENE_HEIGHT,
  ROD_TIP_X,
  ROD_TIP_Y,
} from './NordicOceanRenderer';

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
  caughtFishColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef(createNordicOceanRenderer());
  const readyRef = useRef(false);
  const latestRef = useRef({ tilt, atmosphere, isFishing, caughtFishColor });
  latestRef.current = { tilt, atmosphere, isFishing, caughtFishColor };

  const shipRef = useRef<ShipState & { targetAngle: number }>({
    x: SCENE_WIDTH * 0.44,
    y: SCENE_HEIGHT * 0.69,
    angle: 0,
    targetAngle: 0,
    velocityX: 0,
    velocityY: 0,
  });

  const fishingAnimRef = useRef({
    phase: 'IDLE' as 'IDLE' | 'CASTING' | 'FISHING' | 'REELING',
    phaseStartTime: 0,
    lastCycleTime: 0,
    targetDist: 140,
    startDist: 0,
    bobberX: ROD_TIP_X,
    bobberY: ROD_TIP_Y,
  });

  const timeRef = useRef(0);
  const wavePhaseRef = useRef(0);
  const lightningRef = useRef(0);

  // Tap / Click on bobber to reel in (preserves 60px hit radius)
  const handleHitTest = (clientX: number, clientY: number) => {
    if (!latestRef.current.isFishing || fishingAnimRef.current.phase !== 'FISHING' || !readyRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = rendererRef.current.screenToScene(clientX, clientY, canvas);
    const ship = shipRef.current;
    const anim = fishingAnimRef.current;

    const dx = point.x - ship.x;
    const dy = point.y - ship.y;
    const cos = Math.cos(-ship.angle);
    const sin = Math.sin(-ship.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const dist = Math.hypot(localX - anim.bobberX, localY - anim.bobberY);

    canvas.dataset.lastPointerPoint = `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    canvas.dataset.lastPointerLocal = `${localX.toFixed(2)},${localY.toFixed(2)}`;
    canvas.dataset.lastPointerBobber = `${anim.bobberX.toFixed(2)},${anim.bobberY.toFixed(2)}`;
    canvas.dataset.lastPointerDist = dist.toFixed(2);
    canvas.dataset.lastPointerPhase = anim.phase;

    if (dist < 60) {
      anim.phase = 'REELING';
      anim.phaseStartTime = timeRef.current;
      canvas.dataset.fishingPhase = 'REELING';
    }
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    handleHitTest(event.clientX, event.clientY);
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    handleHitTest(event.clientX, event.clientY);
  };

  useEffect(() => {
    let cancelled = false;
    let animationFrameId = 0;
    let lastNow = 0;
    let frameCount = 0;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    };
    resize();
    window.addEventListener('resize', resize);

    try {
      rendererRef.current.prepare();
      readyRef.current = true;
      canvas.dataset.sceneReady = 'true';
    } catch (err: any) {
      console.error(err);
      canvas.dataset.sceneError = String(err?.message || err);
    }

    const render = (now: number) => {
      if (cancelled || !readyRef.current) return;
      animationFrameId = requestAnimationFrame(render);

      if (document.hidden || !lastNow) {
        lastNow = now;
        return;
      }

      const elapsed = now - lastNow;
      const dt = Math.min(elapsed / 1000, 0.05);
      lastNow = now;
      const step = dt * 60;

      const {
        atmosphere: currentAtmosphere,
        tilt: currentTilt,
        isFishing: fishing,
        caughtFishColor: fishColor,
      } = latestRef.current;

      timeRef.current += dt;
      const t = timeRef.current;

      wavePhaseRef.current += (0.95 + currentAtmosphere.waveSpeed * 2.6) * dt;
      const wavePhase = wavePhaseRef.current;

      if (currentAtmosphere.lightning && Math.random() < dt * 0.35) {
        lightningRef.current = 10;
      }
      if (lightningRef.current > 0) {
        lightningRef.current = Math.max(0, lightningRef.current - dt * 45);
      }

      // --- SHIP TILT & INERTIA PHYSICS ---
      const ship = shipRef.current;
      const DEAD_ZONE = 0.20;
      const absTilt = Math.abs(currentTilt);
      let targetVelX = 0;

      if (absTilt < DEAD_ZONE) {
        ship.velocityX *= Math.pow(0.6, step);
        if (Math.abs(ship.velocityX) < 0.05) ship.velocityX = 0;
      } else {
        const magnitude = absTilt - DEAD_ZONE;
        const sign = Math.sign(currentTilt);
        const MAX_SPEED = 3.2;
        const FORCE_MULTIPLIER = 6.8;
        const rawTarget = sign * magnitude * FORCE_MULTIPLIER;
        targetVelX = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, rawTarget));
        const ACCEL = 1 - Math.pow(1 - 0.06, step);
        ship.velocityX += (targetVelX - ship.velocityX) * ACCEL;
      }

      ship.velocityX *= Math.pow(0.95, step);
      ship.x += ship.velocityX * step;

      const padding = 135;
      if (ship.x < padding) {
        ship.x = padding;
        ship.velocityX *= -0.25;
      }
      if (ship.x > SCENE_WIDTH - padding) {
        ship.x = SCENE_WIDTH - padding;
        ship.velocityX *= -0.25;
      }

      // Buoyancy & pitch from live trochoidal wave row
      const surface = rendererRef.current.getShipSurface(
        ship.x,
        wavePhase,
        currentAtmosphere.waveAmp
      );
      ship.y = surface.y;
      let targetAngle = Math.atan(surface.slope) * 0.78;
      targetAngle += ship.velocityX * 0.016;
      ship.angle += (targetAngle - ship.angle) * (1 - Math.pow(1 - 0.07, step));

      // --- FISHING CAST / WAIT / REEL CYCLE ---
      const anim = fishingAnimRef.current;
      if (!fishing && !fishColor) {
        anim.phase = 'IDLE';
        anim.bobberX = ROD_TIP_X;
        anim.bobberY = ROD_TIP_Y;
      } else if (fishing) {
        if (anim.phase === 'IDLE') {
          anim.phase = 'CASTING';
          anim.phaseStartTime = t;
          anim.lastCycleTime = t;
          anim.targetDist = 90 + Math.random() * 190;
        }
        if (anim.phase === 'FISHING' && t - anim.lastCycleTime > 18.0) {
          anim.phase = 'REELING';
          anim.phaseStartTime = t;
        }

        const endX = ROD_TIP_X + anim.targetDist;
        const bobberSurface = rendererRef.current.getShipSurface(
          ship.x + endX,
          wavePhase,
          currentAtmosphere.waveAmp
        );
        const localWaterY = bobberSurface.y - ship.y - 8;

        if (anim.phase === 'CASTING') {
          const progress = Math.min(1, (t - anim.phaseStartTime) / 0.95);
          anim.bobberX = ROD_TIP_X + (endX - ROD_TIP_X) * progress;
          anim.bobberY =
            ROD_TIP_Y + (localWaterY - ROD_TIP_Y) * progress - Math.sin(progress * Math.PI) * 85;
          if (progress >= 1) {
            anim.phase = 'FISHING';
          }
        } else if (anim.phase === 'FISHING') {
          anim.bobberX = endX;
          anim.bobberY = localWaterY + Math.sin(t * 3.0) * 2.5;
        } else if (anim.phase === 'REELING') {
          const progress = Math.min(1, (t - anim.phaseStartTime) / 1.4);
          anim.bobberX = endX + (ROD_TIP_X - endX) * progress;
          const liftProgress = Math.pow(progress, 5);
          anim.bobberY = localWaterY + (ROD_TIP_Y - localWaterY) * liftProgress;
          if (progress < 0.85) {
            anim.bobberY += Math.sin(t * 26) * 1.4;
          }
          if (progress >= 1) {
            anim.phase = 'CASTING';
            anim.phaseStartTime = t;
            anim.lastCycleTime = t;
            anim.targetDist = 90 + Math.random() * 190;
          }
        }
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      rendererRef.current.draw(ctx, {
        time: t,
        dt,
        ship,
        fishing,
        caughtFishColor: fishColor,
        fishingAnim: anim,
        atmosphere: currentAtmosphere,
        wavePhase,
        lightning: lightningRef.current,
      });

      if (++frameCount % 2 === 0) {
        canvas.dataset.shipX = ship.x.toFixed(1);
        canvas.dataset.shipY = ship.y.toFixed(1);
        canvas.dataset.shipAngle = ship.angle.toFixed(4);
        canvas.dataset.fishingPhase = anim.phase;
        canvas.dataset.bobberX = anim.bobberX.toFixed(1);
        canvas.dataset.bobberY = anim.bobberY.toFixed(1);
      }
    };

    lastNow = performance.now();
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelled = true;
      readyRef.current = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 w-full h-full pointer-events-none"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onMouseDown={handleMouseDown}
    >
      <canvas
        ref={canvasRef}
        className={`block w-full h-full ${isFishing ? 'pointer-events-auto cursor-crosshair' : ''}`}
      />
    </div>
  );
};

export default SimulationCanvas;
