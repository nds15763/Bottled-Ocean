import React, { useRef, useEffect } from 'react';
import { WeatherType } from '../types';

export const PB_PAL = {
  cloud: '#FAF6E8', cloudShade: '#D9D2BC',
  shipBody: '#FAF6E8', shipRed: '#D7392C', shipStack: '#0E0E12', shipWindow: '#5A8FBF',
  ink: '#1A2440', sun: '#E94B2B', sunBig: '#F2B233', moon: '#F0D060', star: '#F0D060',
  oceanDay1: '#5BA8D9', oceanDay2: '#2E5DA5', oceanDay3: '#1B3F7A',
  oceanNight1: '#2D5089', oceanNight2: '#16315E', oceanNight3: '#0A1F45',
  oceanDusk1: '#A861B8', oceanDusk2: '#7B3D8E', oceanDusk3: '#4F2566',
  oceanStorm1: '#5A6E80', oceanStorm2: '#3A4D60', oceanStorm3: '#1F3040',
  oceanRain1: '#6E8AA8', oceanRain2: '#4A6585', oceanRain3: '#2F4666',
  oceanSnow1: '#A8C5DC', oceanSnow2: '#7BA0BD', oceanSnow3: '#52789A',
  skyDayHi: '#7FBEE2', skyDay: '#4FA3D8',
  skyDuskHi: '#F08054', skyDusk: '#E94B2B',
  skyDawnHi: '#F4B98E', skyDawn: '#C8639A',
  skyNightHi: '#142C5E', skyNight: '#0A1738',
  skyStormHi: '#5C6878', skyStorm: '#2A3340',
  skyRainHi: '#9AA8B6', skyRain: '#5C6E80',
  skySnowHi: '#DEE6EE', skySnowDay: '#A6B5C4',
  skySnowNightHi: '#3A485A', skySnowNight: '#1B2735',
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, t));
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(lerp(pa & 255, pb & 255, t));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}

export type PBWeather = 'SUNNY' | 'RAINY' | 'STORM' | 'SNOW';

export function weatherToPB(w: WeatherType): PBWeather {
  switch (w) {
    case WeatherType.RAINY: return 'RAINY';
    case WeatherType.STORM: return 'STORM';
    case WeatherType.SNOW: return 'SNOW';
    default: return 'SUNNY';
  }
}

