export interface Point {
  x: number;
  y: number;
}

export interface WaveSpring {
  x: number;
  height: number; // The actual current height from the bottom (or baseline)
  targetHeight: number; // The desired height based on tilt
  velocity: number;
}

export interface ShipState {
  x: number;
  y: number;
  angle: number;
  velocityX: number;
  velocityY: number;
}

export interface Bubble {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

export enum GameState {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
}