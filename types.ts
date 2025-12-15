
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
  AQUARIUM = 'AQUARIUM' // Replaces ZEN
}

export enum WeatherType {
  SUNNY = 'SUNNY',
  RAINY = 'RAINY',
  STORM = 'STORM',
  NIGHT = 'NIGHT',
  SNOW = 'SNOW'
}

export interface AtmosphereState {
  type: WeatherType;
  localHour: number;    
  waveAmp: number;      
  waveSpeed: number;    
  windSpeed: number;    
  temperature: number;  
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
  price: number; // Value in coins
  spriteUrl: string; // New: Image source for the fish
}

// Instance of a fish inside the Aquarium
export interface AquariumFish {
  instanceId: number; // Unique ID for movement logic
  fishId: string;     // Reference to Fish DB
  x: number;
  y: number;
  angle: number;
  speed: number;
  targetX: number;
  targetY: number;
  flipX: boolean; // Visual facing direction
}

export interface Decoration {
  id: string;
  x: number;
  y: number;
  type: 'plant' | 'structure' | 'toy';
  spriteUrl: string;
  scale: number;
  zIndex: number; // For layering (front/back)
}

export interface UserProgress {
  caughtFishIds: string[];
  totalFocusMinutes: number;
  coins: number;
  aquariumFish: AquariumFish[]; // Fish currently swimming in the tank
}
