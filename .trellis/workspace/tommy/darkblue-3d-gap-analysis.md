# 深藍 3D 風格遷移差距分析報告

**比對標的**：`demo/darkblue.html`（深藍暗模式 3D 元素完整 reference）
**現況來源**：`index.html` + `styles.css`（出貨主應用）
**產出日期**：2026-06-18
**作者**：tommy（由 agent 撰寫）
**狀態**：分析報告，未動工

---

## 0. 結論先行

你的判斷正確：目前主應用**僅搬了 darkblue 的色譜變數**（`--bg`/`--panel`/`--accent` 等），但**設計語彙幾乎沒移植**。`styles.css` 仍是舊「clay 黏土 neumorphic」風格（145deg 漸層 + `5px 5px 12px` 雙向內外陰影），與 darkblue 的「深藍 3D + 光暈 + 寫實投影」是兩套不同的視覺語言。

差距可分三層：
1. **Foundation 層**（影響全部元件）：字體、色彩 token、陰影系統、漸層角度、圓角——全面未對齊。
2. **元件樣式層**：每個元件（sidebar、hero、card、button、input、table、notification…）的陰影/光暈/排版都還是 neumorphic 風。
3. **HTML 結構層**：部分元件 class 命名與結構完全不同（如 `league-card` vs `stat-card`、`crafting-detail-header` vs `crafting-detail-head`、`sidebar-actions` vs `sidebar-footer`），CSS-only 改動無法完整對齊，需連 HTML 一起改。

估計改動範圍：`index.html`（<style> 變數 + 字體載入 + 部分 view 的 class 結構）+ `styles.css`（幾乎全部 2554 行都要審視）+ 可能新增 `pulse-dot` 等 keyframe。

---

## 1. 方法論

- 完整讀取 `demo/darkblue.html`（1605 行，內含全部 CSS+HTML+JS）。
- 完整讀取 `styles.css`（2554 行）與 `index.html`（457 行，含 `<style>` 變數定義與各 view 結構）。
- 逐項比對：CSS 變數、字體、陰影、漸層、圓角、每個元件的視覺特徵、HTML class 結構。
- 未做視覺截圖比對（可作為下一步，若要更精確定位「看起來差多少」）。

---

## 2. Foundation 層差距（影響全部元件）

### 2.1 字體（嚴重）

| 項目 | 現況 (`index.html:11`) | darkblue (`darkblue.html:9`) |
|---|---|---|
| 標題字體 | Quicksand, Plus Jakarta Sans | **Manrope** (700/800) |
| 內文字體 | Plus Jakarta Sans, Segoe UI | **Inter** (400-700) |
| 數字/標籤字體 | Nunito | **JetBrains Mono** (400-700) |
| CSS 變數 | `--font-head`/`--font-body`/`--font-num` | 直接寫死 `font-family` |

**影響**：darkblue 的「科技感計算室」氣質大量仰賴 JetBrains Mono 的 uppercase + `letter-spacing:.18em~.32em` 標籤（如 `nav-label`、`eyebrow`、`rc-head`、`stat-title`、`crafting-item-slot`、`patch-eyebrow`）。目前主應用完全沒有這個字體，複製再多 CSS 也抓不到那個味道。

**待辦**：`index.html:11` 的 Google Fonts 連結換成 `Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700`；`--font-head`/`--font-body`/`--font-num` 重新對應，並新增 `--font-mono`。

### 2.2 色彩 token（嚴重）

`index.html:14-46`（light）與 `47-81`（dark）已有的 token：`--bg`/`--bg-2`/`--panel`/`--panel-2`/`--text`/`--muted`/`--accent`/`--accent-2`/`--accent-dark`/`--border`/`--shadow`/`--clay`/`--clay-light`/`--clay-dark`/`--surface-soft`/`--surface-strong`/`--field-bg`/`--accent-soft`/`--accent-glow`/`--accent-border`/`--row-bg`/`--row-bg-alt`/`--ink`/`--on-accent`/`--clay-shadow`/`--clay-shadow-sm`/`--clay-shadow-inset`。

