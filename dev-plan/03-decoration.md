# 🪴 装饰物模块设计

> 所属: Bottled Ocean v2  
> 状态: 📋 Planning

---

## 模块职责

- 定义装饰物的静态属性（外观、价格、类别）
- 管理装饰物的图层系统（前景/后景）
- 定义互动锚点（鱼可以停靠的位置）
- 提供互动系统逻辑

---

## 对外接口

### 提供给其他模块

| 接口 | 类型 | 使用方 | 说明 |
|------|------|--------|------|
| `DecorationDef` | Type | 鱼缸、商店 | 装饰物静态定义 |
| `PlacedDecoration` | Type | 鱼缸 | 已摆放的装饰实例 |
| `Anchor` | Type | 鱼模块 | 互动锚点定义 |
| `DECOR_REGISTRY` | Data | 全局 | 装饰物注册表 |
| `InteractionSystem` | Class | 鱼缸 | 互动系统 |

### 依赖其他模块

| 依赖 | 来源模块 | 说明 |
|------|----------|------|
| `AquariumFish` | 鱼模块 | 互动系统需要操作鱼 |

---

## 数据结构

### DecorationDef - 装饰物静态定义

```typescript
interface DecorationDef {
  // 基础信息
  id: string;                       // 'pineapple_house'
  name: string;                     // '菠萝房子'
  description: string;              // 描述
  category: DecorationCategory;     // 类别
  
  // 美术资源（核心！）
  spriteUrl: string;                // 基础图（无分层时使用）
  backLayerUrl?: string;            // 后景层（可选）
  frontLayerUrl?: string;           // 前景层（可选）
  
  // 尺寸
  width: number;                    // 像素宽
  height: number;                   // 像素高
  
  // 商店
  price: number;                    // 价格
  unlockCondition?: string;         // 解锁条件（可选）
  
  // 互动锚点
  anchors?: Anchor[];               // 鱼可以停靠的点
}

type DecorationCategory = 'plant' | 'structure' | 'toy' | 'furniture';
```

### Anchor - 互动锚点

```typescript
interface Anchor {
  id: string;                       // 'door', 'window', 'bed'
  type: AnchorType;                 // 锚点类型
  offsetX: number;                  // 相对于装饰物左上角的 X 偏移
  offsetY: number;                  // 相对于装饰物左上角的 Y 偏移
  capacity: number;                 // 同时容纳几条鱼
}

type AnchorType = 'rest' | 'play' | 'hide' | 'eat';
```

### PlacedDecoration - 已摆放的装饰

```typescript
interface PlacedDecoration {
  instanceId: string;               // 唯一实例 ID
  decorId: string;                  // 对应 DecorationDef.id
  x: number;                        // 在鱼缸中的位置
  y: number;
  flipped: boolean;                 // 是否水平翻转
}
```

---

## 图层系统

### 概念图

```
┌─────────────────────────────────────────────────────┐
│                   菠萝房子                           │
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │              backLayerUrl                     │  │
│  │           (房子后墙、内部)                     │  │
│  │                                               │  │
│  │         🐟 鱼在这里会被前景遮挡               │  │
│  │                                               │  │
│  ├───────────────────────────────────────────────┤  │
│  │                                               │  │
│  │              frontLayerUrl                    │  │
│  │           (房子前墙、门框)                     │  │
│  │           门/窗是镂空的                        │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 渲染顺序

1. 先画所有装饰的 `backLayerUrl`
2. 再画所有鱼
3. 最后画所有装饰的 `frontLayerUrl`

这样鱼就可以看起来"进入"房子内部。

### 美术制作要点

| 图层 | 内容 | 示例 |
|------|------|------|
| backLayer | 房子内部、后墙 | 内部家具、墙壁颜色 |
| frontLayer | 房子外壳、门窗框 | 门和窗是镂空的 PNG |

```
制作步骤：
1. 画完整的装饰物
2. 把"前面"的部分（会遮挡鱼的）单独导出为 frontLayer
3. 把"后面"的部分导出为 backLayer
4. 确保门/窗位置镂空（透明）
```

---

## 互动系统

### InteractionSystem 类

```typescript
// systems/InteractionSystem.ts

interface AnchorOccupancy {
  anchorId: string;
  decorInstanceId: string;
  occupiedBy: string[];    // fishInstanceId[]
}

class InteractionSystem {
  private anchorMap: Map<string, AnchorOccupancy> = new Map();
  
  update(fish: AquariumFish[], decorations: PlacedDecoration[]) {
    fish.forEach(f => {
      if (f.state === 'swimming') {
        this.checkForNearbyAnchor(f, decorations);
      } else {
        this.checkForLeaving(f);
      }
    });
  }
  
  private checkForNearbyAnchor(fish: AquariumFish, decorations: PlacedDecoration[]) {
    for (const decor of decorations) {
      const def = getDecorationById(decor.decorId);
      if (!def?.anchors) continue;
      
      for (const anchor of def.anchors) {
        // 计算锚点世界坐标
        const ax = decor.x + anchor.offsetX;
        const ay = decor.y + anchor.offsetY;
        
        const dist = Math.hypot(fish.x - ax, fish.y - ay);
        
        // 检查是否足够近 + 是否可用
        if (dist < 80 && this.isAnchorAvailable(decor.instanceId, anchor)) {
          // 随机决定是否互动（1% 概率）
          if (Math.random() < 0.01) {
            this.startInteraction(fish, decor, anchor);
            return;
          }
        }
      }
    }
  }
  
