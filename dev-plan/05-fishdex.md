# 📊 FishDex 模块设计

> 所属: Bottled Ocean v2  
> 状态: 📋 Planning

---

## 模块职责

- 展示专注统计数据（日/周/月/年）
- 展示鱼类收集图鉴
- 管理成就系统
- 提供数据可视化（柱状图）

---

## 对外接口

### 提供给其他模块

| 接口 | 类型 | 使用方 | 说明 |
|------|------|--------|------|
| `FishDexPanel` | Component | App | FishDex UI |
| `useFocusStats()` | Hook | UI | 统计计算 |
| `useAchievements()` | Hook | UI | 成就状态 |

### 依赖其他模块

| 依赖 | 来源模块 | 说明 |
|------|----------|------|
| `FocusSession[]` | 用户数据 | 历史记录 |
| `FISH_REGISTRY` | 鱼模块 | 图鉴数据 |
| `User.unlockedFishIds` | 用户数据 | 收集进度 |

---

## Tab 结构

```
┌─────────────────────────────────────────────────────┐
│  📊 FishDex                              [X 关闭]  │
├─────────────────────────────────────────────────────┤
│     [📈 专注统计]     [🐠 图鉴/成就]               │
├─────────────────────────────────────────────────────┤
│                                                     │
│              (Tab 内容区域)                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Tab 1: 专注统计

### UI 布局

```
┌─────────────────────────────────────────────────────┐
│  📈 专注统计                                        │
├─────────────────────────────────────────────────────┤
│  🎣 今日渔获                                        │
│  ┌───────┐ ┌───────┐ ┌───────┐                     │
│  │  🐠   │ │  🦀   │ │  🐟   │  共 3 条           │
│  │ +10💰 │ │ +15💰 │ │ +12💰 │                     │
│  └───────┘ └───────┘ └───────┘                     │
├─────────────────────────────────────────────────────┤
│  ⏱️ 专注时长                                        │
│  [日] [周] [月] [年]                                │
│                                                     │
│  60│                                                │
│  45│        ██                                      │
│  30│     ██ ██ ██                                   │
│  15│  ██ ██ ██ ██ ██    ██                          │
│   0└────────────────────────                        │
│      9  10 11 12 13 14 15 16 17  (小时)            │
│                                                     │
│  📊 今日总计: 2h 15m    🔥 连续: 5 天              │
├─────────────────────────────────────────────────────┤
│  💡 专注洞察                                        │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🌅 最佳时段: 上午 10:00-12:00               │   │
│  │ 📈 本周趋势: ↑ 比上周多 45 分钟             │   │
│  │ 🎯 平均时长: 32 分钟/次                     │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 时间范围

| 范围 | X轴 | 数据点 |
|------|-----|--------|
| 日 | 小时 (0-23) | 24 个 |
| 周 | 周一-周日 | 7 个 |
| 月 | 1-31 日 | 28-31 个 |
| 年 | 1-12 月 | 12 个 |

### 统计 Hook

```typescript
// hooks/useFocusStats.ts

interface ChartDataPoint {
  label: string;
  value: number;  // 分钟
}

interface FocusInsights {
  bestHour: string;        // "10:00-12:00"
  trend: string;           // "+45 分钟" 或 "-20 分钟"
  avgDuration: number;     // 32
}

interface FocusStatsResult {
  chartData: ChartDataPoint[];
  totalMinutes: number;
  sessionCount: number;
  insights: FocusInsights;
}

const useFocusStats = (
  sessions: FocusSession[],
  range: 'day' | 'week' | 'month' | 'year'
): FocusStatsResult => {
  return useMemo(() => {
    const now = new Date();
    const filtered = filterByRange(sessions, now, range);
    
    // 生成图表数据
    const chartData = generateChartData(filtered, range);
    
    // 计算洞察
    const bestHour = findBestHour(filtered);
    const trend = calculateTrend(sessions, range);
    const totalMinutes = sum(filtered.map(s => s.durationMinutes));
    const avgDuration = totalMinutes / filtered.length || 0;
    
    return {
      chartData,
      totalMinutes,
      sessionCount: filtered.length,
      insights: {
        bestHour,
        trend,
        avgDuration: Math.round(avgDuration),
      },
    };
  }, [sessions, range]);
};

// 生成图表数据
const generateChartData = (
  sessions: FocusSession[],
  range: 'day' | 'week' | 'month' | 'year'
): ChartDataPoint[] => {
  switch (range) {
    case 'day':
      // 24 小时
      return Array.from({ length: 24 }, (_, hour) => ({
        label: `${hour}`,
        value: sumMinutesForHour(sessions, hour),
      }));
      
    case 'week':
      // 7 天
      const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      return days.map((label, i) => ({
        label,
        value: sumMinutesForDayOfWeek(sessions, i),
      }));
      
    case 'month':
      // 当月天数
      const daysInMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0
      ).getDate();
      return Array.from({ length: daysInMonth }, (_, day) => ({
        label: `${day + 1}`,
        value: sumMinutesForDate(sessions, day + 1),
      }));
      
    case 'year':
      // 12 个月
      return Array.from({ length: 12 }, (_, month) => ({
        label: `${month + 1}月`,
        value: sumMinutesForMonth(sessions, month),
      }));
  }
};
```

