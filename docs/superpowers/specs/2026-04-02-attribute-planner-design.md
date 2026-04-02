# 屬性規劃 (Attribute Planner) — Design Spec

**Date:** 2026-04-02  
**Status:** Approved (design)  
**Phase Strategy:** V1 採用 Plan A（曲線查表插值），V2 升級 Plan B（完整公式重算）

## Overview

新增 SPA 頁面 `#/attribute-planner`，提供進階玩家進行手動屬性微調，並即時計算候選方案相對於基準方案的**預估有效傷害提升**。  
V1 採用來源於 `pvp calculator 2.2.7.xlsx` 的收益曲線做插值估算（Plan A），保持低耦合、高可維護；未來再升級到完整公式重算（Plan B）。

## Scope

### In Scope (V1)
- 新路由/頁面：`#/attribute-planner`
- 手機優先向導式流程（Wizard）
- 5 個屬性規劃：攻擊、元素攻擊、破防、命中、會心
- Baseline vs Candidate 比較
- 顯示 `預估有效傷害提升 (%)`
- 顯示各屬性貢獻與 Top 3 貢獻來源
- 本地資料檔：`tools/attributes-db.json`

### Out of Scope (V1)
- 與 `#/calculator` 欄位雙向連動
- 多方案儲存/管理
- 直接套用完整傷害公式重算
- 雲端同步、帳號系統

## Route and File Changes

| File | Change |
|------|--------|
| `index.html` | 新增 `#/attribute-planner` 導覽項目（側欄 + 手機底部導覽）、新增 `#view-attribute-planner` 容器、註冊 route、載入 `tools/attribute-planner.js` |
| `styles.css` | 新增 `#view-attribute-planner` 範圍內樣式（向導步驟、表單、結果卡片、響應式） |
| `tools/attribute-planner.js` | 新增初始化與頁面邏輯（狀態管理、輸入驗證、曲線插值、結果渲染） |
| `tools/attributes-db.json` | 新增屬性規劃資料（屬性定義、模板、曲線資料、meta） |

## UX Flow (Wizard)

### Step 1 — 選擇模板
- 模板：`PVP 均衡` / `PVP 爆發` / `PVP 穩定`
- 套用模板後初始化：`candidate = baseline`

### Step 2 — 設定 Baseline（目前面板）
- 輸入 5 個屬性目前值
- 套用資料檔定義的 min/max/step

### Step 3 — 調整 Candidate（目標面板）
- 輸入 5 個屬性目標值
- 提供快速調整（例如 ±50 / ±100）
- 即時顯示與 baseline 差值

### Step 4 — 結果分析
- 主 KPI：`預估有效傷害提升 (%)`
- 次要資訊：各屬性貢獻、貢獻占比、Top 3
- 命中收益為 0 的區間需提示（如「命中接近封頂」）

### Step 5 — 確認/重置
- 重置 `candidate = baseline`
- 可返回調整（不清空全部流程）

## Data Source and Conversion

### Source Workbook
- `pvp calculator 2.2.7.xlsx`

### Source Sheets (V1)
- `攻击提升收益`
- `元素攻击提升收益`
- `破防提升收益`
- `命中提升收益`
- `会心提升收益`

### Conversion Rules
- 轉出 `tools/attributes-db.json`
- 每個屬性轉為 `[{ x, gain }]` 曲線序列
  - `x`: 該屬性實際值
  - `gain`: 對應傷害提升百分比（相對基準）
- 清洗規則：
  - 只保留可解析為數值的列
  - 依 `x` 升冪排序
  - 同一 `x` 重複時保留最後一筆

## attributes-db.json Schema (V1)