  private isAnchorAvailable(decorId: string, anchor: Anchor): boolean {
    const key = `${decorId}_${anchor.id}`;
    const occupancy = this.anchorMap.get(key);
    if (!occupancy) return true;
    return occupancy.occupiedBy.length < anchor.capacity;
  }
  
  private startInteraction(fish: AquariumFish, decor: PlacedDecoration, anchor: Anchor) {
    // 1. 更新鱼的状态
    fish.state = this.anchorTypeToState(anchor.type);
    fish.currentAnchorId = `${decor.instanceId}_${anchor.id}`;
    fish.stateStartTime = Date.now();
    
    // 2. 移动鱼到锚点位置
    const def = getDecorationById(decor.decorId)!;
    fish.targetX = decor.x + anchor.offsetX;
    fish.targetY = decor.y + anchor.offsetY;
    
    // 3. 记录占用
    this.occupyAnchor(decor.instanceId, anchor.id, fish.instanceId);
  }
  
  private checkForLeaving(fish: AquariumFish) {
    const elapsed = Date.now() - fish.stateStartTime;
    const duration = this.getStayDuration(fish.state);
    
    if (elapsed > duration) {
      this.endInteraction(fish);
    }
  }
  
  private endInteraction(fish: AquariumFish) {
    // 1. 释放锚点
    if (fish.currentAnchorId) {
      this.releaseAnchor(fish.currentAnchorId, fish.instanceId);
    }
    
    // 2. 恢复游泳状态
    fish.state = 'swimming';
    fish.currentAnchorId = undefined;
    
    // 3. 设置新的随机目标
    fish.targetX = Math.random() * canvasWidth;
    fish.targetY = Math.random() * (canvasHeight - 200);
  }
  
  private getStayDuration(state: FishState): number {
    const durations: Record<FishState, number> = {
      swimming: 0,
      resting: 15000,   // 15秒
      playing: 8000,    // 8秒
      hiding: 20000,    // 20秒
      eating: 5000,     // 5秒
    };
    return durations[state];
  }
  
  private anchorTypeToState(type: AnchorType): FishState {
    const map: Record<AnchorType, FishState> = {
      rest: 'resting',
      play: 'playing',
      hide: 'hiding',
      eat: 'eating',
    };
    return map[type];
  }
}
```

---

## 装饰物注册表

```typescript
// data/decorRegistry.ts

export const DECOR_REGISTRY: DecorationDef[] = [
  // === 建筑 ===
  {
    id: 'pineapple_house',
    name: '菠萝房子',
    description: '海绵宝宝同款！鱼可以进去休息',
    category: 'structure',
    spriteUrl: '/assets/sprites/decor/pineapple.png',
    backLayerUrl: '/assets/sprites/decor/pineapple_back.png',
    frontLayerUrl: '/assets/sprites/decor/pineapple_front.png',
    width: 150,
    height: 180,
    price: 200,
    anchors: [
      { id: 'door', type: 'hide', offsetX: 75, offsetY: 150, capacity: 2 },
      { id: 'window', type: 'rest', offsetX: 45, offsetY: 80, capacity: 1 },
    ],
  },
  
  // === 家具 ===
  {
    id: 'coral_bed',
    name: '珊瑚床',
    description: '柔软的珊瑚，鱼儿最爱的休息地',
    category: 'furniture',
    spriteUrl: '/assets/sprites/decor/coral_bed.png',
    width: 100,
    height: 60,
    price: 80,
    anchors: [
      { id: 'bed', type: 'rest', offsetX: 50, offsetY: 40, capacity: 3 },
    ],
  },
  
  // === 植物 ===
  {
    id: 'seaweed_cluster',
    name: '海草丛',
    description: '摇曳的海草，提供躲藏空间',
    category: 'plant',
    spriteUrl: '/assets/sprites/decor/seaweed.png',
    width: 80,
    height: 120,
    price: 30,
    anchors: [
      { id: 'hide_spot', type: 'hide', offsetX: 40, offsetY: 80, capacity: 2 },
    ],
  },
  
  // === 玩具 ===
  {
    id: 'treasure_chest',
    name: '宝箱',
    description: '打开看看有什么？',
    category: 'toy',
    spriteUrl: '/assets/sprites/decor/treasure.png',
    width: 80,
    height: 60,
    price: 120,
    anchors: [
      { id: 'play_spot', type: 'play', offsetX: 40, offsetY: 30, capacity: 2 },
    ],
  },
  
  // === 食物 ===
  {
    id: 'food_bowl',
    name: '食盆',
    description: '放一些鱼食',
    category: 'furniture',
    spriteUrl: '/assets/sprites/decor/food_bowl.png',
    width: 60,
    height: 40,
    price: 50,
    anchors: [
      { id: 'eat_spot', type: 'eat', offsetX: 30, offsetY: 20, capacity: 4 },
    ],
  },
];

// Helper
export const getDecorationById = (id: string): DecorationDef | undefined => {
  return DECOR_REGISTRY.find(d => d.id === id);
};
```

---

## 美术规范

| 属性 | 规格 |
|------|------|
| 格式 | PNG (透明背景) |
| 描边 | 2-3px 深棕色 (#4A3B32) |
| 尺寸 | 按实际设计，常见 80-200px |
| 风格 | 手绘、圆润、猫咪后院风格 |

### 分层制作

```
pineapple_back.png   →  后墙、内部（实心）
pineapple_front.png  →  外壳、门框（门窗镂空）
```

---

## 相关文档

- [[00-overview]] - 返回总览
- [[01-fish]] - 鱼模块（使用锚点）
- [[02-aquarium]] - 鱼缸模块（渲染装饰）
- [[04-shop]] - 商店模块（销售装饰）

---

#v2 #decoration #module