**darkblue 有但主應用沒有的 token**（`darkblue.html:11-50`）：
- 色譜：`--blue-light` `--blue-bright` `--blue-dark` `--blue-deep` `--cyan` `--cyan-light` `--cyan-dark` `--indigo` `--indigo-light` `--indigo-dark` `--teal` `--teal-light` `--amber` `--amber-light` `--rose` `--rose-light` `--text-soft` `--dim` `--bg-1` `--bg-3` `--panel-3` `--elevated` `--border-strong`
- 漸層：`--blue-grad` `--cyan-grad` `--indigo-grad` `--teal-grad`（135deg）
- 陰影：`--shadow-lg` `--shadow-glow`（`0 0 32px rgba(74,158,255,.16)`）

**待辦**：在 `index.html` 兩個 `:root`/`body.dark-mode` 區塊補齊上述 token。light mode 要給對應的淺色變體（例如 `--cyan-light` 在 light mode 可能是 `#5fdcc9` 的更深版本，避免對比不足）。

### 2.3 陰影系統（嚴重，是風格分歧的根源）

| 用途 | 現況 | darkblue |
|---|---|---|
| 面板 | `--clay-shadow`: `8px 8px 16px rgba(91,168,212,.32), -8px -8px 16px rgba(255,255,255,.9), inset 2px 2px 4px rgba(255,255,255,.5), inset -2px -2px 4px rgba(91,168,212,.16)`（neumorphic 雙向） | `--shadow`: `0 16px 40px rgba(0,0,0,.5)`（寫實落影）+ `--shadow-glow` |
| 小元件 | `--clay-shadow-sm`: `5px 5px 10px ...`（neumorphic） | 無獨立 sm，直接用 `--shadow` 或元件自訂 |
| 凹陷 | `--clay-shadow-inset`: `inset 4px 4px 8px ...`（neumorphic 內凹） | `inset 0 1px 2px rgba(0,0,0,.3)`（僅 input 用，輕微凹陷） |
| 按鈕 | `5px 5px 12px var(--accent-glow), inset 2px 2px 4px rgba(255,255,255,.24), inset -2px -2px 4px rgba(0,0,0,.12)` | `0 8px 20px rgba(74,158,255,.3), inset 0 1px 0 rgba(255,255,255,.2)`（落影 + 頂部高光） |
| 面板高光 | 無 | `inset 0 1px 0 rgba(138,202,255,.06)`（panel-2 / panel-glow 用） |

**影響**：這是「黏土風」vs「深藍 3D」最關鍵的差異。neumorphic 靠雙向陰影偽造立體感，darkblue 靠單向落影 + 頂部高光 + 外光暈。兩者混用會看起來「既不像黏土也不像深藍」。目前 `styles.css` 有 100+ 處 `var(--clay-shadow)` / `var(--clay-light)`。

**待辦**：決策——
- 方案 A（推薦）：保留 `--clay-shadow*` 變數名但**改寫其值**為 darkblue 的寫實陰影，這樣 100+ 處引用自動換風格，改動最小。
- 方案 B：新增 `--shadow`/`--shadow-glow` 並逐步替換 `--clay-shadow` 引用，工程量大但語意清楚。

### 2.4 漸層角度（輕微但普遍）

現況全部 `linear-gradient(145deg, ...)`（neumorphic 慣用）；darkblue 全部 `135deg`（左上到右下，更乾淨）。改 `--*-grad` 變數值即可連帶更新大部分，但 `styles.css` 有許多 inline `linear-gradient(145deg, var(--clay-light), var(--clay))` 不是走變數，需逐處改。

### 2.5 圓角（輕微但普遍）

現況幾乎全部 `border-radius: 8px`；darkblue 分級：panel `16px`、card `12px`、input `10px`、button `10px`、tab `999px`（pill）、icon `12px`、tag `6px`。改動量大但單純。

### 2.6 body 背景（部分對齊）

- light mode `index.html:86`：`radial-gradient(circle at top, #dceaf5 0%, var(--bg) 50%)`——與 darkblue 完全不同（darkblue 沒有 light mode）。
- dark mode `index.html:76-80`：3 層 radial gradient（blue/cyan/indigo）+ `var(--bg)`——**已對齊** darkblue `darkblue.html:58-62`。
- `body.dark-mode::before`（grid overlay）`styles.css:23-30` 與 `darkblue.html:69-78` **已對齊**。
- `body.dark-mode::after`（vignette）`styles.css:32-34` 與 `darkblue.html:80-85` **已對齊**。

**結論**：dark mode 背景已對齊；light mode 背景需要重新設計（darkblue 沒提供 light 對照，要自創淺色變體）。

