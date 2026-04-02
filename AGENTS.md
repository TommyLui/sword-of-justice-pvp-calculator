# AGENTS.md - Agentic Coding Guidelines

## Project Overview
Static HTML/CSS/JS SPA — PVP damage calculator for "Sword of Justice" (逆水寒). Vanilla JS, no build tools, deployed to GitHub Pages. Current version: **S2.2**.

## Build/Deploy Commands

**No build step.** Open `index.html` in a browser or serve locally:

```bash
npx serve .
# or
python -m http.server 8000
```

**No tests.** Manual verification only (see Testing section below).

**Deployment:** Automatic via GitHub Actions on push to `main`/`master`.

## Project Structure

```
├── index.html              # SPA shell: sidebar nav, routing, theming, notifications
├── styles.css              # Calculator view styles only (scoped to #view-calculator)
├── icon.jpg                # App icon
├── tools/
│   ├── calculator.js       # Calculator logic (initCalculator), localStorage, import/export
│   └── calculator.html     # Legacy redirect → ../#/calculator
├── 2.1/                    # Archive: previous season 2.1
│   ├── index.html
│   ├── script.js
│   └── styles.css
└── .github/workflows/
    └── deploy.yml          # GitHub Pages deployment
```

## Code Style Guidelines

### JavaScript
- **Vanilla ES6+**, no frameworks or modules — all code is in global scope or `initCalculator()` closure
- **Functions/variables:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE` for true constants only
- **HTML IDs:** `kebab-case` (e.g., `atk1-attack`, `def2-airShield`)
- **Indentation:** 4 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Null safety:** Use optional chaining (`?.`) for DOM element event listeners

```javascript
// Good — safe DOM access
document.getElementById('export-btn')?.addEventListener('click', () => { ... });

// Good — safe int parsing
const value = parseInt(document.getElementById('atk1-attack').value) || 0;
```

### CSS
- **Class/ID names:** `kebab-case`
- **Calculator styles** are in `styles.css`, scoped under `#view-calculator`
- **App shell styles** are inline in `index.html` `<style>` block (CSS variables, sidebar, hero, grid, responsive)
- **Theming:** CSS custom properties defined in `:root` and `body.dark-mode` (`--bg`, `--accent`, `--border`, etc.)
- **Indentation:** 4 spaces
- **Colors:** Hex codes or `rgba()`; accent gold is `#D6A84A`

### HTML
- **Language:** `zh-TW` (Traditional Chinese UI)
- **IDs:** `kebab-case`
- **Indentation:** 4 spaces
- **Cache-busting:** No query params currently — script is `<script src="tools/calculator.js">`

## Key Architecture Patterns

### SPA Routing (Hash-based)
Routes defined in `index.html` inline script:
```javascript
const ROUTES = { '': 'view-home', 'calculator': 'view-calculator' };
```
Views toggle via `hidden` attribute. Calculator initializes lazily via `initCalculator()` when navigating to `#/calculator`.

### Calculator Initialization Guard
`initCalculator()` runs once via flag:
```javascript
if (window.__calculatorInitialized) return;
window.__calculatorInitialized = true;
```

### CSS Variable Theming
Variables defined in `:root` for light theme, overridden in `body.dark-mode` for dark theme. Dark mode toggled by adding/removing class, persisted in localStorage key `darkMode`.

### Notification System
Use `window.showNotification()` instead of `alert()`:
```javascript
showNotification({ type: 'success', title: '匯出成功', message: '數據已保存', duration: 3000 });
// type: 'success' | 'error' | 'info'
```
In `tools/calculator.js`, use the local `notify()` wrapper which falls back to `alert()` if the notification system isn't loaded.

### localStorage Pattern
All inputs auto-save on change with element ID as key:
```javascript
localStorage.setItem(input.id, input.value);
```
Results saved with `result-` prefix:
```javascript
localStorage.setItem(`result-${element.id}`, element.textContent);
```

### Copy Button Pattern
Properties array + loop for copying values between sections:
```javascript
const properties = ['attack', 'elementalAttack', 'defenseBreak', ...];
properties.forEach(prop => {
    const val = document.getElementById(`atk1-${prop}`).value;
    document.getElementById(`atk2-${prop}`).value = val;
    localStorage.setItem(`atk2-${prop}`, val);
});
```

### Import/Export
- **Export:** Collects all inputs into JSON object, downloads as `.txt` file
- **Import:** Reads `.txt` JSON file, populates inputs, calls `calculateResults()`
- Uses try-catch with user-facing Chinese error messages

## Damage Formulas (S2.2)

Located in `calculateResults()` in `tools/calculator.js`:
- `skillBase = 58000`
- `skillMultiplier = 3.38`

Formula constants in helper functions:
- Defense rate: `remainDefense / (remainDefense + 19032) * 100 + 10`, min `10%`
- Elemental resist: `diff / (diff + 4762) * 100`
- Accuracy: `(143 * diff / (diff + 10688) + 95) / 100`, capped at `100%`
- Crit rate: `(115 * diff - 200) / (diff + 2666) / 100`, plus extra crit, capped at `100%`
- Shield: piecewise — `0` if break ≥ shield, `0.5 * (shield - break)` if break ≥ shield/3, else `shield - 2 * break`

## Season Updates

When a new game season releases:
1. Archive current version to a version folder (e.g., `2.2/`)
2. Update formula constants (`skillBase`, `skillMultiplier`) in `calculateResults()` in `tools/calculator.js`
3. Update version in `index.html` `<title>` and `<meta name="app-version">` (e.g., "S2.3")
4. Update version in hero section and sidebar footer
5. Preserve archived versions in version folders

## Testing

**No automated tests.** Manually verify by:
1. Opening `index.html` in browser
2. Navigate to `#/calculator` via sidebar
3. Enter values in all input fields — results should auto-update
4. Test copy buttons (進攻數值1↔2, 防禦數值1↔2)
5. Test export → clear → import round-trip
6. Toggle dark mode, reload — preference persists
7. Resize browser to test mobile responsive layout
8. Test on mobile — bottom nav should appear, sidebar hidden

## Error Handling
- Safe int parsing: `parseInt(value) || 0`
- Try-catch for JSON import parsing
- All notifications in Chinese via `showNotification()`
- Damage values clamped to `Math.max(0, ...)` before display

## Git Workflow
- Commit to `main`/`master` triggers auto-deploy to GitHub Pages
- No PR required for simple changes
- Preserve archived version folders (e.g., `2.1/`)

## Language
All UI text is **Traditional Chinese (zh-TW)**. Maintain Chinese for:
- Button labels: `夜間模式`, `匯入`, `匯出`, `從進攻數值1複製`
- Notifications: `匯出成功`, `數據匯入成功`, `匯入失敗`
- Table headers: `剩餘防禦`, `防禦減免率`, `實際命中率`, `傷害(包含命中會心)`
- Section titles: `進攻數值1`, `防禦數值1`, `傷害差距`
- Navigation: `首頁`, `傷害計算器`, `選單`
