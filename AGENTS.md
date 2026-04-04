# AGENTS.md

## Project Overview
- Static single-page web app for the game "Sword of Justice" (`逆水寒`).
- Stack: plain HTML, CSS, and vanilla JavaScript. No bundler, no framework, no TypeScript.
- Deployment target: GitHub Pages via `.github/workflows/deploy.yml`.
- UI language is Traditional Chinese (`zh-TW`) and new user-facing text should stay in Chinese unless the existing screen is clearly English.

## Repository Layout
- `index.html`: SPA shell, route switching, shared notification system, dark mode toggle, script loading.
- `styles.css`: large shared stylesheet, with calculator styles scoped under `#view-calculator` and additional tool-specific styles further down.
- `tools/calculator.js`: calculator initialization, formulas, import/export, reset flow, localStorage persistence.
- `tools/attribute-planner.js`: attribute planning UI, JSON-backed estimation model, sync bridge integration.
- `tools/crafting.js`: crafting database search/filter/detail UI backed by JSON.
- `tools/league.js`: CSV upload, parsing, analytics, table sorting/filtering, Chart.js rendering.
- `tools/sync-bridge.js`: lightweight in-page event bridge for syncing baseline attack values between tools.
- `tools/attributes-db.json`: attribute planner data.
- `tools/crafting-db.json`: crafting database snapshot.
- `2.1/`: archived older season version. Treat as historical unless the task explicitly targets it.
- `docs/superpowers/specs/`: design notes and feature specs, useful for intent but not executable code.

## Build, Run, Lint, Test

### Install
- No project install step exists.
- There is no `package.json`, lockfile, or declared dev dependency toolchain in this repository.

### Local Run
- Preferred:
```bash
npx serve .
```
- Alternative:
```bash
python -m http.server 8000
```
- Then open the served URL in a browser.
- Prefer a real local HTTP server over opening `index.html` directly because `crafting.js` and `attribute-planner.js` fetch local JSON files.

### Build
- No build command exists.
- The app is served as static files and deployed as-is.

### Lint
- No lint command or config exists.
- There is no ESLint, Prettier, Stylelint, or equivalent repo-level formatter configuration.
- If you need to improve consistency, follow the existing code style rather than introducing new tooling unless the user asks for it.

### Tests
- No automated test suite exists.
- No Jest, Vitest, Playwright, Cypress, or browser test harness is configured.

### Single Test
- Not applicable: there is no automated test runner and therefore no single-test command.
- If the user asks to "run one test," explain that only manual verification is available in the current repo.

### Deployment
- Pushing to `main` or `master` triggers GitHub Pages deployment through `.github/workflows/deploy.yml`.
- The workflow uploads the repository root directly; there is no build artifact generation step.

## Manual Verification
- Open the app through a local server.
- Verify route switching for `#/calculator`, `#/attribute-planner`, `#/crafting`, and `#/league`.
- Toggle dark mode and reload to confirm `localStorage` persistence.
- On mobile width, verify sidebar behavior and bottom navigation.

### Calculator Checks
- Be aware that first-open values are not always blank: calculator inputs can be restored from `localStorage` or populated from the planner sync bridge.
- In a clean browser state with no prior planner visit, calculator inputs start from the HTML defaults, which are mostly `0`.
- Enter values in all major attack/defense fields and confirm results update on input.
- Test both attack copy buttons and both defense copy buttons.
- Test reset dialog open, cancel, confirm, and Escape handling.
- Test export, clear/reset, then import round-trip.
- Verify bridge behavior between calculator `atk1` fields and attribute planner baseline fields.

### Attribute Planner Checks
- In a clean browser state, planner fields now start from `0` via the first template in `tools/attributes-db.json`.
- Confirm `tools/attributes-db.json` loads.
- Move across all three planner steps.
- Edit baseline and candidate values and verify KPI, contributions, top 3, and notes update.
- Verify baseline sync from planner to calculator and vice versa.

### Crafting Checks
- Confirm crafting data loads from `tools/crafting-db.json`.
- Test search, season filter, slot filter, tag filter, sort order, reset, and detail panel updates.

### League Checks
- Upload a representative CSV file.
- Verify totals, guild tabs, sortable columns, class filter, and both charts.
- Reload and confirm cached league data still restores from `localStorage`.

## Architecture Notes
- Routing is hash-based and defined inline in `index.html` via the `ROUTES` object.
- Each major tool uses a one-time initializer guard such as `window.__calculatorInitialized`.
- Scripts are loaded globally through `<script>` tags, not ES modules.
- There is no import/export system inside app code.
- Cross-tool synchronization uses `window.pvpSyncBridge` plus `CustomEvent` dispatch in `tools/sync-bridge.js`.
- Attribute planner bootstraps from `tools/attributes-db.json` template data and may seed the calculator baseline through the sync bridge on first use.
- Notifications should use `window.showNotification(...)` where available; individual tools usually wrap this in a local `notify()` helper.
- Persistence is local-first: many inputs and derived UI states are stored in `localStorage`.

