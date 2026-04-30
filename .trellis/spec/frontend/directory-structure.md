# Directory Structure

> How frontend code is organized in this project.

---

## Overview

This repository ships a root-level static SPA. There is no `src/` directory, generated app build directory, bundler, framework, or ES module graph for the browser application. GitHub Pages deploys the repository root as-is.

Frontend work is organized around:

- `index.html` for the app shell, hash router, static route markup, script loading, theme persistence, mobile/desktop navigation, and global notifications.
- `styles.css` for global feature and app-shell styles, with additional inline shell CSS in `index.html`.
- `tools/*.js` for browser-global feature scripts and shared modules.
- `tools/crafting-db.json` for the crafting data snapshot loaded at runtime over HTTP.
- `tests/e2e/*.spec.js` and `tests/fixtures/` for Playwright regression coverage and fixtures.

Do not introduce a bundler/module system, framework-specific directory layout, or generated output directory unless a task explicitly asks for that migration.

---

## Directory Layout

```text
.
├── index.html                         # Static SPA shell, route markup, router, theme, notifications
├── styles.css                         # Global CSS for shell and feature views
├── tools/
│   ├── pvp-config.js                  # Shared calculator/planner field lists and bridge mapping
│   ├── combat-formulas.js             # Shared damage formula helpers on window.pvpCombat
│   ├── calculator.js                  # Calculator UI behavior, persistence, import/export, OCR import
│   ├── sync-bridge.js                 # Calculator/planner sync channel on window.pvpSyncBridge
│   ├── attribute-planner.js           # 3-step planner for calculator atk1 vs def1 scenario
│   ├── crafting.js                    # Crafting data loading, filters, list/detail rendering
│   ├── crafting-db.json               # Crafting records fetched by crafting.js
│   ├── league.js                      # CSV upload/parsing, tables, filters, charts, cache restore
│   └── ocr-demo.js                    # OCR parsing/runtime/sample storage exposed as window.pvpOcr
├── tests/
│   ├── e2e/*.spec.js                  # Playwright specs for routes, tools, sync, OCR, formulas
│   └── fixtures/                      # Test CSV/image fixtures
├── playwright.config.js               # Default Chromium Playwright config; excludes real OCR spec
├── playwright.ocr-real.config.js      # Manual real-image OCR config
└── package.json                       # Playwright/serve dev dependencies and test scripts only
```

There is intentionally no `src/`, `components/`, `pages/`, `hooks/`, `dist/`, `build/`, `vite.config.*`, or TypeScript project config for app code.

---

## Module Organization

### App shell and routing

`index.html` owns the route list and view switching:

- Desktop and mobile nav entries both use matching `data-route` values.
- `ROUTES` maps hash keys to view element ids.
- `navigate(location.hash)` hides all `.view` elements, reveals one view, updates active nav state, initializes the calculator route directly, and dispatches `pvp:routechange`.

Current routes must stay aligned across markup, both navs, `ROUTES`, and route listeners:

- `#/` -> `#view-home`
- `#/calculator` -> `#view-calculator`
- `#/attribute-planner` -> `#view-attribute-planner`
- `#/crafting` -> `#view-crafting`
- `#/league` -> `#view-league`

Concrete examples:

```html
<!-- index.html -->
<nav class="bottom-nav" aria-label="行動版導覽">
  <a href="#/calculator" data-route="calculator"><span>⚔️</span>計算器</a>
  <a href="#/attribute-planner" data-route="attribute-planner"><span>📈</span>規劃</a>
</nav>

<script>
  const ROUTES = { '': 'view-home', 'calculator': 'view-calculator', 'league': 'view-league', 'crafting': 'view-crafting', 'attribute-planner': 'view-attribute-planner' };
  function navigate(hash) {
    const route = hash.replace(/^#\/?/, '') || '';
    const viewId = ROUTES[route] || 'view-home';
    document.querySelectorAll('.view').forEach(v => v.hidden = true);
    document.getElementById(viewId).hidden = false;
    document.dispatchEvent(new CustomEvent('pvp:routechange', { detail: { route, viewId } }));
  }
</script>
```

### Script dependency order

Browser scripts are global and loaded by dependency order in `index.html`. Preserve this ordering unless a task changes the dependencies deliberately:

1. Chart.js CDN
2. `tools/pvp-config.js`
3. `tools/combat-formulas.js`
4. `tools/calculator.js`
5. `tools/league.js`
6. `tools/crafting.js`
7. `tools/sync-bridge.js`
8. `tools/attribute-planner.js`
9. `tools/ocr-demo.js`

Example:

```html
<!-- index.html -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
<script src="tools/pvp-config.js"></script>
<script src="tools/combat-formulas.js"></script>
<script src="tools/calculator.js"></script>
<script src="tools/league.js"></script>
<script src="tools/crafting.js"></script>
<script src="tools/sync-bridge.js"></script>
<script src="tools/attribute-planner.js"></script>
<script src="tools/ocr-demo.js"></script>
```