---

## Tab 2: 图鉴/成就

### UI 布局

```
┌─────────────────────────────────────────────────────┐
│  🐠 图鉴 & 成就                                     │
├─────────────────────────────────────────────────────┤
│  收集进度: 7/9 (78%)                                │
│  ████████████████████░░░░░                          │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │   🐠    │ │   🐟    │ │   🦀    │ │   🏮    │  │
│  │ Nemo    │ │ Dory    │ │  Crab   │ │ Lantern │  │
│  │ Common  │ │ Common  │ │ Common  │ │  Rare   │  │
│  │  x 12   │ │  x 8    │ │  x 5    │ │  x 3    │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │   🪼    │ │   ❓    │ │   ❓    │              │
│  │  Jelly  │ │  ???    │ │  ???    │ ← 未解锁    │
│  │  Rare   │ │ Legend  │ │ Legend  │              │
│  │  x 2    │ │  x 0    │ │  x 0    │              │
│  └─────────┘ └─────────┘ └─────────┘              │
├─────────────────────────────────────────────────────┤
│  🏆 成就                                            │
│  ┌─────────────────────────────────────────────┐   │
│  │ ✅ 初次下水 - 完成第一次专注              │   │
│  │ ✅ 渔夫学徒 - 钓到 10 条鱼               │   │
│  │ ✅ 雨中垂钓 - 在雨天钓到鱼               │   │
│  │ 🔒 深夜钓手 - 在凌晨钓到鱼   (进度 0/1)  │   │
│  │ 🔒 收藏家 - 收集所有鱼类     (进度 78%)  │   │
│  │ 🔒 专注大师 - 累计专注100h   (进度 12%)  │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 成就系统

### 数据结构

```typescript
// types/achievement.ts

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  
  condition: AchievementCondition;
  reward?: AchievementReward;
}

interface AchievementCondition {
  type: 'fish_count' | 'focus_minutes' | 'streak' | 'collection' | 'weather' | 'time' | 'rarity';
  target: number | string;
}

interface AchievementReward {
  coins?: number;
  decorationId?: string;
}

interface AchievementProgress {
  achievementId: string;
  unlocked: boolean;
  unlockedAt?: number;
  currentProgress: number;
  targetProgress: number;
}
```

### 成就列表

```typescript
// data/achievements.ts

export const ACHIEVEMENTS: Achievement[] = [
  // === 入门 ===
  {
    id: 'first_catch',
    name: '初次下水',
    description: '完成第一次专注并钓到鱼',
    icon: '🎣',
    condition: { type: 'fish_count', target: 1 },
  },
  {
    id: 'apprentice',
    name: '渔夫学徒',
    description: '累计钓到 10 条鱼',
    icon: '🐟',
    condition: { type: 'fish_count', target: 10 },
  },
  {
    id: 'fisherman',
    name: '老渔夫',
    description: '累计钓到 100 条鱼',
    icon: '🎏',
    condition: { type: 'fish_count', target: 100 },
    reward: { coins: 500 },
  },
  
  // === 专注时长 ===
  {
    id: 'focus_1h',
    name: '专注一小时',
    description: '单次专注达到 60 分钟',
    icon: '⏰',
    condition: { type: 'focus_minutes', target: 60 },
  },
  {
    id: 'focus_10h',
    name: '专注达人',
    description: '累计专注达到 10 小时',
    icon: '⏱️',
    condition: { type: 'focus_minutes', target: 600 },
  },
  {
    id: 'focus_master',
    name: '专注大师',
    description: '累计专注达到 100 小时',
    icon: '🧘',
    condition: { type: 'focus_minutes', target: 6000 },
    reward: { coins: 1000, decorationId: 'golden_statue' },
  },
  
  // === 连续 ===
  {
    id: 'streak_3',
    name: '三天打鱼',
    description: '连续 3 天完成专注',
    icon: '🔥',
    condition: { type: 'streak', target: 3 },
  },
  {
    id: 'streak_7',
    name: '一周坚持',
    description: '连续 7 天完成专注',
    icon: '🔥',
    condition: { type: 'streak', target: 7 },
    reward: { coins: 100 },
  },
  {
    id: 'streak_30',
    name: '月度冠军',
    description: '连续 30 天完成专注',
    icon: '🏆',
    condition: { type: 'streak', target: 30 },
    reward: { coins: 500 },
  },
  
  // === 特殊条件 ===
  {
    id: 'rainy_fisher',
    name: '雨中垂钓',
    description: '在雨天钓到一条鱼',
    icon: '🌧️',
    condition: { type: 'weather', target: 'RAINY' },
  },
  {
    id: 'night_owl',
    name: '深夜钓手',
    description: '在凌晨 0-5 点钓到鱼',
    icon: '🦉',
    condition: { type: 'time', target: 'midnight' },
  },
  {
    id: 'legendary_hunter',
    name: '传说猎人',
    description: '钓到一条传说级鱼',
    icon: '⭐',
    condition: { type: 'rarity', target: 'Legendary' },
  },
  
  // === 收集 ===
  {
    id: 'collector_50',
    name: '初级收藏家',
    description: '收集 50% 的鱼类',
    icon: '📖',
    condition: { type: 'collection', target: 50 },
  },
  {
    id: 'collector_100',
    name: '完美收藏家',
    description: '收集所有种类的鱼',
    icon: '📚',
    condition: { type: 'collection', target: 100 },
    reward: { coins: 2000 },
  },
];
```

### 成就检查系统

```typescript
// systems/AchievementSystem.ts