```json
{
  "version": "2.2.7",
  "kpiName": "預估有效傷害提升",
  "meta": {
    "sourceWorkbook": "pvp calculator 2.2.7.xlsx",
    "generatedAt": "ISO-8601",
    "notes": "Plan A curve interpolation dataset"
  },
  "attributes": [
    { "id": "attack", "name": "攻擊", "min": 0, "max": 999999, "step": 1, "unit": "" },
    { "id": "elementalAttack", "name": "元素攻擊", "min": 0, "max": 999999, "step": 1, "unit": "" },
    { "id": "defenseBreak", "name": "破防", "min": 0, "max": 999999, "step": 1, "unit": "" },
    { "id": "accuracy", "name": "命中", "min": 0, "max": 999999, "step": 1, "unit": "" },
    { "id": "crit", "name": "會心", "min": 0, "max": 999999, "step": 1, "unit": "" }
  ],
  "templates": [
    {
      "id": "balanced",
      "name": "PVP 均衡",
      "baseline": {
        "attack": 17500,
        "elementalAttack": 6200,
        "defenseBreak": 13000,
        "accuracy": 4400,
        "crit": 4600
      }
    },
    {
      "id": "burst",
      "name": "PVP 爆發",
      "baseline": {
        "attack": 17500,
        "elementalAttack": 6200,
        "defenseBreak": 13000,
        "accuracy": 4200,
        "crit": 4800
      }
    },
    {
      "id": "stable",
      "name": "PVP 穩定",
      "baseline": {
        "attack": 17500,
        "elementalAttack": 6200,
        "defenseBreak": 13000,
        "accuracy": 4600,
        "crit": 4500
      }
    }
  ],
  "curves": {
    "attack": [{ "x": 17500, "gain": 0.0 }],
    "elementalAttack": [{ "x": 6200, "gain": 0.0 }],
    "defenseBreak": [{ "x": 13000, "gain": 0.0 }],
    "accuracy": [{ "x": 4400, "gain": 0.0 }],
    "crit": [{ "x": 4600, "gain": 0.0 }]
  }
}
```

## Calculation Engine (Plan A)

### Curve Lookup
- 線性插值：在曲線 `x1 <= x <= x2` 區間插值 `gain`
- 邊界外處理：clamp 到最小/最大 `x` 對應 `gain`（不外推）

### KPI
- `baselineTotal = Σ gain(attr, baseline[attr])`
- `candidateTotal = Σ gain(attr, candidate[attr])`
- `improvePercent = ((candidateTotal - baselineTotal) / max(baselineTotal, epsilon)) * 100`

### Contribution Breakdown
- `contribution[attr] = gain(attr, candidate[attr]) - gain(attr, baseline[attr])`
- 顯示貢獻值、占比、Top 3

## State and Error Handling

- 初始化 guard：`window.__attributePlannerInitialized`
- 載入中：顯示 loading UI
- JSON 載入失敗：顯示通知 `屬性規劃資料載入失敗，請更新資料檔`，並顯示空狀態
- 非法輸入（空值/非數字）：回退到 0 或 min，欄位顯示提示
- 超出可估區間：值可輸入但計算採 clamp，顯示「已達模型估算邊界」提示

## Plan B Upgrade Path (Future)

V2 目標：用完整傷害公式替代曲線估算，提升一致性。

### 設計要求
- 保持 UI 與資料流不變
- 計算引擎抽象化：`calculateEstimate(state, engine)`
  - V1：`curveEngine`
  - V2：`formulaEngine`

### 預留欄位
- 後續可在 `attributes-db.json` 新增：
  - `formulaConstants`
  - `conversionRules`
  - `defenderAssumptions`

## Manual Verification Checklist

1. 可進入 `#/attribute-planner` 並完成向導流程
2. 模板切換可正確載入 baseline
3. Baseline/Candidate 任一欄位變更會即時更新 KPI
4. 顯示 `預估有效傷害提升`、各屬性貢獻與 Top 3
5. 越界值會被 clamp 並顯示邊界提示
6. JSON 讀取失敗會顯示錯誤通知與空狀態
7. 手機版向導流程可順暢操作
