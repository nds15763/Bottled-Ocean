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
  NIGHT = 'NIGHT'
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