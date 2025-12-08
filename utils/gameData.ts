import { Fish, WeatherType } from '../types';

export const FISH_DB: Fish[] = [
  // Common (Any weather, short duration)
  { id: 'clownfish', name: 'Paper Clownfish', rarity: 'Common', description: 'Cut from orange construction paper.', minDurationMinutes: 1, icon: '🐠', color: '#FF7E67' },
  { id: 'blue_tang', name: 'Dory-ish', rarity: 'Common', description: 'Keeps forgetting where it is.', minDurationMinutes: 1, icon: '🐟', color: '#4A90E2' },
  { id: 'origami_crab', name: 'Origami Crab', rarity: 'Common', description: 'Has sharp edges, handle with care.', minDurationMinutes: 1, icon: '🦀', color: '#E74C3C' },
  
  // Rare (> 25 mins)
  { id: 'lantern_fish', name: 'Lantern Fish', rarity: 'Rare', description: 'Ideally suited for reading under the covers.', minDurationMinutes: 25, icon: '🏮', color: '#F1C40F' },
  { id: 'cloud_jelly', name: 'Cloud Jelly', rarity: 'Rare', description: 'Is it a cloud? Is it a jellyfish?', minDurationMinutes: 25, icon: '🪼', color: '#ECF0F1' },
  { id: 'rain_boot', name: 'Lost Boot', rarity: 'Rare', description: 'Someone walked home barefoot.', weatherRequirement: [WeatherType.RAINY], minDurationMinutes: 10, icon: '👢', color: '#F39C12' },
  
  // Legendary (Specific Conditions)
  { id: 'moon_ray', name: 'Moon Ray', rarity: 'Legendary', description: 'Only appears when the moon is watching.', weatherRequirement: [WeatherType.NIGHT], minDurationMinutes: 30, icon: '🛸', color: '#9B59B6' },
  { id: 'rainbow_trout', name: 'Prism Trout', rarity: 'Legendary', description: 'Scales made of holographic foil.', weatherRequirement: [WeatherType.SUNNY], minDurationMinutes: 45, icon: '🌈', color: '#2ECC71' },
  { id: 'message_bottle', name: 'Ancient Message', rarity: 'Legendary', description: 'A letter from the developer?', minDurationMinutes: 40, icon: '📜', color: '#D35400' },
];

export const getRandomFish = (durationMinutes: number, weather: WeatherType): Fish => {
  // Filter candidates
  const candidates = FISH_DB.filter(fish => {
    if (fish.minDurationMinutes > durationMinutes) return false;
    if (fish.weatherRequirement && !fish.weatherRequirement.includes(weather)) return false;
    return true;
  });

  if (candidates.length === 0) return FISH_DB[0]; // Fallback

  // Weighted Rarity Logic
  let rarityPool = candidates;
  const roll = Math.random();

  // High duration increases legendary chance
  if (durationMinutes >= 45) {
     if (roll > 0.5) rarityPool = candidates.filter(f => f.rarity === 'Legendary');
     else if (roll > 0.2) rarityPool = candidates.filter(f => f.rarity === 'Rare');
  } else if (durationMinutes >= 25) {
     if (roll > 0.7) rarityPool = candidates.filter(f => f.rarity === 'Rare');
  } else {
     rarityPool = candidates.filter(f => f.rarity === 'Common');
  }

  // If filter resulted in empty (e.g. no legendary available), revert to all candidates
  if (rarityPool.length === 0) rarityPool = candidates;

  return rarityPool[Math.floor(Math.random() * rarityPool.length)];
};