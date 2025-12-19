import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppMode, WeatherType, FocusSession } from '../types';

interface GameState {
  // === Currency ===
  coins: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  
  // === Current Mode ===
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  
  // === Current Focus Session ===
  currentSession: FocusSession | null;
  startSession: (durationMinutes: number, weather: WeatherType) => void;
  completeSession: (fishId: string) => void;
  abandonSession: () => void;
  recordDecision: (decision: 'kept' | 'sold') => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      coins: 0,
      mode: AppMode.MENU,
      currentSession: null,
      
      addCoins: (amount) => {
        set((s) => ({ coins: s.coins + amount }));
      },
      
      spendCoins: (amount) => {
        if (get().coins >= amount) {
          set((s) => ({ coins: s.coins - amount }));
          return true;
        }
        return false;
      },
      
      setMode: (mode) => set({ mode }),
      
      startSession: (durationMinutes, weather) => {
        const session: FocusSession = {
          id: crypto.randomUUID(),
          startTime: Date.now(),
          endTime: 0,
          durationMinutes,
          completed: false,
          weather,
          decision: null,
        };
        set({ currentSession: session, mode: AppMode.FOCUSING });
      },
      
      completeSession: (fishId) => {
        const session = get().currentSession;
        if (session) {
          session.endTime = Date.now();
          session.completed = true;
          session.caughtFishId = fishId;
          
          // Note: Session will be saved to UserStore by the caller
        }
        set({ mode: AppMode.REWARD });
      },
      
      abandonSession: () => {
        set({ currentSession: null, mode: AppMode.MENU });
      },
      
      recordDecision: (decision) => {
        const session = get().currentSession;
        if (session) {
          session.decision = decision;
          // Note: Session will be updated in UserStore by the caller
        }
        set({ currentSession: null });
      },
    }),
    { name: 'bottled-ocean-game' }
  )
);


