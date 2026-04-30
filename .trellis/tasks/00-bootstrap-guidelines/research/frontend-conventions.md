# Frontend Conventions Research

Research artifact for `.trellis/tasks/00-bootstrap-guidelines`.

## Search Scope

### Existing convention and project docs inspected

- `AGENTS.md` is the main convention source. It defines the static SPA shape, script order, browser-global style, localStorage behavior, defensive parsing, DOM rendering style, and verification expectations (`AGENTS.md:45-89`).
- `README.md` documents GitHub Pages deployment, local serving with Live Server / `npx serve` / Python HTTP server, and Playwright test commands (`README.md:20-37`, `README.md:39-110`).
- `docs/testing-guide.md` documents Playwright as the primary automated regression layer, stable selector preference, OCR mocking guidance, and the main/manual OCR split (`docs/testing-guide.md:3-17`, `docs/testing-guide.md:79-91`).
- `docs/testing-capability-overview.md` lists current automated coverage across routing, calculator, planner sync, crafting, league, OCR, and formulas (`docs/testing-capability-overview.md:3-18`).
- `docs/website-code-review.md` describes the app as a native JavaScript static SPA with hash routing, global scripts, `localStorage`, no bundler/framework/type system, and clear shared modules in `pvp-config`, `combat-formulas`, and `sync-bridge` (`docs/website-code-review.md:5-24`).
- `.trellis/spec/frontend/*.md` currently exists as placeholder scaffolding; `.trellis/spec/frontend/index.md` says future spec content should document actual conventions, include real examples, list forbidden patterns, and be written in English (`.trellis/spec/frontend/index.md:26-39`).

### Convention files not found

Searches did not find `CLAUDE.md`, `CONTRIBUTING.md`, `.cursor/`, `.cursorrules`, `.editorconfig`, or `.github/*.md` convention files. The practical convention sources are `AGENTS.md`, docs under `docs/`, and the existing app/test files.

## Directory Structure and Runtime Shape

### Static root-level SPA, no build output

- The shipped app is a root-level static SPA: `index.html`, `styles.css`, assets at repo root, and browser-global scripts in `tools/`. `AGENTS.md` explicitly says not to introduce a bundler/module system unless asked (`AGENTS.md:45-48`).
- `package.json` contains only Playwright/serve dev dependencies and test scripts; there is no app build, lint, formatter, or typecheck script (`package.json:4-14`, `AGENTS.md:46-47`).
- GitHub Pages deploys the repository root as-is rather than a generated output directory (`AGENTS.md:57-60`, `README.md:10-18`).

Concrete examples:

- `index.html` owns route containers and loads scripts directly via `<script src="tools/...">` (`index.html:239-247`).
- `styles.css` is a single global stylesheet, while `index.html` also contains inline app-shell CSS variables and base layout styles (`index.html:10-17`, `styles.css:1-12`, `styles.css:188-249`).
- `tools/crafting.js` fetches `tools/crafting-db.json` with a fallback path, so the app must be served over HTTP rather than opened as `file://` (`tools/crafting.js:86-141`, `AGENTS.md:50-55`).

### Feature files are organized by global tool script

There is no `src/`, component directory, or page directory. Feature ownership is by root HTML markup plus one script file per tool/feature:

- `tools/calculator.js` owns calculator state, formula execution, persistence, import/export, OCR import, reset, and copy-left/right behavior (`tools/calculator.js:1-19`, `tools/calculator.js:419-557`).
- `tools/attribute-planner.js` owns the 3-step planner UI and calculator `atk1` bridge interaction (`tools/attribute-planner.js:1-47`, `tools/attribute-planner.js:436-472`).
- `tools/crafting.js` owns loading/filtering/rendering of `crafting-db.json` (`tools/crafting.js:1-19`, `tools/crafting.js:72-141`).
- `tools/league.js` owns CSV parsing, upload/restore, tabs, filters, sorting, charts, and chart fallback (`tools/league.js:1-39`, `tools/league.js:488-607`).
- `tools/ocr-demo.js` owns OCR parsing/runtime/sample storage and exposes a calculator-facing OCR API (`tools/ocr-demo.js:1-103`, `tools/ocr-demo.js:1473-1500`).

