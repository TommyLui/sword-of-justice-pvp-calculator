# AGENTS.md - Agentic Coding Guidelines

## Project Overview
Simple static HTML/CSS/JS PVP damage calculator for "Sword of Justice" (逆水寒) game. Deployed to GitHub Pages.

## Build/Deploy Commands

**No build step required** - this is a vanilla HTML/CSS/JS project.

```bash
# Local development - simply open in browser
# Or use a local server:
npx serve .
python -m http.server 8000
```

**Deployment**: Automatic via GitHub Actions on push to `main`/`master` branch.

## Project Structure

```
├── index.html          # Main page (Chinese UI) - Current version S2.2
├── script.js           # Calculator logic + localStorage
├── styles.css          # Styling with dark mode support
├── icon.jpg            # App icon
├── 2.1/                # Archive: Previous season 2.1 version
│   ├── index.html
│   ├── script.js
│   └── styles.css
└── .github/workflows/
    └── deploy.yml      # GitHub Pages deployment
```

## Code Style Guidelines

### JavaScript (`script.js`)
- **Style**: Vanilla ES6+, no frameworks
- **Functions**: Use `camelCase` for function names
- **Variables**: Use `camelCase` for variables
- **IDs**: Use `kebab-case` for HTML element IDs (e.g., `atk1-attack`)
- **Constants**: Use `UPPER_SNAKE_CASE` for true constants only
- **Indentation**: 4 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Use semicolons

Example:
```javascript
function calculateRemainDefense(defense, defenseBreak) {
    return Math.max(0, defense - defenseBreak);
}

const skillBase = 58000;
```

### CSS (`styles.css`)
- **Naming**: Use `kebab-case` for class names
- **Organization**: Group related styles together (base → components → dark mode)
- **Dark mode**: Use `body.dark-mode` prefix for dark theme overrides
- **Indentation**: 4 spaces
- **Colors**: Prefer hex codes (`#4CAF50` for primary green)

Example:
```css
.input-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

body.dark-mode input {
    background-color: #333;
    color: #e0e0e0;
}
```

### HTML (`index.html`)
- **Language**: zh-TW (Traditional Chinese UI)
- **Structure**: Semantic HTML5
- **IDs**: Use `kebab-case`
- **Indentation**: 4 spaces
- **Script cache-busting**: Use `?version` suffix when updating (e.g., `script.js?250327`)

## Key Patterns

### localStorage Usage
All input values auto-save to localStorage with element ID as key:
```javascript
localStorage.setItem(input.id, input.value);
```

Results are saved with `result-` prefix:
```javascript
localStorage.setItem(`result-${element.id}`, element.textContent);
```

### Calculator Formula Constants
When updating game formulas for new seasons, update these constants in `calculateResults()`:
- `skillBase` - Base skill damage value (currently 58000)
- `skillMultiplier` - Skill damage multiplier (currently 3.38)

Previous season (2.1) values: `skillBase = 58000`, `skillMultiplier = 3.38`

### Copy Button Pattern
Properties array + loop for copying between sections:
```javascript
const properties = ['attack', 'defenseBreak', ...];
properties.forEach(prop => {
    const val = document.getElementById(`atk1-${prop}`).value;
    document.getElementById(`atk2-${prop}`).value = val;
    localStorage.setItem(`atk2-${prop}`, val);
});
```

## Season Updates

When a new game season releases:
1. Archive current version to a version folder (e.g., `2.1/`)
2. Update formula constants (`skillBase`, `skillMultiplier`) in `calculateResults()`
3. Update the TODO comment in `script.js` with new values
4. Update version in `index.html` title (e.g., "S2.2")
5. Bump script cache-busting version in HTML (`script.js?YYMMDD`)

## Error Handling
- Parse integers safely: `parseInt(value) || 0`
- Try-catch for JSON parsing (import feature)
- User alerts in Chinese: `alert('數據匯入錯誤: ' + error.message)`

## Testing
**No automated tests** - manually test by:
1. Opening `index.html` in browser
2. Entering values in all input fields
3. Verifying calculations update correctly
4. Testing dark mode toggle
5. Testing import/export with sample data
6. Testing copy buttons between sections

## Git Workflow
- Commit to `main` or `master` triggers auto-deployment
- No pull request required for simple changes
- Bump script version query param when modifying `script.js` to bust cache
- Preserve archived versions in version folders (e.g., `2.1/`)

## Language
UI text is in **Traditional Chinese (zh-TW)**. Maintain Chinese for:
- Button labels (e.g., `夜間模式`, `匯入`, `匯出`)
- Alert messages (e.g., `數據匯入成功!`)
- Table headers (e.g., `剩餘防禦`, `實際命中率`)
- Section titles (e.g., `進攻數值1`, `防禦數值1`)
