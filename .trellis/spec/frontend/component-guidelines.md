# Component Guidelines

> How UI is built in this project.

---

## Overview

This project does not use framework components, props, JSX, templates, slots, or component-scoped CSS. The frontend is a static HTML SPA enhanced by browser-global JavaScript. Treat "component" work as one of these existing patterns:

- Static route and form markup in `index.html`.
- DOM API render functions inside a feature script under `tools/`.
- Shared browser-global helpers such as `window.showNotification`, `window.pvpCombat`, or `window.pvpSyncBridge`.

When adding or changing UI, match the existing native DOM style: find stable elements by id, create dynamic elements with `document.createElement`, put data into `textContent`, append via containers/fragments, and bind listeners once during guarded initialization.

---

## UI Structure

### Static markup lives in `index.html`

Route containers, primary forms, dialogs, navigation, and initial view structure live in `index.html`. Examples include:

- The calculator route and reset dialog markup under `#view-calculator`.
- Planner step panels under `#view-attribute-planner`.
- The mobile bottom nav with `aria-label="行動版導覽"` and matching route links.
- `#notification-container` plus the inline `window.showNotification` implementation.

For route changes, keep all of these in sync:

1. The view container id in `index.html`.
2. Desktop sidebar link.
3. Mobile bottom-nav link.
4. `ROUTES` in `index.html`.
5. Feature route listener in the relevant `tools/*.js` file.
6. Route smoke coverage in `tests/e2e/routing.spec.js` when appropriate.

### Dynamic UI uses DOM API render functions

Generated lists, tables, chips, and notifications are built with DOM APIs, not framework rendering. Data from JSON, CSV, OCR, or user input should be assigned with `textContent`.

Examples:

```js
// index.html notification renderer
const notif = document.createElement('div');
notif.className = `notification ${type}`;

const titleEl = document.createElement('div');
titleEl.className = 'notification-title';
titleEl.textContent = title || titles[type] || titles.info;

const messageEl = document.createElement('div');
messageEl.className = 'notification-message';
messageEl.textContent = message || '';

container.appendChild(notif);
```

```js
// tools/crafting.js pattern
const option = document.createElement('option');
option.value = seasonCode;
option.textContent = formatSeasonDisplay(season);
seasonFilter.appendChild(option);
```

```js
// tools/league.js pattern
const cell = document.createElement('td');
cell.textContent = value;
row.appendChild(cell);
```

Use `innerHTML = ''` to clear a trusted container before DOM rendering. Static trusted placeholders are also used for simple loading/error states, such as `'<div class="crafting-loading">載入中...</div>'` in `tools/crafting.js`. Do not put imported or user-provided data into `innerHTML`.

---

## Props and Composition Conventions

There are no props or component composition APIs. The current equivalent conventions are:

- Use stable DOM ids and `data-*` attributes as the integration contract between `index.html`, feature scripts, and tests.
- Keep feature-local constants near the code that owns the feature.
- Use object literals for configuration maps and labels.
- Use small helper functions inside the feature script for repeated DOM or formatting behavior.

Examples:

```js
// tools/calculator.js: feature-local OCR target config
const OCR_IMPORT_CONFIG = {
    atk1: { fields: ['attack', 'elementalAttack', 'defenseBreak', 'accuracy', 'crit', 'elementalBreak', 'pvpAttack'] },
    atk2: { fields: ['attack', 'elementalAttack', 'defenseBreak', 'accuracy', 'crit', 'elementalBreak', 'pvpAttack'] },
    def1: { fields: ['defense', 'blockResistance', 'criticalResistance', 'elementalResistance', 'pvpResistance'] },
    def2: { fields: ['defense', 'blockResistance', 'criticalResistance', 'elementalResistance', 'pvpResistance'] }
};
```

```js
// tools/crafting.js: feature-local display helper
function formatSeasonDisplay(season) {
    if (!season) return '';
    return season.replace(/\n/g, ' · ');
}
```

Shared behavior should only be promoted to a `window.pvp...` module when multiple features actually depend on it. Existing examples are formula helpers (`tools/combat-formulas.js`), field mapping (`tools/pvp-config.js`), and calculator/planner sync (`tools/sync-bridge.js`).

---

## Styling Patterns

Styling is global:

- `styles.css` contains most shell, calculator, planner, crafting, league, notification, OCR, and responsive classes.
- `index.html` also contains inline shell CSS variables and base layout styles; do not assume `styles.css` is the only style source.
- View visibility is controlled with the `hidden` property and `.view[hidden]` CSS, not by mounting/unmounting components.
- Feature scripts toggle classes for stateful styling (`active`, `positive`, `negative`, `dark-mode`, `sidebar-open`, notification `show`).

Examples:

```js
// index.html route switching
document.querySelectorAll('.view').forEach(v => v.hidden = true);
document.getElementById(viewId).hidden = false;
document.querySelectorAll('.nav a, .bottom-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
});
```

```js
// tools/calculator.js comparison styling
function applyCompareValueClass(element, value) {
    element.classList.remove('positive', 'negative');
    if (value > 0) element.classList.add('positive');
    else if (value < 0) element.classList.add('negative');
}
```

When adding CSS, use descriptive global class names consistent with the feature prefix (`crafting-*`, `league-*`, `planner-*`, `ocr-*`) and check both light and dark mode if the UI is visible in both.

---

## Accessibility

Preserve the existing native accessibility patterns:

- Use semantic controls (`button`, `input`, `select`, `table`, `nav`) rather than clickable `div`s.
- Keep `aria-label` on navigation or icon-only controls.
- Keep `aria-expanded` synchronized for the mobile sidebar toggle.
- Dialog panels should include `role="dialog"`, `aria-modal`, `aria-labelledby`, and `aria-describedby` as the calculator reset dialog does.
- Planner step navigation uses `role="tablist"`; hidden panels should continue using `hidden` plus active state classes.
- Generated text should use `textContent` so assistive technologies receive normal text nodes.

Examples:

```html
<!-- index.html mobile nav -->
<nav class="bottom-nav" aria-label="行動版導覽">...</nav>

<!-- index.html reset dialog pattern -->
<div id="calculator-reset-dialog" class="calc-dialog" hidden>
  <div class="calc-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="calc-dialog-title" aria-describedby="calc-dialog-desc">
    <h3 id="calc-dialog-title">確認重置資料</h3>
    <p id="calc-dialog-desc">此操作會清空目前輸入與結果，且無法復原。要繼續嗎？</p>
  </div>
</div>
```

```js
// index.html mobile menu state
const isOpen = document.body.classList.toggle('sidebar-open');
navToggle.setAttribute('aria-expanded', String(isOpen));
```

---

## Common Mistakes

- Do not add React/Vue/Svelte-style components, props, hooks, JSX, or template files; they do not match the shipped app.
- Do not use `innerHTML` with CSV rows, JSON records, OCR text, or user-entered text. Use `textContent` and DOM nodes.
- Do not bind listeners every time a hash route is revisited. Use the existing `window.__...Initialized` and `window.__...RouteListenerBound` guard style.
- Do not put all new CSS in `styles.css` without checking inline shell CSS in `index.html` when changing app-shell layout, theme variables, or route visibility.
- Do not create UI text in English for user-facing app features unless the surrounding feature is already English. The app copy is mostly Traditional Chinese.
