# 🏠 鱼缸模块设计

> 所属: Bottled Ocean v2  
> 状态: 📋 Planning

---

## 模块职责

- 管理鱼缸场景的整体渲染
- 协调鱼和装饰物的绘制顺序
- 处理用户交互（喂食、点击、拖拽）
- 提供编辑模式（装饰摆放）

---

## 对外接口

### 提供给其他模块

| 接口 | 类型 | 使用方 | 说明 |
|------|------|--------|------|
| `useAquariumStore` | Hook | App、UI | 鱼缸状态管理 |
| `AquariumCanvas` | Component | App | 鱼缸渲染组件 |

### 依赖其他模块

| 依赖 | 来源模块 | 说明 |
|------|----------|------|
| `FishDef`, `AquariumFish` | 鱼模块 | 鱼的数据和渲染 |
| `DecorationDef`, `PlacedDecoration` | 装饰物模块 | 装饰的数据和渲染 |
| `FishBehavior` | 鱼模块 | 鱼的行为更新 |
| `InteractionSystem` | 装饰物模块 | 鱼与装饰互动 |

---

## 状态管理

### AquariumStore

```typescript
// store/useAquariumStore.ts

interface AquariumState {
  // === 鱼 ===
  fish: AquariumFish[];
  addFish: (fishId: string) => void;
  removeFish: (instanceId: string) => void;
  updateFish: (instanceId: string, updates: Partial<AquariumFish>) => void;
  
  // === 装饰 ===
  decorations: PlacedDecoration[];
  placeDecoration: (decorId: string, x: number, y: number) => void;
  moveDecoration: (instanceId: string, x: number, y: number) => void;
  removeDecoration: (instanceId: string) => void;
  flipDecoration: (instanceId: string) => void;
  
  // === 编辑模式 ===
  isEditMode: boolean;
  toggleEditMode: () => void;
  selectedDecorationId: string | null;
  selectDecoration: (id: string | null) => void;
  
  // === 仓库（已购买未摆放）===
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
      
      addFish: (fishId) => {
        const newFish = createFishInstance(fishId);
        set(s => ({ fish: [...s.fish, newFish] }));
      },
      
      removeFish: (instanceId) => {
        set(s => ({ fish: s.fish.filter(f => f.instanceId !== instanceId) }));
      },
      
      placeDecoration: (decorId, x, y) => {
        const newDecor: PlacedDecoration = {
          instanceId: crypto.randomUUID(),
          decorId,
          x,
          y,
          flipped: false,
        };
        set(s => ({
          decorations: [...s.decorations, newDecor],
          inventory: s.inventory.filter(id => id !== decorId),
        }));
      },
      
      // ... 其他方法
    }),
    { name: 'bottled-ocean-aquarium' }
  )
);
```

---

## 渲染架构

### 层级结构

```
┌─────────────────────────────────────────────────────┐
│                    Canvas                           │
├─────────────────────────────────────────────────────┤
│  Layer 1: 背景                                      │
│  - 渐变色背景                                        │
│  - 光线效果                                          │
├─────────────────────────────────────────────────────┤
│  Layer 2: 装饰后景层 (backLayer)                    │
│  - 装饰物的后半部分                                  │
│  - 按 Y 坐标排序                                    │
├─────────────────────────────────────────────────────┤
│  Layer 3: 鱼                                        │
│  - 按 Y 坐标排序                                    │
│  - 在锚点内的鱼特殊处理                              │
├─────────────────────────────────────────────────────┤
│  Layer 4: 装饰前景层 (frontLayer)                   │
│  - 装饰物的前半部分                                  │
│  - 可遮挡鱼                                          │
├─────────────────────────────────────────────────────┤
│  Layer 5: 前景特效                                  │
│  - 气泡                                              │
│  - 喂食效果                                          │
├─────────────────────────────────────────────────────┤
│  Layer 6: 编辑模式 UI                               │
│  - 选中框                                            │
│  - 拖拽指示                                          │
└─────────────────────────────────────────────────────┘
```

