# Attribute Planner Stepping Comparison

## Goal

Redesign the `#/attribute-planner` target/compare flow so the user defines a **step size per attribute** (e.g. "every 200 attack", "every 100 crit", "every 300 defense break") and the compare panel shows a **10-level stepping table** of damage increase for each attribute, compared to the previous level, based on the current `atk1` vs `def1` scenario.

## What I already know

* Current planner has 3 steps: baseline → target → result, comparing two full attribute sets.
* Current planner only considers 8 attributes: `attack`, `elementalAttack`, `defenseBreak`, `shieldBreak`, `accuracy`, `crit`, `critDamage`, `elementalBreak`.
* Damage calculation is provided by `window.pvpCombat.calculateCombatStats(...).expectedDamage`.
* The scenario (defender and remaining attacker stats) is read from `atk1-*` and `def1-*` inputs in the calculator DOM.
* Existing sync-bridge keeps `atk1` baseline values in sync with the planner.

## Assumptions (temporary)

* The new target panel will let the user input one step size per attribute (not one global step size).
* The compare panel will show exactly 10 levels of increments per attribute.
* "Compared to previous level" means level `n` shows the damage delta versus level `n-1`, not versus baseline.
* The existing baseline panel may remain as the reference starting point, or be replaced by the current `atk1` values.

## Open Questions

* Should the 10-level table show absolute damage, percentage gain vs previous level, or both? → **Answered: marginal % + cumulative % vs baseline**
* Should baseline values still be editable in the planner, or be read-only from `atk1`? → **Answered: read-only from atk1**
* Should we preserve the old full-set comparison behavior as an alternative mode, or fully replace it? → **Answered: fully replace**
* What happens when a step size is `0` or empty? Skip that attribute? Show zeros? → **Answered: skip attribute from table**

## Requirements (evolving)

* Baseline values are read-only and sourced from calculator `atk1` (via existing sync-bridge).
* Replace the current "target set" input with per-attribute step-size inputs.
* Compute 10 incremental levels for each attribute using the step size.
* Render a table with 10 rows per attribute.
* Each row shows:
  * damage increase relative to the previous level (marginal gain)
  * cumulative damage increase relative to the baseline (total gain)
* Attributes with step size `0` or empty are omitted from the compare table.
* Base all calculations on the current `atk1` vs `def1` scenario.
* Keep the existing bridge/sync behavior with the calculator.
* Update relevant E2E tests in `tests/e2e/`.

## Acceptance Criteria

* [x] Target panel shows a step-size input for each planner attribute.
* [x] Compare panel renders a 10-level stepping table.
* [x] Each row shows marginal gain vs previous level and cumulative gain vs baseline.
* [x] Table reflects current `atk1`/`def1` values from the calculator.
* [x] Tests pass: `npm test`.

## Definition of Done

* Tests added/updated for the new compare table behavior.
* `npm test` passes.
* UI text remains in Traditional Chinese and consistent with existing copy.
* No regression in calculator ↔ planner sync.

## Out of Scope (explicit)

* The old full-set baseline-vs-target comparison mode will be removed.
* Multi-defender or multi-attacker comparison (still only `atk1` vs `def1`).
* Optimization/recommendation engine.
* Backend or data persistence beyond existing localStorage patterns.

## Technical Notes

* Files impacted:
  * `tools/attribute-planner.js` — main logic and rendering
  * `tools/pvp-config.js` — config for planner attributes
  * `index.html` — planner markup
  * `tests/e2e/attribute-planner.spec.js` (if exists) or related specs
