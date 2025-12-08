
export interface Point {
  x: number;
  y: number;
}

export interface WaveLayer {
  offset: number;
  color: string;
  speed: number;
  amplitude: number;
  frequency: number;
}

export interface ShipState {
  x: number;
  y: number;
  angle: number;
  velocityX: number;
  velocityY: number;
}

export enum AppMode {
  MENU = 'MENU',
  FOCUS_SETUP = 'FOCUS_SETUP',
  FOCUSING = 'FOCUSING',
  REWARD = 'REWARD',
  COLLECTION = 'COLLECTION',
  ZEN = 'ZEN'
}

export enum WeatherType {
  SUNNY = 'SUNNY',
  RAINY = 'RAINY',
  STORM = 'STORM',
  NIGHT = 'NIGHT',
  SNOW = 'SNOW' // Added for completeness, mapped to cold style later
}

export interface AtmosphereState {
  type: WeatherType;
  localHour: number;    // 0 - 24, for celestial position and sky gradient
  waveAmp: number;      // 10 - 60
  waveSpeed: number;    // 0.5 - 2.5
  windSpeed: number;    // Display purpose
  temperature: number;  // Added for dashboard
  hasRainbow: boolean;
  isDay: boolean;
  lightning: boolean;
}

export interface Fish {
  id: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Legendary';
  description: string;
  weatherRequirement?: WeatherType[];
  minDurationMinutes: number;
  icon: string; 
  color: string;
}

export interface UserProgress {
  caughtFishIds: string[];
  totalFocusMinutes: number;
}
