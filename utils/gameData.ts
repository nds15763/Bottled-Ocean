
import { Fish, WeatherType, FishAnimation, Decoration } from '../types';

// --- ASSET PATHS ---
const ASSETS_PATH = '/assets/fish';

// --- HELPERS ---
const SVG_HEADER = "data:image/svg+xml;base64,";
const b64 = (str: string) => window.btoa(str);

// --- DEFAULT ANIMATIONS ---
const DEFAULT_ANIMATION: FishAnimation = {
  wiggleSpeed: 3.5,
  wiggleAmount: 0.05,
  bobSpeed: 1.5,
  bobAmount: 3,
  tiltFactor: 0.5
};

const FAST_ANIMATION: FishAnimation = {
  wiggleSpeed: 6.0,
  wiggleAmount: 0.08,
  bobSpeed: 2.5,
  bobAmount: 2,
  tiltFactor: 0.3
};

const SLOW_ANIMATION: FishAnimation = {
  wiggleSpeed: 1.5,
  wiggleAmount: 0.03,
  bobSpeed: 1.0,
  bobAmount: 5,
  tiltFactor: 0.8
};

// --- FISH DATABASE ---

export const FISH_DB: Fish[] = [
  // Common
  { 
    id: 'clownfish', name: 'Nemo-ish', rarity: 'Common', description: 'Just a normal clownfish.', minDurationMinutes: 1, icon: '🐠', color: '#FF7E67', price: 10,
    spriteUrl: `${ASSETS_PATH}/clownfish.png`,
    width: 100, height: 60,
    animation: DEFAULT_ANIMATION
  },
  { 
    id: 'blue_tang', name: 'Dory-ish', rarity: 'Common', description: 'Keeps forgetting things.', minDurationMinutes: 1, icon: '🐟', color: '#4A90E2', price: 12,
    spriteUrl: `${ASSETS_PATH}/blue_tang.png`,
    width: 100, height: 60,
    animation: DEFAULT_ANIMATION
  },
  { 
    id: 'origami_crab', name: 'Paper Crab', rarity: 'Common', description: 'Careful with the claws.', minDurationMinutes: 1, icon: '🦀', color: '#E74C3C', price: 15,
    spriteUrl: `${ASSETS_PATH}/crab.png`,
    width: 80, height: 50,
    animation: { ...FAST_ANIMATION, bobAmount: 1 } // Crabs bob less
  },
  
  // Rare
  { 
    id: 'lantern_fish', name: 'Lantern Fish', rarity: 'Rare', description: 'Lights up the dark.', minDurationMinutes: 25, icon: '🏮', color: '#F1C40F', price: 50,
    spriteUrl: `${ASSETS_PATH}/lantern_fish.png`,
    width: 120, height: 80,
    animation: SLOW_ANIMATION
  },
  { 
    id: 'cloud_jelly', name: 'Cloud Jelly', rarity: 'Rare', description: 'Floats like a cloud.', minDurationMinutes: 25, icon: '🪼', color: '#ECF0F1', price: 60,
    spriteUrl: `${ASSETS_PATH}/jelly.png`,
    width: 90, height: 110,
    animation: { ...SLOW_ANIMATION, wiggleAmount: 0.1, bobAmount: 10 }
  },
  { 
    id: 'rain_boot', name: 'Old Boot', rarity: 'Rare', description: 'A classic catch.', weatherRequirement: [WeatherType.RAINY], minDurationMinutes: 10, icon: '👢', color: '#F39C12', price: 40,
    spriteUrl: `${ASSETS_PATH}/boot.png`,
    width: 80, height: 80,
    animation: { ...SLOW_ANIMATION, wiggleSpeed: 0, wiggleAmount: 0 } // Boots don't wiggle
  },
  
  // Legendary
  { 
    id: 'moon_ray', name: 'Moon Ray', rarity: 'Legendary', description: 'Graceful glider.', weatherRequirement: [WeatherType.NIGHT], minDurationMinutes: 30, icon: '🛸', color: '#9B59B6', price: 200,
    spriteUrl: `${ASSETS_PATH}/moon_ray.png`,
    width: 150, height: 100,
    animation: SLOW_ANIMATION
  },
  { 
    id: 'rainbow_trout', name: 'Prism Trout', rarity: 'Legendary', description: 'Shines with all colors.', weatherRequirement: [WeatherType.SUNNY], minDurationMinutes: 45, icon: '🌈', color: '#2ECC71', price: 250,
    spriteUrl: `${ASSETS_PATH}/rainbow_trout.png`,
    width: 130, height: 70,
    animation: FAST_ANIMATION
  },
  { 
    id: 'message_bottle', name: 'Message Bottle', rarity: 'Legendary', description: 'SOS.', minDurationMinutes: 40, icon: '📜', color: '#D35400', price: 500,
    spriteUrl: `${ASSETS_PATH}/bottle.png`,
    width: 60, height: 100,
    animation: { ...SLOW_ANIMATION, wiggleSpeed: 0 }
  },
];