---

## 3. 元件樣式層差距（逐區塊）

### 3.1 Sidebar（嚴重）

| 元素 | 現況 | darkblue |
|---|---|---|
| brand | `img.icon.jpg` + `linear-gradient(145deg, var(--clay-light), var(--clay))` clay 盒 | `.logo-mark` SVG hexagon + `--blue-grad` + `0 6px 18px rgba(74,158,255,.4), inset 0 1px 0 rgba(255,255,255,.25)` + `::after` 135deg 高光疊層 |
| brand h1/p | Quicksand + `--ink`/`--accent-dark` | Manrope 700 + `--text` / JetBrains Mono 10px uppercase `--blue-light` |
| nav-label | **無** | JetBrains Mono 10px uppercase `letter-spacing:.32em` `--dim` + `::before` 14px 橫線 |
| nav item | emoji + clay 盒 + active 用 145deg 漸層 + neumorphic | `.nav-ico`（圖示）+ `filter:drop-shadow(0 0 6px rgba(74,158,255,.4))` 光暈 + active 用 `linear-gradient(90deg,rgba(74,158,255,.18),rgba(74,158,255,.04))` + `inset 2px 0 0 var(--blue)` 左側光條 + `0 0 18px rgba(74,158,255,.1)` |
| sidebar footer | `.sidebar-actions` 只有 theme-toggle 按鈕 | `.sidebar-footer` 有 `.status-row`（`pulse-dot` 1.8s 動畫 + `SYSTEM ONLINE`）+ `.sys-meta`（`頂樓風很大/幫會內部使用`） |

**HTML 結構差異**：`index.html:98` 的 `.brand` 用 `<img>`；`index.html:107-115` 的 `.sidebar-actions` 結構與 darkblue 的 `.sidebar-footer` 完全不同。要對齊需改 HTML。

### 3.2 Hero / Home（嚴重）

| 元素 | 現況 | darkblue |
|---|---|---|
| hero 容器 | `.hero.home-hero`：`radial-gradient(circle at 88% 16%, var(--accent-soft), transparent 30%) + linear-gradient(145deg, var(--surface-strong), transparent) + linear-gradient(145deg, var(--clay-light), var(--clay))` | `.hero.panel.panel-glow`：`--panel` + `--shadow` + `--shadow-glow` + `inset 0 1px 0 rgba(138,202,255,.06)` + `::before` 右側 radial + `::after` 底部 `linear-gradient(90deg, var(--blue), transparent)` 光條 |
| 次標題 | `.hero-sub` Quicksand 13px `--accent-dark` | `.sub` JetBrains Mono 12px uppercase `letter-spacing:.36em` `--blue-light` + `::before` 8px 圓點光暈 |
| h2 | Quicksand 700 + `.accent` 用 `--accent-dark` 單色 | Manrope 800 + `.accent` 用 `--blue-grad` + `background-clip:text` 漸層文字 |
| lead | `.hero-lead` `--text` | `.lead` `--text-soft` 17px line-height 1.75 |
| CTA | `.cta` clay 漸層按鈕 + `.cta-ghost` clay 變體 | `.btn` `--blue-grad` + `.btn.btn-ghost` `rgba(74,158,255,.06)` 透明 + border-strong |
| stat-strip | **無** | `.stat-strip` 三欄 `stat-item.sv`（Manrope 800 26px `--blue-bright` + `text-shadow:0 0 18px rgba(74,158,255,.3)`）+ `.sl`（JetBrains Mono uppercase `--dim`） |
| home-cards | `c-pink`/`c-blue`/`c-yellow` 三色，clay 漸層 + neumorphic 陰影 | `panel` + `c-cyan`/`c-indigo` 變體，`::before` 角落 radial 光暈 + hover `translateY(-4)` + `--shadow-glow` |
| home-ico | 145deg 漸層 + neumorphic | `--blue-grad`/`--cyan-grad`/`--indigo-grad` + `0 8px 20px rgba(...,.3) + inset 0 1px 0 rgba(255,255,255,.2)` |
| home-tag | Quicksand 11px `--accent-dark` + `--accent-soft` 底 | JetBrains Mono 10px uppercase `letter-spacing:.18em` `--blue-light` + `--border-strong` + `::before` 5px 光點 |
| patch-frame | **完全沒有此元件** | `.patch-frame.panel-2`：`linear-gradient(135deg,rgba(74,158,255,.08),rgba(107,126,255,.05)) + --panel-2` + `::before` 右上 radial + `.patch-eyebrow`（cyan 光點）+ `.patch-title` Manrope 28px + `.patch-sub` JetBrains Mono |

