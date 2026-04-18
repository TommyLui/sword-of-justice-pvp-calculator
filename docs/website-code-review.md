# Website Code Review

日期：2026-04-18

## 整體評估

這個網站是一個以原生 JavaScript 實作的靜態 SPA，依靠 hash router、全域腳本與 `localStorage` 運作。在沒有 bundler、沒有框架、沒有型別系統的前提下，整體程式碼的結構比一般同類型工具站更有秩序。特別是 `tools/pvp-config.js`、`tools/combat-formulas.js`、`tools/sync-bridge.js` 這三個共用層，已經形成清楚的模組邊界。

目前最主要的技術債不是「功能無法運作」，而是：

- `index.html` 責任過重
- 大型模組（尤其 `ocr-demo.js`、`league.js`）體積持續膨脹
- 部分 shell / feature 之間仍透過 DOM id 直接耦合
- 文件與實際程式碼需要持續同步治理

## 做得好的地方

### 1. 共用公式層清晰

`tools/combat-formulas.js` 已成功把 calculator 與 planner 的核心公式抽成純函式模組。這降低了公式漂移風險，也讓 regression tests 能集中在單一來源驗證。

### 2. sync bridge 設計正確

`tools/sync-bridge.js` 使用 `CustomEvent` + source guard + re-entry guard，在全域腳本環境中是合理且穩健的做法。這避免了 calculator/planner 互相直接寫 DOM 的無限回圈問題。

### 3. 防禦性 parsing 風格一致

各模組普遍採用：

- `parseInt(..., 10)`
- `Number.isFinite`
- fallback `0`
- `try/catch`
- `?.`

這讓整體在沒有型別檢查的情況下仍維持不錯的穩定性。

### 4. 測試護欄已成型

現在已有 Playwright 自動測試保護：

- routing
- calculator
- import/export
- copy buttons
- planner flow
- planner sync
- crafting
- league
- OCR integration
- OCR parser
- formulas

這使得此 repo 已經從「只能手動驗證」提升為「有回歸防護網」的狀態。

## 主要問題與風險

### 1. `index.html` 過胖且責任過多

`index.html` 同時承擔：

- app shell
- route 容器
- navigation
- dark mode toggle
- notification system
- inline layout/styles
- route bootstrap

這導致理解成本高，也提高未來調整 shell UI 時誤傷功能的風險。

### 2. `ocr-demo.js` 模組體積大、責任複合

它目前同時處理：

- text normalize
- fixed-panel parser
- fallback
- worker loading
- debug state
- API expose
- sample management

雖然功能可用，但認知負擔大，是未來最值得持續收斂的檔案之一。

### 3. `league.js` 已接近第二個高複雜度模組

此檔案目前承擔：

- CSV parsing
- guild tabs
- filters
- sorting
- summary cards
- charts + fallback
- localStorage restore
- dark mode 重繪

它還沒失控，但已經進入需要刻意防止持續膨脹的階段。

### 4. shell 與 feature module 仍有直接 DOM 耦合

例如深色模式切換與部分功能模組之間，仍存在直接依賴 shell DOM id 的情況。這不一定立刻出錯，但會讓未來 UI 重構變得更脆弱。

### 5. 文件同步成本已上升

此 repo 現在已有：

- README
- AGENTS.md
- testing guide
- testing overview
- 多份 spec / audit 文件

文件越完整越好，但也代表未來每次改動更需要同步維護，否則容易出現 code / docs 脫節。

## 建議的改善順序

### P1
1. 逐步收斂 `index.html` 內的 shell / shared CSS / bootstrapping 責任
2. 限制 `ocr-demo.js` 與 `league.js` 再度膨脹
3. 持續確保 docs 與實際 runtime 行為同步

### P2
4. 減少 feature module 對 shell DOM id 的直接依賴
5. 補更多 error-path tests（import 壞檔、OCR error、fetch fail）

### P3
6. 再評估是否需要更進一步的 module 化，而不是現在就急著改架構

## 結論

這個網站不是靠現代框架撐起來的專案，但它在現有限制下是有秩序、可維護、而且正在持續變穩的。最值得肯定的是公式層、sync bridge 與測試護欄。最值得警戒的是 `index.html` 的責任過重與大型模組持續膨脹。
