# 打造資料庫 (Crafting Skills Database) — Design Spec

**Date:** 2026-04-02  
**Status:** Approved (design)  
**Approach:** One-time Google Sheet snapshot to local JSON, query-first `#/crafting` view

## Overview

Add a new SPA page `#/crafting` as a searchable database for 裝備打造特技.  
V1 is query-first (no editing/admin), using a one-time captured dataset from the specified Google Sheet tab (`gid=198994622`) stored locally in JSON for speed and reliability.

## Scope

### In Scope (V1)
- New route/view: `#/crafting`
- Local JSON dataset file generated from one-time fetch/snapshot
- Advanced query UX:
  - Keyword search
  - Multi-filter (season, slot, effect type)
  - Sorting
- Detail panel for selected skill with full effect description
- Responsive and dark-mode-compatible UI

### Out of Scope (V1)
- Live Google Sheet sync
- In-app data editing/import management
- Favorites/recent history/user accounts

## Data Source Strategy

- Source target: Google Sheet tab `gid=198994622` from provided spreadsheet URL
- Strategy: Fetch/parse once, normalize, save as `tools/crafting-db.json`
- Runtime behavior: Frontend reads local JSON only
- Update model: manual refresh by re-running snapshot workflow (future enhancement)

## File Changes

| File | Change |
|------|--------|
| `index.html` | Add `#/crafting` nav entries (sidebar + bottom nav), add `#view-crafting`, register route, include `<script src="tools/crafting.js">` |
| `styles.css` | Add styles scoped under `#view-crafting` |
| `tools/crafting.js` | New page logic (`initCrafting()`), data loading, state, filtering, sorting, rendering |
| `tools/crafting-db.json` | One-time normalized snapshot data |

## Data Model

Each record in `tools/crafting-db.json`:

```json
{
  "id": "s1-weapon-001",
  "seasonYear": "第一賽年",
  "season": "S1",
  "category": "打造特技",
  "slot": "武器",
  "boss": "墨先生",
  "source": "副本【秋嵐畫院】",
  "skillName": "石破天驚",
  "effectTag": "範圍減速",
  "effectText": "攻擊時有10%概率..."
}
```

## Field Mapping

From sheet columns to normalized fields:

- 賽年 → `seasonYear`
- 賽季 → `season`
- 打造部位 → `slot`
- 首領 → `boss`
- 秘藏/來源欄位 → `source`
- 特技 → `skillName`
- 特技效果（短標）→ `effectTag`
- 特技效果（全文）→ `effectText`

## Normalization Rules

- Trim spaces (including full-width spaces)
- Keep missing values as empty string (`''`)
- Preserve original Chinese wording (no semantic rewrite)
- Generate stable unique `id` from `season + slot + skillName + index`
- Keep records even if some optional fields are empty

## UI/UX Design

### Route and Layout

- Route: `#/crafting`
- Main structure:
  1. Toolbar (search + filters + sort + reset)
  2. Result list area (compact rows/cards)
  3. Detail panel for selected record

### List (compact fields only)

Display fields per result row:
- `skillName`
- `season`
- `slot`
- `source`
- `effectTag`

### Detail Panel

Displays:
- `skillName`
- `seasonYear` / `season`
- `slot`
- `boss`
- `source`
- full `effectText`

### Responsive Behavior

- Desktop/tablet: list + detail side by side
- Mobile: list above, detail below

## Query Behavior

### Keyword Search

Search across:
- `skillName`
- `effectTag`
- `source`
- `boss`

Case-insensitive text match.

### Multi-filter

Filter dimensions:
- Season (`season`)
- Slot (`slot`)
- Effect type (`effectTag`)

Options are derived dynamically from loaded dataset values.

### Sorting

Supported sorts:
- `season` new → old (default)
- `season` old → new
- `skillName` A → Z
- `skillName` Z → A

Deterministic tiebreakers:
1. `slot`
2. `skillName`

### State Handling

- Search and filters are combined (AND logic)
- Updating one control preserves others
- If selected item is filtered out, auto-select first visible item

## Error Handling

- JSON load failure: show notification + empty state
- Empty query result: show “找不到符合條件的特技”
- Missing field in record: render `—` for display-only fields

Suggested error message for dataset failure:
- `打造資料載入失敗，請聯絡管理員更新資料快照`

## Manual Verification Checklist

1. Navigate to `#/crafting` and view renders
2. Keyword search updates list immediately
3. Season/slot/effect filters work together
4. Sort modes change result order correctly
5. Clicking a result updates detail panel with full `effectText`
6. Mobile layout stacks list above detail
7. Dark mode remains readable and consistent

## Implementation Notes

- Follow existing SPA pattern: lazy init guard (`window.__craftingInitialized`)
- Keep all styles scoped under `#view-crafting`
- Use existing notification system (`window.showNotification`)
- Keep Traditional Chinese UI copy consistent with project language