**HTML 結構差異**：`index.html:129-137` 的 hero 結構與 darkblue `darkblue.html:1147-1160` 不同（缺 `.sub`/`.lead`/`.stat-strip`/`::after`）；`index.html:138-157` 的 home-cards 用 `c-pink/c-blue/c-yellow`，darkblue 用 `c-cyan/c-indigo`。無 patch-frame 區塊。

### 3.3 Calculator（嚴重）

| 元素 | 現況 | darkblue |
|---|---|---|
| result-panel h3 | `--accent-2` 單色 | `--blue-bright` + `text-shadow:0 0 14px rgba(74,158,255,.25)` + `padding-bottom:14px + border-bottom --border` + `::after` 48px 光條 `box-shadow:0 0 8px --blue` |
| result-card | `--row-bg-alt` + `--border` 8px | `--bg-2` + `--border` 12px + `.rc-head`（JetBrains Mono uppercase `--cyan-light` + `text-shadow:0 0 8px rgba(61,212,232,.25)` + border-bottom） |
| result-row | `--muted` / `--text` 兩色 | `.k` `--muted` + `.v` JetBrains Mono 700 `--text`；`.dmg .v` `--amber` + text-shadow；`.crit .v` `--teal-light` + text-shadow |
| compare-box | `linear-gradient(145deg, var(--surface-strong), var(--surface-soft))` clay | `linear-gradient(135deg,rgba(74,158,255,.16),rgba(107,126,255,.1))` + `--border-strong` + `inset 0 0 18px rgba(74,158,255,.08) + 0 0 24px rgba(74,158,255,.1)` + `.lbl` mono uppercase `--blue-bright` + `.val` Manrope 800 26px `text-shadow` |
| input-section h2 | 純文字 | `::before` 8px 圓點 `box-shadow:0 0 10px --blue` |
| section-header | 無 border-bottom | `border-bottom:1px solid --border + padding-bottom:14px` |
| input | `--field-bg` + `--clay-shadow-inset` neumorphic 內凹 | `--bg-2` + `inset 0 1px 2px rgba(0,0,0,.3)` 輕凹 + focus `inset + 0 0 0 3px rgba(74,158,255,.18)` |
| button | 145deg 漸層 + neumorphic + `color:#111`（dark mode 下會糊） | `--blue-grad` + `0 8px 20px rgba(74,158,255,.3) + inset 0 1px 0 rgba(255,255,255,.2)` + `color:#fff` |
| table | `td[colspan]` 用 `--accent-soft` 底 + `--ink` 字 | th 用 `--panel-3` 底 + `--blue-bright` + `text-shadow` + uppercase letter-spacing |

**HTML 結構差異**：`index.html:181-182` 用 `<table>` + `<td colspan="2">` 結構，darkblue 用 `<div class="result-card"> + <div class="rc-head"> + <div class="result-row">` 結構。要對齊需重寫 calculator.js 的 render 邏輯（`tools/calculator.js`），改動量大。**這是整個遷移最痛的點**。

### 3.4 Attribute Planner（中重）

| 元素 | 現況 | darkblue |
|---|---|---|
| header h2 | 純「屬性規劃」 | `屬性<span class="accent">規劃</span>` 漸層文字 |
| kpi | `linear-gradient(145deg, var(--clay-light), var(--clay))` clay | `--panel-2` + `--border-strong` + `inset 0 1px 0 rgba(138,202,255,.06)` + `strong` Manrope 800 22px `--blue-bright` + `text-shadow:0 0 14px rgba(74,158,255,.35)` |
| step | `<button>1. 基準</button>` 單一文字 + active 用 180deg 漸層 + `::after` 底部短條 | `.step-num`（40px 圓 + JetBrains Mono 16px）+ `.step-label`（Inter 600 14px）分離；active 用 `linear-gradient(180deg,rgba(74,158,255,.12),rgba(74,158,255,.04))` + `0 0 22px rgba(74,158,255,.2) + inset 0 0 18px rgba(74,158,255,.06)`；active step-num 用 `--blue-grad` + `box-shadow:0 0 16px rgba(74,158,255,.5)` |
| field | `--row-bg-alt` + `--accent-2` 標籤 | `--bg-2` + `.planner-field-label` JetBrains Mono uppercase `--blue-light` |
| nav | `--clay-shadow` 面板 | 無獨立面板，直接 btn-ghost + btn |

