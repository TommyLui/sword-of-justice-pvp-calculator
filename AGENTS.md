# AGENTS.md

## Repo shape
- Current app lives at the repo root as a static SPA: `index.html` + `styles.css` + global scripts under `tools/`.
- `2.1/` is an archived older snapshot; leave it alone unless the task explicitly targets that version.
- There is no `package.json`, lockfile, bundler, module system, lint config, typecheck config, or automated test setup. Verification here is manual in a browser.
- User-facing copy is predominantly Traditional Chinese (`zh-TW`); keep new UI text consistent unless the surrounding screen is already English.

## Run / deploy
- Serve over HTTP, not `file://`: `npx serve .`, `python -m http.server 8000`, or VS Code Live Server all work.
- `tools/crafting.js` fetches `tools/crafting-db.json`, so `file://` will give misleading results.
- GitHub Pages deploys the repo root as-is from `.github/workflows/deploy.yml` on pushes to `main` or `master` and on manual dispatch. There is no build step or output directory.

## Wiring that is easy to break
- `index.html` is the app shell: it defines the hash router (`ROUTES`), dark-mode persistence (`localStorage.darkMode`), mobile nav behavior, and `window.showNotification(...)`.
- Script order matters because everything is global: Chart.js CDN → `tools/pvp-config.js` → `tools/combat-formulas.js` → `tools/calculator.js` → `tools/league.js` → `tools/crafting.js` → `tools/sync-bridge.js` → `tools/attribute-planner.js`.
- Keep code browser-ready and global-script-compatible; do not convert app code to ES modules unless explicitly asked.
- Tool entrypoints are `initCalculator()`, `initLeague()`, `initCrafting()`, and `initAttributePlanner()`. Each file uses a one-time `window.__...Initialized` guard, so revisiting a route should rehydrate state instead of rebinding listeners.

## Source-of-truth files
- `tools/pvp-config.js` owns field lists plus the calculator ↔ planner bridge map. If synced attributes change, update this first.
- `tools/combat-formulas.js` exposes `window.pvpCombat`; calculator math depends on it loading before `tools/calculator.js`.
- `tools/sync-bridge.js` is the only calculator/planner sync channel (`window.pvpSyncBridge` + `CustomEvent`). Preserve the `source`/re-entry guards or you will create feedback loops.
- `tools/calculator.js` persists nearly every numeric input and result in `localStorage`, and owns copy-left/right, import/export, and reset-dialog behavior.
- `tools/attribute-planner.js` is a 3-step planner that compares baseline vs candidate and syncs the baseline subset from calculator `atk1` through the bridge.
- `tools/crafting.js` loads `tools/crafting-db.json` with fallback paths (`tools/crafting-db.json`, `../tools/crafting-db.json`) and keeps explicit loading/error states visible.
- `tools/league.js` parses uploaded CSV, retries with `Big5` after UTF-8, caches parsed data and filename in `localStorage`, and redraws Chart.js charts after dark-mode toggles.

## Editing conventions
- Match the existing plain-function style and small file-local state rather than introducing abstractions.
- Use `window.showNotification(...)` or local `notify()` wrappers for user-visible success/error feedback.
- Keep the repo's defensive parsing style when touching inputs, JSON, or CSV: `parseInt(..., 10)` helpers, shape checks, and `try/catch`.

## Manual verification
- Smoke test `#/calculator`, `#/attribute-planner`, `#/crafting`, and `#/league`.
- Reload once after changes: dark mode, calculator values/results, and league cached data all persist and can hide default-state bugs.
- If calculator, planner, `pvp-config.js`, or `sync-bridge.js` changes, verify baseline sync both ways: calculator `atk1` → planner baseline and planner baseline → calculator.
- If crafting changes, confirm data loads over HTTP and filters/detail panel still work.
- If league changes, upload a representative CSV, verify sort/filter/charts, toggle dark mode, then reload to confirm cached restore.