export const getRandomFish = (durationMinutes: number, weather: WeatherType): Fish => {
  const candidates = FISH_DB.filter(fish => {
    if (fish.minDurationMinutes > durationMinutes) return false;
    if (fish.weatherRequirement && !fish.weatherRequirement.includes(weather)) return false;
    return true;
  });

  if (candidates.length === 0) return FISH_DB[0];

  let rarityPool = candidates;
  const roll = Math.random();

  if (durationMinutes >= 45) {
     if (roll > 0.5) rarityPool = candidates.filter(f => f.rarity === 'Legendary');
     else if (roll > 0.2) rarityPool = candidates.filter(f => f.rarity === 'Rare');
  } else if (durationMinutes >= 25) {
     if (roll > 0.7) rarityPool = candidates.filter(f => f.rarity === 'Rare');
  } else {
     rarityPool = candidates.filter(f => f.rarity === 'Common');
  }

  if (rarityPool.length === 0) rarityPool = candidates;
  return rarityPool[Math.floor(Math.random() * rarityPool.length)];
};


// --- DECORATION ASSETS (The "Neko Atsume" Goods) ---

const createDecorSVG = (type: string) => {
    let content = '';
    let w = 100, h = 100;
    
    if (type === 'castle') {
        // A cute sandcastle/tower
        content = `<path d="M20,80 L20,40 L10,40 L25,10 L40,40 L30,40 L30,80 Z M70,80 L70,50 L60,50 L75,20 L90,50 L80,50 L80,80 Z M30,80 L70,80 L70,60 L30,60 Z" fill="#F0E68C" stroke="#4A3B32" stroke-width="3"/>
                   <rect x="40" y="70" width="20" height="10" fill="#4A3B32" opacity="0.5"/>`;
    } else if (type === 'pot') {
        // A broken jar for hiding
        content = `<path d="M20,20 Q10,50 20,80 L80,80 Q90,50 80,20 Q50,10 20,20 Z" fill="#D35400" stroke="#4A3B32" stroke-width="3"/>
                   <ellipse cx="50" cy="20" rx="30" ry="10" fill="#2C3E50" />`;
    } else if (type === 'weed') {
        // Seaweed cluster
        content = `<path d="M50,90 Q40,60 50,30 Q60,60 50,90" fill="#58D68D" stroke="#2ECC71" stroke-width="2"/>
                   <path d="M40,90 Q20,60 30,40" fill="#58D68D" stroke="#2ECC71" stroke-width="2"/>
                   <path d="M60,90 Q80,60 70,50" fill="#58D68D" stroke="#2ECC71" stroke-width="2"/>`;
    } else if (type === 'clam') {
        // Giant Clam Bed
        content = `<path d="M10,60 Q50,90 90,60 Q80,30 50,40 Q20,30 10,60 Z" fill="#F5B7B1" stroke="#4A3B32" stroke-width="3"/>
                   <path d="M15,60 L50,80 L85,60" fill="none" stroke="#4A3B32" stroke-width="1"/>`;
    }
    
    return SVG_HEADER + b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${w}" height="${h}">${content}</svg>`);
};

export const DECORATION_ASSETS = {
    castle: createDecorSVG('castle'),
    pot: createDecorSVG('pot'),
    weed: createDecorSVG('weed'),
    clam: createDecorSVG('clam'),
};

export const DECOR_DB: Decoration[] = [
    { id: 'castle', name: 'Sand Castle', type: 'castle', spriteUrl: DECORATION_ASSETS.castle, price: 100 },
    { id: 'pot', name: 'Ancient Pot', type: 'pot', spriteUrl: DECORATION_ASSETS.pot, price: 80 },
    { id: 'weed', name: 'Seaweed', type: 'weed', spriteUrl: DECORATION_ASSETS.weed, price: 20 },
    { id: 'clam', name: 'Giant Clam', type: 'clam', spriteUrl: DECORATION_ASSETS.clam, price: 150 },
];
