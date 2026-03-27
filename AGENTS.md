# AGENTS.md - Agentic Coding Guidelines

## Project Overview
Simple static HTML/CSS/JS PVP damage calculator for "Sword of Justice" game. Deployed to GitHub Pages.

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
├── index.html          # Main page (Chinese UI)
├── script.js           # Calculator logic + localStorage
├── styles.css          # Styling with dark mode support
├── icon.jpg            # App icon
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
- **Organization**: Group related styles together
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
- **Script cache-busting**: Use `?version` suffix when updating (e.g., `script.js?241225`)

## Key Patterns

### localStorage Usage
All input values auto-save to localStorage with element ID as key:
```javascript
localStorage.setItem(input.id, input.value);
```

### Calculator Formula Constants
When updating game formulas, update these constants in `calculateResults()`:
- `skillBase` - Base skill damage value
- `skillMultiplier` - Skill damage multiplier

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

## Language
UI text is in **Traditional Chinese (zh-TW)**. Maintain Chinese for:
- Button labels
- Alert messages
- Table headers
- Section titles