interface PBSimCanvasProps {
  hour?: number;
  wind?: number;
  weather?: PBWeather;
  fishing?: boolean;
  shipX?: number | null;
  shipScale?: number;
  showShip?: boolean;
  showFishing?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

interface SimState {
  t: number;
  wavePhase: number;
  lightning: number;
  rainbowFade: number;
  ship: { x: number; y: number; angle: number };
  clouds: { x: number; yPct: number; scale: number; type: number }[];
  stars: { x: number; y: number; size: number; op: number }[];
  rain: { x: number; y: number; sp: number; len: number }[];
  snow: { x: number; y: number; sp: number; sz: number; ph: number }[];
  splashes: { x: number; y: number; life: number }[];
  fish: { phase: 'IDLE' | 'CASTING' | 'FISHING' | 'REELING'; startT: number; lastCycle: number; target: number; bx: number; by: number };
}

const PBSimCanvas: React.FC<PBSimCanvasProps> = ({
  hour = 12,
  wind = 4,
  weather = 'SUNNY',
  fishing = false,
  shipX = null,
  shipScale = 1,
  showShip = true,
  showFishing = true,
  width = 874,
  height = 402,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SimState | null>(null);

  // params accessed inside the rAF loop without re-binding
  const paramsRef = useRef({ hour, wind, weather, fishing, shipX, shipScale, showShip, showFishing, width, height });
  paramsRef.current = { hour, wind, weather, fishing, shipX, shipScale, showShip, showFishing, width, height };

  // init state once
  if (!stateRef.current) {
    stateRef.current = {
      t: 0, wavePhase: 0, lightning: 0, rainbowFade: 0,
      ship: { x: shipX == null ? width * 0.5 : shipX, y: height * 0.6, angle: 0 },
      clouds: Array.from({ length: 6 }, (_, i) => ({
        x: i * 180 + Math.random() * 100,
        yPct: 0.04 + Math.random() * 0.30,
        scale: 0.7 + Math.random() * 0.5,
        type: i % 3,
      })),
      stars: Array.from({ length: 80 }, () => ({
        x: Math.random(), y: Math.random() * 0.55,
        size: 1 + Math.random() * 2.2, op: 0.4 + Math.random() * 0.6,
      })),
      rain: Array.from({ length: 240 }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        sp: 14 + Math.random() * 16, len: 10 + Math.random() * 8,
      })),
      snow: Array.from({ length: 90 }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        sp: 0.4 + Math.random() * 1.6, sz: 1.2 + Math.random() * 2.2,
        ph: Math.random() * Math.PI * 2,
      })),
      splashes: [],
      fish: { phase: 'IDLE', startT: 0, lastCycle: 0, target: 120, bx: 50, by: -30 },
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    // grain pattern
    const grain = document.createElement('canvas');
    grain.width = 160; grain.height = 160;
    {
      const g = grain.getContext('2d');
      if (g) {
        const img = g.createImageData(160, 160);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = (Math.random() * 255) | 0;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = (Math.random() * 55) | 0;
        }
        g.putImageData(img, 0, 0);
      }
    }
    const grainPat = ctx.createPattern(grain, 'repeat');

    const drawShip = (
      ctx2: CanvasRenderingContext2D,
      ship: { x: number; y: number; angle: number },
      t: number,
      sc: number,
      windNow: number,
      isStormNow: boolean,
    ) => {
      ctx2.save();
      ctx2.translate(ship.x, ship.y);
      ctx2.rotate(ship.angle);
      ctx2.scale(sc, sc);

      // smoke
      const fx = -2, fy = -42;
      ctx2.fillStyle = 'rgba(250,246,232,0.9)';
      const w2 = isStormNow ? Math.max(windNow, 28) : windNow;
      for (let i = 0; i < 4; i++) {
        const cycle = 2.4;
        const pt = (t * 1.4 + i * (cycle / 4)) % cycle;
        const drift = -(w2 * 2.2) * pt;
        const rise = -16 * pt;
        const a = Math.max(0, 1 - pt / 1.5);
        const ssz = 1 + pt * 1.2;
        ctx2.globalAlpha = a;
        ctx2.beginPath();
        ctx2.arc(fx + drift, fy + rise, 4.5 * ssz, 0, Math.PI * 2);
        ctx2.fill();
      }
      ctx2.globalAlpha = 1;

      // hull
      ctx2.fillStyle = PB_PAL.shipBody;
      ctx2.beginPath();
      ctx2.moveTo(-44, -12); ctx2.lineTo(44, -12);
      ctx2.quadraticCurveTo(54, -12, 46, 8);
      ctx2.lineTo(36, 16); ctx2.lineTo(-36, 16);
      ctx2.quadraticCurveTo(-46, 8, -44, -12);
      ctx2.fill();
      // red bottom
      ctx2.fillStyle = PB_PAL.shipRed;
      ctx2.beginPath();
      ctx2.moveTo(-36, 16); ctx2.lineTo(36, 16); ctx2.lineTo(42, 8); ctx2.lineTo(-42, 8);
      ctx2.fill();
      // cabin
      ctx2.fillStyle = PB_PAL.shipBody;
      ctx2.fillRect(-32, -30, 50, 18);
      // windows
      ctx2.fillStyle = PB_PAL.shipWindow;
      [-22, -10, 2].forEach(wx => {
        ctx2.beginPath(); ctx2.arc(wx, -21, 3.6, 0, Math.PI * 2); ctx2.fill();
      });
      // funnel
      ctx2.fillStyle = PB_PAL.shipRed;
      ctx2.fillRect(-7, -44, 12, 14);
      ctx2.fillStyle = PB_PAL.shipStack;
      ctx2.fillRect(-8, -48, 14, 5);
      // mast & flag
      ctx2.strokeStyle = PB_PAL.ink; ctx2.lineWidth = 1.4;
      ctx2.beginPath(); ctx2.moveTo(-32, -30); ctx2.lineTo(-32, -46); ctx2.stroke();
      ctx2.fillStyle = PB_PAL.shipRed;
      ctx2.beginPath();
      ctx2.moveTo(-32, -46); ctx2.lineTo(-46, -40); ctx2.lineTo(-32, -34);
      ctx2.fill();
      // anchor doodle on bow
      ctx2.strokeStyle = PB_PAL.ink; ctx2.lineWidth = 1.2; ctx2.lineCap = 'round';
      ctx2.beginPath();
      ctx2.moveTo(28, -3); ctx2.lineTo(28, 5);
      ctx2.moveTo(24, 3); ctx2.quadraticCurveTo(28, 8, 32, 3);
      ctx2.moveTo(25, -1); ctx2.lineTo(31, -1);
      ctx2.stroke();
      ctx2.beginPath(); ctx2.arc(28, -6, 1.4, 0, Math.PI * 2); ctx2.stroke();

      ctx2.restore();
    };

    const drawFishing = (
      ctx2: CanvasRenderingContext2D,
      ship: { x: number; y: number; angle: number },
      f: SimState['fish'],
      sc: number,
    ) => {
      if (f.phase === 'IDLE') return;
      ctx2.save();
      ctx2.translate(ship.x, ship.y);
      ctx2.rotate(ship.angle);
      ctx2.scale(sc, sc);
      // rod
      ctx2.strokeStyle = PB_PAL.ink; ctx2.lineWidth = 1.4;
      ctx2.beginPath(); ctx2.moveTo(28, -12); ctx2.lineTo(50, -30); ctx2.stroke();
      // line
      ctx2.strokeStyle = 'rgba(250,246,232,0.95)'; ctx2.lineWidth = 1;
      ctx2.beginPath();
      ctx2.moveTo(50, -30);
      if (f.phase === 'FISHING') {
        ctx2.quadraticCurveTo(50 + (f.bx - 50) / 2, f.by + 18, f.bx, f.by);
      } else {
        ctx2.lineTo(f.bx, f.by);
      }
      ctx2.stroke();
      // bobber
      ctx2.fillStyle = PB_PAL.shipRed;
      ctx2.beginPath(); ctx2.arc(f.bx, f.by, 3.2, 0, Math.PI * 2); ctx2.fill();
      // caught fish flash on reel
      if (f.phase === 'REELING' && f.by < -10) {
        ctx2.save();
        ctx2.translate(f.bx, f.by + 6);
        ctx2.fillStyle = PB_PAL.shipRed;
        ctx2.beginPath(); ctx2.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2); ctx2.fill();
        ctx2.beginPath();
        ctx2.moveTo(8, 0); ctx2.lineTo(14, -4); ctx2.lineTo(14, 4); ctx2.closePath(); ctx2.fill();
        ctx2.fillStyle = PB_PAL.ink;
        ctx2.beginPath(); ctx2.arc(-4, -1, 0.9, 0, Math.PI * 2); ctx2.fill();
        ctx2.restore();
      }
      ctx2.restore();
    };

    const tick = () => {
      const s = stateRef.current!;
      const p = paramsRef.current;
      const W = canvas.width, H = canvas.height;
      s.t += 0.016;
      const t = s.t;

      const isStorm = p.weather === 'STORM';
      const isRainy = p.weather === 'RAINY';
      const isSnow = p.weather === 'SNOW';
      const effWind = isStorm ? Math.max(p.wind, 28) : p.wind;
      const waveAmp = isStorm ? Math.max(20, effWind * 1.0) : Math.max(0.5, p.wind * 0.8);
      const waveSpeed = 0.05 + (effWind / 50) * 1.15 + (isStorm ? 0.4 : 0);
      s.wavePhase += waveSpeed * 0.05;

      if (isStorm && Math.random() < 0.006) s.lightning = 9;
      if (s.lightning > 0) s.lightning--;

      const isDeepNight = p.hour < 5 || p.hour >= 20;
      const isDawn = p.hour >= 5 && p.hour < 7;
      const isDay = p.hour >= 7 && p.hour < 17;
      const isDusk = p.hour >= 17 && p.hour < 20;

      // sky colors
      let sky1: string, sky2: string;
      if (isStorm) {
        if (isDeepNight) { sky1 = lerpHex(PB_PAL.skyStormHi, '#1A1F28', 0.6); sky2 = lerpHex(PB_PAL.skyStorm, '#0A0E14', 0.6); }
        else { sky1 = PB_PAL.skyStormHi; sky2 = PB_PAL.skyStorm; }
      } else if (isRainy) {
        if (isDeepNight) { sky1 = lerpHex(PB_PAL.skyRainHi, '#202A36', 0.5); sky2 = lerpHex(PB_PAL.skyRain, '#0F1620', 0.5); }
        else { sky1 = PB_PAL.skyRainHi; sky2 = PB_PAL.skyRain; }
      } else if (isSnow) {
        if (isDeepNight) { sky1 = PB_PAL.skySnowNightHi; sky2 = PB_PAL.skySnowNight; }
        else { sky1 = PB_PAL.skySnowHi; sky2 = PB_PAL.skySnowDay; }
      } else if (isDeepNight) { sky1 = PB_PAL.skyNightHi; sky2 = PB_PAL.skyNight; }
      else if (isDawn) { const k = (p.hour - 5) / 2; sky1 = lerpHex(PB_PAL.skyDawnHi, PB_PAL.skyDayHi, k); sky2 = lerpHex(PB_PAL.skyDawn, PB_PAL.skyDay, k); }
      else if (isDay) { sky1 = PB_PAL.skyDayHi; sky2 = PB_PAL.skyDay; }
      else { const k = (p.hour - 17) / 3; sky1 = lerpHex(PB_PAL.skyDuskHi, PB_PAL.skyNightHi, k); sky2 = lerpHex(PB_PAL.skyDusk, PB_PAL.skyNight, k); }

      if (s.lightning > 5) { sky1 = '#FFFFFF'; sky2 = '#C8D0DA'; }

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, sky1); grad.addColorStop(1, sky2);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

      // stars
      if (isDeepNight && !isStorm && !isRainy) {
        ctx.fillStyle = PB_PAL.star;
        s.stars.forEach((st, i) => {
          const sx = st.x * W, sy = st.y * H * 0.7;
          const tw = 0.7 + Math.sin(t * 2 + i) * 0.3;
          ctx.globalAlpha = (isSnow ? st.op * 0.5 : st.op) * tw;
          ctx.beginPath();
          ctx.moveTo(sx, sy - st.size);
          ctx.lineTo(sx + st.size * 0.4, sy - st.size * 0.4);
          ctx.lineTo(sx + st.size, sy);
          ctx.lineTo(sx + st.size * 0.4, sy + st.size * 0.4);
          ctx.lineTo(sx, sy + st.size);
          ctx.lineTo(sx - st.size * 0.4, sy + st.size * 0.4);
          ctx.lineTo(sx - st.size, sy);
          ctx.lineTo(sx - st.size * 0.4, sy - st.size * 0.4);
          ctx.closePath(); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // sun / moon helpers
      const drawSunCoral = (cx: number, cy: number, r: number) => {
        // Rotating dashed sun rays — 8 spokes that slowly turn over time.
        ctx.save();
        ctx.strokeStyle = PB_PAL.sun;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + t * 0.1;
          ctx.moveTo(cx + Math.cos(ang) * (r + 6), cy + Math.sin(ang) * (r + 6));
          ctx.lineTo(cx + Math.cos(ang) * (r + 26), cy + Math.sin(ang) * (r + 26));
        }
        ctx.stroke();
        ctx.restore();
        // Sun body — gentle breathing
        ctx.fillStyle = PB_PAL.sun;
        const rb = r + Math.sin(t * 2) * 2;
        ctx.beginPath(); ctx.arc(cx, cy, rb, 0, Math.PI * 2); ctx.fill();
      };
      const drawSunBig = (cx: number, cy: number, r: number) => {
        ctx.fillStyle = PB_PAL.sunBig; ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      };
      const drawCrescent = (cx: number, cy: number, r: number) => {
        ctx.fillStyle = PB_PAL.moon;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = sky2;
        ctx.beginPath(); ctx.arc(cx + r * 0.45, cy - r * 0.25, r * 0.92, 0, Math.PI * 2); ctx.fill();
      };

      const showSun = !isStorm && !isRainy && p.hour >= 5 && p.hour <= 19;
      const showMoon = isDeepNight && !isStorm && !isRainy;
      if (showSun) {
        const k = (p.hour - 5) / 14;
        const cx = W * k;
        const cy = H - Math.sin(k * Math.PI) * (H * 0.55) - H * 0.12;
        if (isSnow) { ctx.globalAlpha = 0.55; drawSunBig(cx, cy, 28); ctx.globalAlpha = 1; }
        else if (isDusk || isDawn) drawSunBig(cx, cy, 38);
        else drawSunCoral(cx, cy, 22);
      }
      if (showMoon) {
        const k = p.hour >= 18 ? (p.hour - 18) / 12 : (p.hour + 6) / 12;
        const cx = W * k;
        const cy = H - Math.sin(k * Math.PI) * (H * 0.55) - H * 0.15;
        if (isSnow) { ctx.globalAlpha = 0.7; drawCrescent(cx, cy, 22); ctx.globalAlpha = 1; }
        else drawCrescent(cx, cy, 22);
      }

      // rainbow occasional
      const wantRainbow = !isStorm && !isRainy && p.weather === 'SUNNY' && p.hour >= 8 && p.hour <= 17 && Math.sin(t * 0.05) > 0.92;
      s.rainbowFade = lerp(s.rainbowFade, wantRainbow ? 1 : 0, 0.04);
      if (s.rainbowFade > 0.02) {
        ctx.save();
        const cx = W * 0.5, cy = H * 1.0, r = W * 0.55;
        const cs = ['#D7392C', '#E27430', '#E8A92F', '#3F7E3A', '#2A5DA8', '#3A2C7A'];
        ctx.lineWidth = 8; ctx.globalAlpha = 0.65 * s.rainbowFade;
        cs.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r - i * 9, Math.PI, 0); ctx.stroke(); });
        ctx.restore();
      }

      // clouds
      let cloudFill: string;
      if (isStorm) cloudFill = isDeepNight ? '#3A4250' : '#6E7A88';
      else if (isRainy) cloudFill = isDeepNight ? '#4A5460' : '#8E97A2';
      else if (isSnow) cloudFill = isDeepNight ? '#5A6878' : '#E2E7EC';
      else cloudFill = PB_PAL.cloud;
      const windFactor = effWind / 12;
      s.clouds.forEach(c => {
        c.x -= 0.15 + windFactor * 0.7;
        if (c.x < -220) c.x = W + 200;
        const cx = c.x, cy = c.yPct * H;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(c.scale, c.scale);
        ctx.fillStyle = cloudFill;
        if (c.type === 0) {
          ctx.beginPath();
          ctx.ellipse(0, 8, 22, 12, 0, 0, Math.PI * 2);
          ctx.ellipse(24, -2, 26, 16, 0, 0, Math.PI * 2);
          ctx.ellipse(50, 6, 22, 12, 0, 0, Math.PI * 2);
          ctx.ellipse(28, 12, 32, 9, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (c.type === 1) {
          ctx.beginPath();
          ctx.ellipse(-5, 4, 18, 10, 0, 0, Math.PI * 2);
          ctx.ellipse(20, -6, 24, 14, 0, 0, Math.PI * 2);
          ctx.ellipse(48, 2, 20, 11, 0, 0, Math.PI * 2);
          ctx.ellipse(20, 8, 28, 7, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2);
          ctx.ellipse(36, -12, 28, 16, 0, 0, Math.PI * 2);
          ctx.ellipse(60, 2, 26, 14, 0, 0, Math.PI * 2);
          ctx.ellipse(30, 12, 40, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = isStorm ? '#1F2530' : PB_PAL.cloudShade;
        ctx.globalAlpha = isStorm ? 0.45 : 0.35;
        ctx.beginPath(); ctx.ellipse(20, 12, 30, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      });

      // lightning
      if (s.lightning > 4) {
        ctx.save();
        ctx.strokeStyle = '#FFE89A'; ctx.lineWidth = 2.4; ctx.shadowBlur = 18; ctx.shadowColor = '#FFE89A';
        ctx.beginPath();
        let lx = Math.random() * W, ly = 0;
        ctx.moveTo(lx, ly);
        while (ly < H * 0.6) { lx += (Math.random() - 0.5) * 40; ly += Math.random() * 40; ctx.lineTo(lx, ly); }
        ctx.stroke();
        ctx.lineWidth = 1.2; ctx.beginPath();
        let bx = lx, by = ly;
        ctx.moveTo(bx, by);
        for (let k = 0; k < 5; k++) { bx += (Math.random() - 0.5) * 30; by += Math.random() * 15; ctx.lineTo(bx, by); }
        ctx.stroke();
        ctx.restore();
      }

      // ocean — three layers
      const oceanY = H * 0.62;
      let l1: string, l2: string, l3: string;
      if (isStorm) { l1 = PB_PAL.oceanStorm1; l2 = PB_PAL.oceanStorm2; l3 = PB_PAL.oceanStorm3; }
      else if (isRainy) { l1 = PB_PAL.oceanRain1; l2 = PB_PAL.oceanRain2; l3 = PB_PAL.oceanRain3; }
      else if (isSnow) { l1 = PB_PAL.oceanSnow1; l2 = PB_PAL.oceanSnow2; l3 = PB_PAL.oceanSnow3; }
      else if (isDeepNight) { l1 = PB_PAL.oceanNight1; l2 = PB_PAL.oceanNight2; l3 = PB_PAL.oceanNight3; }
      else if (isDusk) { l1 = PB_PAL.oceanDusk1; l2 = PB_PAL.oceanDusk2; l3 = PB_PAL.oceanDusk3; }
      else { l1 = PB_PAL.oceanDay1; l2 = PB_PAL.oceanDay2; l3 = PB_PAL.oceanDay3; }

      const layers = [
        { c: l1, off: 0, ampMult: 1.0, sp: 0.8 },
        { c: l2, off: 22, ampMult: 1.2, sp: 1.0 },
        { c: l3, off: 48, ampMult: 1.0, sp: 1.25 },
      ];
      layers.forEach((L, i) => {
        ctx.fillStyle = L.c;
        ctx.beginPath();
        const baseY = oceanY + L.off;
        const phase = s.wavePhase * L.sp + i;
        const freq = 0.0028;
        ctx.moveTo(-10, H);
        ctx.lineTo(-10, baseY);
        for (let x = -10; x <= W + 10; x += 8) {
          let y = baseY + Math.sin(x * freq + phase) * waveAmp * L.ampMult;
          if (isStorm) y += Math.sin(x * 0.018 + phase * 1.6) * waveAmp * 0.4;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W + 10, H); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = -10; x <= W + 10; x += 8) {
          let y = baseY + Math.sin(x * freq + phase) * waveAmp * L.ampMult;
          if (isStorm) y += Math.sin(x * 0.018 + phase * 1.6) * waveAmp * 0.4;
          if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // streaks drift with wind
        const streakDrift = (0.6 + (effWind / 50) * 7) * L.sp;
        const streakOffset = s.t * streakDrift * 60;
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        for (let k = 0; k < 14; k++) {
          let sx = ((k * 73 - streakOffset) % (W + 40) + (W + 40)) % (W + 40) - 20;
          const sy = baseY + 14 + L.off * 0.3 + (k % 3) * 8 + Math.sin(sx * freq + phase) * waveAmp * L.ampMult;
          ctx.fillRect(sx, sy, 10, 1.6);
        }
        ctx.fillStyle = 'rgba(20,30,60,0.18)';
        for (let k = 0; k < 14; k++) {
          let sx = ((k * 97 - streakOffset * 1.1) % (W + 40) + (W + 40)) % (W + 40) - 20;
          const sy = baseY + 22 + L.off * 0.3 + (k % 3) * 7 + Math.sin(sx * freq + phase) * waveAmp * L.ampMult;
          ctx.fillRect(sx, sy, 8, 1.4);
        }

        if (i === 1 && p.showShip) {
          const ship = s.ship;
          if (p.shipX != null) ship.x = p.shipX; else ship.x = W * 0.5;
          const wp = ship.x * freq + s.wavePhase * L.sp + 1;
          ship.y = baseY + Math.sin(wp) * waveAmp * L.ampMult - 18;
          const slope = waveAmp * L.ampMult * freq * Math.cos(wp);
          ship.angle += (Math.atan(slope) - ship.angle) * 0.1;
          drawShip(ctx, ship, t, p.shipScale, p.wind, isStorm);
          if (p.showFishing) drawFishing(ctx, ship, s.fish, p.shipScale);
        }
      });

      // rain
      if (isRainy || isStorm) {
        const tilt = (isStorm ? effWind : p.wind) * 0.45;
        const dropSpeed = isStorm ? 1.6 : 1.0;
        ctx.strokeStyle = isStorm ? 'rgba(220,232,244,0.85)' : 'rgba(220,232,244,0.65)';
        ctx.lineWidth = isStorm ? 1.6 : 1.2;
        ctx.beginPath();
        s.rain.forEach(r => {
          r.y += r.sp * dropSpeed; r.x -= tilt * 0.3;
          if (r.y > H) {
            if (r.y > oceanY + 10 && Math.random() < 0.18) {
              s.splashes.push({ x: r.x, y: oceanY + 10 + Math.random() * 40, life: 0 });
            }
            r.y = -10; r.x = Math.random() * W;
          }
          if (r.x < -10) r.x = W + 10;
          ctx.moveTo(r.x, r.y);
          ctx.lineTo(r.x - tilt * 0.5, r.y + r.len);
        });
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
        for (let i = s.splashes.length - 1; i >= 0; i--) {
          const sp = s.splashes[i]; sp.life += 0.06;
          ctx.globalAlpha = Math.max(0, 1 - sp.life);
          ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.life * 4, 0, Math.PI); ctx.stroke();
          if (sp.life > 1) s.splashes.splice(i, 1);
        }
        ctx.globalAlpha = 1;
        if (isStorm) {
          ctx.fillStyle = 'rgba(28,36,48,0.18)';
          ctx.fillRect(0, 0, W, H);
        }
      }

      // snow
      if (isSnow) {
        ctx.fillStyle = isDeepNight ? 'rgba(240,244,250,0.85)' : 'rgba(255,255,255,0.92)';
        s.snow.forEach(sn => {
          sn.y += sn.sp;
          sn.x += Math.sin(t * 0.7 + sn.ph) * 0.6 - p.wind * 0.04;
          if (sn.y > H) { sn.y = -5; sn.x = Math.random() * W; }
          if (sn.x < -5) sn.x = W + 5; if (sn.x > W + 5) sn.x = -5;
          ctx.beginPath(); ctx.arc(sn.x, sn.y, sn.sz, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(0, oceanY - 2, W, 4);
      }

      // grain overlay
      if (grainPat) {
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = grainPat;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // fishing state machine
      if (p.fishing && p.showFishing) {
        const f = s.fish;
        if (f.phase === 'IDLE') { f.phase = 'CASTING'; f.startT = t; f.lastCycle = t; f.target = 80 + Math.random() * 200; }
        if (f.phase === 'FISHING' && (t - f.lastCycle) > 4.5) { f.phase = 'REELING'; f.startT = t; }
        if (f.phase === 'CASTING') {
          const pr = Math.min(1, (t - f.startT) / 0.7);
          f.bx = 50 + (f.target) * pr;
          const yBase = -30 + (15 - (-30)) * pr;
          f.by = yBase - Math.sin(pr * Math.PI) * 60;
          if (pr >= 1) f.phase = 'FISHING';
        } else if (f.phase === 'FISHING') {
          f.bx = 50 + f.target;
          f.by = 15 + Math.sin(t * 4) * 2.5;
        } else if (f.phase === 'REELING') {
          const pr = Math.min(1, (t - f.startT) / 1.0);
          f.bx = (50 + f.target) + (50 - (50 + f.target)) * pr;
          f.by = 15 + (-30 - 15) * Math.pow(pr, 8);
          if (pr >= 1) { f.phase = 'CASTING'; f.startT = t; f.lastCycle = t; f.target = 80 + Math.random() * 200; }
        }
      } else {
        s.fish.phase = 'IDLE'; s.fish.bx = 50; s.fish.by = -30;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
};

export default PBSimCanvas;
