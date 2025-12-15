# 🏪 商店模块设计

> 所属: Bottled Ocean v2  
> 状态: 📋 Planning

---

## 模块职责

- 展示可购买的商品列表
- 处理购买逻辑（扣钱、添加到仓库）
- 商品分类和筛选
- 已拥有状态显示

---

## 对外接口

### 提供给其他模块

| 接口 | 类型 | 使用方 | 说明 |
|------|------|--------|------|
| `ShopPanel` | Component | App | 商店 UI 组件 |
| `purchaseDecoration()` | Function | UI | 购买装饰 |

### 依赖其他模块

| 依赖 | 来源模块 | 说明 |
|------|----------|------|
| `DECOR_REGISTRY` | 装饰物模块 | 商品数据 |
| `useGameStore.coins` | 用户数据 | 余额 |
| `useAquariumStore.inventory` | 鱼缸模块 | 已拥有装饰 |

---

## 商店数据

### 商品分类

```typescript
interface ShopCategory {
  id: string;
  name: string;
  icon: string;
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: 'all', name: '全部', icon: '🏠' },
  { id: 'plant', name: '植物', icon: '🌿' },
  { id: 'structure', name: '建筑', icon: '🏠' },
  { id: 'furniture', name: '家具', icon: '🛋️' },
  { id: 'toy', name: '玩具', icon: '🎾' },
];
```

### 商品列表

商品直接复用 `DECOR_REGISTRY`，按分类筛选即可。

```typescript
const getShopItems = (category: string): DecorationDef[] => {
  if (category === 'all') return DECOR_REGISTRY;
  return DECOR_REGISTRY.filter(d => d.category === category);
};
```

---

## 购买逻辑

```typescript
// systems/EconomySystem.ts

interface PurchaseResult {
  success: boolean;
  message: string;
}

const purchaseDecoration = (decorId: string): PurchaseResult => {
  const { coins, spendCoins } = useGameStore.getState();
  const { inventory, addToInventory } = useAquariumStore.getState();
  
  const decor = getDecorationById(decorId);
  if (!decor) {
    return { success: false, message: '商品不存在' };
  }
  
  // 检查是否已拥有（可选：允许购买多个）
  if (inventory.includes(decorId)) {
    return { success: false, message: '已拥有此装饰' };
  }
  
  // 检查余额
  if (coins < decor.price) {
    return { success: false, message: '金币不足' };
  }
  
  // 扣钱
  spendCoins(decor.price);
  
  // 添加到仓库
  addToInventory(decorId);
  
  return { success: true, message: `成功购买 ${decor.name}！` };
};
```

---

## UI 设计

### 商店界面

```
┌─────────────────────────────────────────────────────┐
│  🏪 商店                              💰 1,234     │
├─────────────────────────────────────────────────────┤
│  [全部] [🌿植物] [🏠建筑] [🛋️家具] [🎾玩具]       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │     🍍      │  │     🪸      │  │     🏰      │ │
│  │             │  │             │  │             │ │
│  │  菠萝房子   │  │  珊瑚床     │  │  城堡       │ │
│  │  💰 200     │  │  💰 80      │  │  💰 350     │ │
│  │             │  │             │  │             │ │
│  │  [ 购买 ]   │  │  [ 购买 ]   │  │  [已拥有]   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │     🌿      │  │     📦      │  │     🍖      │ │
│  │             │  │             │  │             │ │
│  │  海草丛     │  │  宝箱       │  │  食盆       │ │
│  │  💰 30      │  │  💰 120     │  │  💰 50      │ │
│  │             │  │             │  │             │ │
│  │  [ 购买 ]   │  │  [ 购买 ]   │  │  [ 购买 ]   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 商品卡片状态

| 状态 | 按钮 | 样式 |
|------|------|------|
| 可购买 | `[ 购买 ]` | 蓝色按钮 |
| 余额不足 | `[ 购买 ]` | 灰色按钮，不可点击 |
| 已拥有 | `[已拥有]` | 绿色标签 |
| 已摆放 | `[使用中]` | 灰色标签 |

---

## 组件实现

```tsx
// components/ui/Shop/ShopPanel.tsx

const ShopPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [category, setCategory] = useState('all');
  const { coins } = useGameStore();
  const { inventory, decorations } = useAquariumStore();
  
  const items = getShopItems(category);
  
  const getItemStatus = (decorId: string) => {
    const isPlaced = decorations.some(d => d.decorId === decorId);
    if (isPlaced) return 'placed';
    if (inventory.includes(decorId)) return 'owned';
    return 'available';
  };
  
  const handlePurchase = (decorId: string) => {
    const result = purchaseDecoration(decorId);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };
  
  return (
    <div className="shop-panel">
      <header>
        <h2>🏪 商店</h2>
        <div className="coins">💰 {coins}</div>
        <button onClick={onClose}>✕</button>
      </header>
      
      <nav className="categories">
        {SHOP_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={category === cat.id ? 'active' : ''}
            onClick={() => setCategory(cat.id)}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </nav>
      
      <div className="items-grid">
        {items.map(item => {
          const status = getItemStatus(item.id);
          const canAfford = coins >= item.price;
          
          return (
            <div key={item.id} className="item-card">
              <img src={item.spriteUrl} alt={item.name} />
              <h3>{item.name}</h3>
              <p className="price">💰 {item.price}</p>
              
              {status === 'available' && (
                <button
                  disabled={!canAfford}
                  onClick={() => handlePurchase(item.id)}
                >
                  购买
                </button>
              )}
              {status === 'owned' && <span className="badge owned">已拥有</span>}
              {status === 'placed' && <span className="badge placed">使用中</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

## 相关文档

- [[00-overview]] - 返回总览
- [[03-decoration]] - 装饰物模块（商品来源）
- [[06-user-data]] - 用户数据（金币系统）
- [[02-aquarium]] - 鱼缸模块（仓库系统）

---

#v2 #shop #module