Shared/global modules:

- `tools/pvp-config.js` exposes field lists and planner bridge mappings on `window.pvpConfig` (`tools/pvp-config.js:1-35`).
- `tools/combat-formulas.js` exposes shared formula helpers on `window.pvpCombat` (`tools/combat-formulas.js:1-79`).
- `tools/sync-bridge.js` exposes calculator/planner sync helpers on `window.pvpSyncBridge` (`tools/sync-bridge.js:1-90`).

## Module Organization and Browser Globals

### Plain functions and IIFEs, not ES modules

The runtime uses browser globals instead of `import` / `export`:

- `tools/pvp-config.js` is an IIFE that exits if `window.pvpConfig` already exists, then assigns constants to `window.pvpConfig` (`tools/pvp-config.js:1-35`).
- `tools/combat-formulas.js` is an IIFE that exits if `window.pvpCombat` already exists, then exposes pure formula helpers on `window.pvpCombat` (`tools/combat-formulas.js:1-79`).
- `tools/sync-bridge.js` is an IIFE with a `window.__pvpSyncBridgeInitialized` guard and exposes `getBaselineAtk1`, `setBaselineAtk1`, and `subscribe` (`tools/sync-bridge.js:1-90`).
- Feature scripts expose global init functions or route listeners: `initCalculator`, `initAttributePlanner`, `initCrafting`, and `initLeague` (`tools/calculator.js:1`, `tools/attribute-planner.js:1`, `tools/crafting.js:1`, `tools/league.js:1`).

The only CommonJS `require(...)` usage is in Node-side Playwright config/tests, not browser app modules (`playwright.config.js:1-36`, `tests/e2e/routing.spec.js:1`).

### Script order is dependency order

`index.html` loads scripts in a fixed order:

1. Chart.js CDN
2. `tools/pvp-config.js`
3. `tools/combat-formulas.js`
4. `tools/calculator.js`
5. `tools/league.js`
6. `tools/crafting.js`
7. `tools/sync-bridge.js`
8. `tools/attribute-planner.js`
9. `tools/ocr-demo.js`

This is documented in `AGENTS.md` and visible in `index.html` (`AGENTS.md:62-66`, `index.html:239-247`).

## Initialization Guards, Routing, and Events

### Hash router lives in `index.html`

- `index.html` defines `ROUTES`, maps hash route keys to `#view-*` elements, hides all views, shows the current view, toggles nav active state, initializes calculator directly for `#/calculator`, and dispatches `pvp:routechange` (`index.html:249-265`).
- It binds `hashchange` to `navigate(location.hash)` and runs an initial navigation on load (`index.html:266-291`).
- Route markup is duplicated in desktop sidebar and mobile bottom nav with matching `data-route` values (`index.html:23-30`, `index.html:237`).

Current routes:

- `#/` → `#view-home`
- `#/calculator` → `#view-calculator`
- `#/attribute-planner` → `#view-attribute-planner`
- `#/crafting` → `#view-crafting`
- `#/league` → `#view-league`

### Feature scripts bind route listeners once

Feature scripts use one-time `window.__...RouteListenerBound` flags for route-level lazy init:

- Calculator: `window.__calculatorRouteListenerBound` listens for `pvp:routechange` and calls `initCalculator()` on `calculator` (`tools/calculator.js:560-567`).
- Attribute planner: `window.__attributePlannerRouteListenerBound` listens for `attribute-planner` (`tools/attribute-planner.js:475-482`).
- Crafting: `window.__craftingRouteListenerBound` listens for `crafting` (`tools/crafting.js:466-473`).
- League: `window.__leagueRouteListenerBound` listens for `league` (`tools/league.js:609-616`).

### Feature init functions guard repeated binding

- Calculator uses `window.__calculatorInitialized`; on later route visits it hydrates state and returns instead of rebinding all listeners (`tools/calculator.js:343-347`).
- Attribute planner, crafting, and league return early on `window.__attributePlannerInitialized`, `window.__craftingInitialized`, and `window.__leagueInitialized` (`tools/attribute-planner.js:1-3`, `tools/crafting.js:1-3`, `tools/league.js:1-3`).
- OCR demo exposes `window.initOcrDemo`; repeated calls refresh controls/output instead of rebinding events (`tools/ocr-demo.js:1473-1492`).