**HTML 結構差異**：`index.html:292-294` 的 `.planner-step` 是 `<button>1. 基準</button>` 單文字；darkblue 是 `<div class="planner-step"><div class="step-num">1</div><div class="step-label">基準</div></div>` 雙層結構。需改 HTML + `tools/attribute-planner.js` 的 step render。

### 3.5 Crafting（中重）

| 元素 | 現況 | darkblue |
|---|---|---|
| crafting-item | `--row-bg-alt` + hover `translateX(4px)`（已有） | `--bg-2` + hover `translateX(4px)` + `0 0 14px rgba(74,158,255,.1)` 光暈 |
| crafting-item.active | `rgba(74,158,255,.15)` 單層 | `rgba(74,158,255,.08)` + `0 0 18px rgba(74,158,255,.15) + inset 0 0 14px rgba(74,158,255,.04)` 雙層光暈 |
| crafting-item-slot | `rgba(74,158,255,.15) + --accent-2` 6px | `--border-strong` border + JetBrains Mono uppercase `letter-spacing:.1em` `--blue-light` |
| crafting-tag | `rgba(76,175,80,.15) + #81C784`（綠）8px | `rgba(46,201,184,.12) + rgba(46,201,184,.35) border + --teal-light` 999px pill + `::before` 5px teal 光點 |
| crafting-detail-effect | `--row-bg-alt` 素面 | `linear-gradient(135deg,rgba(74,158,255,.1),rgba(107,126,255,.06)) + --border-strong + inset 0 0 18px rgba(74,158,255,.06)` + `.et` mono uppercase `--blue-bright` |
| detail-empty | 純文字 `--muted` | `.crafting-detail-empty` + `.empty-orb`（80px 圓 + radial + dashed border + `pulse-dot` 2.4s） |

**HTML 結構差異**：`index.html` 用 `.crafting-item-tag`/`.crafting-detail-tag`（綠色），darkblue 用統一 `.crafting-tag`（teal）。detail row 用 `.crafting-detail-label`/`.crafting-detail-value`，darkblue 用 `.lbl`/`.val`。需改 `tools/crafting.js` 的 render。

### 3.6 League（嚴重）

| 元素 | 現況 | darkblue |
|---|---|---|
| summary card | `.league-card` 無色彩變體 + `--accent-2` 值 | `.stat-card` 6 色變體（`c-cyan`/`c-indigo`/`c-teal`/`c-amber`/`c-rose`）+ `::before` 角落 radial 光暈 + `.stat-ico`（42px 漸層圖示盒）+ `.stat-value`（Manrope 800 30px + `text-shadow:0 0 16px`）+ `.stat-sub` mono |
| league-tab | 8px 矩形 + active 145deg 漸層 `color:#111` | 999px pill + active `--blue-grad` + `0 0 18px rgba(74,158,255,.35) + inset 0 1px 0 rgba(255,255,255,.2)` + `color:#fff` |
| league-table th | `rgba(74,158,255,.12)` 底 + `--accent-2` + 2px border-bottom | `--panel-3` 底 + `--blue-bright` + `text-shadow:0 0 8px rgba(74,158,255,.2)` + JetBrains Mono uppercase `letter-spacing:.12em` + `--border-strong` |
| td.name | 無特殊樣式 | `--blue-bright` 700 + `text-shadow:0 0 8px rgba(74,158,255,.25)` |
| td.num | 無特殊樣式 | `--amber` 700 |
| chart-fallback | dashed border + `--muted` 文字 | `.chart-fallback` + `.orb`（64px 圓 + radial + `--border-strong` + `0 0 24px + inset 0 0 16px` 光暈 + `pulse-dot` 2.4s）+ `repeating-linear-gradient(45deg,...)` 斜線底紋 |

