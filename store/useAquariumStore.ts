import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AquariumFish, PlacedDecoration } from '../types';

// Helper function to create a new fish instance
const createFishInstance = (fishId: string): AquariumFish => {
  const w = typeof window !== 'undefined' ? window.innerWidth : 800;
  const h = typeof window !== 'undefined' ? window.innerHeight : 600;
  
  return {
    instanceId: crypto.randomUUID(),
    fishId,
    x: Math.random() * w,
    y: Math.random() * (h * 0.6),
    targetX: Math.random() * w,
    targetY: Math.random() * (h * 0.6),
    angle: 0,
    speed: 1.0 + Math.random() * 0.5,
    flipX: Math.random() > 0.5,
    state: 'swimming',
    stateStartTime: Date.now(),
    currentFrame: 0,
    animationTimer: 0,
  };
};

interface AquariumState {
  // === Fish ===
  fish: AquariumFish[];
  addFish: (fishId: string) => void;
  removeFish: (instanceId: string) => void;
  updateFish: (instanceId: string, updates: Partial<AquariumFish>) => void;
  
  // === Decorations ===
  decorations: PlacedDecoration[];
  placeDecoration: (decorId: string, x: number, y: number) => void;
  moveDecoration: (instanceId: string, x: number, y: number) => void;
  removeDecoration: (instanceId: string) => void;
  flipDecoration: (instanceId: string) => void;
  
  // === Edit Mode ===
  isEditMode: boolean;
  toggleEditMode: () => void;
  selectedDecorationId: string | null;
  selectDecoration: (id: string | null) => void;
  
  // === Inventory (purchased but not placed) ===
  inventory: string[];  // decorId[]
  addToInventory: (decorId: string) => void;
  removeFromInventory: (decorId: string) => void;
}

export const useAquariumStore = create<AquariumState>()(
  persist(
    (set, get) => ({
      fish: [],
      decorations: [],
      isEditMode: false,
      selectedDecorationId: null,
      inventory: [],
      
      // === Fish Actions ===
      addFish: (fishId) => {
        const newFish = createFishInstance(fishId);
        set((s) => ({ fish: [...s.fish, newFish] }));
      },
      
      removeFish: (instanceId) => {
        set((s) => ({ fish: s.fish.filter((f) => f.instanceId !== instanceId) }));
      },
      
      updateFish: (instanceId, updates) => {
        set((s) => ({
          fish: s.fish.map((f) =>
            f.instanceId === instanceId ? { ...f, ...updates } : f
          ),
        }));
      },
      
      // === Decoration Actions ===
      placeDecoration: (decorId, x, y) => {
        const newDecor: PlacedDecoration = {
          instanceId: crypto.randomUUID(),
          decorId,
          x,
          y,
          flipped: false,
        };
        set((s) => ({
          decorations: [...s.decorations, newDecor],
          inventory: s.inventory.filter((id) => id !== decorId),
        }));
      },
      
      moveDecoration: (instanceId, x, y) => {
        set((s) => ({
          decorations: s.decorations.map((d) =>
            d.instanceId === instanceId ? { ...d, x, y } : d
          ),
        }));
      },
      
      removeDecoration: (instanceId) => {
        const decor = get().decorations.find((d) => d.instanceId === instanceId);
        if (decor) {
          set((s) => ({
            decorations: s.decorations.filter((d) => d.instanceId !== instanceId),
            inventory: [...s.inventory, decor.decorId],
          }));
        }
      },
      
      flipDecoration: (instanceId) => {
        set((s) => ({
          decorations: s.decorations.map((d) =>
            d.instanceId === instanceId ? { ...d, flipped: !d.flipped } : d
          ),
        }));
      },
      
      // === Edit Mode ===
      toggleEditMode: () => {
        set((s) => ({ 
          isEditMode: !s.isEditMode,
          selectedDecorationId: null 
        }));
      },
      
      selectDecoration: (id) => {
        set({ selectedDecorationId: id });
      },
      
      // === Inventory ===
      addToInventory: (decorId) => {
        set((s) => ({ inventory: [...s.inventory, decorId] }));
      },
      
      removeFromInventory: (decorId) => {
        set((s) => ({
          inventory: s.inventory.filter((id) => id !== decorId),
        }));
      },
    }),
    { name: 'bottled-ocean-aquarium' }
  )
);


