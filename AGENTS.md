# AGENTS.md

## Repo facts
- Static single-page app for Sword of Justice (`逆水寒`) built with plain HTML, CSS, and vanilla JS.
- No `package.json`, lockfile, bundler, framework, modules, lint config, or automated test setup exists.
- User-facing copy should stay in Traditional Chinese (`zh-TW`) unless the surrounding screen is already English.
- `2.1/` is an archived older season snapshot; leave it alone unless the task explicitly targets it.

## Run and deploy
- Local serve: `npx serve .` or `python -m http.server 8000`.
- Do not rely on `file://` for verification; `tools/crafting.js` fetches `tools/crafting-db.json`.
- GitHub Pages deploys the repo root as-is via `.github/workflows/deploy.yml` on push to `main` or `master` and on manual dispatch. There is no build step or artifact directory.

## App wiring
- `index.html` owns the hash router (`ROUTES`), dark-mode persistence, and `window.showNotification(...)`.
- Scripts are loaded globally in this order: `tools/calculator.js` → `tools/league.js` → `tools/crafting.js` → `tools/sync-bridge.js` → `tools/attribute-planner.js`.
- Keep code browser-ready and global-script-compatible; do not convert app code to ES modules unless explicitly asked.
- Major entrypoints are `initCalculator()`, `initLeague()`, `initCrafting()`, and `initAttributePlanner()`. Each tool uses a one-time `window.__...Initialized` guard.
- Shared styling lives in `styles.css`.

## Tool-specific gotchas
- `tools/calculator.js`: formulas, import/export, reset dialog, copy-left/right helpers, and heavy `localStorage` persistence for inputs/results.
- `tools/attribute-planner.js`: 3-step planner that compares baseline vs candidate using the current calculator `atk1` vs `def1` scenario.
- Calculator/planner sync goes through `window.pvpSyncBridge` in `tools/sync-bridge.js`; preserve the source/loop guards and test sync both directions if touched.
- `tools/crafting.js` fetches JSON with fallback paths (`tools/crafting-db.json`, `../tools/crafting-db.json`); keep loading and failure states visible.
- `tools/league.js` parses uploaded CSV, falls back from UTF-8 to Big5 when needed, caches league data in `localStorage`, and redraws Chart.js charts after dark-mode toggles.

## Editing conventions that matter here
- Match the existing plain-function style and minimal, file-local state rather than introducing abstractions.
- Use `window.showNotification(...)` or the local `notify()` wrappers for user-visible success/error feedback.
- Keep the repo's defensive numeric/data parsing style (`parseInt(...) || 0` or helper-based coercion, shape checks, `try/catch`) when touching inputs, JSON, or CSV handling.

## Manual verification
- Smoke test routes: `#/calculator`, `#/attribute-planner`, `#/crafting`, `#/league`.
- Verify dark mode persists after reload and mobile sidebar/bottom nav still behave.
- Remember persisted state can mask defaults: calculator may restore saved values or bridge-seeded values; planner starts at zero only in a clean state.
- If calculator/planner logic changes, test planner → calculator and calculator → planner baseline sync.
- If crafting changes, confirm JSON loads and filters/detail panel still work.
- If league changes, upload a representative CSV, verify sort/filter/charts, then reload to confirm cached data restores.