### 渲染流程

```typescript
// components/canvas/AquariumCanvas.tsx

const render = () => {
  const { fish, decorations, isEditMode, selectedDecorationId } = useAquariumStore.getState();
  
  // 1. 清空画布
  ctx.clearRect(0, 0, width, height);
  
  // 2. 背景
  drawBackground(ctx, width, height);
  drawGodRays(ctx, time);
  
  // 3. 装饰后景层（按 Y 排序）
  const sortedDecor = [...decorations].sort((a, b) => a.y - b.y);
  sortedDecor.forEach(d => {
    const def = getDecorationById(d.decorId);
    if (def?.backLayerUrl) {
      drawDecorLayer(ctx, d, def.backLayerUrl);
    }
  });
  
  // 4. 鱼（按 Y 排序）
  const sortedFish = [...fish].sort((a, b) => a.y - b.y);
  sortedFish.forEach(f => drawFish(ctx, f));
  
  // 5. 装饰前景层
  sortedDecor.forEach(d => {
    const def = getDecorationById(d.decorId);
    if (def?.frontLayerUrl) {
      drawDecorLayer(ctx, d, def.frontLayerUrl);
    } else if (!def?.backLayerUrl) {
      // 无分层的装饰，直接画
      drawDecorLayer(ctx, d, def.spriteUrl);
    }
  });
  
  // 6. 气泡等前景特效
  drawBubbles(ctx, bubbles, time);
  
  // 7. 喂食交互
  if (interactionRef.current.isPressing) {
    drawFeedingEffect(ctx, interactionRef.current.x, interactionRef.current.y);
  }
  
  // 8. 编辑模式 UI
  if (isEditMode) {
    drawEditOverlay(ctx, decorations, selectedDecorationId);
  }
};
```

---

## 交互系统

### 普通模式

| 交互 | 行为 |
|------|------|
| 点击 | 无 |
| 长按 | 喂食效果，吸引附近的鱼 |
| 滑动 | 平移视图（如果画布大于屏幕） |

### 编辑模式

| 交互 | 行为 |
|------|------|
| 点击装饰 | 选中装饰，显示操作按钮 |
| 拖拽装饰 | 移动装饰位置 |
| 点击空白 | 取消选中 |
| 底部按钮 | 旋转/删除/打开仓库 |

### 编辑模式 UI

```
┌─────────────────────────────────────────────────────┐
│  🔧 编辑模式                           [✓ 完成]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│         ╔═══════════╗                               │
│         ║   🍍     ║  ← 选中高亮                   │
│         ╚═══════════╝                               │
│                           🐠                        │
│              🪸                                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [🔄 翻转]  [🗑️ 放回仓库]  [📦 仓库]              │
└─────────────────────────────────────────────────────┘
```

---

## 画布尺寸

```typescript
// 画布尺寸 = 视口 * 倍数（可滚动）
const getDimensions = () => ({
  width: window.innerWidth * 3.0,   // 3倍宽度
  height: window.innerHeight * 2.0, // 2倍高度
});
```

用户可以通过滑动查看整个鱼缸。

---

## 游戏循环

```typescript
useEffect(() => {
  let animationFrameId: number;
  let lastTime = 0;
  
  const gameLoop = (currentTime: number) => {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    // 1. 更新鱼的行为
    const { fish, decorations } = useAquariumStore.getState();
    fish.forEach(f => {
      FishBehavior.update(f, deltaTime, { decorations });
    });
    
    // 2. 更新互动系统
    InteractionSystem.update(fish, decorations);
    
    // 3. 渲染
    render();
    
    animationFrameId = requestAnimationFrame(gameLoop);
  };
  
  animationFrameId = requestAnimationFrame(gameLoop);
  return () => cancelAnimationFrame(animationFrameId);
}, []);
```

---

## 相关文档

- [[00-overview]] - 返回总览
- [[01-fish]] - 鱼模块
- [[03-decoration]] - 装饰物模块

---

#v2 #aquarium #module

