# Redesign: 3D Claymorphism Light + Dark Theme

## Goal

將現有網站(逆水寒 PVP 工具箱)的外觀風格,從當前的「深藍底 + 金色 accent + glass-morphism」重新設計為「3D claymorphism(黏土元素)」風格,並提供真正的亮模式與暗模式雙主題。

參考 demo:`demo/three-d.html`(亮模式 claymorphism,sky blue 主色)、`demo/darkblue.html`(暗模式,deep navy + electric blue)。

## What I already know

### 現有風格詳情(需記錄並作為遷移基準)

**架構**
- `index.html` 擁有 hash router、桌面側欄、行動底欄、暗模式 persistence、`window.showNotification`、內聯 CSS
- `styles.css` 2420 行,包含所有 view-specific 樣式(calculator / league / crafting / attribute-planner / ocr-demo)
- 腳本載入順序:Chart.js CDN → `tools/pvp-config.js` → `combat-formulas.js` → `calculator.js` → `league.js` → `crafting.js` → `sync-bridge.js` → `attribute-planner.js` → `ocr-demo.js`
- 無 build step、無 bundler、無 lint/typecheck config

**當前色彩系統(全在 index.html `<style>` 內聯)**
- `:root`(預設=暗):`--bg:#0B1220` / `--bg-2:#101A2E` / `--panel:#141F33` / `--panel-2:#18243B` / `--text:#E8EEF9` / `--muted:#93A4C7` / `--accent:#D6A84A`(金) / `--accent-2:#F2D38A` / `--border:rgba(214,168,74,.18)` / `--shadow:0 18px 40px rgba(0,0,0,.35)`
- `body.dark-mode`(更暗變體):`--bg:#08111d` / `--bg-2:#0d1626` / `--panel:#101a2d` / `--panel-2:#15213a` / `--text:#ecf2ff` / `--muted:#96a5c8` / accent 同金 / `--border:rgba(214,168,74,.22)` / `--shadow:0 18px 40px rgba(0,0,0,.5)` / `background:radial-gradient(circle at top,#101a2d 0%,var(--bg) 50%)`
- `body` 預設 `background:radial-gradient(circle at top,#13213b 0%,var(--bg) 50%)`
- **注意:目前沒有真正的亮模式**;預設就是暗,「dark-mode」toggle 只是更暗

**暗模式切換邏輯(index.html)**
- `#darkToggle` 按鈕 → `document.body.classList.toggle('dark-mode')` → `localStorage.setItem('darkMode', isDark)`
- 載入時:`if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode')`
- 切換時 dispatch `pvp:themechange` CustomEvent({detail:{darkMode:isDark}})
- `league.js:565` 監聽 `pvp:themechange` → 重新渲染 Chart.js 圖表(必須保留此契約)

**字體**:`Arial, sans-serif`(系統字,無 web font)

**view 結構(5 個路由)**
- `#view-home` — hero + patch image + footer
- `#view-calculator` — toolbar + results(2 panel × 2 card + compare-box) + 4 input section(進攻1/2、防禦1/2)
- `#view-attribute-planner` — header + KPI + 3-step + panels + nav
- `#view-crafting` — toolbar + list/detail grid
- `#view-league` — summary(6 stat-card) + tabs + table + 2 chart section
- (ocr-demo 不是獨立 view;OCR 整合在 calculator 內,`#view-ocr-demo` CSS 為殘留未用)

**樣式分布**
- `styles.css` 以 `#view-calculator`、`#view-league`、`#view-crafting`、`#view-attribute-planner`、`#view-ocr-demo` 等 ID 前綴分段(每段數百行)
- 通用元件(.sidebar / .nav / .hero / .card / .notification / .bottom-nav)在 styles.css 開頭
- 所有 view 段落共用 `--bg` / `--panel` / `--accent` 等 root 變數

### 3D Claymorphism demo 參考(`demo/three-d.html`)

- **Claymorphism 陰影配方**:外暗 drop + 外亮 highlight + 內亮 top + 內暗 bottom(4 層 box-shadow)
- **亮模式色譜**:lavender bg `#dceaf5` + sky blue clay `#87ceeb` 主色 + 糖果色 accent(pink/blue/yellow/green/coral)
- **字體**:Quicksand(圓潤標題) + Plus Jakarta Sans(正文) + Nunito(數據)
- **3D 裝飾**:浮動球體、bob 動畫、按鈕 `:active` inset 陰影
- 目前 `demo/three-d.html` 主色已改為 sky blue

