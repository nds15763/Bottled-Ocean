import { Fish, WeatherType } from '../types';

const SVG_HEADER = 'data:image/svg+xml;base64,';
const b64 = (str: string) => window.btoa(str);

type FishShape = 'round' | 'long' | 'ray' | 'crab' | 'jelly' | 'boot' | 'bottle';

// Clean, lineless Nordic flat-gouache fish & coastal treasure illustrations
const createFishSVG = (color1: string, color2: string, shape: FishShape) => {
  let path = '';
  if (shape === 'round') {
    path = `
      <path d="M80,35 L104,19 L99,35 L104,51 Z" fill="${color2}" opacity="0.92"/>
      <path d="M44,14 L58,5 L62,16 Z" fill="${color2}" opacity="0.85"/>
      <path d="M14,35 C16,13 44,11 66,16 C80,20 87,28 87,35 C87,42 80,50 66,54 C44,59 16,57 14,35 Z" fill="${color1}"/>
      <path d="M38,14 C34,28 34,42 38,56 L45,56 C41,42 41,28 45,14 Z" fill="${color2}" opacity="0.88"/>
      <path d="M60,16 C57,28 57,42 60,54 L65,53 C62,42 62,28 65,17 Z" fill="${color2}" opacity="0.85"/>
      <circle cx="27" cy="31" r="4.2" fill="#F6EFE2"/>
      <circle cx="26" cy="31" r="2.1" fill="#182A3B"/>`;
  } else if (shape === 'long') {
    path = `
      <path d="M84,35 L108,21 L102,35 L108,49 Z" fill="${color2}" opacity="0.9"/>
      <path d="M44,19 L58,8 L63,20 Z" fill="${color2}" opacity="0.85"/>
      <path d="M12,35 C20,18 52,16 86,28 L86,42 C52,54 20,52 12,35 Z" fill="${color1}"/>
      <path d="M22,36 C44,31 66,32 84,36" fill="none" stroke="${color2}" stroke-width="2.6" stroke-linecap="round" opacity="0.85"/>
      <circle cx="26" cy="32" r="3.8" fill="#F6EFE2"/>
      <circle cx="25" cy="32" r="1.9" fill="#182A3B"/>`;
  } else if (shape === 'ray') {
    path = `
      <path d="M82,36 Q102,42 113,54" fill="none" stroke="${color2}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M12,35 Q50,4 86,35 Q50,66 12,35 Z" fill="${color1}"/>
      <circle cx="46" cy="27" r="2.5" fill="${color2}" opacity="0.8"/>
      <circle cx="57" cy="34" r="3" fill="${color2}" opacity="0.8"/>
      <circle cx="48" cy="43" r="2.2" fill="${color2}" opacity="0.8"/>
      <circle cx="27" cy="30" r="3.2" fill="#F6EFE2"/>
      <circle cx="26.5" cy="30" r="1.6" fill="#182A3B"/>`;
  } else if (shape === 'crab') {
    path = `
      <path d="M30,43 L16,54 M36,47 L25,59 M80,43 L94,54 M74,47 L85,59" stroke="${color2}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M35,26 L23,14 L31,9 L39,20 Z M75,26 L87,14 L79,9 L71,20 Z" fill="${color2}"/>
      <ellipse cx="55" cy="38" rx="26" ry="16" fill="${color1}"/>
      <circle cx="46" cy="29" r="3.5" fill="#F6EFE2"/>
      <circle cx="64" cy="29" r="3.5" fill="#F6EFE2"/>
      <circle cx="46" cy="29" r="1.8" fill="#182A3B"/>
      <circle cx="64" cy="29" r="1.8" fill="#182A3B"/>`;
  } else if (shape === 'jelly') {
    path = `
      <path d="M41,41 Q37,55 43,64 M55,42 Q52,56 57,65 M69,41 Q65,54 71,63" fill="none" stroke="${color2}" stroke-width="2.8" stroke-linecap="round" opacity="0.85"/>
      <path d="M27,41 C27,14 83,14 83,41 C70,45 62,40 55,42 C48,40 40,45 27,41 Z" fill="${color1}"/>
      <ellipse cx="48" cy="25" rx="9" ry="4" fill="#FFFFFF" opacity="0.3"/>`;
  } else if (shape === 'boot') {
    path = `
      <path d="M42,13 L63,13 L61,42 L81,46 C86,48 86,57 80,58 L37,58 L39,13 Z" fill="${color1}"/>
      <rect x="39" y="13" width="24" height="6" fill="${color2}"/>
      <rect x="37" y="54" width="46" height="4" rx="1.5" fill="${color2}"/>`;
  } else if (shape === 'bottle') {
    path = `
      <rect x="49" y="8" width="12" height="8" rx="1.5" fill="#A66D3F"/>
      <path d="M47,16 L63,16 L65,25 C74,30 74,44 73,57 C61,61 49,61 37,57 C36,44 36,30 45,25 Z" fill="#7FB5D1" opacity="0.82"/>
      <rect x="47" y="30" width="16" height="20" rx="1.5" fill="${color1}"/>`;
  }

  return (
    SVG_HEADER +
    b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 116 70" width="116" height="70">${path}</svg>`)
  );
};