### Theme and cross-module events

- Dark mode is owned by `index.html`, persisted as `localStorage.darkMode`, and toggles `body.dark-mode` (`index.html:273-279`).
- Dark-mode toggles dispatch `pvp:themechange` with `{ darkMode }` detail (`index.html:276-284`).
- League listens for `pvp:themechange` and redraws charts only when league data exists and the league view is visible (`tools/league.js:565-570`).
- Calculator/planner sync uses `window.pvpSyncBridge` and a `pvp-sync:update` `CustomEvent`; payloads preserve `source` metadata (`tools/sync-bridge.js:5-22`, `tools/sync-bridge.js:69-83`).
- Calculator and planner both ignore their own sync source and use re-entry flags (`isApplyingBridgeUpdate` / `isApplyingSync`) to avoid feedback loops (`tools/calculator.js:177-198`, `tools/attribute-planner.js:241-271`).

## UI Rendering, Styling, and Accessibility Reality

### Static markup plus DOM API rendering

`index.html` contains the app shell and many static view containers. Dynamic lists/tables/cards are rendered by feature scripts using DOM APIs and `textContent` for data:

- Notification UI creates elements and assigns `textContent` instead of injecting message HTML (`index.html:293-340`).
- Crafting list/detail renderers clear containers, create elements, set `textContent`, and append a `DocumentFragment` (`tools/crafting.js:282-348`, `tools/crafting.js:351-441`).
- League tab/table/summary rendering creates rows, buttons, cells, and labels with `textContent` (`tools/league.js:246-352`).
- Attribute planner creates generated input fields and chip buttons with `createElement`, `setAttribute`, `textContent`, and event listeners (`tools/attribute-planner.js:299-386`).
- OCR output/sample rendering also uses `createElement`, `textContent`, and fragments for generated controls (`tools/ocr-demo.js:835-880`, `tools/ocr-demo.js:937-943`, `tools/ocr-demo.js:1029-1036`).

`innerHTML` is still used, but the observed pattern is to clear containers or insert static trusted placeholders/options, not raw imported data:

- Crafting loading/error placeholders are static strings (`tools/crafting.js:81-84`, `tools/crafting.js:125-134`).
- Select defaults like `<option value="">全部賽季</option>` are static (`tools/crafting.js:151-167`).
- League and planner clear containers with `innerHTML = ''` before DOM API rendering (`tools/league.js:200-210`, `tools/league.js:260-278`, `tools/attribute-planner.js:185-228`, `tools/attribute-planner.js:371-386`).

### Styling is global CSS plus inline shell CSS

- `index.html` defines CSS variables, base body styles, and `.view[hidden]` in an inline `<style>` block (`index.html:10-17`).
- `styles.css` contains global app shell, notification, responsive, calculator, planner, crafting, league, and OCR-related classes; it is not component-scoped CSS (`styles.css:1-12`, `styles.css:188-249`).
- `AGENTS.md` explicitly says not to assume `styles.css` is the only styling source because `index.html` also owns inline CSS (`AGENTS.md:62-63`).

### Visibility and basic accessibility patterns

- Routed views are hidden/shown with the `hidden` property (`index.html:253-254`).
- Modal/dialog markup uses `role="dialog"`, `aria-modal`, `aria-labelledby`, and `aria-describedby` for the calculator reset dialog (`index.html:52-61`).
- Planner steps use `role="tablist"` and `aria-label` in markup, while panels are toggled with `hidden` and `active` classes (`index.html:175-183`, `tools/attribute-planner.js:388-405`).
- Mobile navigation has `aria-label`; the mobile menu button maintains `aria-expanded` (`index.html:34`, `index.html:237`, `index.html:267-289`).

## State Management and Persistence

### File-local state objects/variables are the default

There is no state library. Each feature module keeps small file-local state:

- League: `leagueData`, `activeGuild`, `sortColumn`, `sortAsc`, `activeFilter`, chart instances, and `statsCache` (`tools/league.js:29-37`).
- Crafting: `records`, `filtered`, `selectedId`, `isLoading`, and `loadPromise` (`tools/crafting.js:13-19`).
- Attribute planner: `state = { step, baseline, candidate, lastResult }`, plus sync flags (`tools/attribute-planner.js:38-47`).
- OCR demo: one large `state` object for worker/runtime/file/preprocess/results/samples/debug (`tools/ocr-demo.js:80-103`).
- Sync bridge: one private `state` object with `baselineAtk1`, `hasValue`, `updatedAt`, and `source` (`tools/sync-bridge.js:8-22`).

### `localStorage` persistence uses explicit keys

Observed persistent keys and owners:

- `darkMode`: shell theme state in `index.html` (`index.html:273-279`).
- Calculator numeric inputs: key is the DOM input id, e.g. `atk1-attack`; restored from `localStorage.getItem(input.id)` and saved on input/change/import/copy/reset (`tools/calculator.js:92-99`, `tools/calculator.js:349-357`, `tools/calculator.js:377-412`, `tools/calculator.js:512-548`).
- Calculator result spans: key is `result-<spanId>` (`tools/calculator.js:101-108`, `tools/calculator.js:172-174`).
- League cache: `leagueData`, `leagueFilename`, and `leagueActiveTab` (`tools/league.js:229-233`, `tools/league.js:293-293`, `tools/league.js:496-506`, `tools/league.js:596-605`).
- OCR samples: `ocrDemoSamples` via `SAMPLE_STORAGE_KEY` (`tools/ocr-demo.js:3`, `tools/ocr-demo.js:548-578`).

### URL and event state

- Current route is the hash route; there is no separate router library (`index.html:249-266`).
- Calculator/planner cross-feature state flows through `window.pvpSyncBridge` and `pvp-sync:update`, not through shared DOM mutation (`tools/sync-bridge.js:50-83`, `tools/calculator.js:177-198`, `tools/attribute-planner.js:241-271`).

## Parsing, Validation, and Error Handling

### Defensive numeric parsing is common

- Formula helpers use `parseInt(value, 10)` and `Number.isFinite` with fallback `0` (`tools/combat-formulas.js:7-10`).
- Sync bridge sanitizes partial payloads by whitelisting allowed keys and parsing each value to integer (`tools/sync-bridge.js:24-37`).
- Planner uses `Number(value)`, `Number.isFinite`, min/max clamping, and fallback values (`tools/attribute-planner.js:66-85`).
- League CSV parsing strips commas and uses `parseInt(..., 10) || 0` for numeric columns (`tools/league.js:97-132`).
- Crafting season sorting extracts `S<number>` with a regex and uses `parseInt(..., 10)`, falling back to `9999` for unknown seasons (`tools/crafting.js:64-69`).
- OCR parsing uses `parseInt(..., 10)` with explicit fallback and text normalization for OCR variants (`tools/ocr-demo.js:146-156`, `tools/ocr-demo.js:195-219`).

### Runtime shape checks and `try/catch` replace static typing

- Calculator checks for required global modules (`window.pvpCombat`, `window.pvpConfig`) and shows error notifications if they are missing (`tools/calculator.js:10-32`).
- Calculator import parses JSON in `try/catch`; invalid import triggers an error notification (`tools/calculator.js:512-548`).
- Crafting fetches from multiple paths, catches fetch/JSON errors, shows visible error UI, and sends a notification (`tools/crafting.js:86-141`).
- League parsing returns `false` for invalid CSV payloads, retries with Big5, and shows an error notification if both attempts fail (`tools/league.js:488-551`).
- League restores cached JSON in `try/catch` and removes invalid cached `leagueData` (`tools/league.js:596-605`).
- OCR sample loading validates array/object shape while mapping stored samples and falls back to `[]` on parsing errors (`tools/ocr-demo.js:548-573`).

## Testing Conventions

### Playwright is the regression layer