class AchievementSystem {
  checkAchievements(user: User, sessions: FocusSession[]): AchievementProgress[] {
    return ACHIEVEMENTS.map(achievement => {
      const progress = this.calculateProgress(achievement, user, sessions);
      const unlocked = progress.currentProgress >= progress.targetProgress;
      
      return {
        achievementId: achievement.id,
        unlocked,
        unlockedAt: unlocked ? this.getUnlockTime(achievement.id, user) : undefined,
        ...progress,
      };
    });
  }
  
  private calculateProgress(
    achievement: Achievement,
    user: User,
    sessions: FocusSession[]
  ): { currentProgress: number; targetProgress: number } {
    const { type, target } = achievement.condition;
    
    switch (type) {
      case 'fish_count':
        return {
          currentProgress: user.stats.totalFishCaught,
          targetProgress: target as number,
        };
        
      case 'focus_minutes':
        return {
          currentProgress: user.stats.totalFocusMinutes,
          targetProgress: target as number,
        };
        
      case 'streak':
        return {
          currentProgress: user.stats.longestStreak,
          targetProgress: target as number,
        };
        
      case 'collection':
        const total = FISH_REGISTRY.length;
        const collected = user.unlockedFishIds.length;
        const percentage = (collected / total) * 100;
        return {
          currentProgress: Math.round(percentage),
          targetProgress: target as number,
        };
        
      case 'weather':
        const hasWeather = sessions.some(
          s => s.weather === target && s.completed
        );
        return {
          currentProgress: hasWeather ? 1 : 0,
          targetProgress: 1,
        };
        
      case 'time':
        const hasMidnight = sessions.some(s => {
          const hour = new Date(s.startTime).getHours();
          return hour >= 0 && hour < 5 && s.completed;
        });
        return {
          currentProgress: hasMidnight ? 1 : 0,
          targetProgress: 1,
        };
        
      case 'rarity':
        const hasRarity = sessions.some(s => {
          if (!s.caughtFishId) return false;
          const fish = getFishById(s.caughtFishId);
          return fish?.rarity === target;
        });
        return {
          currentProgress: hasRarity ? 1 : 0,
          targetProgress: 1,
        };
        
      default:
        return { currentProgress: 0, targetProgress: 1 };
    }
  }
}
```

---

## 图表组件

### 简单柱状图

```tsx
// components/ui/FishDex/BarChart.tsx

interface BarChartProps {
  data: ChartDataPoint[];
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, height = 200 }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="bar-chart" style={{ height }}>
      <div className="y-axis">
        <span>{maxValue}</span>
        <span>{Math.round(maxValue / 2)}</span>
        <span>0</span>
      </div>
      
      <div className="bars">
        {data.map((point, i) => (
          <div key={i} className="bar-container">
            <div
              className="bar"
              style={{
                height: `${(point.value / maxValue) * 100}%`,
              }}
            />
            <span className="label">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 相关文档

- [[00-overview]] - 返回总览
- [[01-fish]] - 鱼模块（图鉴数据）
- [[06-user-data]] - 用户数据（统计来源）

---

#v2 #fishdex #statistics #achievement #module