export const FISH_DB: Fish[] = [
  // Common
  {
    id: 'clownfish',
    name: 'Nemo-ish',
    rarity: 'Common',
    description: 'Just a normal clownfish.',
    minDurationMinutes: 1,
    icon: '🐠',
    color: '#D96B4E',
    price: 10,
    spriteUrl: createFishSVG('#D96B4E', '#F4ECE0', 'round'),
  },
  {
    id: 'blue_tang',
    name: 'Dory-ish',
    rarity: 'Common',
    description: 'Keeps forgetting things.',
    minDurationMinutes: 1,
    icon: '🐟',
    color: '#4686B3',
    price: 12,
    spriteUrl: createFishSVG('#4686B3', '#E6AF52', 'round'),
  },
  {
    id: 'origami_crab',
    name: 'Paper Crab',
    rarity: 'Common',
    description: 'Careful with the claws.',
    minDurationMinutes: 1,
    icon: '🦀',
    color: '#C6533E',
    price: 15,
    spriteUrl: createFishSVG('#C6533E', '#9C3B2B', 'crab'),
  },

  // Rare
  {
    id: 'lantern_fish',
    name: 'Lantern Fish',
    rarity: 'Rare',
    description: 'Lights up the dark.',
    minDurationMinutes: 25,
    icon: '🏮',
    color: '#E6B85C',
    price: 50,
    spriteUrl: createFishSVG('#325475', '#F4CF72', 'long'),
  },
  {
    id: 'cloud_jelly',
    name: 'Cloud Jelly',
    rarity: 'Rare',
    description: 'Floats like a cloud.',
    minDurationMinutes: 25,
    icon: '🪼',
    color: '#C7B8D6',
    price: 60,
    spriteUrl: createFishSVG('#B4A7C9', '#EAE4F2', 'jelly'),
  },
  {
    id: 'rain_boot',
    name: 'Old Boot',
    rarity: 'Rare',
    description: 'A classic catch.',
    weatherRequirement: [WeatherType.RAINY],
    minDurationMinutes: 10,
    icon: '👢',
    color: '#DFA042',
    price: 40,
    spriteUrl: createFishSVG('#DFA042', '#9C6828', 'boot'),
  },

  // Legendary
  {
    id: 'moon_ray',
    name: 'Moon Ray',
    rarity: 'Legendary',
    description: 'Graceful glider.',
    weatherRequirement: [WeatherType.NIGHT],
    minDurationMinutes: 30,
    icon: '🛸',
    color: '#6C6FA0',
    price: 200,
    spriteUrl: createFishSVG('#56618E', '#F4E5B8', 'ray'),
  },
  {
    id: 'rainbow_trout',
    name: 'Prism Trout',
    rarity: 'Legendary',
    description: 'Shines with all colors.',
    weatherRequirement: [WeatherType.SUNNY],
    minDurationMinutes: 45,
    icon: '🌈',
    color: '#5F9E8E',
    price: 250,
    spriteUrl: createFishSVG('#569487', '#E59A6E', 'long'),
  },
  {
    id: 'message_bottle',
    name: 'Message Bottle',
    rarity: 'Legendary',
    description: 'SOS.',
    minDurationMinutes: 40,
    icon: '📜',
    color: '#E6CFA8',
    price: 500,
    spriteUrl: createFishSVG('#EBD8B7', '#F4ECE0', 'bottle'),
  },
];

export const getRandomFish = (durationMinutes: number, weather: WeatherType): Fish => {
  const candidates = FISH_DB.filter((fish) => {
    if (fish.minDurationMinutes > durationMinutes) return false;
    if (fish.weatherRequirement && !fish.weatherRequirement.includes(weather)) return false;
    return true;
  });

  if (candidates.length === 0) return FISH_DB[0];

  let rarityPool = candidates;
  const roll = Math.random();

  if (durationMinutes >= 45) {
    if (roll > 0.5) rarityPool = candidates.filter((f) => f.rarity === 'Legendary');
    else if (roll > 0.2) rarityPool = candidates.filter((f) => f.rarity === 'Rare');
  } else if (durationMinutes >= 25) {
    if (roll > 0.7) rarityPool = candidates.filter((f) => f.rarity === 'Rare');
  } else {
    rarityPool = candidates.filter((f) => f.rarity === 'Common');
  }

  if (rarityPool.length === 0) rarityPool = candidates;
  return rarityPool[Math.floor(Math.random() * rarityPool.length)];
};

export const DECORATION_ASSETS = {
  castle: '',
  pot: '',
  weed: '',
  clam: '',
};