## Code Style

### JavaScript
- Use vanilla ES6+ syntax that works directly in the browser without transpilation.
- Use 4-space indentation.
- Use semicolons.
- Use single quotes for strings unless the file clearly requires template literals or double quotes.
- Prefer `const` by default and `let` only when reassignment is needed.
- Use `camelCase` for variables and functions.
- Use `UPPER_SNAKE_CASE` for real constants only.
- Keep functions near the logic they support; the codebase prefers file-local helper functions inside each initializer.
- Match the current style of plain functions like `function initLeague() { ... }` rather than introducing classes.

### Imports and Modules
- There are no JS imports in app code.
- Do not convert files to ES modules or add a bundler unless explicitly requested.
- External dependencies, if any, are loaded by script tag. Current example: Chart.js CDN in `index.html`.

### Types
- There is no static type system.
- Preserve the current runtime-validation style instead of adding TypeScript.
- Coerce numeric input explicitly with `parseInt(..., 10)` or `Number(...)`, then guard with a fallback.
- When reading untrusted JSON or CSV data, validate expected shape before use.

### DOM Access
- Prefer `document.getElementById(...)` for known single elements; that is the dominant pattern.
- Use optional chaining for event binding when an element may not exist, for example `document.getElementById('x')?.addEventListener(...)`.
- For repeated elements, use `querySelectorAll(...)` and iterate with `forEach`.
- Prefer updating existing DOM nodes over replacing large sections of markup unless the feature already renders that way.

### Naming
- HTML IDs and CSS classes use `kebab-case`.
- JavaScript identifiers use `camelCase`.
- Boolean flags usually read as `is...`, `has...`, or `...Hidden`.
- Initialization guards use `window.__somethingInitialized`.
- Local storage keys often mirror element IDs or use a small prefix like `result-...`.

### Formatting and CSS
- Keep CSS in `styles.css` unless you are editing app-shell styles already defined inline in `index.html`.
- Preserve existing CSS variable usage for theming: `--bg`, `--text`, `--accent`, `--border`, etc.
- Reuse existing gradients, border radii, shadows, and gold accent palette before inventing new styles.
- Maintain responsive behavior for widths below `900px`.

### Error Handling
- Prefer defensive parsing and graceful fallback over throwing for user input.
- Pattern used throughout the repo: `parseInt(value, 10) || 0` or a helper that returns a numeric fallback.
- Wrap file import, JSON parsing, async fetch, and CSV processing in `try/catch`.
- Show user-facing failures through notifications in Chinese.
- `console.error(...)` is acceptable for developer diagnostics, but pair it with visible UI feedback when a user action failed.
- Clamp invalid or negative computed damage values with `Math.max(0, value)` where appropriate.

### Async and Data Loading
- `fetch()` is used directly for local JSON files.
- Existing code often tries multiple relative paths for robustness; preserve that behavior when editing JSON-backed features.
- Validate response success with `response.ok` before reading JSON.
- Keep loading and failure states visible in the UI.

### State Management
- Keep state simple and local to each initializer closure.
- Existing files favor a single `state` object or a small set of local variables rather than abstractions.
- Avoid introducing global mutable state except for established globals like `window.pvpSyncBridge` and initializer guards.
- If you add persistence, prefer scoped `localStorage` keys and keep names predictable.

### Comments
- Keep comments sparse and practical.
- Add comments for non-obvious formulas, file-format assumptions, or sync-loop guards.
- Do not add tutorial-style comments for obvious DOM or assignment operations.

## Data and Content Rules
- User-visible copy should remain Traditional Chinese.
- Keep season/version text consistent across title, meta tag, hero/footer text, and any tool labels when updating versions.
- Preserve archived version folders instead of overwriting them during season rollovers.
- Treat JSON data files as source data snapshots; avoid changing structure unless the consuming code is updated in the same change.

## Agent-Specific Guidance
- Before editing, inspect the relevant route, script, and any related JSON data file.
- Prefer minimal edits that match existing patterns over large refactors.
- Do not introduce build tooling, test tooling, or frameworks unless requested.
- If asked for lint/test commands, state clearly when they do not exist instead of inventing them.
- If a task touches fetch-backed tools, verify behavior through a local server, not `file://`.
- If working on calculator/planner sync, test both directions of the bridge.

## Cursor / Copilot Rules
- No `.cursor/rules/` directory was found.
- No `.cursorrules` file was found.
- No `.github/copilot-instructions.md` file was found.
- If these files are added later, fold their instructions into this document and follow the more specific repository rule when conflicts arise.
