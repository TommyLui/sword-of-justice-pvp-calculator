# AGENTS.md

## Repo shape
- The live app is a root-level static SPA: `index.html` + `styles.css` + global scripts under `tools/`.
- `2.1/` is an archived snapshot; leave it alone unless the task explicitly targets that version.
- There is no `package.json`, lockfile, bundler, module system, lint config, typecheck config, or automated test setup. Verification is manual in a browser.
- User-facing copy is mostly Traditional Chinese (`zh-TW`); keep new UI text consistent unless the surrounding screen is already English.

## Run / deploy
- Serve over HTTP, not `file://`: `npx serve .`, `python -m http.server 8000`, or VS Code Live Server all work.
- `tools/crafting.js` fetches `tools/crafting-db.json`, so `file://` will give misleading results.
- GitHub Pages deploys the repo root as-is from `.github/workflows/deploy.yml` (`upload-pages-artifact` path `.`) on pushes to `main` or `master` and on manual dispatch. There is no build step or output directory.

## App shell / wiring that is easy to break
- `index.html` is the real app shell: it contains the hash router, both navs (sidebar + mobile bottom nav), dark-mode persistence (`localStorage.darkMode`), `window.showNotification(...)`, and a large amount of inline CSS. Do not assume `styles.css` is the only styling source.
- Current interactive routes are `calculator`, `ocr-demo`, `attribute-planner`, `crafting`, and `league`. If you add or remove a page, update the route view, desktop nav, mobile bottom nav, `ROUTES`, and the `navigate()` init branch together.
- Script order matters because everything is global: Chart.js CDN → `tools/pvp-config.js` → `tools/combat-formulas.js` → `tools/calculator.js` → `tools/league.js` → `tools/crafting.js` → `tools/sync-bridge.js` → `tools/attribute-planner.js` → `tools/ocr-demo.js`.
- Keep code browser-ready and global-script-compatible; do not convert app code to ES modules unless explicitly asked.
- Tool entrypoints are `initCalculator()`, `initLeague()`, `initCrafting()`, `initAttributePlanner()`, and `window.initOcrDemo()`. Modules use one-time `window.__...Initialized` guards; revisiting a route should reuse existing DOM/state instead of rebinding listeners.

## Source-of-truth files
- `tools/pvp-config.js` owns attack/defense field lists and the calculator ↔ planner bridge map. If synced attributes change, update `BRIDGE_FIELD_MAP` / `BASELINE_SYNC_KEYS` here first.
- `tools/combat-formulas.js` exposes `window.pvpCombat`; calculator math and planner estimates both depend on it loading before their init functions run.
- `tools/sync-bridge.js` is the only calculator/planner sync channel (`window.pvpSyncBridge` + `pvp-sync:update`). Preserve the `source` and re-entry guards or you will create feedback loops.
- `tools/calculator.js` persists nearly every numeric input under its DOM id and every result under `result-<spanId>` in `localStorage`. It also owns import/export, reset, and copy-left/right behavior.
- `tools/attribute-planner.js` is a 3-step planner that evaluates only the calculator `atk1` vs `def1` scenario and syncs the planner baseline bi-directionally with calculator `atk1`.
- `tools/crafting.js` loads `tools/crafting-db.json` with fallback paths (`tools/crafting-db.json`, `../tools/crafting-db.json`) and keeps explicit loading/error states visible.
- `tools/league.js` parses uploaded CSV, retries with `Big5` after UTF-8, and caches parsed data, filename, and active tab in `localStorage`.
- `tools/ocr-demo.js` does not write into the calculator. It lazy-loads `tesseract.js` from CDN, uses `chi_tra` + `eng`, and stores sample calibrations in `localStorage` under `ocrDemoSamples`.

## Editing conventions
- Match the existing plain-function style and small file-local state rather than introducing abstractions.
- Use `window.showNotification(...)` or local `notify()` wrappers for user-visible success/error feedback.
- Keep the repo's defensive parsing style when touching inputs, JSON, or CSV: `parseInt(..., 10)` helpers, shape checks, and `try/catch`.
- Follow the existing DOM-API rendering style for data-driven UI (for example crafting detail/list rendering) instead of injecting raw HTML.

## Manual verification
- Smoke test `#/calculator`, `#/ocr-demo`, `#/attribute-planner`, `#/crafting`, and `#/league`.
- Reload once after changes: dark mode, calculator values/results, league cached data, and OCR samples all persist and can hide default-state bugs.
- If calculator, planner, `pvp-config.js`, or `sync-bridge.js` changes, verify baseline sync both ways: calculator `atk1` → planner baseline and planner baseline → calculator.
- If crafting changes, confirm data loads over HTTP and filters/detail panel still work.
- If league changes, upload a representative CSV, verify sort/filter/charts, toggle dark mode, then reload to confirm cached restore.
- If OCR changes, run one recognition pass, confirm the lazy CDN/worker load succeeds, and verify sample save/load/delete still works.
