# 聯賽數據分析 (League Data Analysis) — Design Spec

**Date:** 2026-04-02  
**Status:** Approved  
**Approach:** A — Single-page with guild tabs, sortable tables, summary cards, comparison charts

## Overview

Add a new "聯賽數據分析" view to the SPA where users upload a guild war CSV file and see parsed player/team stats with tables and charts. Follows existing SPA architecture: hash route `#/league`, lazy-initialized via `initLeague()`, styles scoped under `#view-league`.

## CSV Format

The input is a multi-guild guild war export:

```
"guild_name","player_count"
"玩家名字","職業","擊敗","助攻","資源","對玩家傷害","對建築傷害","治療值","承受傷害","重傷","化羽/清泉","焚骨"
"player1","class","9","159","260","36137344","8781033","0","20737637","9","0","38"
...

"guild_name_2","player_count_2"
"玩家名字","職業",...
"playerX","class",...
```

- All fields are double-quoted, comma-separated
- Guild header: `"name","number"` (number = player count)
- Empty lines separate guilds
- Columns: 玩家名字, 職業, 擊敗, 助攻, 資源, 對玩家傷害, 對建築傷害, 治療值, 承受傷害, 重傷, 化羽/清泉, 焚骨

## Page Layout (top to bottom)

### 1. Upload Bar
- File input accepting `.csv`
- After upload: shows filename + "重新上傳" button
- Parsed data persisted in `localStorage` key `leagueData`

### 2. Summary Cards Row (4 cards)
- 總擊敗 (Total Kills)
- 總對玩家傷害 (Total Damage to Players)
- 總治療值 (Total Healing)
- 總重傷 (Total Deaths)
- Each card shows value + guild breakdown

### 3. Guild Tabs
- One tab per guild from CSV
- Default: first guild selected
- Active tab styled with accent color
- Last selected tab persisted in `localStorage` key `leagueActiveTab`

### 4. Player Stats Table (per guild tab)
- All 12 CSV columns displayed
- Click column header to sort asc/desc (toggle)
- Dropdown filter by 職業 (九靈, 素問, 碎夢, 血河, 神相, 鐵衣, 龍吟, 玄機)
- Alternating row shading

### 5. Guild Comparison Section
- Horizontal bar chart comparing aggregate stats across guilds
- Metrics: Total kills, Total player damage, Total healing, Total deaths
- Chart.js, styled with gold accent palette

### 6. Class Distribution Chart (per guild tab)
- Doughnut chart showing player count per 職業

## Files

| File | Change |
|------|--------|
| `index.html` | Add `#view-league` div with HTML structure, add route `'league': 'view-league'`, add Chart.js CDN script, add `<script src="tools/league.js">`, enable nav links |
| `tools/league.js` | New: `initLeague()`, CSV parser, table renderer, Chart.js charts, sort/filter, localStorage |
| `styles.css` | League view styles scoped under `#view-league` |

## CSV Parser Logic

1. Split file by newlines
2. For each line, strip quotes and split by `","` 
3. Detect guild header: line has exactly 2 fields and second field is all digits → new guild entry
4. Detect column header: first field is `"玩家名字"` → mark next lines as data rows
5. Data rows: parse into player objects under current guild
6. Empty lines: skip
7. Malformed rows: skip, show notification with row number

## Edge Cases

- No data uploaded → show upload prompt with format instructions
- 1 guild → no comparison chart, just guild tab
- >2 guilds → comparison chart shows all, tabs for all
- Re-upload replaces existing data
- Browser without Chart.js → tables still work, charts gracefully hidden

## Dependencies

- **Chart.js** via CDN (`https://cdn.jsdelivr.net/npm/chart.js`) — single `<script>` tag, no build step
- No other external dependencies

## localStorage

- `leagueData` — parsed JSON of last uploaded CSV
- `leagueActiveTab` — last selected guild tab name