**HTML 結構差異**：`index.html:208-213` 用 `.league-card`/`.league-card-icon`/`.league-card-title`/`.league-card-value`/`.league-card-breakdown`，darkblue 用 `.stat-card`/`.stat-ico`/`.stat-title`/`.stat-value`/`.stat-sub` + 色彩變體 class。需改 `tools/league.js` 的 summary render。`index.html:243-251` 用 `.league-section`/`.league-chart-wrap`/`<canvas>`，darkblue 用 `.league-chart-section`/`.chart-fallback`/`.orb`（demo 沒接 Chart.js，主應用有接，這點要保留 canvas 但 fallback 樣式可借鏡）。

### 3.7 Buttons / Inputs / Notification（中重，但是共用元件，槓桿高）

| 元素 | 現況 | darkblue |
|---|---|---|
| .cta / button | 145deg `--accent-2`→`--accent` + `5px 5px 12px + inset 2px 2px 4px rgba(255,255,255,.24) + inset -2px -2px 4px rgba(0,0,0,.12)` + `color:var(--on-accent)`（dark mode `#0a2540`，在深藍底會糊） | 135deg `--blue-grad` + `0 8px 20px rgba(74,158,255,.3) + inset 0 1px 0 rgba(255,255,255,.2)` + `color:#fff` + hover `translateY(-2) + 0 12px 28px + brightness(1.08)` |
| input | `--field-bg` + `--clay-shadow-inset` | `--bg-2` + `inset 0 1px 2px rgba(0,0,0,.3)` + focus `0 0 0 3px rgba(74,158,255,.18)` |
| .field-label | 無統一樣式 | JetBrains Mono 11px uppercase `letter-spacing:.12em --muted` |
| notification | `.notification` fixed + `--panel` + `--border` + `--clay-shadow` + `border-left:4px solid #4caf50/#f44336` + emoji icon | `.notif-sample` `--panel-2` + `--border-strong` + `--shadow-lg + 0 0 24px rgba(74,158,255,.15)` + `.nico`（34px `--blue-grad` 圓 + `0 0 14px rgba(74,158,255,.4)`）+ `.ntitle` Manrope + `.nmsg` mono |

**HTML 結構差異**：`index.html:407-454` 的 `window.showNotification` 動態生成 `.notification-icon`（emoji）+ `.notification-content`（title + message）+ `.notification-close`（×）。darkblue 用 `.nico`（漸層圓）+ `.ntitle` + `.nmsg`。要對齊需改 `showNotification` JS。

### 3.8 Bottom-nav / Topbar（輕中）

| 元素 | 現況 | darkblue |
|---|---|---|
| bottom-nav a | emoji `<span>` + `--muted` + active `--accent-dark + rgba(91,168,212,.1)` | `.bnav-ico`（`--blue` 18px）+ active `--blue-bright + rgba(74,158,255,.1)` + JetBrains Mono 10px |
| topbar buttons | `.mobile-nav-toggle` + `.theme-mode-button` clay | `.btn.btn-ghost.btn-sm` |

---

## 4. HTML 結構層差距（CSS-only 無法解決）

下列 class 命名/結構完全不同，**必須連 HTML + 對應 JS render 一起改**：

| 區塊 | 現況 class | darkblue class | 涉及 JS |
|---|---|---|---|
| sidebar footer | `.sidebar-actions` + `.theme-mode-button` | `.sidebar-footer` + `.status-row` + `.status-dot` + `.sys-meta` | `index.html` inline script |
| hero | `.hero-sub`/`.hero-lead`/`.cta-row`/`.cta` | `.hero .sub`/`.hero .lead`/`.hero .cta-row`/`.btn` | `index.html` 靜態 |
| home cards 變體 | `c-pink`/`c-blue`/`c-yellow` | `c-cyan`/`c-indigo` | `index.html` 靜態 |
| patch-frame | 無 | `.patch-frame` + `.patch-eyebrow` + `.patch-title` + `.patch-sub` | `index.html` 靜態 |
| calculator result | `<table>` + `<td colspan>` | `.result-card` + `.rc-head` + `.result-row` + `.compare-box .lbl/.val` | `tools/calculator.js` render |
| planner step | `<button>1. 基準</button>` | `.step-num` + `.step-label` | `tools/attribute-planner.js` |
| planner header | `.attribute-planner-header`/`.attribute-planner-kpi` | `.planner-header`/`.planner-kpi` + `<span class="accent">` | `index.html` 靜態 |
| crafting tag | `.crafting-item-tag`/`.crafting-detail-tag` | `.crafting-tag`（統一） | `tools/crafting.js` |
| crafting detail | `.crafting-detail-header`/`.crafting-detail-title`/`.crafting-detail-label`/`.crafting-detail-value`/`.crafting-detail-effect-title`/`.crafting-detail-effect-text` | `.crafting-detail-head`/`.crafting-detail-row`/`.lbl`/`.val`/`.et`/`.ex` | `tools/crafting.js` |
| league summary | `.league-card`/`.league-card-icon`/`.league-card-title`/`.league-card-value`/`.league-card-breakdown` | `.stat-card`/`.stat-ico`/`.stat-title`/`.stat-value`/`.stat-sub` + `c-cyan`/`c-indigo`/`c-teal`/`c-amber`/`c-rose` | `tools/league.js` |
| league table wrap | `.league-table-header`/`.league-filter-select`/`#league-table` | `.league-table-head`/`.league-filter`/`.league-table` | `tools/league.js` |
| notification | `.notification-icon`/`.notification-content`/`.notification-close` | `.nico`/`.ntitle`/`.nmsg` | `index.html` `showNotification` |

