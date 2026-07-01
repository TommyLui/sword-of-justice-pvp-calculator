# AGENTS.md

## Repo shape
- Static browser SPA: no bundler, framework, TypeScript, or build step. `index.html` is the app shell/router and loads plain global scripts from `tools/`.
- UI/content is primarily Traditional Chinese (`zh-TW`); preserve existing labels and route copy unless the task asks otherwise.
- Hash routes are defined in `index.html`: `#/`, `#/calculator`, `#/attribute-planner`, `#/crafting`, `#/league`.
- Script order matters: Chart.js CDN, then `tools/pvp-config.js`, `tools/combat-formulas.js`, `tools/calculator.js`, `tools/league.js`, `tools/crafting.js`, `tools/sync-bridge.js`, `tools/attribute-planner.js`, `tools/ocr-demo.js`.
- `tools/calculator.html` only redirects to `../#/calculator`; the production calculator UI lives in `index.html` + `tools/calculator.js`.
- `demo/` contains standalone design prototypes/screenshots, not the production app path unless a task explicitly targets it.

## Commands
- Install JS deps with npm only: `npm ci` for CI-equivalent clean installs, `npm install` for local updates. Keep `package-lock.json`.
- Manual app server: `npm start` serves the repo root on `http://localhost:3099`.
- Playwright test server: `npm run start:test` serves the repo root on `http://localhost:3101`; `npm test` uses/reuses this port.
- Main verification: `npm test` (`playwright test`, Chromium, `tests/e2e`).
- Focused checks: `npm run test:single -- league`, or pass any Playwright grep string after `--`.
- Debug UI tests: `npm run test:headed` or `npm run test:debug`.
- Real OCR baseline is opt-in/manual: `npm run test:ocr-real`.
- CI uses Node 20, `npm ci`, `npx playwright install --with-deps chromium`, then `npx playwright test`.

## Testing gotchas
- Do not use `file://`; tests and app behavior expect HTTP. Manual servers: `npx serve .` or `python -m http.server 8000`.
- If local Playwright behavior is odd, check for an existing `localhost:3101` server; local test runs reuse it while CI starts fresh.
- `playwright.config.js` intentionally has `fullyParallel: false`; CI uses one worker and one retry.
- Default tests ignore `tests/e2e/ocr-real.spec.js`. The real OCR spec uses the base server plus its own `localhost:3100`, has a 180s timeout, depends on real Tesseract/CDN/runtime behavior, and skips when `CI` is truthy.
- For OCR integration tests, mock `window.pvpOcr.recognizeFromFile` unless explicitly validating the real-image baseline under `ocr_example/`.
- Prefer stable selectors already present in markup: ids, explicit route ids, and fixed button ids.

## Architecture notes
- `tools/combat-formulas.js` exposes `window.pvpCombat` and is the single source for calculator/planner combat math. When changing formulas, update and run `tests/e2e/formulas.spec.js`; golden values are intentional.
- `tools/pvp-config.js` exposes `window.pvpConfig` for shared attack/defense fields, planner attributes, and calculator→planner bridge mapping.
- `tools/sync-bridge.js` exposes `window.pvpSyncBridge` and dispatches `pvp-sync:update` for calculator/planner synchronization; avoid direct cross-feature DOM writes when extending sync.
- `index.html` dispatches `pvp:routechange` and `pvp:themechange`; feature modules should hook these events instead of coupling directly to shell controls.
- Calculator/planner/league/theme/OCR sample state persists in `localStorage`; preserve existing keys or update restore/import-export tests with the migration.
- `index.html`, `tools/ocr-demo.js`, and `tools/league.js` are high-coupling/high-complexity areas. Prefer small behavior-preserving changes over broad rewrites.
- Keep the static SPA architecture; existing docs explicitly discourage premature React/Vue/Vite/framework conversion.

## Deployment and artifacts
- GitHub Pages deploy workflow uploads the repo root `'.'` on pushes to `main`/`master`; anything committed can ship, so do not add generated reports, debug captures, or screenshots unless intended.
- Ignored local artifacts include `node_modules/`, `playwright-report/`, `test-results/`, and `wiki/`. Treat `wiki/` as local ignored content unless the user explicitly asks about it.
