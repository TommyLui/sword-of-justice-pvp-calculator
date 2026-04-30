# State Management

> How state is managed in this project.

---

## Overview

There is no Redux, Zustand, React state, server-state cache, router library, or framework store. State is managed with:

- File-local variables inside each `tools/*.js` feature script.
- DOM values in stable form controls and result spans.
- Explicit `localStorage` keys for persistence.
- The URL hash for route state.
- `window.pvpSyncBridge` for the one cross-feature calculator/planner baseline sync contract.
- Browser events for route, theme, and sync updates.

Keep state close to the feature that owns it. Only promote state to a shared `window.pvp...` module when more than one feature has an existing, concrete need for the same state.

---

## State Categories

### Feature-local in-memory state

Each feature owns small file-local variables rather than a shared app store.

Examples:

```js
// tools/crafting.js
let records = [];
let filtered = [];
let selectedId = null;
let isLoading = false;
let loadPromise = null;
```

```js
// tools/league.js
let leagueData = null;
let activeGuild = null;
let sortColumn = null;
let sortAsc = true;
let activeFilter = '';
let comparisonChart = null;
let classChart = null;
let statsCache = null;
```

```js
// tools/attribute-planner.js
const state = {
    step: 1,
    baseline: {},
    candidate: {},
    lastResult: null
};
```

### DOM state

Inputs and route containers are part of the state contract:

- Calculator and planner numeric inputs are read by id.
- Routed views are hidden/shown with the `hidden` property.
- Result spans are updated with `textContent` and persisted by id.
- Active tabs/nav elements are represented with classes and `data-*` attributes.

Example:

```js
// tools/calculator.js
function getInputValue(id) {
    return combat.toInt(document.getElementById(id)?.value);
}

document.getElementById('damage1_1').textContent = Math.floor(matchup1_1.finalDamage);
localStorage.setItem(`result-${element.id}`, element.textContent);
```

### URL route state

The current page is the hash route. `index.html` maps route keys to view ids and dispatches `pvp:routechange` after navigation. There is no separate router state object.

```js
// index.html
const route = hash.replace(/^#\/?/, '') || '';
const viewId = ROUTES[route] || 'view-home';
document.querySelectorAll('.view').forEach(v => v.hidden = true);
document.getElementById(viewId).hidden = false;
```

---

## Persistence and Key Ownership

Use explicit keys and preserve existing ownership. Do not rename persistence keys without migration and regression coverage.

| Key / key pattern | Owner | Purpose |
| --- | --- | --- |
| `darkMode` | `index.html` | Stores shell dark-mode boolean string. |
| `<calculator input id>` such as `atk1-attack` | `tools/calculator.js` | Stores calculator numeric input values by DOM id. |
| `result-<spanId>` | `tools/calculator.js` | Stores calculator result span text by result span id. |
| `leagueData` | `tools/league.js` | Stores parsed league CSV data. |
| `leagueFilename` | `tools/league.js` | Stores the uploaded filename label. |
| `leagueActiveTab` | `tools/league.js` | Stores the active league tab. |
| `ocrDemoSamples` | `tools/ocr-demo.js` | Stores OCR sample calibration data. |

Examples:

```js
// index.html
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}
localStorage.setItem('darkMode', isDark);
```

```js
// tools/calculator.js
document.querySelectorAll('#view-calculator input[type="number"]').forEach(input => {
    const saved = localStorage.getItem(input.id);
    if (saved !== null) input.value = saved;
});

document.querySelectorAll('#results span[id]').forEach(element => {
    localStorage.setItem(`result-${element.id}`, element.textContent);
});
```

```js
// tools/league.js pattern
localStorage.setItem('leagueData', JSON.stringify(leagueData));
localStorage.setItem('leagueFilename', file.name);
localStorage.setItem('leagueActiveTab', activeGuild);
```

Use `try/catch` when restoring JSON from `localStorage`; remove or ignore invalid cache entries rather than crashing the route.

---

## Cross-Feature State

Only calculator `atk1` baseline fields sync with the attribute planner. The shared contract lives in `tools/pvp-config.js` and `tools/sync-bridge.js`:

- `BRIDGE_FIELD_MAP` maps planner attribute keys to calculator DOM ids.
- `BASELINE_SYNC_KEYS` is derived from the bridge map.
- `window.pvpSyncBridge.getBaselineAtk1()` returns current synced values plus `_meta`.
- `window.pvpSyncBridge.setBaselineAtk1(partial, { source, onlyIfEmpty })` sanitizes partial values, updates state, and dispatches `pvp-sync:update`.
- `window.pvpSyncBridge.subscribe(listener)` returns an unsubscribe function.

Example:

```js
// tools/pvp-config.js
const BRIDGE_FIELD_MAP = {
    attack: 'atk1-attack',
    elementalAttack: 'atk1-elementalAttack',
    defenseBreak: 'atk1-defenseBreak',
    shieldBreak: 'atk1-shieldBreak',
    accuracy: 'atk1-accuracy',
    crit: 'atk1-crit',
    critDamage: 'atk1-critDamage',
    elementalBreak: 'atk1-elementalBreak'
};
const BASELINE_SYNC_KEYS = Object.keys(BRIDGE_FIELD_MAP);
```

Example:

```js
// tools/sync-bridge.js
function sanitizePartial(partial) {
    const next = {};
    ATTR_KEYS.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(partial, key)) {
            next[key] = toInt(partial[key]);
        }
    });
    return next;
}
```

Calculator and planner must ignore their own updates and use re-entry guards:

```js
// tools/calculator.js
const SYNC_SOURCE = 'calculator';
let isApplyingBridgeUpdate = false;

const publishToBridge = () => {
    if (!window.pvpSyncBridge?.setBaselineAtk1 || isApplyingBridgeUpdate) return;
    window.pvpSyncBridge.setBaselineAtk1(readAtk1SyncData(), { source: SYNC_SOURCE });
};
```

Do not sync `atk2`, `def1`, or `def2` into planner unless the task explicitly changes the product contract and updates tests.

---

## Server State

There is no backend server state. The app is static and reads local files/user uploads in the browser:

- `tools/crafting.js` fetches `tools/crafting-db.json` with a fallback path and keeps loading/error states visible.
- `tools/league.js` parses uploaded CSV client-side and caches parsed results in `localStorage`.
- `tools/ocr-demo.js` lazy-loads Tesseract from CDN and stores sample calibration data locally.

Treat these as browser runtime data sources, not API-backed server state. Do not add an API client, query cache, or backend assumption for normal feature work.

---

## Common Mistakes

- Do not add a global state library to solve feature-local state.
- Do not duplicate calculator/planner bridge mappings in multiple files; update `tools/pvp-config.js` first when the synced attribute contract changes.
- Do not remove sync `source` metadata or re-entry guards; this can create calculator/planner feedback loops.
- Do not rename `localStorage` keys casually; persistence and Playwright tests depend on stable keys.
- Do not store user-imported data as HTML. Persist JSON/text values and render with `textContent`.
- Do not assume state is reset on route changes; feature scripts intentionally reuse initialized DOM/state on route revisits.
