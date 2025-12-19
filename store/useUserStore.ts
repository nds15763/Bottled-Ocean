import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserStats, FocusSession, AchievementProgress } from '../types';

// Helper function to create default user
const createDefaultUser = (): User => ({
  id: crypto.randomUUID(),
  createdAt: Date.now(),
  coins: 0,
  unlockedFishIds: [],
  ownedDecorationIds: [],
  stats: {
    totalFocusMinutes: 0,
    totalFocusSessions: 0,
    totalFishCaught: 0,
    fishCaughtByRarity: { Common: 0, Rare: 0, Legendary: 0 },
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    hourlyDistribution: Array(24).fill(0),
  },
  achievementProgress: [],
});

interface UserState {
  // === User Data ===
  user: User;
  
  // === Session History ===
  sessions: FocusSession[];
  addSession: (session: FocusSession) => void;
  updateSessionDecision: (id: string, decision: 'kept' | 'sold') => void;
  
  // === Statistics Updates ===
  updateStatsOnCatch: (fishId: string, rarity: 'Common' | 'Rare' | 'Legendary', durationMinutes: number) => void;
  updateStreak: () => void;
  
  // === Collection Progress ===
  unlockFish: (fishId: string) => void;
  
  // === Achievements (placeholder for now) ===
  checkAchievements: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: createDefaultUser(),
      sessions: [],
      
      // === Session Actions ===
      addSession: (session) => {
        set((s) => ({ sessions: [...s.sessions, session] }));
      },
      
      updateSessionDecision: (id, decision) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, decision } : sess
          ),
        }));
      },
      
      // === Statistics Updates ===
      updateStatsOnCatch: (fishId, rarity, durationMinutes) => {
        set((s) => {
          const stats = { ...s.user.stats };
          const hour = new Date().getHours();
          
          // Update counts
          stats.totalFishCaught += 1;
          stats.totalFocusSessions += 1;
          stats.totalFocusMinutes += durationMinutes;
          stats.fishCaughtByRarity[rarity] += 1;
          stats.hourlyDistribution[hour] += durationMinutes;
          
          return {
            user: { ...s.user, stats },
          };
        });
        
        // Update streak
        get().updateStreak();
        
        // Unlock fish
        get().unlockFish(fishId);
        
        // Check achievements (placeholder)
        get().checkAchievements();
      },
      
      updateStreak: () => {
        const today = new Date().toISOString().split('T')[0];
        
        set((s) => {
          const stats = { ...s.user.stats };
          const lastActive = stats.lastActiveDate;
          
          if (lastActive === today) {
            // Already recorded today
            return s;
          }
          
          const yesterday = new Date(Date.now() - 86400000)
            .toISOString()
            .split('T')[0];
          
          if (lastActive === yesterday) {
            // Consecutive day
            stats.currentStreak += 1;
            stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
          } else {
            // Streak broken
            stats.currentStreak = 1;
          }
          
          stats.lastActiveDate = today;
          
          return {
            user: { ...s.user, stats },
          };
        });
      },
      
      // === Collection ===
      unlockFish: (fishId) => {
        set((s) => {
          if (s.user.unlockedFishIds.includes(fishId)) {
            return s;
          }
          return {
            user: {
              ...s.user,
              unlockedFishIds: [...s.user.unlockedFishIds, fishId],
            },
          };
        });
      },
      
      // === Achievements (Placeholder - will be implemented in P6) ===
      checkAchievements: () => {
        // TODO: Implement achievement checking in P6
        console.log('Achievement checking not yet implemented');
      },
    }),
    { name: 'bottled-ocean-user' }
  )
);


