const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

export interface MoonPhaseInfo {
  phase: number;
  illumination: number;
  waxing: boolean;
  name: string;
}

export function getMoonPhase(date: Date): MoonPhaseInfo {
  const ageDays = ((date.getTime() - KNOWN_NEW_MOON_MS) / 86400000) % SYNODIC_MONTH_DAYS;
  const phase = ((ageDays + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  const illumination = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  const waxing = phase < 0.5;
  let name = 'Waxing Crescent';
  if (phase < 0.0625 || phase >= 0.9375) name = 'New Moon';
  else if (phase < 0.1875) name = 'Waxing Crescent';
  else if (phase < 0.3125) name = 'First Quarter';
  else if (phase < 0.4375) name = 'Waxing Gibbous';
  else if (phase < 0.5625) name = 'Full Moon';
  else if (phase < 0.6875) name = 'Waning Gibbous';
  else if (phase < 0.8125) name = 'Last Quarter';
  else name = 'Waning Crescent';
  return { phase, illumination, waxing, name };
}