**風險**：改 JS render 邏輯會影響 `tests/e2e/*.spec.js` 的 selector（如 `crafting.spec.js`、`league.spec.js`、`ocr-calculator.spec.js`、`sync.spec.js`）。需同步更新測試。

---

## 5. 建議遷移優先序（5 階段）

### Phase 1：Foundation（槓桿最高，影響全部元件）
1. `index.html:11` 換 Google Fonts 為 Manrope/Inter/JetBrains Mono。
2. `index.html:14-81` 兩個 `:root`/`body.dark-mode` 補齊 darkblue 的色彩/漸層/陰影 token（`--blue-light`/`--cyan`/`--teal`/`--amber`/`--rose`/`--shadow-glow`/`--blue-grad`/`--cyan-grad`/…）。
3. `styles.css` 補 `@keyframes pulse-dot`（`darkblue.html:87-90`）與 `shimmer`。
4. 決策陰影方案（推薦 A：改寫 `--clay-shadow*` 的值為 darkblue 寫實陰影，保留變數名）。
5. 全域 `border-radius` 與 `linear-gradient` 角度 145→135 的審視（可順便改）。

**驗證**：dark mode 與 light mode 分別載入，目視主色調/字體/陰影是否接近 darkblue。

### Phase 2：共用元件（button / input / panel / notification）
6. `.cta`、`button`、`#view-calculator button`、`.league-btn`、`.crafting-reset-btn`、`.planner-primary-btn` 等統一改 darkblue 按鈕樣式（135deg 漸層 + 寫實落影 + 頂部高光 + `color:#fff`）。
7. `input`/`select`/`.crafting-search-input` 統一改 `--bg-2 + inset 0 1px 2px + focus ring`。
8. `.field-label` 統一改 JetBrains Mono uppercase 樣式。
9. `.notification` 改 `.notif-sample` 風格（漸層 nico + Manrope title + mono msg），連帶改 `showNotification` JS。

**驗證**：`npm test` 確認 routing/sync/ocr/crafting/league spec 不回歸。

### Phase 3：Shell（sidebar / hero / home）
10. sidebar：brand 換 `.logo-mark` SVG + `--blue-grad`；nav 加 `.nav-ico` 光暈 + `.nav-label`；footer 加 `.status-dot` pulse + `.sys-meta`。
11. hero：加 `.sub` eyebrow + `.stat-strip` + `::after` 底部光條 + `::before` 右側 radial；h2 `.accent` 改漸層文字。
12. home-cards：`c-pink/c-blue/c-yellow` → `c-cyan/c-indigo`，加 `::before` 角落 radial + hover `--shadow-glow`。
13. home-tag：改 mono uppercase + 光點。
14. 新增 `.patch-frame` 區塊（可放目前 `#view-home .footer` 上方）。

**驗證**：`tests/e2e/routing.spec.js` 通過；目視 home route 接近 `darkblue.html` home section。