### Feature ownership

Each feature is owned by static markup in `index.html` plus one browser-global script in `tools/`:

- Calculator: `tools/calculator.js` owns numeric input persistence, formulas, import/export, reset, OCR import, and copy-left/right behavior.
- Attribute planner: `tools/attribute-planner.js` owns generated planner controls and syncs only the calculator `atk1` baseline scenario.
- Crafting: `tools/crafting.js` owns `tools/crafting-db.json` loading, fallback fetch paths, filter options, cards, details, and error UI.
- League: `tools/league.js` owns CSV parsing, Big5 retry, local cache, tabs, filters, sorting, summaries, and Chart.js rendering/fallbacks.
- OCR: `tools/ocr-demo.js` owns lazy Tesseract loading, OCR parser/runtime, sample storage, debug output, and `window.pvpOcr`.

Shared modules expose browser globals instead of imports:

```js
// tools/pvp-config.js
(function initPvpConfig() {
    if (window.pvpConfig) return;
    const ATTACK_FIELDS = ['attack', 'elementalAttack', 'defenseBreak', 'shieldBreak', 'pvpAttack', 'accuracy', 'crit', 'critDamage', 'extraCritRate', 'pvpAttackRate', 'elementalBreak', 'skillAttack'];
    const DEFENSE_FIELDS = ['defense', 'airShield', 'elementalResistance', 'pvpResistance', 'blockResistance', 'criticalResistance', 'criticalDefense', 'skillResistance'];
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
    const PLANNER_ATTRIBUTES = [
        { id: 'attack', name: '攻擊', min: 0, max: 999999, step: 1 },
        { id: 'elementalAttack', name: '元素攻擊', min: 0, max: 999999, step: 1 },
        { id: 'defenseBreak', name: '破防', min: 0, max: 999999, step: 1 },
        { id: 'shieldBreak', name: '破盾', min: 0, max: 999999, step: 1 },
        { id: 'accuracy', name: '命中', min: 0, max: 999999, step: 1 },
        { id: 'crit', name: '會心', min: 0, max: 999999, step: 1 },
        { id: 'critDamage', name: '會傷', min: 0, max: 999999, step: 1 },
        { id: 'elementalBreak', name: '忽視元抗', min: 0, max: 999999, step: 1 }
    ];
    window.pvpConfig = { ATTACK_FIELDS, DEFENSE_FIELDS, BRIDGE_FIELD_MAP, BASELINE_SYNC_KEYS, PLANNER_ATTRIBUTES };
})();

// tools/combat-formulas.js
(function initPvpCombatFormulas() {
    if (window.pvpCombat) return;
    function toInt(value) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? n : 0;
    }
    window.pvpCombat = {
        SKILL_BASE,
        SKILL_MULTIPLIER,
        toInt,
        calculateRemainDefense,
        calculateDefenseRate,
        calculateRemainShield,
        calculateElementalResisRate,
        calculateActualAccuracyRate,
        calculateActualCritRate,
        calculateCombatStats
    };
})();
```

---

## Naming Conventions

- Browser feature scripts are plain lowercase/kebab-case files under `tools/` (`calculator.js`, `attribute-planner.js`, `sync-bridge.js`, `ocr-demo.js`).
- Global init functions use `initFeatureName` names where the route calls them (`initCalculator`, `initCrafting`, `initLeague`, `initAttributePlanner`).
- One-time guards use `window.__...Initialized` and route-listener guards use `window.__...RouteListenerBound`.
- Shared global namespaces use `window.pvp...` (`window.pvpConfig`, `window.pvpCombat`, `window.pvpSyncBridge`, `window.pvpOcr`).
- DOM ids are stable selectors and persistence keys. Calculator ids encode side and stat, e.g. `atk1-attack`, `def1-defense`; result persistence uses `result-<spanId>`.
- User-facing app copy is mostly Traditional Chinese (`zh-TW`). Keep new UI text consistent with surrounding copy.

---

## Examples

Good project-shaped examples:

- `index.html` route shell: keeps markup, nav, route map, theme, and notifications in the shipped HTML file.
- `tools/crafting.js`: feature-local state plus HTTP JSON fetch fallback (`tools/crafting-db.json`, then `../tools/crafting-db.json`) and DOM API rendering.
- `tools/sync-bridge.js`: small shared browser-global module with private state, `CustomEvent` channel, sanitized payloads, and a cleanup-returning `subscribe` function.
- `tests/e2e/sync.spec.js`: verifies the calculator/planner cross-feature contract rather than relying on implementation details.

Avoid these mismatches:

- Do not create `src/components/*`, React pages, hooks, or module imports for normal changes in this repo.
- Do not move deployable files into `dist/` or assume a build step exists.
- Do not update route markup without also updating `ROUTES`, both navs, and affected route listeners/tests.
- Do not open the app via `file://` for feature work; `tools/crafting.js` fetches JSON and needs HTTP serving.
