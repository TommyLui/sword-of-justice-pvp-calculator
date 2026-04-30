# Hook Guidelines

> How stateful browser behavior is organized in this project.

---

## Overview

This project does not use React or custom hooks. There are no `use*` files, hook dependency arrays, React Query, SWR, or framework lifecycle APIs. The closest project-specific equivalents are:

- Global `init*` functions called by the hash router or route listeners.
- One-time initialization guards on `window`.
- Custom browser events (`pvp:routechange`, `pvp:themechange`, `pvp-sync:update`).
- File-local state variables inside each `tools/*.js` feature script.
- Cleanup-returning subscription functions for shared event channels.

When implementing stateful UI behavior, follow these native browser patterns instead of introducing hooks or a framework runtime.

---

## Initialization Patterns

Feature scripts expose global initialization functions and guard repeated binding.

Examples:

```js
// tools/crafting.js
function initCrafting() {
    if (window.__craftingInitialized) return;
    window.__craftingInitialized = true;

    let records = [];
    let filtered = [];
    let selectedId = null;
    // bind listeners once, then render/update feature-local state
}
```

```js
// tools/calculator.js
function initCalculator() {
    const combat = window.pvpCombat;
    if (!combat) {
        notify({ type: 'error', title: '載入失敗', message: '傷害公式模組未載入，請重新整理頁面' });
        return;
    }

    if (window.__calculatorInitialized) {
        hydrateCalculatorState();
        return;
    }
    window.__calculatorInitialized = true;
    // first-time listener binding happens after this point
}
```

For revisited routes, refresh or hydrate existing DOM/state rather than rebinding all listeners.

---

## Route and Event Patterns

### Route lifecycle

`index.html` dispatches `pvp:routechange` after switching visible views. Feature scripts listen once and initialize lazily on the relevant route.

Examples:

```js
// index.html
document.dispatchEvent(new CustomEvent('pvp:routechange', {
    detail: { route, viewId }
}));
```

```js
// tools/league.js route listener pattern
if (!window.__leagueRouteListenerBound) {
    window.__leagueRouteListenerBound = true;
    document.addEventListener('pvp:routechange', (event) => {
        if (event.detail?.route === 'league') {
            initLeague();
        }
    });
}
```

Use the same route-listener guard pattern for new route-owned features. Do not attach a new listener on every route visit.

### Theme events

Dark mode is owned by `index.html` and persisted as `localStorage.darkMode`. The shell dispatches `pvp:themechange` with `{ darkMode }`; feature scripts can respond when they have theme-sensitive rendering.

Example:

```js
// index.html
const isDark = document.body.classList.toggle('dark-mode');
localStorage.setItem('darkMode', isDark);
document.dispatchEvent(new CustomEvent('pvp:themechange', {
    detail: { darkMode: isDark }
}));
```

`tools/league.js` uses this pattern to redraw charts only when league data exists and the league view is visible.

### Cross-feature sync events

Calculator/planner sync uses `window.pvpSyncBridge` and the `pvp-sync:update` event. Preserve `source` metadata and re-entry guards to avoid feedback loops.

Example:

```js
// tools/sync-bridge.js
function setBaselineAtk1(partial, options = {}) {
    const { source = 'unknown', onlyIfEmpty = false } = options;
    const clean = sanitizePartial(partial || {});
    if (Object.keys(clean).length === 0) return false;

    state.baselineAtk1 = { ...state.baselineAtk1, ...clean };
    state.source = source;
    window.dispatchEvent(new CustomEvent('pvp-sync:update', {
        detail: { baselineAtk1: { ...state.baselineAtk1 }, updatedAt: state.updatedAt, source: state.source }
    }));
    return true;
}
```

```js
// tools/calculator.js
const applyFromBridge = (payload) => {
    if (!payload || payload.source === SYNC_SOURCE) return;
    isApplyingBridgeUpdate = true;
    // update DOM/localStorage, recalculate, then clear the guard
    isApplyingBridgeUpdate = false;
};
```

---

## Data Fetching and Lazy Loading

There is no data-fetching library. Use native browser APIs with explicit loading/error UI and defensive fallback behavior.

### Runtime JSON data

`tools/crafting.js` fetches a static JSON file over HTTP. It prevents re-entry with `isLoading`/`loadPromise`, tries more than one path, normalizes data, renders filters, and shows visible error UI plus a notification on failure.

```js
// tools/crafting.js
let isLoading = false;
let loadPromise = null;

async function loadData() {
    if (isLoading && loadPromise) return loadPromise;
    if (records.length > 0) return Promise.resolve();

    isLoading = true;
    listContainer.innerHTML = '<div class="crafting-loading">載入中...</div>';

    loadPromise = (async () => {
        try {
            let response;
            const pathsToTry = ['tools/crafting-db.json', '../tools/crafting-db.json'];
            for (const path of pathsToTry) {
                response = await fetch(path);
                if (response.ok) break;
            }
            const data = await response.json();
            records = data.map(record => ({ ...record, _seasonSortKey: getSeasonNumber(record.season) }));
        } catch (error) {
            notify({ type: 'error', title: '載入失敗', message: '打造資料載入失敗，請聯絡管理員更新資料快照' });
        } finally {
            isLoading = false;
            loadPromise = null;
        }
    })();

    return loadPromise;
}
```

Because of this fetch, serve the app over HTTP (`npx serve .`, Playwright web server, or Python HTTP server); do not validate feature behavior with `file://`.

### Lazy third-party runtime

`tools/ocr-demo.js` lazy-loads Tesseract from a CDN and exposes `window.pvpOcr` for calculator and tests. Default tests mock OCR behavior; real Tesseract/image OCR is manual-only.

### CSV/file uploads

`tools/league.js` parses uploaded CSV files in the browser, retries with Big5 after UTF-8, validates parsed shape, and caches parsed data/filename/tab in `localStorage`.

---

## Naming Conventions

- Do not create `useSomething` hooks for app code.
- Use `initFeatureName` for route-owned initializers (`initCalculator`, `initCrafting`, `initLeague`, `initAttributePlanner`).
- Use `window.__featureInitialized` for one-time feature binding guards.
- Use `window.__featureRouteListenerBound` for one-time route listener guards.
- Use `pvp:*` event names for app-level events and `window.pvp...` for shared browser-global modules.
- Use explicit source constants for sync publishers, e.g. `const SYNC_SOURCE = 'calculator'`.

---

## Common Mistakes

- Do not add React/custom hook abstractions to share stateful logic; use native events, init functions, and small shared `window.pvp...` modules.
- Do not skip initialization guards. Rebinding listeners on route revisit causes duplicate handlers and stale state bugs.
- Do not drop sync `source` metadata or re-entry flags (`isApplyingBridgeUpdate`, `isApplyingSync`); calculator/planner sync depends on them.
- Do not perform fetch-dependent validation over `file://`; HTTP serving is required.
- Do not make real OCR/Tesseract calls in the default regression path; use mocks except for `npm run test:ocr-real`.
