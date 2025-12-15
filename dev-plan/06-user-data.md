# 💾 用户数据模块设计

> 所属: Bottled Ocean v2  
> 状态: 📋 Planning

---

## 模块职责

- 管理用户核心数据（金币、收集进度）
- 记录专注会话历史
- 提供统一的存储服务
- 处理 v1 → v2 数据迁移

---

## 对外接口

### 提供给其他模块

| 接口 | 类型 | 使用方 | 说明 |
|------|------|--------|------|
| `useGameStore` | Hook | 全局 | 游戏核心状态 |
| `useUserStore` | Hook | FishDex | 用户统计 |
| `StorageService` | Class | 全局 | 存储服务 |
| `FocusSession` | Type | FishDex | 会话记录类型 |

### 依赖其他模块

| 依赖 | 来源模块 | 说明 |
|------|----------|------|
| `AquariumFish` | 鱼模块 | 存储鱼缸数据 |
| `PlacedDecoration` | 装饰物模块 | 存储装饰数据 |

---

## 数据结构

### User - 用户数据

```typescript
interface User {
  // 身份
  id: string;
  createdAt: number;
  
  // 货币
  coins: number;
  
  // 收集进度
  unlockedFishIds: string[];       // 图鉴解锁
  ownedDecorationIds: string[];    // 已购买装饰（仓库）
  
  // 统计
  stats: UserStats;
  
  // 成就
  achievementProgress: AchievementProgress[];
}

interface UserStats {
  // 专注统计
  totalFocusMinutes: number;
  totalFocusSessions: number;
  
  // 钓鱼统计
  totalFishCaught: number;
  fishCaughtByRarity: {
    Common: number;
    Rare: number;
    Legendary: number;
  };
  
  // 连续记录
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;    // 'YYYY-MM-DD'
  
  // 时段分布（用于"最佳时段"）
  hourlyDistribution: number[];   // 长度 24
}
```

### FocusSession - 专注会话

```typescript
interface FocusSession {
  id: string;
  
  // 时间
  startTime: number;         // Unix timestamp
  endTime: number;
  durationMinutes: number;
  
  // 状态
  completed: boolean;        // 是否完成（vs 放弃）
  
  // 结果
  caughtFishId?: string;     // 钓到的鱼（如果完成）
  weather: WeatherType;      // 当时的天气
  
  // 决策
  decision: 'kept' | 'sold' | null;
}
```

---

## 状态管理

### GameStore - 游戏核心状态

```typescript
// store/useGameStore.ts

interface GameState {
  // === 货币 ===
  coins: number;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  
  // === 当前模式 ===
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  
  // === 当前专注会话 ===
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
        set(s => ({ coins: s.coins + amount }));
      },
      
      spendCoins: (amount) => {
        if (get().coins >= amount) {
          set(s => ({ coins: s.coins - amount }));
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
          
          // 保存到历史
          useUserStore.getState().addSession(session);
          
          // 更新统计
          useUserStore.getState().updateStatsOnCatch(fishId);
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
          // 更新已保存的会话
          useUserStore.getState().updateSessionDecision(session.id, decision);
        }
        set({ currentSession: null });
      },
    }),
    { name: 'bottled-ocean-game' }
  )
);
```

### UserStore - 用户数据状态

```typescript
// store/useUserStore.ts

interface UserState {
  // === 用户数据 ===
  user: User;
  
  // === 会话历史 ===
  sessions: FocusSession[];
  addSession: (session: FocusSession) => void;
  updateSessionDecision: (id: string, decision: 'kept' | 'sold') => void;
  
  // === 统计更新 ===
  updateStatsOnCatch: (fishId: string) => void;
  updateStreak: () => void;
  
  // === 收集进度 ===
  unlockFish: (fishId: string) => void;
  
  // === 成就 ===
  checkAchievements: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: createDefaultUser(),
      sessions: [],
      
      addSession: (session) => {
        set(s => ({ sessions: [...s.sessions, session] }));
      },
      
      updateSessionDecision: (id, decision) => {
        set(s => ({
          sessions: s.sessions.map(sess =>
            sess.id === id ? { ...sess, decision } : sess
          ),
        }));
      },
      
      updateStatsOnCatch: (fishId) => {
        const fish = getFishById(fishId);
        if (!fish) return;
        
        set(s => {
          const stats = { ...s.user.stats };
          const hour = new Date().getHours();
          
          stats.totalFishCaught += 1;
          stats.fishCaughtByRarity[fish.rarity] += 1;
          stats.hourlyDistribution[hour] += 1;
          
          return {
            user: { ...s.user, stats },
          };
        });
        
        // 更新连续天数
        get().updateStreak();
        
        // 解锁图鉴
        get().unlockFish(fishId);
        
        // 检查成就
        get().checkAchievements();
      },
      
      updateStreak: () => {
        const today = new Date().toISOString().split('T')[0];
        
        set(s => {
          const stats = { ...s.user.stats };
          const lastActive = stats.lastActiveDate;
          
          if (lastActive === today) {
            // 今天已经记录过
            return s;
          }
          
          const yesterday = new Date(Date.now() - 86400000)
            .toISOString()
            .split('T')[0];
          
          if (lastActive === yesterday) {
            // 连续
            stats.currentStreak += 1;
            stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
          } else {
            // 中断
            stats.currentStreak = 1;
          }
          
          stats.lastActiveDate = today;
          
          return {
            user: { ...s.user, stats },
          };
        });
      },
      
      unlockFish: (fishId) => {
        set(s => {
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
      
      checkAchievements: () => {
        // 调用 AchievementSystem 检查并更新
        const progress = AchievementSystem.checkAchievements(
          get().user,
          get().sessions
        );
        set(s => ({
          user: { ...s.user, achievementProgress: progress },
        }));
      },
    }),
    { name: 'bottled-ocean-user' }
  )
);

// Helper
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
```