- `npm test` runs `playwright test`; headed/debug/single/real-OCR scripts are in `package.json` (`package.json:4-10`).
- `playwright.config.js` uses `./tests/e2e`, ignores `ocr-real.spec.js`, runs Chromium, disables full parallelism, and auto-serves `npx serve . --listen 3000` (`playwright.config.js:3-36`).
- `playwright.ocr-real.config.js` extends the main config and removes `testIgnore` for the manual real-image OCR run (`playwright.ocr-real.config.js:1-7`).
- The default suite intentionally excludes real Tesseract/image OCR; `npm run test:ocr-real` is separate (`AGENTS.md:50-55`, `AGENTS.md:84-89`, `docs/testing-guide.md:51-84`).

### Test style examples

- Route smoke tests iterate a route table and assert each view plus one stable selector is visible (`tests/e2e/routing.spec.js:3-25`).
- Calculator tests use stable `#id` selectors, clear `localStorage`, dispatch input events after filling, and assert DOM/result/localStorage behavior (`tests/e2e/calculator.spec.js:3-24`, `tests/e2e/calculator.spec.js:40-45`).
- Sync tests cover calculator → planner, planner → calculator, and non-sync of `atk2` (`tests/e2e/sync.spec.js:20-58`).
- League tests upload a CSV fixture, assert rendered tabs/table/summary/fallback notifications, and reset stored league keys in `beforeEach` (`tests/e2e/league.spec.js:1-26`, `tests/e2e/league.spec.js:71-104`).
- Crafting tests use HTTP-served data, wait for count changes, and route-abort fetches to exercise error UI (`tests/e2e/crafting.spec.js:10-34`, `tests/e2e/crafting.spec.js:64-72`).
- OCR calculator tests mock `window.pvpOcr.recognizeFromFile` instead of invoking real OCR (`tests/e2e/ocr-calculator.spec.js:35-66`, `tests/e2e/ocr-calculator.spec.js:165-198`).
- OCR parser tests mock `window.Tesseract.createWorker` and call `window.pvpOcr.recognizeFromFile(...)` with fixture image blobs (`tests/e2e/ocr-parser.spec.js:18-31`, `tests/e2e/ocr-parser.spec.js:66-82`).
- Formula tests directly evaluate `window.pvpCombat` helpers and golden-value outputs (`tests/e2e/formulas.spec.js:8-32`, `tests/e2e/formulas.spec.js:73-125`).

## TypeScript / Type-Safety Reality

- The application is plain JavaScript. There is no TypeScript, `tsconfig`, `@ts-check`, app typecheck script, or lint script (`AGENTS.md:46-47`, `docs/website-code-review.md:7`).
- Browser code does not use JSDoc type declarations. Shape conventions are represented by object literals, constant field lists, and runtime checks.
- Examples of runtime shape definitions:
  - Calculator/planner field ownership is encoded in `ATTACK_FIELDS`, `DEFENSE_FIELDS`, `BRIDGE_FIELD_MAP`, `BASELINE_SYNC_KEYS`, and `PLANNER_ATTRIBUTES` (`tools/pvp-config.js:4-26`).
  - League table columns are encoded in the `COLUMNS` array with `key`, `label`, and `numeric` flags (`tools/league.js:14-27`).
  - OCR fields and parser metadata are encoded in `FIELDS`, row schema constants, and result object factories (`tools/ocr-demo.js:33-79`, `tools/ocr-demo.js:105-157`, `tools/ocr-demo.js:524-544`).
- The practical type-safety convention is defensive runtime parsing/validation plus Playwright regression coverage, not compile-time type checking.

## Forbidden or Avoided Patterns Evident from Docs/Code

