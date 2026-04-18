# Calculator / Planner Formula Equivalence Audit

日期：2026-04-18

## 對照範圍

本審計對照以下兩組實作：

### 重構前
- `git show ac2cb14^:tools/calculator.js`
- `git show ac2cb14^:tools/attribute-planner.js`

### 重構後
- `tools/combat-formulas.js`
- `tools/calculator.js`
- `tools/attribute-planner.js`

目標是確認 calculator 與 planner 在重構成共用 `window.pvpCombat` 後，數學邏輯沒有被錯誤修改。

## 核心常數對照

| 項目 | 舊版 | 新版 | 結論 |
| --- | --- | --- | --- |
| Skill Base | `58000` | `58000` | 一致 |
| Skill Multiplier | `3.38` | `3.38` | 一致 |

## 核心函式對照

| 函式 | 舊版邏輯 | 新版邏輯 | 結論 |
| --- | --- | --- | --- |
| `calculateRemainDefense` | `Math.max(0, defense - defenseBreak)` | 相同 | 一致 |
| `calculateDefenseRate` | `Math.max(10, ((remainDefense / (remainDefense + 19032)) * 100) + 10)` | 相同 | 一致 |
| `calculateRemainShield` | 三段式：全破 / 中段 / 低破盾 | 相同 | 一致 |
| `calculateElementalResisRate` | `diff / (diff + 4762) * 100` | 相同 | 一致 |
| `calculateActualAccuracyRate` | `min(((143 * diff)/(diff+10688)+95)/100, 1) * 100` | 相同 | 一致 |
| `calculateActualCritRate` | `min(baseRate + extraCritRate/100, 1) * 100` | 相同 | 一致 |

## 複合傷害公式對照

### Base Damage

舊版與新版都使用：

```text
((58000 + 3.38 * (attack + pvpAttack + skillAttack - pvpResistance - remainShield - skillResistance))
  * (1 - defenseRate / 100)
  + elementalAttack * 3.38 * (1 - elementalResisRate / 100))
  * (1 + pvpAttackRate / 100)
```

### Final Damage

舊版與新版都使用：

```text
Math.max(0, baseDamage)
```

### Expected Damage

舊版行內寫法與新版 `critBonus` 中間變數寫法代數等價：

```text
Math.floor(
  finalDamage * (actualAccuracyRate / 100) * (1 + (actualCritRate / 100) * ((critDamage / 100) - (criticalDefense / 100)))
  + finalDamage * (1 - (actualAccuracyRate / 100)) * 0.5
)
```

## 需要注意但不構成錯誤的點

### `parseInt(..., 10)`

新版在 `combat-formulas.js` 中明確指定十進位，較舊版 `parseInt(value)` 更安全。對正常輸入值不構成差異。

### Planner 仍只規劃 8 個 baseline sync 屬性

像 `pvpAttack`、`pvpAttackRate`、`extraCritRate`、`skillAttack` 仍不是 planner 可調整欄位，這是既有設計，不是本次重構造成的問題。

### 負 `critBonus` 仍是既有行為

若 `criticalDefense` 大於 `critDamage`，新舊版都會讓暴擊期望值下降。這是原本就存在的公式行為，並非本次變更引入。

## 最終判斷

重構後的 `tools/combat-formulas.js` 與重構前 calculator / planner 內聯公式在數學上等價，沒有發現常數、係數、上下限、分支或截斷位置被錯誤修改。

也就是說，這次變更是**抽共用公式**，不是**改公式**。