---

## 存储服务

### StorageService

```typescript
// services/StorageService.ts

const STORAGE_VERSION = 2;

interface StorageSchema {
  version: number;
  
  // 游戏状态
  game: {
    coins: number;
    mode: AppMode;
  };
  
  // 用户数据
  user: User;
  
  // 会话历史
  sessions: FocusSession[];
  
  // 鱼缸
  aquarium: {
    fish: AquariumFish[];
    decorations: PlacedDecoration[];
    inventory: string[];
  };
}

class StorageService {
  private static KEY = 'bottled_ocean_v2';
  
  // === 保存 ===
  static save(data: Partial<StorageSchema>): void {
    const existing = this.load();
    const merged: StorageSchema = {
      ...existing,
      ...data,
      version: STORAGE_VERSION,
    };
    localStorage.setItem(this.KEY, JSON.stringify(merged));
  }
  
  // === 加载 ===
  static load(): StorageSchema {
    const raw = localStorage.getItem(this.KEY);
    if (!raw) {
      return this.getDefault();
    }
    
    try {
      const data = JSON.parse(raw);
      
      // 版本检查
      if (data.version < STORAGE_VERSION) {
        return this.migrate(data);
      }
      
      return data;
    } catch (e) {
      console.error('Failed to parse storage', e);
      return this.getDefault();
    }
  }
  
  // === 默认值 ===
  static getDefault(): StorageSchema {
    return {
      version: STORAGE_VERSION,
      game: {
        coins: 0,
        mode: AppMode.MENU,
      },
      user: createDefaultUser(),
      sessions: [],
      aquarium: {
        fish: [],
        decorations: [],
        inventory: [],
      },
    };
  }
  
  // === v1 迁移 ===
  static migrate(oldData: any): StorageSchema {
    console.log('Migrating from v1 to v2...');
    
    // 读取 v1 数据
    const v1Collection = localStorage.getItem('bottled_ocean_collection');
    const v1Coins = localStorage.getItem('bottled_ocean_coins');
    const v1Tank = localStorage.getItem('bottled_ocean_tank');
    
    const defaultData = this.getDefault();
    
    // 合并 v1 数据
    if (v1Coins) {
      defaultData.game.coins = parseInt(v1Coins, 10);
    }
    
    if (v1Collection) {
      try {
        defaultData.user.unlockedFishIds = JSON.parse(v1Collection);
      } catch (e) {}
    }
    
    if (v1Tank) {
      try {
        defaultData.aquarium.fish = JSON.parse(v1Tank);
      } catch (e) {}
    }
    
    // 保存迁移后的数据
    this.save(defaultData);
    
    // 可选：清理 v1 数据
    // localStorage.removeItem('bottled_ocean_collection');
    // localStorage.removeItem('bottled_ocean_coins');
    // localStorage.removeItem('bottled_ocean_tank');
    
    return defaultData;
  }
  
  // === 清除所有数据 ===
  static clear(): void {
    localStorage.removeItem(this.KEY);
  }
  
  // === 导出数据 ===
  static export(): string {
    return JSON.stringify(this.load(), null, 2);
  }
  
  // === 导入数据 ===
  static import(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.version) {
        localStorage.setItem(this.KEY, jsonString);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
```

---

## 数据迁移

### 启动时检查

```typescript
// App.tsx 或 useEffect

useEffect(() => {
  // 检查是否有 v1 数据但没有 v2 数据
  const hasV1 = localStorage.getItem('bottled_ocean_collection') !== null;
  const hasV2 = localStorage.getItem('bottled_ocean_v2') !== null;
  
  if (hasV1 && !hasV2) {
    console.log('Detected v1 data, migrating...');
    StorageService.migrate({});
  }
}, []);
```

### 迁移映射

| v1 Key | v2 位置 |
|--------|---------|
| `bottled_ocean_collection` | `user.unlockedFishIds` |
| `bottled_ocean_coins` | `game.coins` |
| `bottled_ocean_tank` | `aquarium.fish` |

---

## 相关文档

- [[00-overview]] - 返回总览
- [[05-fishdex]] - FishDex（消费统计数据）
- [[02-aquarium]] - 鱼缸（存储鱼和装饰）

---

#v2 #user-data #storage #module