- Do not introduce a bundler, module system, or framework unless explicitly asked (`AGENTS.md:45-47`).
- Do not assume all styling is in `styles.css`; `index.html` owns inline app-shell CSS too (`AGENTS.md:62-63`, `index.html:10-17`).
- Do not change routes in only one place; route markup, both navs, `ROUTES`, and route init/event handling must stay aligned (`AGENTS.md:62-66`, `index.html:23-30`, `index.html:237`, `index.html:249-266`).
- Do not rebind event listeners on every route revisit; existing feature scripts use `window.__...Initialized` and `window.__...RouteListenerBound` guards (`AGENTS.md:65-66`, `tools/calculator.js:343-347`, `tools/crafting.js:466-473`, `tools/league.js:609-616`).
- Do not break sync bridge `source` metadata or re-entry guards; calculator and planner depend on them to avoid feedback loops (`AGENTS.md:69-71`, `tools/sync-bridge.js:50-83`, `tools/calculator.js:177-198`, `tools/attribute-planner.js:241-271`).
- Do not inject raw imported/user data as HTML. The documented convention is DOM API rendering instead of raw HTML, and observed renderers use `textContent` for data (`AGENTS.md:78-82`, `tools/crafting.js:282-348`, `tools/league.js:324-352`).
- Do not test/serve the app with `file://`; use HTTP because `crafting.js` fetches JSON (`AGENTS.md:50-55`, `README.md:20-37`).
- Do not use real-image OCR tests as the default gate; they are manual/local or manual workflow checks (`AGENTS.md:53-55`, `AGENTS.md:84-89`, `README.md:73-85`).
- Do not document React component or hook conventions as if they exist. The repo contains no React components/hooks; current patterns are static markup plus browser-global functions and event listeners.

## Recommended Spec Mapping

Map these findings into the six target files under `.trellis/spec/frontend/` as follows:

1. `.trellis/spec/frontend/directory-structure.md`
   - Document the root static SPA layout: `index.html`, `styles.css`, `tools/*.js`, `tools/crafting-db.json`, root assets, `tests/e2e/*.spec.js`, `tests/fixtures/`, and Playwright configs.
   - Include script dependency order from `index.html:239-247` and feature-file ownership from `AGENTS.md:68-76`.
   - State that there is no `src/`, generated build directory, bundler, or module system.

2. `.trellis/spec/frontend/component-guidelines.md`
   - Document that there are no framework components/props; UI is static HTML plus DOM API render functions.
   - Capture DOM creation/textContent patterns from `crafting.js`, `league.js`, `attribute-planner.js`, and `index.html` notifications.
   - Include styling reality: global `styles.css` plus inline shell CSS in `index.html`; view visibility via `hidden`; existing accessibility attributes in reset dialog, nav, and planner steps.

3. `.trellis/spec/frontend/hook-guidelines.md`
   - Document that there are no React/custom hooks.
   - Map the actual equivalent patterns: `init*` functions, route listener guards, `pvp:routechange`, `pvp:themechange`, `pvp-sync:update`, and subscription cleanup shape in `sync-bridge.js`.
   - Include data-fetch/lazy-load patterns from `crafting.js` fetch fallback and `ocr-demo.js` lazy Tesseract loader.

4. `.trellis/spec/frontend/state-management.md`
   - Document file-local state as the default, `localStorage` key ownership, hash route state, and `window.pvpSyncBridge` for calculator/planner cross-feature state.
   - Include concrete keys: `darkMode`, calculator input ids, `result-<spanId>`, `leagueData`, `leagueFilename`, `leagueActiveTab`, and `ocrDemoSamples`.
   - Capture sync-source and re-entry guard rules for calculator/planner.

5. `.trellis/spec/frontend/type-safety.md`
   - Document plain JavaScript/no TypeScript/no typecheck reality.
   - Capture runtime validation conventions: `parseInt(..., 10)`, `Number.isFinite`, fallback values, whitelisted field maps, shape checks, `try/catch`, and optional chaining.
   - Use examples from `pvp-config.js`, `combat-formulas.js`, `sync-bridge.js`, `league.js`, `crafting.js`, and `ocr-demo.js`.

6. `.trellis/spec/frontend/quality-guidelines.md`
   - Document Playwright as the primary regression suite, command split, HTTP serving requirement, stable selector preference, and OCR real-image exclusion from the default gate.
   - Include forbidden patterns from the section above: no bundler/framework unless asked, no raw imported HTML injection, no route/nav partial updates, no repeated listener binding, no sync metadata removal.
   - Add affected-area verification mapping: routing tests for route changes; calculator/planner/sync tests for calculator or bridge changes; crafting/league/OCR specs for their feature changes.
