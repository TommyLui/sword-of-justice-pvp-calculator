# OCR Phase 2 自動測試設計

日期：2026-04-18

## 背景

目前 repo 已完成 Phase 1 Playwright E2E 基建，並已涵蓋 routing、calculator、planner sync、crafting、league 與公式驗算。OCR 能力目前由 `tools/ocr-demo.js` 內部提供 `window.pvpOcr` API，透過 calculator 的「從圖片讀取」按鈕調用，不再有獨立 `#/ocr-demo` route。

OCR 不在 Phase 1 CI 範圍，原因是 Tesseract.js 依賴 CDN、worker、語言包下載，且真實影像辨識的穩定性與執行時間都不適合作為主線 PR gate。Phase 2 的目標是補上 OCR 接線與解析管線的自動化保護，但仍保持 CI 可快速執行。

## 目標

Phase 2 OCR 測試要保護三件事：

1. calculator 的 OCR 接線沒有壞
2. 固定面板解析與 fallback 管線沒有壞
3. 真實圖片至少有可手動執行的基線回歸方式

## 非目標

本設計不追求：

- 驗證 Tesseract 模型品質
- 做視覺截圖比對
- 把真實 OCR 測試納入每次 CI 主線
- 修改 app 為可匯出的白箱 parser module

## 測試分層

## 層 A：calculator OCR 接線整合

### 目的

保護 calculator 透過 `window.pvpOcr.recognizeFromFile()` 匯入攻擊／防禦欄位組的邏輯。

### 做法

新增 `tests/e2e/ocr-calculator.spec.js`。

在測試中：

1. 進入 `#/calculator`
2. 用 `page.evaluate()` 覆寫 `window.pvpOcr.recognizeFromFile`
3. stub 回傳固定 `fields` 結果
4. 點擊 `atk1/atk2/def1/def2` 的「從圖片讀取」按鈕
5. 用 `setInputFiles('#calculator-ocr-file', ...)` 觸發 change event

### 斷言範圍

- `atk1` 匯入 attack-side 欄位：
  - `attack`
  - `elementalAttack`
  - `defenseBreak`
  - `accuracy`
  - `crit`
  - `elementalBreak`
  - `pvpAttack`
- `def1/def2` 匯入 defense-side 欄位：
  - `defense`
  - `blockResistance`
  - `criticalResistance`
  - `elementalResistance`
  - `pvpResistance`
- `calculateResults()` 有被觸發
- `atk1` 匯入後會同步到 planner baseline
- `atk2` 不應觸發 planner baseline 污染
- 回傳空欄位時會出錯誤通知，但頁面不崩潰

### 是否進 CI

**是。**

因為這層完全不依賴真 Tesseract 或 CDN，速度快且穩定。

## 層 B：OCR parser 管線整合

### 目的

保護固定面板解析、平均值欄位、fallback 與 debug 資訊。

### 做法

新增 `tests/e2e/ocr-parser.spec.js`。

測試時不跑真 Tesseract，而是：

1. 攔截或 stub OCR 相關輸入
2. 讓 `recognizeFromFile()` 走既有管線，但回傳受控 OCR data / text
3. 驗證 parser 最終輸出的 `fields`、`layoutWarning`、`debug`

### 核心驗證

- `recognizeFixedPanel` 能正確分配 row-based 欄位
- average rows 正確產生：
  - `defense`
  - `blockResistance`
  - `criticalResistance`
- `draftFieldsFromText` 在 panel 缺欄時能補值
- `fallbackKeys` 與 `notes` 的行為符合預期
- `filledCount` 與 `valid` 邊界符合目前規則

### fixture 策略

此層不直接依賴真實圖片，而是建立固定 parser fixture。fixture 可從目前 app debug output（例如 rowAttempts 結果）整理而來，再手工固定預期值。

### 是否進 CI

**是。**

前提是 fixture 完全 mock 化，不碰真實 OCR 引擎下載。

## 層 C：真實 OCR 基線回歸

### 目的

對 `ocr_example/ex1.png`、`ex2.png`、`ex3.png` 提供真實 OCR 回歸能力，作為 parser 常數調整時的手動驗證工具。

### 做法

新增 `tests/e2e/ocr-real.spec.js`。

測試流程：

1. 以 HTTP 方式載入 `ocr_example/*.png`
2. 真正呼叫 `window.pvpOcr.recognizeFromFile(file)`
3. 驗證關鍵欄位與 `filledCount`

### 驗證範圍

- `filledCount >= 10`
- 主要欄位為合理正整數，例如：
  - `attack`
  - `defense`
  - `crit`
- `layoutWarning === ''` 或符合預期警告

### 是否進 CI

**否。**

這層只作為手動或選擇性執行的回歸基線，避免主線 CI 被 CDN / worker / 語言包拖慢或弄 flaky。

## 推薦落地順序

### Step 1

先做 **層 A：calculator OCR 接線整合**。

原因：

- 最快拿到價值
- 不依賴真 OCR
- 直接保護現在最常用的產品入口

### Step 2

再做 **層 B：parser 管線整合**。

原因：

- 可以保護固定面板 schema / fallback / debug 行為
- 成本比真 OCR 低很多

### Step 3

最後做 **層 C：真實圖片基線回歸**。

原因：

- 最慢
- 最不穩
- 但對 OCR 常數調整有高價值

## 與現有 Playwright 架構的關係

OCR Phase 2 應完全建立在目前既有 Playwright 架構之上：

- 使用同一個 `playwright.config.js`
- 共用 `tests/e2e/` 目錄
- 層 A / 層 B 可進主線 `npm test`
- 層 C 應以 tag 或獨立指令排除於預設 CI 外

## 成功標準

當 OCR Phase 2 完成時，應達成：

1. calculator OCR 匯入接線有 E2E 保護
2. 固定面板 parser / fallback 有 mock-based regression tests
3. 真實 OCR 圖片有可重跑的基線回歸方式
4. 主線 CI 仍維持快速且穩定
