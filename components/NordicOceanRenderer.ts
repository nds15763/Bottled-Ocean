import { AtmosphereState, ShipState, WeatherType } from '../types';

export const SCENE_WIDTH = 1600;
export const SCENE_HEIGHT = 900;

// Slender fishing rod tip in boat-local space (ahead and above the sweeping bow)
export const ROD_TIP_X = 96;
export const ROD_TIP_Y = -58;

export interface FishingVisualState {
  phase: 'IDLE' | 'CASTING' | 'FISHING' | 'REELING';
  bobberX: number;
  bobberY: number;
}

export interface OceanRenderState {
  time: number;
  dt: number;
  ship: ShipState;
  fishing: boolean;
  caughtFishColor?: string | null;
  fishingAnim: FishingVisualState;
  atmosphere: AtmosphereState;
  wavePhase: number;
  lightning: number;
}

interface Palette {
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  horizonMist: string;
  sunColor: string;
  sunHalo: string;
  cloudMain: string;
  cloudShadow: string;
  stormBankBack: string;
  stormBankMid: string;
  stormBankFront: string;
  stormBankAlpha: number;
  cliffDark: string;
  cliffLight: string;
  cliffFoliage: string;
  seaHorizon: string;
  seaRidge: string;
  seaBody: string;
  seaTrough: string;
  foamColor: string;
  cabinWindowLit: number; // 0 (day reflection) .. 1 (warm golden interior glow)
  lighthouseBeam: number; // 0 .. 1
  chopMin: number;        // Minimum wave choppiness for this weather
}

const PALETTES: Record<'SUNNY' | 'DUSK' | 'RAINY' | 'STORM' | 'NIGHT' | 'SNOW', Palette> = {
  // Sampled from f04_sunny.png & f00_map.png
  SUNNY: {
    skyTop: '#357CA8',
    skyMid: '#488EB8',
    skyHorizon: '#7FB0CE',
    horizonMist: 'rgba(218, 236, 246, 0.46)',
    sunColor: '#FCE39C',
    sunHalo: 'rgba(252, 229, 164, 0.22)',
    cloudMain: '#F6EEDC',
    cloudShadow: '#E5D6BC',
    stormBankBack: '#466D90',
    stormBankMid: '#567FA2',
    stormBankFront: '#6A93B4',
    stormBankAlpha: 0.0,
    cliffDark: '#234C70',
    cliffLight: '#4F7FA1',
    cliffFoliage: '#1A3B58',
    seaHorizon: '#4986AF',
    seaRidge: '#4E8CB4',
    seaBody: '#2F6E99',
    seaTrough: '#21557B',
    foamColor: '#F3F8FB',
    cabinWindowLit: 0.0,
    lighthouseBeam: 0.0,
    chopMin: 0.12,
  },
  // Sampled from f50_after_rain.png (Golden warm terracotta after-rain dusk)
  DUSK: {
    skyTop: '#8C6850',
    skyMid: '#A57F64',
    skyHorizon: '#C49E80',
    horizonMist: 'rgba(232, 204, 178, 0.34)',
    sunColor: '#FDEBB8',
    sunHalo: 'rgba(253, 226, 168, 0.25)',
    cloudMain: '#DEC7AB',
    cloudShadow: '#C7AE91',
    stormBankBack: '#6E5648',
    stormBankMid: '#7F6555',
    stormBankFront: '#917665',
    stormBankAlpha: 0.0,
    cliffDark: '#203F5C',
    cliffLight: '#496E88',
    cliffFoliage: '#173047',
    seaHorizon: '#2D6282',
    seaRidge: '#3C7596',
    seaBody: '#255675',
    seaTrough: '#193E58',
    foamColor: '#EFE9DE',
    cabinWindowLit: 1.0,
    lighthouseBeam: 0.72,
    chopMin: 0.16,
  },
  // Sampled from f15_wind_rain.png ("要下雨了")
  RAINY: {
    skyTop: '#3C5E80',
    skyMid: '#4C7092',
    skyHorizon: '#7B9AB5',
    horizonMist: 'rgba(196, 214, 228, 0.42)',
    sunColor: '#D6CCB6',
    sunHalo: 'rgba(214, 204, 182, 0.12)',
    cloudMain: '#AEB6BD',
    cloudShadow: '#8E99A4',
    stormBankBack: '#345272',
    stormBankMid: '#416284',
    stormBankFront: '#517396',
    stormBankAlpha: 0.72,
    cliffDark: '#244360',
    cliffLight: '#4B6E8A',
    cliffFoliage: '#1B344C',
    seaHorizon: '#426B8C',
    seaRidge: '#6A93B0',
    seaBody: '#325B7D',
    seaTrough: '#1E3F5C',
    foamColor: '#E9F2F7',
    cabinWindowLit: 0.85,
    lighthouseBeam: 0.55,
    chopMin: 0.66,
  },
  // Sampled from f34_storm_sea.png & f36_lightning.png
  STORM: {
    skyTop: '#36465F',
    skyMid: '#495A75',
    skyHorizon: '#7E8FA4',
    horizonMist: 'rgba(198, 210, 222, 0.48)',
    sunColor: '#B8C0CC',
    sunHalo: 'rgba(184, 192, 204, 0.0)',
    cloudMain: '#7C8B9E',
    cloudShadow: '#606F84',
    stormBankBack: '#2F3E56',
    stormBankMid: '#3E4F6A',
    stormBankFront: '#50627E',
    stormBankAlpha: 0.96,
    cliffDark: '#233A52',
    cliffLight: '#4C6B84',
    cliffFoliage: '#192C40',
    seaHorizon: '#435870',
    seaRidge: '#738CA3',
    seaBody: '#394E66',
    seaTrough: '#223246',
    foamColor: '#F0F5F9',
    cabinWindowLit: 1.0,
    lighthouseBeam: 1.0,
    chopMin: 1.04,
  },
  NIGHT: {
    skyTop: '#142538',
    skyMid: '#1E354D',
    skyHorizon: '#2E4D69',
    horizonMist: 'rgba(110, 146, 175, 0.25)',
    sunColor: '#FAF0CE',
    sunHalo: 'rgba(250, 238, 198, 0.19)',
    cloudMain: '#2C445D',
    cloudShadow: '#20344A',
    stormBankBack: '#122133',
    stormBankMid: '#192C42',
    stormBankFront: '#223952',
    stormBankAlpha: 0.0,
    cliffDark: '#102030',
    cliffLight: '#213B54',
    cliffFoliage: '#0B1724',
    seaHorizon: '#1D3952',
    seaRidge: '#355A7A',
    seaBody: '#18324A',
    seaTrough: '#0F2234',
    foamColor: '#C9DFEE',
    cabinWindowLit: 1.0,
    lighthouseBeam: 1.0,
    chopMin: 0.26,
  },
  SNOW: {
    skyTop: '#5E7F99',
    skyMid: '#7A9AB2',
    skyHorizon: '#B5CAD8',
    horizonMist: 'rgba(238, 245, 250, 0.52)',
    sunColor: '#FFF3CC',
    sunHalo: 'rgba(255, 243, 204, 0.24)',
    cloudMain: '#F2F6F9',
    cloudShadow: '#DAE3EC',
    stormBankBack: '#53728B',
    stormBankMid: '#66859E',
    stormBankFront: '#7B9AB2',
    stormBankAlpha: 0.35,
    cliffDark: '#36546E',
    cliffLight: '#7395AE',
    cliffFoliage: '#284157',
    seaHorizon: '#567B96',
    seaRidge: '#7EA2BC',
    seaBody: '#3F6582',
    seaTrough: '#2B4B66',
    foamColor: '#F7FBFE',
    cabinWindowLit: 0.85,
    lighthouseBeam: 0.5,
    chopMin: 0.26,
  },
};

function parseRgb(color: string): [number, number, number] {
  const c = color.trim();
  if (c.startsWith('#')) {
    const h = c.slice(1);
    if (h.length === 3) {
      return [
        parseInt(h[0] + h[0], 16) || 0,
        parseInt(h[1] + h[1], 16) || 0,
        parseInt(h[2] + h[2], 16) || 0,
      ];
    }
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) {
    return [Number(m[1]) || 0, Number(m[2]) || 0, Number(m[3]) || 0];
  }
  return [0, 0, 0];
}

function parseRgba(color: string): [number, number, number, number] {
  const c = color.trim();
  const m = c.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (m) {
    return [
      Number(m[1]) || 0,
      Number(m[2]) || 0,
      Number(m[3]) || 0,
      m[4] !== undefined ? Number(m[4]) : 1,
    ];
  }
  const [r, g, b] = parseRgb(c);
  return [r, g, b, 1];
}

