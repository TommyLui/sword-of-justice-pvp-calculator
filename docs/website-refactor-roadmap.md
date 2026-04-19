# Website Refactor Roadmap

日期：2026-04-18

## 目標

本 roadmap 的目標不是把專案改造成框架型應用，而是在保持目前靜態 SPA 架構的前提下，降低維護成本、減少耦合，並優先處理高投報比的改善項目。

## Phase 1：低風險結構收斂

### 1. 收斂 shell / shared CSS

狀態：**已完成**

範圍：

- `index.html`
- `styles.css`

目標：

- 把 `index.html` 內的共用 shell / notification / layout CSS 逐步收進 `styles.css`
- 保持功能不變，只降低樣式來源分散問題

成功標準：

- shell 主要 CSS 不再分散於兩個地方
- UI 無明顯回歸

### 2. 補 error-path 測試

狀態：**已完成**

優先項目：

- calculator import 壞 JSON
- OCR API 拋錯
- crafting fetch failure（若可穩定模擬）

成功標準：

- 有明確錯誤通知
- app 不崩潰
- 測試可重複執行

## Phase 2：降低跨模組耦合

### 1. 收斂 `ocr-demo.js`

狀態：**進行中**

建議拆分方向：

- parser helpers
- OCR runtime / worker loading
- sample/debug logic
- public API glue

不是強制拆成多檔，但至少要把責任分區更清楚。

### 2. 收斂 `league.js`

狀態：**進行中**

建議拆分方向：

- CSV parsing
- state restore
- rendering helpers
- chart rendering / fallback

目標是讓這個檔案未來再擴功能時，不會快速變成不可維護的大檔。

### 3. 減少 shell DOM 直接耦合

狀態：**進行中**

例如：

- dark mode 改以自定義事件或狀態驅動
- feature module 不直接綁死 shell 元件 id

## Phase 3：強化一致性與維運能力

### 1. 文件同步治理

狀態：**進行中**

每次功能調整時，至少同步檢查：

- `README.md`
- `AGENTS.md`
- `docs/testing-guide.md`
- `docs/testing-capability-overview.md`

### 2. 公式與測試治理

狀態：**已完成**

持續維持：

- `tools/combat-formulas.js` 作為唯一公式來源
- `tests/e2e/formulas.spec.js` 的 golden values
- `docs/superpowers/specs/2026-04-18-formula-equivalence-audit.md`

### 3. 避免過早大改架構

狀態：**已遵守**

短中期內不建議急著把整個 repo 改成 React/Vue/Vite 專案。當前更高投報比的工作，是在既有架構上持續降低耦合與提高可測試性。

## 建議執行順序

1. shell/shared CSS 收斂
2. error-path tests
3. `ocr-demo.js` 收斂
4. `league.js` 收斂
5. shell DOM 耦合降低
6. 文件治理常態化

## 結論

這個網站目前最大的問題不是「技術選型太舊」，而是幾個關鍵檔案開始承擔太多責任。先做低風險的收斂與補測試，比直接大改框架更有效。
