# Type Safety

> Type safety patterns in this project.

---

## Overview

The application is plain browser JavaScript. There is no TypeScript, `tsconfig.json`, app typecheck script, app lint script, JSDoc type layer, schema validation library, or compile-time type system. The practical type-safety approach is:

- Keep object shapes explicit with local constants and field maps.
- Parse numbers defensively with radix `10` and finite checks.
- Whitelist accepted keys before copying imported/synced data.
- Validate array/object shapes when reading JSON or `localStorage`.
- Wrap untrusted parsing/fetching/storage restore in `try/catch`.
- Cover important contracts with Playwright tests.

Do not document or introduce TypeScript conventions as if they already exist. A TypeScript migration would be a separate task.

---

## Shape Organization

Runtime shapes are encoded in constants near the owning module rather than shared type files.

Examples:

```js
// tools/pvp-config.js: calculator/planner field shape
const ATTACK_FIELDS = ['attack', 'elementalAttack', 'defenseBreak', 'shieldBreak', 'pvpAttack', 'accuracy', 'crit', 'critDamage', 'extraCritRate', 'pvpAttackRate', 'elementalBreak', 'skillAttack'];
const DEFENSE_FIELDS = ['defense', 'airShield', 'elementalResistance', 'pvpResistance', 'blockResistance', 'criticalResistance', 'criticalDefense', 'skillResistance'];
const BRIDGE_FIELD_MAP = {
    attack: 'atk1-attack',
    elementalAttack: 'atk1-elementalAttack',
    defenseBreak: 'atk1-defenseBreak',
    shieldBreak: 'atk1-shieldBreak',
    accuracy: 'atk1-accuracy',
    crit: 'atk1-crit',
    critDamage: 'atk1-critDamage',
    elementalBreak: 'atk1-elementalBreak'
};
```

```js
// tools/league.js: table column shape
const COLUMNS = [
    { key: 'name', label: '玩家名字', numeric: false },
    { key: 'role', label: '職業', numeric: false },
    { key: 'kills', label: '擊敗', numeric: true },
    { key: 'assists', label: '助攻', numeric: true }
];
```

```js
// tools/calculator.js: feature import target shape
const OCR_IMPORT_CONFIG = {
    atk1: { fields: ['attack', 'elementalAttack', 'defenseBreak', 'accuracy', 'crit', 'elementalBreak', 'pvpAttack'] },
    def1: { fields: ['defense', 'blockResistance', 'criticalResistance', 'elementalResistance', 'pvpResistance'] }
};
```

When adding fields, update the owning shape constant first, then update all route markup, rendering, persistence, sync, and tests that depend on it.

---

## Validation

### Numeric parsing

Use explicit number parsing and fallbacks. Existing examples use `parseInt(..., 10)`, `Number.isFinite`, `Number(value)`, `Math.max`, `Math.min`, and default `0`/known fallback values.

Examples:

```js
// tools/combat-formulas.js
function toInt(value) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
}
```

```js
// tools/sync-bridge.js
function sanitizePartial(partial) {
    const next = {};
    ATTR_KEYS.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(partial, key)) {
            next[key] = toInt(partial[key]);
        }
    });
    return next;
}
```

```js
// tools/crafting.js
function getSeasonNumber(season) {
    if (!season) return 9999;
    const match = season.match(/S(\d+)/);
    return match ? parseInt(match[1], 10) : 9999;
}
```

League CSV parsing also strips thousands separators before parsing numeric columns. Preserve this style when reading human-entered or imported numeric data.

### JSON and storage parsing

Use `try/catch` and shape checks for data that can be invalid:

- `tools/calculator.js` catches JSON import parse errors and shows an error notification.
- `tools/crafting.js` catches fetch/JSON failures, renders visible error UI, and notifies the user.
- `tools/league.js` catches invalid cached `leagueData`, removes it, and keeps the route usable.
- `tools/ocr-demo.js` validates stored sample arrays/objects and falls back to an empty list on errors.

Example:

```js
// tools/crafting.js pattern
try {
    const data = await response.json();
    records = data.map(record => ({
        ...record,
        effectText: normalizeEffectText(record.effectText),
        _seasonSortKey: getSeasonNumber(record.season)
    }));
} catch (error) {
    console.error('Error loading crafting data:', error);
    notify({ type: 'error', title: '載入失敗', message: '打造資料載入失敗，請聯絡管理員更新資料快照' });
}
```

---

## Common Patterns

### Check required globals before use

Because browser scripts depend on load order, feature scripts check required `window` globals and fail visibly when a dependency is missing.

```js
// tools/calculator.js
const combat = window.pvpCombat;
if (!combat) {
    notify({
        type: 'error',
        title: '載入失敗',
        message: '傷害公式模組未載入，請重新整理頁面',
        duration: 5000
    });
    return;
}
```

### Optional chaining for optional DOM/globals

Optional chaining is used for optional elements and globals so missing optional pieces do not crash unrelated routes.

```js
// tools/calculator.js
document.getElementById('calculator-reset-dialog')?.setAttribute('hidden', 'hidden');
if (!window.pvpSyncBridge?.setBaselineAtk1 || isApplyingBridgeUpdate) return;
```

### Whitelist and copy data instead of sharing mutable references

Shared modules copy state out and sanitize state in.

```js
// tools/sync-bridge.js
function getBaselineAtk1() {
    return {
        ...state.baselineAtk1,
        _meta: {
            hasValue: state.hasValue,
            updatedAt: state.updatedAt,
            source: state.source
        }
    };
}
```

### User-facing failures should be visible

Use `window.showNotification(...)` or a local `notify()` wrapper for visible feedback, and keep route-local fallback UI when data cannot load.

```js
// tools/crafting.js
const notify = (options) => {
    if (window.showNotification) {
        window.showNotification(options);
    } else {
        alert(options.title + ': ' + options.message);
    }
};
```

---

## Forbidden Patterns

- Do not add TypeScript-only artifacts (`.ts`, `.tsx`, `types/`, `tsconfig.json`) for normal app changes; the shipped app is plain JavaScript.
- Do not rely on implicit `parseInt(value)` radix behavior; use `parseInt(value, 10)`.
- Do not copy arbitrary keys from imported JSON, CSV rows, OCR output, or sync payloads into app state. Use whitelists such as `ATTR_KEYS`, field lists, or target config maps.
- Do not assume `localStorage` JSON is valid or current. Parse with `try/catch` and shape checks.
- Do not inject parsed strings as HTML to "validate" them visually. Keep data as values and render via `textContent`.
- Do not silence missing required globals; show a user-visible failure and return early.