### 暗模式 demo 參考(`demo/darkblue.html`)

- deep navy `#050b18` + electric blue `#4a9eff` + cyan/indigo/teal accent
- **注意**:此 demo 不是 claymorphism,是 flat dark panel + glow。暗模式 claymorphism 需另行設計(深色 surface + 反向陰影)

## Assumptions (temporary, to validate)

- 重設計後仍為 root-level static SPA(不引入 bundler)
- 保留所有 DOM id 與結構 class(避免破壞 tools/*.js 的 querySelector 綁定)
- 保留 `pvp:themechange` 事件契約(league.js 圖表重渲染)
- 保留 `localStorage.darkMode` persistence
- 可能引入 Google Fonts(web font stylesheet link,非 bundler/CDN script)
- 暗模式 claymorphism 需用「深色 surface + 反向 inset 陰影 + 微光 highlight」而非亮模式的外暗陰影

## Decision (ADR-lite)

**Context**: 需決定 MVP 範圍、預設主題、字體策略、暗模式主色,以收斂 claymorphism 雙主題重設計方案。

**Decision**(使用者 2026-06-18 確認):
- **MVP 範圍**:5 個 view 雙主題 + 清理 ocr-demo 殘留 CSS + Chart.js 圖表配色隨主題切換。**不**預留自訂 accent 色擴充點(YAGNI)。
- **預設主題**:暗模式為預設(維持目前行為)。`#darkToggle` 切換至亮模式,`localStorage.darkMode` 記憶。注意:語意反轉——「dark-mode」class 改為代表「啟用暗模式」(目前已是此語意,但預設值從「無 class = 暗深藍」變為「無 class = 新暗 claymorphism」)。
- **字體**:引入 Google Fonts — Quicksand(標題)+ Plus Jakarta Sans(正文)+ Nunito(數據)。`file://` 下降級系統字(與 crafting.js fetch JSON 同限制,不新增限制)。
- **主色**:亮模式 Sky Blue `#87CEEB`(light `#B8E0F7` / dark `#5BA8D4`),暗模式 Electric Blue `#4A9EFF`(light `#6BB5FF` / bright `#8ACAFF`)。兩模式主色感一致但各 optimise 對比。

**Consequences**:
- 暗模式 claymorphism 需設計「深色 surface + 反向 inset 亮線 + 微弱外暗 drop」(非亮模式的外亮 highlight),是本次最大設計挑戰
- Chart.js 配色需在 league.js 增加 theme-aware 顏色邏輯(目前只重渲染),需小心不破壞既有圖表行為
- 清理 ocr-demo CSS 需先確認 tools/ocr-demo.js 不依賴任何 `#view-ocr-demo` 選擇器(依 AGENTS.md,OCR 整合在 calculator,殘留 CSS 應可安全移除)
- Google Fonts 增加一個 `<link>` 外部依賴,但無新 build step

## Requirements

### 功能性
- 將 `index.html` 內聯 CSS + `styles.css` 全部重寫為 claymorphism 風格
- 提供真正的亮模式 + 暗模式雙主題(透過 CSS 變數 + `body` class 切換)
- **預設為暗模式 claymorphism**;`#darkToggle` 切換至亮模式
- 保留所有功能 JS 的 DOM 綁定(HTML id 不變;如需改 class,同步更新 tools/*.js querySelector)
- 保留 `pvp:themechange` 事件 + `localStorage.darkMode` persistence + 事件 detail.shape
- 5 個 view(home / calculator / attribute-planner / crafting / league)全部套用新風格
- Chart.js 圖表配色隨主題切換(亮/暗各一套 chart 顏色,在 `pvp:themechange` 時切換)
- 清理 `styles.css` 中 `#view-ocr-demo` 殘留段落(~100 行,需先驗證 ocr-demo.js 無依賴)

### 非功能性
- 響應式(1100/900/720 三斷點)維持
- `prefers-reduced-motion` 支援(停用 bob/float 動畫)
- 暗模式文字對比度達 WCAG AA(正文 ≥ 4.5:1,大字 ≥ 3:1)
- 無 console error
- 不引入 bundler / module system / 新 build step

## Acceptance Criteria

- [ ] 暗模式(預設):claymorphism 風格——深色 surface + 反向 inset 亮線 + 微弱外暗 drop + Electric Blue `#4A9EFF` accent
- [ ] 亮模式(切換後):claymorphism 風格——糖果色 surface + 雙陰影(外暗+外亮+inset)+ Sky Blue `#87CEEB` accent
- [ ] `#darkToggle` 切換亮/暗,`localStorage.darkMode` 記憶,`pvp:themechange` 正常 dispatch
- [ ] 切換主題後 league Chart.js 圖表**配色**隨之切換(非僅重渲染)
- [ ] 5 個 view 視覺一致,無殘留舊金/深藍風格
- [ ] `styles.css` 中 `#view-ocr-demo` 段落已移除且 OCR 功能正常
- [ ] Google Fonts(Quicksand / Plus Jakarta Sans / Nunito)在 HTTP 伺服器下載入;`file://` 降級系統字不報錯
- [ ] `npm test`(Playwright e2e)全綠
- [ ] 行動版(900/720)側欄滑出 + 底欄 5 欄正常
- [ ] 暗模式正文對比度 ≥ 4.5:1(spot-check hero/panel/table)

## Definition of Done

- `npm test` 通過(Chromium e2e)
- 暗模式切換 + persistence + 圖表重渲染驗證
- 亮/暗對比度 spot-check
- 無 console error
- docs/notes 更新(AGENTS.md App Shell / Editing Conventions 如有變動)

## Out of Scope (explicit)

- 不改變功能邏輯(計算公式、OCR、CSV 解析、sync bridge)
- 不改變路由結構或新增 view
- 不引入 bundler / module system
- 不改 Chart.js 版本或 CDN 來源
- **不**預留自訂 accent 色擴充點(YAGNI;未來需要再加)
- **不**依 `prefers-color-scheme` 自動跟隨系統(預設暗、使用者手動切換)
- demo/ 資料夾的 6 個 demo 檔不納入正式站點

## Technical Notes

- 暗模式 CSS 目前全在 `index.html` 內聯(styles.css 無 dark-mode 規則) → 重設計時統一移到 styles.css,內聯只留 `:root` + `body.dark-mode` 變數與字體 link
- `league.js:565` 監聽 `pvp:themechange` → 必須保留事件名稱 `pvp:themechange` 與 `detail.darkMode` shape;新增 chart 配色切換邏輯需在此 listener 內
- `tools/*.js` 使用 `document.getElementById` / `querySelector` 綁定特定 id → 改 CSS 時不可改動 HTML id;如需改動 class 名需 grep tools/*.js 同步
- `styles.css` 以 view-id 前綴分段 → 可逐段重寫,降低風險
- Google Fonts link 會在 `file://` 下失效(需 HTTP 伺服器)— 與 `tools/crafting.js` fetch JSON 同限制,不新增限制
- claymorphism 暗模式配方(設計基準):
  - surface:深 navy `#0F1D38` / `#142849`
  - 外暗 drop:`8px 8px 16px rgba(0,0,0,.5)`(亮模式用 rgba(91,168,212,.35))
  - inset 亮線:`inset 2px 2px 4px rgba(138,202,255,.06)`(微光,非亮模式的 `.5`)
  - inset 暗底:`inset -2px -2px 4px rgba(0,0,0,.3)`
  - accent glow:text-shadow / box-shadow 用 `rgba(74,158,255,.3)` 增可讀性
- Chart.js 配色切換:league.js 需定義 `CHART_COLORS_LIGHT` / `CHART_COLORS_DARK` 兩套,在 renderComparisonChart / renderClassChart 依 `document.body.classList.contains('dark-mode')` 選用

## Implementation Plan (small PRs)

- **PR1**:CSS 變數系統(亮/暗雙主題 token,統一移到 styles.css)+ Google Fonts link + 通用元件(sidebar/nav/topbar/notification/bottom-nav)+ `:root` 預設為暗 claymorphism
- **PR2**:home + calculator view 重寫為 claymorphism
- **PR3**:attribute-planner + crafting + league view 重寫 + league.js chart 配色隨主題切換
- **PR4**:清理 ocr-demo 殘留 CSS + 暗模式對比度 spot-check + e2e 全綠 + AGENTS.md 更新(如有 Editing Conventions 變動)

## Research References

無外部研究需求——claymorphism 與暗模式最佳實踐已在先前 demo(三-d.html / darkblue.html)驗證,直接套用並調整。