### Phase 4：各 view（calculator / planner / crafting / league）
15. calculator：result-panel h3 加 `::after` 光條；result-card 加 `.rc-head`；result-row 加 `.dmg`/`.crit` 色碼；compare-box 改漸層 + 光暈；input-section h2 加 `::before` 光點。**注意**：若要完全換成 darkblue 的 div 結構，需改 `tools/calculator.js` render 與對應 spec；建議先保留 table 結構僅換樣式，Phase 4.5 再決定是否換結構。
16. planner：header h2 加 `.accent` span；kpi 改 `--panel-2 + --border-strong` + strong 光暈；step 拆 `.step-num` + `.step-label`（改 `tools/attribute-planner.js`）；field-label 改 mono uppercase。
17. crafting：item.active 加雙層光暈；item-slot 加 border + mono；tag 改 teal pill + 光點（改 `tools/crafting.js` 統一 `.crafting-tag`）；detail-effect 改漸層面板 + `.et`/`.ex`。
18. league：summary card 換 `.stat-card` 6 色變體（改 `tools/league.js`）；tab 改 999px pill + 光暈；table th 改 mono uppercase + text-shadow；td.name/td.num 加色碼；chart-fallback 加 `.orb` pulse（保留 canvas 結構）。

**驗證**：`npm test` 全綠；`tests/e2e/formulas.spec.js`（calculator 數學）必跑；目視各 route 接近 darkblue 對應 section。

### Phase 5：Polish
19. `.empty-orb`/`.chart-fallback .orb`/`.status-dot` 套 `pulse-dot` 動畫。
20. scrollbar thumb 改 `rgba(74,158,255,.35)`。
21. `prefers-reduced-motion` 已有 `styles.css:2546`，確認新增動畫也被覆蓋。
22. light mode 全局目視檢查（darkblue 沒提供 light 對照，需自創淺色變體並測試對比度）。

---

## 6. 風險與驗證注意

- **測試 selector 衝擊**：改 class 名（league-card→stat-card、crafting-detail-* 等）會打斷 `tests/e2e/crafting.spec.js`、`league.spec.js`、`ocr-calculator.spec.js`、`sync.spec.js`。每改一個 JS render 都要同步改 spec。建議 Phase 4 每改一個 view 就跑該 view 的 spec。
- **light mode 沒 reference**：darkblue 只有 dark mode。light mode 的 `--cyan-light`/`--teal-light`/`--amber-light`/`--rose-light` 要自創，且需注意 WCAG 對比度（目前 light mode 文字 `--text:#1e3a5f` 在淺藍底上 OK，但加光暈後可能糊）。
- **OCR 測試**：`tests/e2e/ocr-calculator.spec.js` 與 `ocr-parser.spec.js` 依賴 calculator 的 input/result DOM id（如 `#atk1-attack`、`#damage1_1`）。**這些 id 不可改**，只能改外層 class 與樣式。
- **`tools/crafting.js` fetch**：`file://` 會失敗，驗證時务必用 `npx serve .` 或 `npm test`（已 auto-serve）。
- **CDN 字體**：換 Manrope/Inter/JetBrains Mono 後，離線/CDN 阻斷會 fallback 到系統字體，需確認 fallback stack 仍可讀。
- **Chart.js**：league 圖表用 Chart.js，darkblue demo 用 `.chart-fallback` 沒接 Chart.js。遷移時保留 `<canvas>` 結構，只借 fallback 樣式給「無資料」狀態。
- **不改 id**：calculator/planner 的 input id 與 result span id 是 `pvp-config.js`/`combat-formulas.js`/`sync-bridge.js` 的契約，不可改名。

---

## 7. 未做與原因

- **未做視覺截圖比對**：本報告純程式碼層級分析。若要量化「視覺差距百分比」或找出肉眼才看得到的問題（如行距、留白、光暈強度感受），需另開瀏覽器並排截圖（chrome-devtools 或 playwright screenshot）。可作為下一步。
- **未評估 light mode 設計**：darkblue 無 light 對照，需單獨設計，本報告僅標記為風險。
- **未動任何程式碼**：依你的選擇「只先做分析報告」，本報告僅供決策參考。
- **未建立 Trellis 任務**：等你決定動工範圍後再建。

---

## 8. 下一步選項

1. **建立 Trellis 任務並進入規劃**：依本報告的 5 階段撰寫 `prd.md`/`design.md`/`implement.md`，逐階段驗證。
2. **只跑 Phase 1+2**（foundation + 共用元件）：最小風險，先看主色調/字體/按鈕是否到位，再決定要不要繼續。
3. **先做視覺截圖比對**：用 chrome-devtools 並排截圖 5 個 route，補強本報告的視覺證據。
4. **暫不動工**：報告存檔備查。
