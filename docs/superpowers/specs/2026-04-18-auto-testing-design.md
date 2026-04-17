# 自動測試模組設計

日期：2026-04-18

## 背景

此 repo 是 root-level 靜態 SPA，使用 `index.html` + `styles.css` + `tools/*.js` 全域 script。當前沒有 `package.json`、沒有自動測試、沒有 lint/typecheck/test 基建。應用必須走 HTTP 提供，不能用 `file://`，因為 `tools/crafting.js` 會 fetch `tools/crafting-db.json`。

目前最需要防止的回歸不是單一函式，而是整體瀏覽器行為：hash router、script 載入順序、localStorage persistence、calculator/planner sync、crafting fetch 成功與否。

## 目標

Phase 1 建立一套最小但穩定的自動測試系統，讓以下能力在本機與 GitHub Actions 都可執行：

1. 驗證主要 route 仍可正常使用
2. 驗證 calculator 核心輸入/輸出流程沒有壞
3. 驗證 calculator 與 attribute planner 的雙向同步
4. 驗證 crafting 頁在 HTTP 下能正常載入與互動
5. 驗證 `window.pvpCombat` 的少量黃金值計算結果

Phase 1 不追求高覆蓋率，也不追求完整端到端 QA；目標是先建立可靠的回歸防護網。

## 推薦方案

採用 **Playwright E2E** 作為第一階段自動測試方案。

### 原因

- 最符合目前 repo 的靜態 SPA + 全域 script 結構
- 可直接搭配 `npx serve .` 在測試前自動起 HTTP server
- 可在瀏覽器內用 `page.evaluate()` 直接呼叫 `window.pvpCombat`
- 可同時支援本機執行與 GitHub Actions
- 不需要先將應用重構為 ES modules

### 不採用的方案

#### 純單元測試優先

不作為 Phase 1 主方案。原因是目前應用最脆弱的是 route、DOM、localStorage、fetch、script wiring，這些更適合由 E2E 先保護。

#### E2E + 單元測試一起導入

不作為 Phase 1 主方案。原因是導入成本太高，會拖慢第一套穩定測試護欄落地。

## 目標架構

新增最小測試基建，不改動現有 deploy workflow：

```txt
package.json
package-lock.json
playwright.config.js
tests/
  e2e/
    routing.spec.js
    calculator.spec.js
    sync.spec.js
    crafting.spec.js
    formulas.spec.js
.github/workflows/
  test.yml
```

### 設計原則

1. app 程式碼盡量零侵入
2. 本機與 CI 共用同一套測試配置
3. 先跑 Chromium-only
4. 測試 workflow 與 deploy workflow 分開

## Phase 1 範圍

### 1. routing.spec.js

驗證下列 route：

- `#/`
- `#/calculator`
- `#/attribute-planner`
- `#/crafting`
- `#/league`

每條 route 斷言：

- 對應 `view-*` 區塊顯示
- 主要 DOM 存在
- 沒有明顯未處理 page error

### 2. calculator.spec.js

驗證：

- 輸入 atk1 / def1 後結果欄位更新
- reset dialog 的取消與確認流程正常
- reload 後 localStorage 還原正常

### 3. sync.spec.js

驗證：

- calculator `atk1` → planner baseline 同步
- planner baseline → calculator `atk1` 回寫同步
- `atk2` 不應誤影響 planner baseline

### 4. crafting.spec.js

驗證：

- `#/crafting` 在 HTTP 環境能載入資料
- count 不為 0
- 搜尋可縮小結果
- reset 可回復原始列表

### 5. formulas.spec.js

在頁面中以 `page.evaluate()` 呼叫 `window.pvpCombat` 做少量黃金值驗算：

- `calculateRemainDefense`
- `calculateRemainShield`
- `calculateDefenseRate`
- `calculateCombatStats`

至少包含：

- 一組全零/接近預設值
- 一組典型中段值
- 一組邊界值

## Phase 1 不納入的內容

### OCR 自動測試

Phase 1 不納入。原因：

- Tesseract.js 需走 CDN 與 worker
- 首次下載大
- CI 穩定性差
- 目前產品路徑已改成 calculator 內部調用 OCR API，不需要先用 OCR 測試阻塞 Phase 1 導入

### League CSV upload 深測

Phase 1 不納入完整 upload/filter/chart 流程。先做 route smoke 與初始化能力驗證即可。

### 視覺回歸測試

Phase 1 不納入。

## 穩定性策略

### 1. 每個 test case 使用新的 browser context

避免污染：

- localStorage
- `window.__...Initialized`
- hash router state

### 2. 不依賴真實 page navigation

本 repo 使用 hash router，不應以傳統 navigation 完成事件作為主要等待條件。測試應等待：

- 目標 view 顯示
- 特定 DOM 存在
- 特定值更新完成

### 3. 優先使用穩定 selector

優先順序：

- `id`
- `data-route`
- 明確的按鈕 id

避免大量依賴文案全文。

### 4. Chromium-only

Phase 1 先只支援 Chromium，以降低 flaky 風險與 CI 成本。

### 5. 對 CDN 保守處理

此 repo 仍依賴：

- Chart.js CDN
- OCR 的 Tesseract.js CDN

因此：

- Phase 1 不把 OCR 納入主線 CI
- route smoke 應避免過度等待外部資源

## 測試資料策略

### Calculator / Planner

測試內直接使用少量固定數值，不建立大型 fixture。

### Crafting

直接使用 repo 內的 `tools/crafting-db.json` 作為 source of truth。

### League

保留到 Phase 2 再新增 UTF-8 / Big5 CSV fixture。

### OCR

保留到 Phase 3，再決定採 mock OCR result 或少量 golden image。

## CI 設計

新增獨立 workflow：`.github/workflows/test.yml`

觸發：

- `push`
- `pull_request`

核心步驟：

1. checkout
2. setup node
3. install dependencies
4. install Playwright Chromium
5. run Playwright tests

Deploy workflow `deploy.yml` 不修改。

## 本機開發流程目標

導入後應至少支援：

1. 一個命令跑完整 E2E
2. 一個命令跑單一 spec
3. headed/debug 模式

但這些命令的細節屬 implementation plan 範圍，不在本 spec 詳列。

## Phase 2 路線

1. League upload/filter/chart 測試
2. Calculator import/export/copy-left-right 更完整回歸測試
3. Crafting detail/filter 更完整互動測試

## Phase 3 路線

1. OCR 自動測試
   - 優先考慮 mock OCR result
   - 視需求再加入少量 golden image
2. 更純粹的公式單元測試

## 成功標準

Phase 1 完成時，應達成：

1. 本機可執行完整 E2E
2. GitHub Actions 自動執行同一套 E2E
3. routing / calculator / sync / crafting / formulas 五類測試已存在
4. 不需先重構 app 架構為 modules
5. OCR 不阻塞主線 CI 穩定性

## 非目標

本設計不包含：

- 立即實作測試
- OCR golden-image pipeline
- 視覺回歸系統
- 多瀏覽器矩陣
- 大規模 app 重構
