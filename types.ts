
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
  AQUARIUM = 'AQUARIUM', // Replaces ZEN
  ZEN = 'ZEN'
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

export interface FishAnimation {
  wiggleSpeed: number;
  wiggleAmount: number;
  bobSpeed: number;
  bobAmount: number;
  tiltFactor: number;
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
  price: number; 
  spriteUrl: string;
  width: number;
  height: number;
  animation: FishAnimation;
}

export type FishState = 'swimming' | 'approaching' | 'interacting' | 'fleeing';

// Instance of a fish inside the Aquarium
export interface AquariumFish {
  instanceId: string; // Unique ID for movement logic
  fishId: string;     // Reference to Fish DB
  x: number;
  y: number;
  speed: number;
  targetX: number;
  targetY: number;
  flipX: boolean; // Visual facing direction
  state: FishState;
  stateStartTime: number;
}

export interface Decoration {
  id: string;
  name: string;
  type: 'plant' | 'structure' | 'toy' | 'weed' | 'castle' | 'pot' | 'clam';
  spriteUrl: string;
  price: number;
}

export interface PlacedDecoration {
  instanceId: string;
  decorId: string;
  x: number;
  y: number;
  flipped: boolean;
  scale?: number;
}

export interface UserProgress {
  caughtFishIds: string[];
  totalFocusMinutes: number;
  coins: number;
  aquariumFish: AquariumFish[]; // Fish currently swimming in the tank
}
