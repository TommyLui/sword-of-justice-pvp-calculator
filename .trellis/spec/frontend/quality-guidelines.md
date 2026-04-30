# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

This project's quality gate is behavior-oriented Playwright regression testing plus careful manual inspection for docs-only changes. `package.json` contains Playwright and `serve` dev dependencies only; there is no app build, lint script, formatter config, or typecheck script.

Use the smallest focused verification that matches the change, then run broader tests when practical. Serve the app over HTTP for runtime validation because `tools/crafting.js` fetches JSON.

---

## Forbidden Patterns

- Do not introduce a bundler, generated build output, framework, ES module conversion, React components, or hook architecture unless explicitly requested.
- Do not assume all styling is in `styles.css`; `index.html` also owns inline app-shell CSS and route shell behavior.
- Do not update route markup in only one place. Keep view markup, desktop nav, mobile nav, `ROUTES`, route listeners, and route tests aligned.
- Do not rebind listeners on every route revisit. Preserve `window.__...Initialized` and `window.__...RouteListenerBound` guards.
- Do not remove calculator/planner sync `source` metadata or re-entry guards. They prevent feedback loops.
- Do not inject raw imported/user data via `innerHTML`; render data with DOM nodes and `textContent`.
- Do not use `file://` as a validation environment for fetch-dependent features.
- Do not include real Tesseract/image OCR as part of the default test gate. Use `npm run test:ocr-real` only when real-image OCR behavior matters.
- Do not commit secrets, credentials, tokens, local environment files, or unrelated generated artifacts.

---

## Required Patterns

- Match the existing static SPA shape: root `index.html`, global `styles.css`, browser-global scripts under `tools/`.
- Keep script dependency order in `index.html` aligned with browser-global dependencies.
- Use guarded `init*` functions and guarded route listeners for route-owned features.
- Use `window.showNotification(...)` or local `notify()` wrappers for user-visible success/error feedback.
- Use defensive parsing for inputs, CSV, JSON, OCR, and sync payloads (`parseInt(..., 10)`, finite checks, whitelisted keys, `try/catch`).
- Use DOM API rendering (`createElement`, `textContent`, `appendChild`, `DocumentFragment`) for dynamic imported/user data.
- Preserve stable DOM ids because tests and persistence depend on them.
- Keep user-facing copy in Traditional Chinese unless the surrounding feature already uses another language.
- For app changes, prefer a focused Playwright spec for the affected route/feature before running the full suite.

---

## Testing Requirements

### Commands

Available scripts:

```bash
npm test                       # playwright test, Chromium, excludes ocr-real.spec.js
npm run test:single -- league  # focused grep example
npm run test:headed            # headed debugging
npm run test:debug             # Playwright debug mode
npm run test:ocr-real          # manual real-image OCR baseline, excluded from default suite
```

`playwright.config.js` auto-serves the repo root with `npx serve . --listen 3000`, uses Chromium, and ignores `ocr-real.spec.js` by default. `playwright.ocr-real.config.js` is only for the manual real-image OCR path.

There is no lint/typecheck command to run. Do not claim lint or typecheck passed unless a task adds those scripts or an equivalent check was actually executed.

### Affected-area verification map

Use this mapping to choose focused tests:

| Change area | Preferred verification |
| --- | --- |
| Route shell, nav, view markup, route init | `tests/e2e/routing.spec.js` |
| Theme/dark-mode persistence | `tests/e2e/dark-mode.spec.js` |
| Calculator formulas or result rendering | `tests/e2e/calculator.spec.js`, `tests/e2e/formulas.spec.js` |
| Calculator import/export persistence | `tests/e2e/calculator-import-export.spec.js` |
| `tools/combat-formulas.js` golden behavior | `tests/e2e/formulas.spec.js` |
| Attribute planner flow, KPI, chips, contribution table | `tests/e2e/planner.spec.js` |
| Calculator/planner bridge, `tools/pvp-config.js`, `tools/sync-bridge.js`, planner baseline | `tests/e2e/sync.spec.js` plus relevant calculator/planner checks |
| Crafting data fetch/filter/detail UI | `tests/e2e/crafting.spec.js` |
| League CSV parsing/tabs/tables/charts/cache | `tests/e2e/league.spec.js` |
| OCR parser or calculator OCR import with mocked OCR | `tests/e2e/ocr-parser.spec.js`, `tests/e2e/ocr-calculator.spec.js` |
| Real Tesseract/sample image behavior | `npm run test:ocr-real` only when specifically relevant |
| Docs/spec-only changes | Inspect changed Markdown, ensure placeholders are removed, and optionally run `git diff --check` |

### Test style examples

Existing Playwright tests prefer stable selectors and behavior assertions:

```js
// tests/e2e/routing.spec.js pattern
for (const route of routes) {
  await page.goto(route.hash);
  await expect(page.locator(route.view)).toBeVisible();
  await expect(page.locator(route.selector)).toBeVisible();
}
```

```js
// tests/e2e/calculator.spec.js pattern
await page.locator('#atk1-attack').fill('1000');
await page.locator('#atk1-attack').dispatchEvent('input');
await expect(page.locator('#damage1_1')).not.toHaveText('0');
```

OCR tests should mock `window.pvpOcr.recognizeFromFile` or `window.Tesseract.createWorker` unless the manual real-image suite is intentionally being run.

---

## Code Review Checklist

Reviewers and check agents should verify:

- The change matches the static root-level SPA architecture and does not add unrelated tooling.
- Route changes update all required route surfaces and smoke tests.
- Dynamic data is rendered with `textContent`/DOM APIs rather than raw HTML injection.
- Initialization is guarded so route revisits do not duplicate event listeners.
- `localStorage` keys and DOM ids remain stable or have an intentional migration/test update.
- Calculator/planner sync keeps `BRIDGE_FIELD_MAP`, `BASELINE_SYNC_KEYS`, `source` metadata, and re-entry guards consistent.
- Defensive parsing and shape checks exist for user input, uploads, fetched JSON, OCR text, and cached storage.
- User-facing success/error states use `window.showNotification(...)` or a local wrapper and remain visible when data fails to load.
- Accessibility basics are preserved: semantic controls, dialog ARIA, nav labels, `aria-expanded`, and `hidden` route/panel visibility.
- The verification run matches the affected area, and failures are fixed rather than bypassed.
