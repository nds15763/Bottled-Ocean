
import { Fish, WeatherType } from '../types';

// --- ASSET GENERATION (Embedded SVGs for "Neko Atsume" Style) ---
// These simulate hand-drawn, thick-outline assets.

const SVG_HEADER = "data:image/svg+xml;base64,";

const b64 = (str: string) => window.btoa(str);

const createFishSVG = (color1: string, color2: string, shape: 'round' | 'long' | 'ray' | 'crab') => {
  let path = "";
  if (shape === 'round') {
     // Cute chubby fish (Clownfish style)
     path = `<path d="M10,25 Q10,5 30,5 Q60,5 80,25 Q90,30 95,15 L95,35 Q90,20 80,25 Q60,45 30,45 Q10,45 10,25 Z" fill="${color1}" stroke="#4A3B32" stroke-width="3" stroke-linejoin="round"/>
             <path d="M30,5 Q25,25 30,45" fill="none" stroke="#4A3B32" stroke-width="3" />
             <path d="M55,5 Q50,25 55,45" fill="none" stroke="#4A3B32" stroke-width="3" />
             <circle cx="20" cy="20" r="3" fill="#000" />`;
  } else if (shape === 'long') {
     // Long fish (Trout style)
     path = `<ellipse cx="50" cy="25" rx="45" ry="15" fill="${color1}" stroke="#4A3B32" stroke-width="3" />
             <path d="M5,25 L-5,15 L-5,35 Z" fill="${color2}" stroke="#4A3B32" stroke-width="3" />
             <path d="M30,25 L40,15 M60,25 L70,35" stroke="${color2}" stroke-width="3" />
             <circle cx="80" cy="20" r="3" fill="#000" />`;
  } else if (shape === 'ray') {
     // Ray/Flat
     path = `<path d="M10,25 Q50,-10 90,25 Q50,60 10,25 Z" fill="${color1}" stroke="#4A3B32" stroke-width="3" />
             <path d="M90,25 Q110,30 130,60" fill="none" stroke="#4A3B32" stroke-width="2" />
             <circle cx="30" cy="20" r="2" fill="#000" />
             <circle cx="30" cy="30" r="2" fill="#000" />`;
  } else if (shape === 'crab') {
     // Crab
     path = `<ellipse cx="50" cy="30" rx="25" ry="15" fill="${color1}" stroke="#4A3B32" stroke-width="3" />
             <path d="M25,30 L10,15 L15,10 Z M75,30 L90,15 L85,10 Z" fill="${color2}" stroke="#4A3B32" stroke-width="3" />
             <path d="M30,40 L20,50 M35,42 L30,52 M65,42 L70,52 M70,40 L80,50" stroke="#4A3B32" stroke-width="3" />
             <circle cx="40" cy="25" r="2" fill="#000" />
             <circle cx="60" cy="25" r="2" fill="#000" />`;
  }
  
  return SVG_HEADER + b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 150 80" width="100" height="60">${path}</svg>`);
};

// --- FISH DATABASE WITH SPRITES ---

export const FISH_DB: Fish[] = [
  // Common
  { 
    id: 'clownfish', name: 'Nemo-ish', rarity: 'Common', description: 'Just a normal clownfish.', minDurationMinutes: 1, icon: '🐠', color: '#FF7E67', price: 10,
    spriteUrl: createFishSVG('#FFAB91', '#FFF', 'round')
  },
  { 
    id: 'blue_tang', name: 'Dory-ish', rarity: 'Common', description: 'Keeps forgetting things.', minDurationMinutes: 1, icon: '🐟', color: '#4A90E2', price: 12,
    spriteUrl: createFishSVG('#5DADE2', '#F1C40F', 'round')
  },
  { 
    id: 'origami_crab', name: 'Paper Crab', rarity: 'Common', description: 'Careful with the claws.', minDurationMinutes: 1, icon: '🦀', color: '#E74C3C', price: 15,
    spriteUrl: createFishSVG('#E74C3C', '#C0392B', 'crab')
  },
  
  // Rare
  { 
    id: 'lantern_fish', name: 'Lantern Fish', rarity: 'Rare', description: 'Lights up the dark.', minDurationMinutes: 25, icon: '🏮', color: '#F1C40F', price: 50,
    spriteUrl: createFishSVG('#34495E', '#F1C40F', 'long')
  },
  { 
    id: 'cloud_jelly', name: 'Cloud Jelly', rarity: 'Rare', description: 'Floats like a cloud.', minDurationMinutes: 25, icon: '🪼', color: '#ECF0F1', price: 60,
    spriteUrl: createFishSVG('#D7BDE2', '#FFF', 'round') 
  },
  { 
    id: 'rain_boot', name: 'Old Boot', rarity: 'Rare', description: 'A classic catch.', weatherRequirement: [WeatherType.RAINY], minDurationMinutes: 10, icon: '👢', color: '#F39C12', price: 40,
    spriteUrl: createFishSVG('#D35400', '#A04000', 'long') // Reusing long shape for boot abstractly
  },
  
  // Legendary
  { 
    id: 'moon_ray', name: 'Moon Ray', rarity: 'Legendary', description: 'Graceful glider.', weatherRequirement: [WeatherType.NIGHT], minDurationMinutes: 30, icon: '🛸', color: '#9B59B6', price: 200,
    spriteUrl: createFishSVG('#8E44AD', '#FFF', 'ray')
  },
  { 
    id: 'rainbow_trout', name: 'Prism Trout', rarity: 'Legendary', description: 'Shines with all colors.', weatherRequirement: [WeatherType.SUNNY], minDurationMinutes: 45, icon: '🌈', color: '#2ECC71', price: 250,
    spriteUrl: createFishSVG('#ABEBC6', '#58D68D', 'long')
  },
  { 
    id: 'message_bottle', name: 'Message Bottle', rarity: 'Legendary', description: 'SOS.', minDurationMinutes: 40, icon: '📜', color: '#D35400', price: 500,
    spriteUrl: createFishSVG('#F5CBA7', '#FFF', 'long')
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