function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function lerpHex(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = parseRgb(c1);
  const [r2, g2, b2] = parseRgb(c2);
  const r = clampByte(lerpNum(r1, r2, t));
  const g = clampByte(lerpNum(g1, g2, t));
  const b = clampByte(lerpNum(b1, b2, t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function lerpRgba(c1: string, c2: string, t: number): string {
  const [r1, g1, b1, a1] = parseRgba(c1);
  const [r2, g2, b2, a2] = parseRgba(c2);
  const r = clampByte(lerpNum(r1, r2, t));
  const g = clampByte(lerpNum(g1, g2, t));
  const b = clampByte(lerpNum(b1, b2, t));
  const a = Math.max(0, Math.min(1, lerpNum(a1, a2, t)));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

function wrap(v: number, period: number): number {
  return ((v % period) + period) % period;
}

interface CloudDef {
  x: number;
  y: number;
  scale: number;
  speed: number;
  variant: number;
}

interface SplashParticle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  size: number;
}

const WAVE_ROWS = 14;
const HORIZON_Y = 482;
const SHIP_ROW = 7; // Boat sits nested inside mid-sea; rows 8..13 roll in front of its hull!

export function createNordicOceanRenderer() {
  let grainPattern: CanvasPattern | null = null;
  let ready = false;
  let blendPalette: Palette | null = null;
  let currentChop = 0.14;

  // Hand-composed initial cloud layout so top-left title sky opens cleanly
  const clouds: CloudDef[] = [
    { x: 705, y: 118, scale: 1.0, speed: 4.6, variant: 0 },
    { x: 985, y: 224, scale: 0.66, speed: 3.2, variant: 1 },
    { x: 1310, y: 108, scale: 0.92, speed: 4.1, variant: 2 },
    { x: 1810, y: 192, scale: 0.78, speed: 5.4, variant: 0 },
  ];

  const splashes: SplashParticle[] = Array.from({ length: 54 }, () => {
    const maxAge = 0.36 + Math.random() * 0.24;
    return {
      x: Math.random() * SCENE_WIDTH,
      y: HORIZON_Y + 26 + Math.random() * (SCENE_HEIGHT - HORIZON_Y - 38),
      age: Math.random() * maxAge,
      maxAge,
      size: 0.68 + Math.random() * 0.55,
    };
  });

  function computeTransform(cw: number, ch: number) {
    const scale = Math.max(cw / SCENE_WIDTH, ch / SCENE_HEIGHT);
    const offsetX = (cw - SCENE_WIDTH * scale) * 0.5;
    const offsetY = (ch - SCENE_HEIGHT * scale) * 0.48;
    return { scale, offsetX, offsetY };
  }

  function prepare() {
    if (ready) return;
    // Ultra-fine matte gouache / editorial film grain (subtle 2.5% alpha, zero harshness)
    const gc = document.createElement('canvas');
    gc.width = 160;
    gc.height = 160;
    const gctx = gc.getContext('2d')!;
    const img = gctx.createImageData(160, 160);
    let s = 192837465;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const v = (s >>> 24) & 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 9; // Delicate ~3.5% matte grain
    }
    gctx.putImageData(img, 0, 0);
    grainPattern = gctx.createPattern(gc, 'repeat');
    ready = true;
  }

  function selectTargetPalette(a: AtmosphereState): Palette {
    const h = a.localHour;
    const isNight = a.type === WeatherType.NIGHT || !a.isDay || h >= 20 || h < 5;
    if (a.type === WeatherType.STORM) return PALETTES.STORM;
    if (a.type === WeatherType.RAINY) return PALETTES.RAINY;
    if (a.type === WeatherType.SNOW) return PALETTES.SNOW;
    if (isNight) return PALETTES.NIGHT;
    if ((h >= 17 && h < 20) || (h >= 5 && h < 6.6)) return PALETTES.DUSK;
    return PALETTES.SUNNY;
  }

  function stepAtmosphereBlend(a: AtmosphereState, dt: number): Palette {
    const target = selectTargetPalette(a);
    const windChop = Math.min(1, a.windSpeed / 38);
    const targetChop = Math.max(target.chopMin, windChop * 0.92 + 0.1);

    if (!blendPalette) {
      blendPalette = { ...target };
      currentChop = targetChop;
      return blendPalette;
    }

    const k = Math.min(1, dt * 3.2);
    currentChop = lerpNum(currentChop, targetChop, k);

    blendPalette = {
      skyTop: lerpHex(blendPalette.skyTop, target.skyTop, k),
      skyMid: lerpHex(blendPalette.skyMid, target.skyMid, k),
      skyHorizon: lerpHex(blendPalette.skyHorizon, target.skyHorizon, k),
      horizonMist: lerpRgba(blendPalette.horizonMist, target.horizonMist, k),
      sunColor: lerpHex(blendPalette.sunColor, target.sunColor, k),
      sunHalo: lerpRgba(blendPalette.sunHalo, target.sunHalo, k),
      cloudMain: lerpHex(blendPalette.cloudMain, target.cloudMain, k),
      cloudShadow: lerpHex(blendPalette.cloudShadow, target.cloudShadow, k),
      stormBankBack: lerpHex(blendPalette.stormBankBack, target.stormBankBack, k),
      stormBankMid: lerpHex(blendPalette.stormBankMid, target.stormBankMid, k),
      stormBankFront: lerpHex(blendPalette.stormBankFront, target.stormBankFront, k),
      stormBankAlpha: lerpNum(blendPalette.stormBankAlpha, target.stormBankAlpha, k),
      cliffDark: lerpHex(blendPalette.cliffDark, target.cliffDark, k),
      cliffLight: lerpHex(blendPalette.cliffLight, target.cliffLight, k),
      cliffFoliage: lerpHex(blendPalette.cliffFoliage, target.cliffFoliage, k),
      seaHorizon: lerpHex(blendPalette.seaHorizon, target.seaHorizon, k),
      seaRidge: lerpHex(blendPalette.seaRidge, target.seaRidge, k),
      seaBody: lerpHex(blendPalette.seaBody, target.seaBody, k),
      seaTrough: lerpHex(blendPalette.seaTrough, target.seaTrough, k),
      foamColor: lerpHex(blendPalette.foamColor, target.foamColor, k),
      cabinWindowLit: lerpNum(blendPalette.cabinWindowLit, target.cabinWindowLit, k),
      lighthouseBeam: lerpNum(blendPalette.lighthouseBeam, target.lighthouseBeam, k),
      chopMin: target.chopMin,
    };
    return blendPalette;
  }

  // --- PERSPECTIVE TROCHOIDAL / CUSP WAVE GEOMETRY (Exact crop_wind_sea.png & crop_storm_sea.png!) ---
  function rowBaseY(row: number): number {
    const u = row / (WAVE_ROWS - 1);
    const p = Math.pow(u, 1.42);
    return HORIZON_Y + 5 + p * (SCENE_HEIGHT - HORIZON_Y - 26);
  }

  /**
   * Evaluates row ridge Y and normalized crest sharpness [0..1] at horizontal coordinate x.
   * Uses staggered scalloped Trochoidal Cusps (1 - 2*|sin|^0.74) with ~82px..205px perspective
   * wavelengths so adjacent wave rows interlock like coastal wave scales!
   */
  function evalWaveRow(
    row: number,
    x: number,
    wavePhase: number,
    chop: number
  ): { y: number; peakness: number } {
    const u = row / (WAVE_ROWS - 1);
    const depthScale = 0.22 + 0.78 * Math.pow(u, 0.9);
    const base = rowBaseY(row);

    // Tight horizon chop (~84px) expanding to sculptural foreground swells (~208px)
    const wavelength = 84 + u * 124;
    const k1 = (Math.PI * 2) / wavelength;
    const k2 = k1 * 0.61;
    const speed = 0.78 + u * 0.62;

    // Half-cycle row stagger (row * 2.85) interlocks crests into the troughs behind them!
    const ph1 = wavePhase * speed + row * 2.85;
    const ph2 = -wavePhase * speed * 0.54 + row * 1.93;

    const u1 = x * k1 * 0.5 + ph1 * 0.5;
    const u2 = x * k2 * 0.5 + ph2 * 0.5;

    // Smooth gentle swell (calm water) vs crisp concave-trough trochoidal cusp (wind/rain/storm)
    const s1 = Math.sin(x * k1 + ph1);
    const s2 = Math.sin(x * k2 + ph2);
    const smoothWave = s1 * 0.66 + s2 * 0.34;

    const cusp1 = 1 - 2 * Math.pow(Math.abs(Math.sin(u1)), 0.74);
    const cusp2 = 1 - 2 * Math.pow(Math.abs(Math.sin(u2)), 0.8);
    // Slight low-frequency swell modulation so adjacent crests vary naturally in height
    const env = 0.84 + 0.16 * Math.sin(x * k1 * 0.27 - wavePhase * 0.35 + row * 1.1);
    const cuspWave = (cusp1 * 0.72 + cusp2 * 0.28) * env;

    const cuspBlend = Math.min(1, chop * 1.18);
    const combined = smoothWave * (1 - cuspBlend) + cuspWave * cuspBlend;

    const maxAmp = (2.2 + chop * 19.5) * depthScale;
    const y = base - combined * maxAmp;
    const peakness = Math.max(0, (combined + 0.18) / 1.14);
    return { y, peakness };
  }

  function getShipWaveSurface(shipX: number, wavePhase: number): { y: number; slope: number } {
    const wCenter = evalWaveRow(SHIP_ROW, shipX, wavePhase, currentChop).y;
    const wLeft = evalWaveRow(SHIP_ROW, shipX - 24, wavePhase, currentChop).y;
    const wRight = evalWaveRow(SHIP_ROW, shipX + 24, wavePhase, currentChop).y;
    // Nest boat down so foreground wave rows (8..13) always lap seamlessly across the lower hull waterline
    return {
      y: wCenter + 23,
      slope: (wRight - wLeft) / 48,
    };
  }

  // --- SKY, CELESTIALS & ASYMMETRIC BILLOWING STORM-CLOUD MASSES ---
  function drawSkyAndCelestials(
    ctx: CanvasRenderingContext2D,
    pal: Palette,
    state: OceanRenderState
  ) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 18);
    skyGrad.addColorStop(0, pal.skyTop);
    skyGrad.addColorStop(0.6, pal.skyMid);
    skyGrad.addColorStop(1, pal.skyHorizon);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, SCENE_WIDTH, HORIZON_Y + 24);

    const h = state.atmosphere.localHour;
    const isNight = state.atmosphere.type === WeatherType.NIGHT || !state.atmosphere.isDay || h >= 20 || h < 5;
    const isDusk = !isNight && ((h >= 17 && h < 20) || (h >= 5 && h < 6.6));

    // Pinpoint stars in Night and faint evening stars in Dusk (matching f50_after_rain.png!)
    if (isNight || isDusk) {
      const starAlphaBase = isNight ? 0.8 : 0.3;
      ctx.save();
      ctx.fillStyle = '#FAF2DF';
      for (let i = 0; i < 56; i++) {
        const sx = (i * 193 + 85) % SCENE_WIDTH;
        const sy = ((i * 79 + 22) % (HORIZON_Y - 90)) + 16;
        const twinkle = 0.55 + 0.45 * Math.sin(state.time * 1.8 + i * 2.1);
        ctx.globalAlpha = starAlphaBase * twinkle;
        const r = i % 6 === 0 ? 1.8 : 1.1;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Serene Nordic Sun / Moon with soft concentric translucent halos (NO spiky cartoon rays!)
    const sunX = isDusk ? SCENE_WIDTH * 0.31 : SCENE_WIDTH * 0.56;
    const sunY = isDusk ? HORIZON_Y - 82 : SCENE_HEIGHT * 0.24;

    if (pal.stormBankAlpha < 0.92) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - pal.stormBankAlpha * 0.92);
      ctx.translate(sunX, sunY);

      ctx.fillStyle = pal.sunHalo;
      ctx.beginPath();
      ctx.arc(0, 0, 74, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, 56, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pal.sunColor;
      if (isNight) {
        // Crisp editorial crescent moon with subtle earthshine disc
        ctx.globalAlpha *= 0.16;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = Math.max(0, 1 - pal.stormBankAlpha * 0.92);
        ctx.beginPath();
        ctx.arc(0, 0, 36, Math.PI * 0.22, Math.PI * 1.48, false);
        ctx.quadraticCurveTo(-8, -4, 36 * Math.cos(Math.PI * 0.22), 36 * Math.sin(Math.PI * 0.22));
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 39, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Hand-Composed Asymmetric Billowing Storm-Cloud Banks (exact f15_wind_rain.png & f34_storm_sea.png!)
    // Variable dome widths eliminate mechanical repetition while keeping misty horizon band open for lighthouse beams!
    if (pal.stormBankAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = pal.stormBankAlpha;
      const domeSpans = [255, 145, 315, 175, 275, 155]; // Sum = 1320
      const period = 1320;
      const banks = [
        { yTop: -18, yBase: 168, color: pal.stormBankBack, speed: 5.5, lifts: [48, 22, 64, 28, 52, 18], drops: [22, 12, 28, 14, 24, 10] },
        { yTop: 48, yBase: 248, color: pal.stormBankMid, speed: 9.5, lifts: [36, 56, 24, 62, 30, 48], drops: [18, 26, 14, 24, 16, 22] },
        { yTop: 118, yBase: 318, color: pal.stormBankFront, speed: 14.5, lifts: [54, 26, 46, 20, 58, 32], drops: [24, 14, 22, 12, 26, 16] },
      ];

      for (const b of banks) {
        const shift = wrap(state.time * (b.speed + state.atmosphere.windSpeed * 0.3), period);
        ctx.fillStyle = b.color;
        ctx.beginPath();

        // Build seamlessly tiling asymmetric cumulus vertices across [-period .. SCENE_WIDTH + period]
        const tops: { x0: number; xm: number; ym: number; x1: number; y1: number }[] = [];
        let cursor = -period - shift;
        let segIdx = 0;
        ctx.moveTo(cursor, b.yTop + 10);
        while (cursor < SCENE_WIDTH + period) {
          const k = segIdx % domeSpans.length;
          const w = domeSpans[k];
          const lift = b.lifts[k];
          const nextK = (segIdx + 1) % domeSpans.length;
          const x1 = cursor + w;
          const y1 = b.yTop + (nextK % 2 === 0 ? 12 : 24);
          const xm = cursor + w * 0.48;
          const ym = b.yTop - lift;
          ctx.bezierCurveTo(cursor + w * 0.18, ym, cursor + w * 0.82, ym, x1, y1);
          tops.push({ x0: cursor, xm, ym: b.yBase + b.drops[k], x1, y1: b.yBase - (k % 2 === 0 ? 6 : 14) });
          cursor = x1;
          segIdx++;
        }

        ctx.lineTo(cursor, b.yBase);
        for (let i = tops.length - 1; i >= 0; i--) {
          const seg = tops[i];
          const w = seg.x1 - seg.x0;
          ctx.bezierCurveTo(seg.x0 + w * 0.78, seg.ym, seg.x0 + w * 0.22, seg.ym, seg.x0, seg.y1);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // --- SCULPTURAL FLAT-BOTTOMED EDITORIAL CLOUDS (Exact f04_sunny.png Silhouette!) ---
  function drawSculpturalCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    variant: number,
    mainColor: string,
    shadowColor: string
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Build bold, clean, lineless editorial cloud silhouette with flat/gently-curved base
    const traceCloud = (c: CanvasRenderingContext2D) => {
      c.beginPath();
      if (variant === 0) {
        c.moveTo(-135, 36);
        c.bezierCurveTo(-152, 36, -155, 2, -118, -2);
        c.bezierCurveTo(-112, -36, -68, -46, -42, -28);
        c.bezierCurveTo(-22, -72, 48, -72, 66, -24);
        c.bezierCurveTo(96, -32, 128, -12, 124, 10);
        c.bezierCurveTo(152, 12, 150, 38, 126, 38);
        c.quadraticCurveTo(0, 44, -135, 36);
      } else if (variant === 1) {
        c.moveTo(-105, 28);
        c.bezierCurveTo(-122, 28, -120, 0, -88, -2);
        c.bezierCurveTo(-72, -44, -8, -48, 16, -16);
        c.bezierCurveTo(46, -34, 92, -16, 92, 8);
        c.bezierCurveTo(116, 10, 114, 30, 92, 30);
        c.quadraticCurveTo(0, 34, -105, 28);
      } else {
        c.moveTo(-148, 32);
        c.bezierCurveTo(-165, 32, -162, 6, -128, 4);
        c.bezierCurveTo(-110, -28, -58, -32, -36, -12);
        c.bezierCurveTo(-8, -56, 62, -54, 82, -10);
        c.bezierCurveTo(118, -14, 152, 8, 142, 32);
        c.quadraticCurveTo(0, 38, -148, 32);
      }
      c.closePath();
    };

    ctx.fillStyle = mainColor;
    traceCloud(ctx);
    ctx.fill();

    // Subtle tonal belly plane (matching f15_wind_rain.png & f00_map.png)
    ctx.save();
    traceCloud(ctx);
    ctx.clip();
    ctx.fillStyle = shadowColor;
    ctx.beginPath();
    ctx.ellipse(12, 36, 155, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function drawCloudsAndBirds(ctx: CanvasRenderingContext2D, pal: Palette, state: OceanRenderState) {
    const cloudOpacity = Math.max(0.25, 1 - pal.stormBankAlpha * 0.55);
    ctx.save();
    ctx.globalAlpha = cloudOpacity;
    for (const c of clouds) {
      const span = SCENE_WIDTH + 480;
      const speed = c.speed + state.atmosphere.windSpeed * 0.25;
      const cx = wrap(c.x - state.time * speed + 240, span) - 240;
      drawSculpturalCloud(ctx, cx, c.y, c.scale, c.variant, pal.cloudMain, pal.cloudShadow);
    }
    ctx.restore();

    // Minimalist V-wing coastal gulls gliding in the breeze (exact f04_sunny.png style!)
    const gullCycle = 24;
    const gt = state.time % gullCycle;
    if (gt < 14) {
      ctx.save();
      ctx.strokeStyle = '#F6EFE0';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < 2; i++) {
        const tB = gt - i * 0.6;
        if (tB < 0) continue;
        const bx = SCENE_WIDTH * 0.78 - tB * 58 + i * 38;
        const by = 165 + i * 24 + Math.sin(tB * 1.7 + i) * 9;
        const flap = Math.sin(tB * 5.2 + i * 1.4) * 5.5;
        ctx.globalAlpha = 0.86;
        ctx.beginPath();
        ctx.moveTo(bx - 13, by - 3 + flap);
        ctx.quadraticCurveTo(bx - 5, by - 6 + flap * 0.3, bx, by);
        ctx.quadraticCurveTo(bx + 5, by - 6 + flap * 0.3, bx + 13, by - 3 + flap);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // --- FORKED LIGHTNING IN STORM (Exact f36_lightning.png!) ---
  function drawLightningBolt(ctx: CanvasRenderingContext2D, state: OceanRenderState) {
    if (state.lightning <= 1) return;
    const alpha = Math.min(0.95, state.lightning / 9);
    const seed = Math.floor(state.time * 4);
    const baseX = 180 + ((seed * 317) % (SCENE_WIDTH * 0.65));

    ctx.save();
    // Subtle atmospheric sky glow around bolt
    const flash = ctx.createRadialGradient(baseX, 180, 10, baseX, 220, 520);
    flash.addColorStop(0, `rgba(235, 245, 255, ${alpha * 0.42})`);
    flash.addColorStop(1, 'rgba(235, 245, 255, 0)');
    ctx.fillStyle = flash;
    ctx.fillRect(0, 0, SCENE_WIDTH, HORIZON_Y + 40);

    ctx.strokeStyle = `rgba(248, 252, 255, ${alpha})`;
    ctx.lineWidth = 2.4;
    ctx.shadowColor = '#DCEEFF';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    let lx = baseX;
    let ly = 40;
    ctx.moveTo(lx, ly);
    for (let s = 0; s < 11; s++) {
      const dir = ((seed + s * 13) % 7) - 3;
      lx += dir * 9;
      ly += 36;
      ctx.lineTo(lx, ly);
      // Forked side branch
      if (s === 4 || s === 7) {
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + (dir >= 0 ? 28 : -28), ly + 38);
        ctx.moveTo(lx, ly);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // --- SCULPTURAL NORDIC LIGHTHOUSE CLIFF ISLAND & MISTY HEADLANDS (Exact f04, f15 & crop_boat_lighthouse!) ---
  function drawHorizonIslandsAndLighthouse(
    ctx: CanvasRenderingContext2D,
    pal: Palette,
    state: OceanRenderState
  ) {
    // 1. Far right misty sea-cliff headlands (exact f15_wind_rain.png & crop_wind_sea.png right horizon!)
    const farShift = 1090 + Math.sin(state.time * 0.025) * 18;
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = pal.cliffDark;
    ctx.beginPath();
    ctx.moveTo(farShift, HORIZON_Y + 4);
    ctx.lineTo(farShift + 36, HORIZON_Y - 24);
    ctx.lineTo(farShift + 74, HORIZON_Y - 16);
    ctx.lineTo(farShift + 116, HORIZON_Y - 34);
    ctx.lineTo(farShift + 168, HORIZON_Y - 10);
    ctx.lineTo(farShift + 206, HORIZON_Y + 4);
    ctx.closePath();
    ctx.fill();

    // Even fainter outer archipelago silhouette near right edge
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.moveTo(farShift + 270, HORIZON_Y + 4);
    ctx.lineTo(farShift + 305, HORIZON_Y - 19);
    ctx.lineTo(farShift + 344, HORIZON_Y - 28);
    ctx.lineTo(farShift + 392, HORIZON_Y - 11);
    ctx.lineTo(farShift + 430, HORIZON_Y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Signature Faceted Lighthouse Cliff Island (anchored gently in left horizon parallax like f04 & f34!)
    const ix = 138 + Math.sin(state.time * 0.032) * 22;
    const iy = HORIZON_Y + 4;

    ctx.save();
    ctx.translate(ix, iy);

    // Subtle outlying dark skerry rocks on far left of island (f04_sunny.png!)
    ctx.fillStyle = pal.cliffDark;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.moveTo(-68, 0);
    ctx.lineTo(-46, -14);
    ctx.lineTo(-26, -7);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Main Prussian/slate cliff mass
    ctx.fillStyle = pal.cliffDark;
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(14, -18);
    ctx.lineTo(42, -15);
    ctx.lineTo(62, -36);
    ctx.lineTo(86, -34);
    ctx.lineTo(108, -70);
    ctx.lineTo(140, -74);
    ctx.lineTo(147, -85); // Old watchtower / stone outcrop on left ridge
    ctx.lineTo(155, -85);
    ctx.lineTo(160, -72);
    ctx.lineTo(184, -58);
    ctx.lineTo(204, -76);
    ctx.lineTo(282, -78); // Lighthouse plateau
    ctx.lineTo(314, -54);
    ctx.lineTo(340, -24);
    ctx.lineTo(366, 0);
    ctx.closePath();
    ctx.fill();

    // Sunlit / misty geometric cliff rock facets (exact planar gouache cliff faces in f04, f34 & crop_boat_lighthouse!)
    ctx.fillStyle = pal.cliffLight;
    ctx.beginPath();
    ctx.moveTo(162, 0);
    ctx.lineTo(188, -44);
    ctx.lineTo(216, -38);
    ctx.lineTo(234, -64);
    ctx.lineTo(270, -60);
    ctx.lineTo(298, -40);
    ctx.lineTo(332, 0);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(98, -36);
    ctx.lineTo(128, -26);
    ctx.lineTo(146, 0);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Winding pale limestone cliff path ribbon (subtle nod to crop_boat_lighthouse.png!)
    ctx.strokeStyle = 'rgba(235, 226, 206, 0.34)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(246, -75);
    ctx.bezierCurveTo(212, -58, 256, -42, 228, -22);
    ctx.quadraticCurveTo(218, -10, 238, -2);
    ctx.stroke();

    // Minimalist coastal pine / shrub silhouettes crowning the cliff plateau (crop_boat_lighthouse.png!)
    ctx.fillStyle = pal.cliffFoliage;
    for (const [tx, ty, tr] of [
      [198, -77, 7.5],
      [207, -81, 9],
      [214, -78, 6.5],
      [244, -78, 6.5],
      [274, -78, 7],
      [283, -75, 5.5],
    ]) {
      ctx.beginPath();
      ctx.arc(tx, ty, tr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tiny white keeper's gable house (x: 217..241)
    ctx.fillStyle = '#F2EAD9';
    ctx.fillRect(217, -90, 23, 14);
    // Tiny terracotta chimney on keeper's house
    ctx.fillStyle = '#B84A39';
    ctx.fillRect(221, -99, 4, 6);
    ctx.fillStyle = pal.cliffFoliage;
    ctx.beginPath();
    ctx.moveTo(214, -90);
    ctx.lineTo(228.5, -100);
    ctx.lineTo(243, -90);
    ctx.closePath();
    ctx.fill();
    // Tiny warm windows on keeper's house
    ctx.fillStyle = pal.cabinWindowLit > 0.3 ? '#FAD678' : '#264E70';
    ctx.fillRect(222, -85, 4, 5);
    ctx.fillRect(232, -85, 4, 5);

    // Architectural Coastal Lighthouse (x: 250..268, rising to -128)
    ctx.fillStyle = '#F4ECE0';
    ctx.beginPath();
    ctx.moveTo(250, -77);
    ctx.lineTo(252.5, -118);
    ctx.lineTo(265.5, -118);
    ctx.lineTo(268, -77);
    ctx.closePath();
    ctx.fill();

    // Muted terracotta-red upper band & tiny narrow tower slit windows
    ctx.fillStyle = '#243C54';
    ctx.fillRect(256, -98, 2.5, 5);
    ctx.fillRect(260, -88, 2.5, 5);

    ctx.fillStyle = '#B84A39';
    ctx.beginPath();
    ctx.moveTo(251.8, -104);
    ctx.lineTo(252.5, -117);
    ctx.lineTo(265.5, -117);
    ctx.lineTo(266.2, -104);
    ctx.closePath();
    ctx.fill();

    // Lantern gallery & cupola
    ctx.fillStyle = '#1E3144';
    ctx.fillRect(249, -120, 20, 3);
    ctx.fillStyle = pal.lighthouseBeam > 0.15 ? '#FFF0B8' : '#D8E6F0';
    ctx.fillRect(253, -128, 12, 8);
    ctx.fillStyle = '#1E3144';
    ctx.beginPath();
    ctx.moveTo(251, -128);
    ctx.lineTo(259, -136);
    ctx.lineTo(267, -128);
    ctx.closePath();
    ctx.fill();

    // Volumetric Sweeping Lighthouse Beams in Rain / Storm / Dusk / Night (Exact crop_storm_sea.png!)
    if (pal.lighthouseBeam > 0.05) {
      const lx = 259;
      const ly = -124;
      const pulse = 0.84 + 0.16 * Math.sin(state.time * 1.4);
      const beamAlpha = pal.lighthouseBeam * pulse;
      const sweep = Math.sin(state.time * 0.55) * 0.06;

      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(sweep);

      for (const dir of [-1, 1]) {
        const beamGrad = ctx.createLinearGradient(0, 0, dir * 310, 0);
        beamGrad.addColorStop(0, `rgba(255, 246, 208, ${0.52 * beamAlpha})`);
        beamGrad.addColorStop(0.45, `rgba(235, 243, 250, ${0.2 * beamAlpha})`);
        beamGrad.addColorStop(1, 'rgba(235, 243, 250, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(0, -2.5);
        ctx.lineTo(dir * 315, -30);
        ctx.lineTo(dir * 315, 26);
        ctx.lineTo(0, 2.5);
        ctx.closePath();
        ctx.fill();
      }

      // Warm lantern core glow
      const coreGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
      coreGlow.addColorStop(0, `rgba(255, 245, 198, ${0.88 * beamAlpha})`);
      coreGlow.addColorStop(1, 'rgba(255, 245, 198, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();

    // Soft atmospheric sea-mist veil hugging the horizon & cliff base (exact f04_sunny.png & crop_storm_sea.png!)
    const mistGrad = ctx.createLinearGradient(0, HORIZON_Y - 38, 0, HORIZON_Y + 16);
    mistGrad.addColorStop(0, 'rgba(255,255,255,0)');
    mistGrad.addColorStop(0.66, pal.horizonMist);
    mistGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, HORIZON_Y - 38, SCENE_WIDTH, 54);

    // Animated white surf spray lapping at the cliff base (subtle in calm, lively in storm!)
    ctx.save();
    ctx.fillStyle = pal.foamColor;
    const surfStrength = 0.28 + currentChop * 0.55;
    ctx.globalAlpha = surfStrength;
    for (let s = 0; s < 9; s++) {
      const sx = ix + 6 + s * 41 + Math.sin(state.time * 2.1 + s) * 3;
      const sr = (3.2 + currentChop * 4.5) * (0.7 + 0.3 * Math.sin(state.time * 3.1 + s * 1.7));
      ctx.beginPath();
      ctx.arc(sx, HORIZON_Y + 2, sr, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- MULTI-ROW SCALLOPED CUSP SEA RENDERER (Exact f04 Calm + crop_wind_sea + crop_storm_sea!) ---
  function drawWaveRowsRange(
    ctx: CanvasRenderingContext2D,
    fromRow: number,
    toRow: number,
    pal: Palette,
    state: OceanRenderState
  ) {
    const stepX = 6; // High horizontal resolution so every cusp crest is razor-clean and silky!

    // Base sea fill under horizon if starting at row 0
    if (fromRow === 0) {
      const seaBg = ctx.createLinearGradient(0, HORIZON_Y, 0, SCENE_HEIGHT);
      seaBg.addColorStop(0, pal.seaHorizon);
      seaBg.addColorStop(0.55, pal.seaBody);
      seaBg.addColorStop(1, pal.seaTrough);
      ctx.fillStyle = seaBg;
      ctx.fillRect(0, HORIZON_Y, SCENE_WIDTH, SCENE_HEIGHT - HORIZON_Y);

      // Subtle crisp mist-white horizon line (exact crop_storm_sea.png & f04_sunny.png!)
      ctx.fillStyle = 'rgba(235, 245, 252, 0.38)';
      ctx.fillRect(0, HORIZON_Y, SCENE_WIDTH, 1.5);
    }

    for (let r = fromRow; r <= toRow; r++) {
      const u = r / (WAVE_ROWS - 1);
      const base = rowBaseY(r);
      const nextBase = r < WAVE_ROWS - 1 ? rowBaseY(r + 1) : SCENE_HEIGHT + 16;
      const rowSpan = Math.max(14, nextBase - base);

      const pts: { x: number; y: number; peakness: number }[] = [];
      for (let x = -24; x <= SCENE_WIDTH + 24; x += stepX) {
        const w = evalWaveRow(r, x, state.wavePhase, currentChop);
        pts.push({ x, y: w.y, peakness: w.peakness });
      }

      // 1. Deep Gouache Wave Body Fill (darkens into Prussian trough right before the next foreground wave overlaps it!)
      const rowGrad = ctx.createLinearGradient(0, base - 16, 0, base + rowSpan * 1.15);
      const bodyTop = lerpHex(pal.seaHorizon, pal.seaBody, Math.min(1, 0.25 + u * 0.65));
      const troughDeep = lerpHex(pal.seaBody, pal.seaTrough, Math.min(1, 0.35 + u * 0.65 + currentChop * 0.25));
      rowGrad.addColorStop(0, bodyTop);
      rowGrad.addColorStop(0.52, lerpHex(bodyTop, troughDeep, 0.55));
      rowGrad.addColorStop(1, troughDeep);

      ctx.fillStyle = rowGrad;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, SCENE_HEIGHT + 30);
      ctx.lineTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.lineTo(pts[pts.length - 1].x, SCENE_HEIGHT + 30);
      ctx.closePath();
      ctx.fill();

      // 2. Contoured Lighter Gouache Crest-Face Ribbon (hugs every peak & trough just like crop_wind_sea.png!)
      const faceAlpha = 0.16 + currentChop * 0.42;
      ctx.fillStyle = hexWithAlpha(pal.seaRidge, Math.min(0.62, faceAlpha));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      for (let i = pts.length - 1; i >= 0; i--) {
        const bandH = (2.8 + u * 9.5) * (0.45 + pts[i].peakness * 0.78);
        ctx.lineTo(pts[i].x, pts[i].y + bandH);
      }
      ctx.closePath();
      ctx.fill();

      // 3. Alabaster Foam Lace & Parallel Echo Contour Ripples (scales gracefully from Calm to Storm!)
      if (currentChop > 0.22) {
        const foamStrength = Math.min(1, (currentChop - 0.16) / 0.56) * (0.5 + u * 0.5);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = pal.foamColor;

        // Pass A: Crisp tapered white crest foam peaking on sharp cusp tips (exact crop_storm_sea.png!)
        for (let i = 0; i < pts.length - 1; i++) {
          const p0 = pts[i];
          const p1 = pts[i + 1];
          const pk = (p0.peakness + p1.peakness) * 0.5;
          const threshold = 0.34 - currentChop * 0.22;
          const segAlpha = Math.max(0, (pk - threshold) * 1.65) * foamStrength;
          if (segAlpha <= 0.04) continue;

          ctx.globalAlpha = Math.min(0.96, segAlpha);
          const capBoost = pk > 0.72 ? (pk - 0.72) * 3.4 : 0;
          ctx.lineWidth = (0.85 + pk * 2.25 + capBoost) * (0.52 + u * 0.58);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y + 0.5);
          ctx.lineTo(p1.x, p1.y + 0.5);
          ctx.stroke();

          // Pass B: Signature delicate parallel echo contour lines under peaked crests (crop_storm_sea.png!)
          if (pk > 0.48 && r >= 1) {
            const echo1Offset = 3.6 + u * 3.4;
            ctx.globalAlpha = Math.min(0.55, segAlpha * 0.56);
            ctx.lineWidth = 0.95 + u * 0.5;
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y + echo1Offset);
            ctx.lineTo(p1.x, p1.y + echo1Offset);
            ctx.stroke();

            if (currentChop > 0.56 && pk > 0.62 && r >= 2) {
              const echo2Offset = 7.4 + u * 5.4;
              ctx.globalAlpha = Math.min(0.34, segAlpha * 0.34);
              ctx.lineWidth = 0.8 + u * 0.4;
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y + echo2Offset);
              ctx.lineTo(p1.x, p1.y + echo2Offset);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      } else {
        // Calm Sunny / Dusk Sea: Minimalist scattered scalloped white wavelets ('~^~') & fine glints (f04_sunny.png!)
        if (r >= 1 && r % 2 === 1) {
          const count = 3 + Math.floor(u * 3);
          ctx.save();
          ctx.strokeStyle = pal.foamColor;
          ctx.lineCap = 'round';
          for (let j = 0; j < count; j++) {
            const wx = wrap(j * 410 + r * 175 - state.time * (8 + r * 1.8), SCENE_WIDTH + 160) - 80;
            const wy = evalWaveRow(r, wx, state.wavePhase, currentChop).y + 5 + u * 7;
            const wScale = 0.62 + u * 0.52;
            ctx.globalAlpha = 0.5 + u * 0.25;
            ctx.lineWidth = 1.45 * wScale;

            // Delicate two-cusp minimalist wavelet (exact f04_sunny.png & f50_after_rain.png detail!)
            ctx.beginPath();
            ctx.moveTo(wx - 18 * wScale, wy + 2);
            ctx.quadraticCurveTo(wx - 7 * wScale, wy + 1, wx - 2 * wScale, wy - 3.2 * wScale);
            ctx.quadraticCurveTo(wx + 4 * wScale, wy + 1, wx + 9 * wScale, wy - 1.6 * wScale);
            ctx.quadraticCurveTo(wx + 15 * wScale, wy + 2, wx + 22 * wScale, wy + 2.4);
            ctx.stroke();

            // Tiny echo ripple underneath
            ctx.globalAlpha *= 0.45;
            ctx.lineWidth = 1.0 * wScale;
            ctx.beginPath();
            ctx.moveTo(wx - 10 * wScale, wy + 4.8 * wScale);
            ctx.lineTo(wx + 12 * wScale, wy + 4.8 * wScale);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }

    // Golden Dusk OR Silver Moonlight Water Shimmer Column (exact f50_after_rain.png!)
    const h = state.atmosphere.localHour;
    const isNight =
      state.atmosphere.type === WeatherType.NIGHT || !state.atmosphere.isDay || h >= 20 || h < 5;
    const isDusk =
      !isNight &&
      state.atmosphere.type !== WeatherType.STORM &&
      state.atmosphere.type !== WeatherType.RAINY &&
      ((h >= 17 && h < 20) || (h >= 5 && h < 6.6));
    if ((isDusk || isNight) && fromRow === 0) {
      const shimmerX = isDusk ? SCENE_WIDTH * 0.31 : SCENE_WIDTH * 0.56;
      ctx.save();
      ctx.strokeStyle = isDusk ? '#FCE6B2' : '#E8E4CE';
      ctx.lineCap = 'round';
      for (let s = 0; s < 16; s++) {
        const sy = HORIZON_Y + 8 + s * 11;
        const halfW = (6 + s * 1.8) * (0.75 + 0.25 * Math.sin(state.time * 2.4 + s));
        const drift = Math.sin(state.time * 1.9 + s * 1.3) * 5;
        const maxA = isDusk ? 0.38 : 0.24;
        ctx.globalAlpha = Math.max(0.05, maxA - s * 0.015);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(shimmerX + drift - halfW, sy);
        ctx.lineTo(shimmerX + drift + halfW, sy);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // --- ARCHITECTURAL NORDIC FISHING TRAWLER & FISHERMAN (Inspired by crop_boat_lighthouse.png & f04!) ---
  function drawNordicFishingBoat(
    ctx: CanvasRenderingContext2D,
    pal: Palette,
    state: OceanRenderState
  ) {
    const { ship, time, fishing, caughtFishColor, fishingAnim, atmosphere } = state;

    // 0. Soft dark hull water shadow & delicate bow/stern waterline foam before rotating hull
    ctx.save();
    ctx.fillStyle = 'rgba(10, 24, 38, 0.26)';
    ctx.beginPath();
    ctx.ellipse(ship.x, ship.y + 15, 86, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexWithAlpha(pal.foamColor, 0.52);
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const wakeExtend = Math.abs(ship.velocityX) * 8;
    ctx.moveTo(ship.x - 84 - wakeExtend, ship.y + 11);
    ctx.quadraticCurveTo(ship.x, ship.y + 15, ship.x + 84 + wakeExtend * 0.5, ship.y + 9);
    ctx.stroke();
    ctx.restore();

    // 1. Soft translucent layered chimney smoke puffs (exact f04_sunny.png & f15_wind_rain.png style!)
    const cos = Math.cos(ship.angle);
    const sin = Math.sin(ship.angle);
    const stackLocalX = -22;
    const stackLocalY = -66;
    const stackWorldX = ship.x + stackLocalX * cos - stackLocalY * sin;
    const stackWorldY = ship.y + stackLocalX * sin + stackLocalY * cos;

    ctx.save();
    for (let i = 0; i < 8; i++) {
      const age = (time * 0.38 + i / 8) % 1;
      const r = 4.5 + age * 13;
      const sx = stackWorldX - age * (48 + atmosphere.windSpeed * 1.35);
      const sy = stackWorldY - age * 52 + Math.sin(time * 2.5 + i) * 1.8;
      ctx.fillStyle = '#F2EFE9';
      ctx.globalAlpha = Math.sin(age * Math.PI) * 0.34 * (1 - age * 0.35);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);

    // 2. Slender wooden A-frame masts & architectural rigging stays (crop_boat_lighthouse.png!)
    ctx.strokeStyle = 'rgba(28, 42, 56, 0.78)';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    // Fore stay (main mast top to bow stem)
    ctx.moveTo(-8, -96);
    ctx.lineTo(88, -32);
    // Inner stay to foredeck
    ctx.moveTo(-8, -96);
    ctx.lineTo(24, -20);
    // Back stay (main mast top to stern)
    ctx.moveTo(-8, -96);
    ctx.lineTo(-82, -26);
    // Mizzen stays
    ctx.moveTo(-58, -74);
    ctx.lineTo(-8, -94);
    ctx.moveTo(-58, -74);
    ctx.lineTo(-84, -26);
    ctx.moveTo(-58, -74);
    ctx.lineTo(-40, -20);
    ctx.stroke();

    // Main wooden mast & stern mizzen mast
    ctx.strokeStyle = '#2A394A';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -20);
    ctx.lineTo(-8, -98);
    ctx.stroke();

    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-58, -18);
    ctx.lineTo(-58, -76);
    ctx.stroke();

    // Fluttering muted terracotta-red masthead pennant
    const flagWave = Math.sin(time * 5.2) * 3.2;
    ctx.fillStyle = '#C9533E';
    ctx.beginPath();
    ctx.moveTo(-8, -97);
    ctx.quadraticCurveTo(-20, -95 + flagWave * 0.5, -31, -93 + flagWave);
    ctx.quadraticCurveTo(-19, -89 + flagWave * 0.4, -8, -90);
    ctx.closePath();
    ctx.fill();

    // Tiny warm masthead anchor light (glows softly in rain/storm/dusk/night)
    if (pal.cabinWindowLit > 0.15) {
      const mGlow = ctx.createRadialGradient(-8, -99, 1, -8, -99, 14);
      mGlow.addColorStop(0, `rgba(255, 234, 165, ${0.85 * pal.cabinWindowLit})`);
      mGlow.addColorStop(1, 'rgba(255, 234, 165, 0)');
      ctx.fillStyle = mGlow;
      ctx.beginPath();
      ctx.arc(-8, -99, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Stern Wooden Net Reel / Coiled Gear Detail (exact crop_boat_lighthouse.png!)
    ctx.strokeStyle = '#6D523E';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-66, -24, 9.5, Math.PI, 0);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-66, -33.5);
    ctx.lineTo(-66, -24);
    ctx.moveTo(-72, -31);
    ctx.lineTo(-66, -24);
    ctx.moveTo(-60, -31);
    ctx.lineTo(-66, -24);
    ctx.stroke();
    ctx.fillStyle = '#8C6B50';
    ctx.fillRect(-76, -25, 20, 6);

    // 4. Wheelhouse Cabin (slate-blue architectural cabin + roof signal box + terracotta chimney + golden windows!)
    // Small white roof navigation light box (exact crop_boat_lighthouse.png!)
    ctx.fillStyle = '#F2EBE0';
    ctx.fillRect(-38, -60, 9, 7);
    if (pal.cabinWindowLit > 0.2) {
      ctx.fillStyle = '#FCE29A';
      ctx.fillRect(-35, -58, 3, 3);
    }

    // Terracotta chimney pipe
    ctx.fillStyle = '#B84C39';
    ctx.fillRect(-24, -65, 7.5, 16);
    ctx.fillStyle = '#243342';
    ctx.fillRect(-25, -67, 9.5, 3);

    // Cabin body
    ctx.fillStyle = '#38516A';
    ctx.beginPath();
    ctx.moveTo(-44, -18);
    ctx.lineTo(-42, -50);
    ctx.lineTo(14, -50);
    ctx.lineTo(18, -18);
    ctx.closePath();
    ctx.fill();

    // Sunlit forward cabin wall plane
    ctx.fillStyle = '#476582';
    ctx.beginPath();
    ctx.moveTo(2, -18);
    ctx.lineTo(1, -50);
    ctx.lineTo(14, -50);
    ctx.lineTo(18, -18);
    ctx.closePath();
    ctx.fill();

    // Crisp dark-slate overhanging cabin roof
    ctx.fillStyle = '#203142';
    ctx.beginPath();
    ctx.moveTo(-47, -49);
    ctx.lineTo(18, -49);
    ctx.lineTo(17, -53);
    ctx.lineTo(-46, -53);
    ctx.closePath();
    ctx.fill();

    // Two framed wheelhouse windows (daylight glass vs cozy warm amber light!)
    const winDay = '#234A6B';
    const winNight = '#FAD878';
    const winFill = lerpHex(winDay, winNight, pal.cabinWindowLit);
    for (const wx of [-32, -14]) {
      if (pal.cabinWindowLit > 0.25) {
        const wGlow = ctx.createRadialGradient(wx + 5, -38, 2, wx + 5, -38, 20);
        wGlow.addColorStop(0, `rgba(252, 218, 120, ${0.38 * pal.cabinWindowLit})`);
        wGlow.addColorStop(1, 'rgba(252, 218, 120, 0)');
        ctx.fillStyle = wGlow;
        ctx.beginPath();
        ctx.arc(wx + 5, -38, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#EAE2D0';
      ctx.fillRect(wx - 1, -44, 12, 13);
      ctx.fillStyle = winFill;
      ctx.fillRect(wx + 0.5, -42.5, 9, 10);
    }

    // Small white orange-striped life preserver mounted on cabin side (exact f04_sunny.png detail!)
    ctx.strokeStyle = '#F4ECE0';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(-3, -34, 5.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#C8523E';
    ctx.beginPath();
    ctx.arc(-3, -34, 5.2, -0.4, 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-3, -34, 5.2, Math.PI - 0.4, Math.PI + 0.4);
    ctx.stroke();

    // 5. Minimalist Lineless Protagonist Fisherman in Ochre Jacket on Foredeck (f04 & f34 character!)
    // Dark slate boots/legs
    ctx.fillStyle = '#263647';
    ctx.fillRect(33, -24, 7, 8);
    // Warm ochre-mustard fisherman jacket
    ctx.fillStyle = '#DFA042';
    ctx.beginPath();
    ctx.moveTo(29, -22);
    ctx.quadraticCurveTo(30, -42, 37, -43);
    ctx.quadraticCurveTo(44, -42, 44, -22);
    ctx.closePath();
    ctx.fill();
    // Subtle shoulder pack strap (matching the video protagonist!)
    ctx.strokeStyle = '#6D442A';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(33, -41);
    ctx.lineTo(40, -26);
    ctx.stroke();
    // Neck & face profile facing bow
    ctx.fillStyle = '#ECC5A4';
    ctx.beginPath();
    ctx.arc(38, -48.5, 4.6, 0, Math.PI * 2);
    ctx.fill();
    // Tousled dark hair silhouette
    ctx.fillStyle = '#1E2A38';
    ctx.beginPath();
    ctx.arc(36.5, -50, 4.8, Math.PI * 0.65, Math.PI * 2.05);
    ctx.arc(39.5, -52, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Slender, graceful curved graphite/bamboo fishing rod to (ROD_TIP_X, ROD_TIP_Y)
    ctx.strokeStyle = '#5D4634';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(41, -33);
    ctx.quadraticCurveTo(68, -55, ROD_TIP_X, ROD_TIP_Y);
    ctx.stroke();

    // 6. Sweeping Nordic Wooden Trawler Hull (clean lineless sculptural silhouette!)
    // Main deep slate-navy hull (extends slightly deeper into keel skirt so foreground wave row 8 always laps seamlessly across it!)
    ctx.fillStyle = '#283A4E';
    ctx.beginPath();
    ctx.moveTo(-88, -27); // Sweeping stern sheer
    ctx.quadraticCurveTo(-12, -15, 92, -33); // Graceful upward bow sheer!
    ctx.quadraticCurveTo(85, -3, 66, 20);    // Clean flared bow stem
    ctx.quadraticCurveTo(0, 26, -70, 19);    // Submerged keel skirt
    ctx.quadraticCurveTo(-84, 2, -88, -27);  // Transom stern
    ctx.closePath();
    ctx.fill();

    // Subtle lighter slate forward bow plane
    ctx.fillStyle = '#334960';
    ctx.beginPath();
    ctx.moveTo(28, -21);
    ctx.quadraticCurveTo(62, -25, 92, -33);
    ctx.quadraticCurveTo(85, -3, 66, 20);
    ctx.lineTo(24, 21);
    ctx.closePath();
    ctx.fill();

    // Muted terracotta-rust lower waterline boot-top
    ctx.fillStyle = '#9D4839';
    ctx.beginPath();
    ctx.moveTo(-79, 2);
    ctx.quadraticCurveTo(0, 6, 78, 0);
    ctx.lineTo(66, 20);
    ctx.quadraticCurveTo(0, 26, -70, 19);
    ctx.closePath();
    ctx.fill();

    // Crisp warm alabaster-cream sheer rail & tiny bow hawsehole ring (exact crop_boat_lighthouse.png!)
    ctx.strokeStyle = '#EFE6D4';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(-88, -26.5);
    ctx.quadraticCurveTo(-12, -14.5, 92, -32.5);
    ctx.stroke();

    ctx.strokeStyle = '#EFE6D4';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(68, -20, 3.2, 0, Math.PI * 2);
    ctx.stroke();

    // 7. Delicate Silk Fishing Line & Minimalist Terracotta-Cream Float
    if (fishing || caughtFishColor) {
      if (!caughtFishColor) {
        const bx = fishingAnim.bobberX;
        const by = fishingAnim.bobberY;
        const sag = fishingAnim.phase === 'FISHING' ? 20 : 4;

        ctx.strokeStyle = 'rgba(245, 242, 234, 0.78)';
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.moveTo(ROD_TIP_X, ROD_TIP_Y);
        ctx.quadraticCurveTo((ROD_TIP_X + bx) * 0.5, (ROD_TIP_Y + by) * 0.5 + sag, bx, by);
        ctx.stroke();

        // Delicate concentric elliptical water ripples around resting float
        if (fishingAnim.phase === 'FISHING') {
          for (let r = 0; r < 2; r++) {
            const rp = (time * 0.7 + r * 0.5) % 1;
            ctx.strokeStyle = `rgba(240, 247, 252, ${(1 - rp) * 0.55})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(bx, by + 3.5, 8 + rp * 22, 2.2 + rp * 4.5, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Minimalist two-tone coastal float (cream bottom, muted terracotta top + tiny spindle)
        ctx.fillStyle = '#F4ECE0';
        ctx.beginPath();
        ctx.arc(bx, by, 6.2, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#D45742';
        ctx.beginPath();
        ctx.arc(bx, by, 6.2, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#F4ECE0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx, by - 6);
        ctx.lineTo(bx, by - 11);
        ctx.stroke();
      } else {
        // Caught fish gleaming on the line
        const fx = ROD_TIP_X + 10;
        const fy = -8 + Math.sin(time * 5) * 2.5;
        ctx.strokeStyle = 'rgba(245, 242, 234, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ROD_TIP_X, ROD_TIP_Y);
        ctx.lineTo(fx, fy);
        ctx.stroke();

        ctx.fillStyle = caughtFishColor;
        ctx.beginPath();
        ctx.ellipse(fx, fy + 8, 10, 5.2, Math.PI * 0.48, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Subtle resting line & float gently swaying near the bow in Menu / Zen
      const sx = ROD_TIP_X + Math.sin(time * 1.9) * 2.8;
      const sy = ROD_TIP_Y + 24;
      ctx.strokeStyle = 'rgba(245, 242, 234, 0.65)';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(ROD_TIP_X, ROD_TIP_Y);
      ctx.lineTo(sx, sy);
      ctx.stroke();

      ctx.fillStyle = '#F4ECE0';
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D45742';
      ctx.beginPath();
      ctx.arc(sx, sy, 4.5, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- MULTI-DEPTH RAIN SHEETS & WATER SPLASH CROWNS (Exact f34_storm_sea.png!) ---
  function drawPrecipitationAndSplashes(
    ctx: CanvasRenderingContext2D,
    state: OceanRenderState
  ) {
    const a = state.atmosphere;

    if (a.type === WeatherType.RAINY || a.type === WeatherType.STORM) {
      const isStorm = a.type === WeatherType.STORM;
      const slantX = -19 - a.windSpeed * 0.42;
      const slantY = isStorm ? 54 : 44;

      ctx.save();
      ctx.lineCap = 'round';

      // Layer A: Dense misty background rain sheet (exact f34_storm_sea.png atmospheric downpour!)
      const bgCount = isStorm ? 195 : 92;
      ctx.strokeStyle = isStorm ? 'rgba(222, 236, 248, 0.24)' : 'rgba(218, 234, 246, 0.2)';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      for (let i = 0; i < bgCount; i++) {
        const rx = wrap(i * 61 + (i % 7) * 19 - state.time * (310 + a.windSpeed * 6.5), SCENE_WIDTH + 200) - 100;
        const ry = wrap(i * 97 + (i % 5) * 31 + state.time * (isStorm ? 880 : 660), SCENE_HEIGHT + 160) - 80;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + slantX * 0.82, ry + slantY * 0.82);
      }
      ctx.stroke();

      // Layer B: Crisp foreground diagonal rain streaks
      const fgCount = isStorm ? 115 : 54;
      ctx.strokeStyle = isStorm ? 'rgba(240, 248, 255, 0.54)' : 'rgba(232, 243, 250, 0.42)';
      ctx.lineWidth = 1.55;
      ctx.beginPath();
      for (let i = 0; i < fgCount; i++) {
        const lenScale = 0.82 + (i % 4) * 0.26;
        const rx = wrap(i * 83 + 29 - state.time * (410 + a.windSpeed * 8.5), SCENE_WIDTH + 220) - 110;
        const ry = wrap(i * 113 + state.time * (isStorm ? 1120 : 820), SCENE_HEIGHT + 180) - 90;
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + slantX * lenScale, ry + slantY * lenScale);
      }
      ctx.stroke();

      // Water & Cabin-Roof 3-Spoke Splash Crowns + Expanding Elliptical Rings (exact f34_storm_sea.png!)
      const activeSplashes = isStorm ? splashes.length : 28;
      for (let i = 0; i < activeSplashes; i++) {
        const sp = splashes[i];
        sp.age += state.dt;
        if (sp.age >= sp.maxAge) {
          sp.age = 0;
          sp.maxAge = 0.36 + Math.random() * 0.24;
          sp.x = Math.random() * SCENE_WIDTH;
          sp.y = HORIZON_Y + 24 + Math.random() * (SCENE_HEIGHT - HORIZON_Y - 36);
        }
        const p = sp.age / sp.maxAge;
        const alpha = (1 - p) * (isStorm ? 0.76 : 0.54);

        // Expanding flat water ring
        ctx.strokeStyle = `rgba(238, 247, 255, ${alpha})`;
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, (3 + p * 13) * sp.size, (1 + p * 3.3) * sp.size, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Crisp 3-spoke splash crown droplets on impact (first 52% of life, exact f34_storm_sea.png!)
        if (p < 0.52) {
          const lift = Math.sin((p / 0.52) * Math.PI) * 8.5 * sp.size;
          ctx.strokeStyle = `rgba(246, 251, 255, ${Math.min(0.95, alpha * 1.25)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          // Left spoke
          ctx.moveTo(sp.x - 1.5, sp.y);
          ctx.lineTo(sp.x - 5.2 * sp.size, sp.y - lift * 0.88);
          // Center vertical jet
          ctx.moveTo(sp.x, sp.y);
          ctx.lineTo(sp.x, sp.y - lift * 1.15);
          // Right spoke
          ctx.moveTo(sp.x + 1.5, sp.y);
          ctx.lineTo(sp.x + 5.2 * sp.size, sp.y - lift * 0.88);
          ctx.stroke();
        }
      }

      // Cute tiny rain bounces right along the boat's cabin roof!
      ctx.save();
      ctx.translate(state.ship.x, state.ship.y);
      ctx.rotate(state.ship.angle);
      for (let k = 0; k < 5; k++) {
        const rp = (state.time * 4.5 + k * 0.21) % 1;
        if (rp < 0.5) {
          const rx = -40 + k * 13;
          const ry = -53;
          const hLift = Math.sin((rp / 0.5) * Math.PI) * 5.5;
          ctx.strokeStyle = `rgba(242, 249, 255, ${(1 - rp * 2) * 0.7})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry - hLift);
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx + 3, ry - hLift);
          ctx.stroke();
        }
      }
      ctx.restore();

      ctx.restore();
    } else if (a.type === WeatherType.SNOW) {
      ctx.save();
      ctx.fillStyle = 'rgba(248, 251, 255, 0.82)';
      for (let i = 0; i < 60; i++) {
        const sx = wrap(i * 73 + Math.sin(state.time * 0.9 + i) * 26 - state.time * a.windSpeed * 1.2, SCENE_WIDTH);
        const sy = wrap(i * 53 + state.time * (26 + (i % 4) * 9), SCENE_HEIGHT);
        ctx.globalAlpha = 0.45 + (i % 4) * 0.14;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.6 + (i % 3) * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (a.hasRainbow) {
      const colors = ['#D97A6C', '#E5AA68', '#EAD682', '#88B890', '#7BA8C9', '#9488B8'];
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.lineWidth = 7;
      colors.forEach((col, i) => {
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.arc(SCENE_WIDTH * 0.62, HORIZON_Y + 20, 320 - i * 8, Math.PI * 1.04, Math.PI * 1.96);
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  return {
    prepare,
    isReady() {
      return ready;
    },
    getShipSurface(shipX: number, wavePhase: number, _waveAmp: number) {
      if (!ready) return { y: SCENE_HEIGHT * 0.68, slope: 0 };
      return getShipWaveSurface(shipX, wavePhase);
    },
    draw(ctx: CanvasRenderingContext2D, state: OceanRenderState) {
      if (!ready) return;
      const cw = ctx.canvas.clientWidth || window.innerWidth;
      const ch = ctx.canvas.clientHeight || window.innerHeight;
      const { scale, offsetX, offsetY } = computeTransform(cw, ch);

      const pal = stepAtmosphereBlend(state.atmosphere, state.dt);

      ctx.save();
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = pal.skyTop;
      ctx.fillRect(0, 0, cw, ch);

      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.rect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      ctx.clip();

      // 1. Sky wash, Sun/Moon halos & rolling storm-cloud strata
      drawSkyAndCelestials(ctx, pal, state);

      // 2. Forked lightning in Storm (behind foreground clouds & island!)
      drawLightningBolt(ctx, state);

      // 3. Sculptural Nordic editorial clouds & soaring gulls
      drawCloudsAndBirds(ctx, pal, state);

      // 4. Faceted Lighthouse Cliff Island, distant headlands, sweeping beam & horizon sea mist
      drawHorizonIslandsAndLighthouse(ctx, pal, state);

      // 5. Distant & Mid-Sea Trochoidal Wave Rows (0 .. SHIP_ROW)
      drawWaveRowsRange(ctx, 0, SHIP_ROW, pal, state);

      // 6. Architectural Nordic Fishing Trawler, Ochre-Jacket Fisherman & Silk Fishing Line/Float
      drawNordicFishingBoat(ctx, pal, state);

      // 7. Foreground Rolling Trochoidal Wave Rows (SHIP_ROW + 1 .. WAVE_ROWS - 1 — laps across hull!)
      drawWaveRowsRange(ctx, SHIP_ROW + 1, WAVE_ROWS - 1, pal, state);

      // 8. Multi-depth slanted rain sheets, water splash crowns & snow
      drawPrecipitationAndSplashes(ctx, state);

      // 9. Delicate matte editorial film grain across entire scene
      if (grainPattern) {
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
      }

      ctx.restore();
    },
    screenToScene(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
      const rect = canvas.getBoundingClientRect();
      const { scale, offsetX, offsetY } = computeTransform(rect.width, rect.height);
      return {
        x: (clientX - rect.left - offsetX) / scale,
        y: (clientY - rect.top - offsetY) / scale,
      };
    },
  };
}
