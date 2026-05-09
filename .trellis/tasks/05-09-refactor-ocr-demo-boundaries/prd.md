# Refactor OCR demo responsibility boundaries

## Goal

Refactor `tools/ocr-demo.js` so its OCR parser, Tesseract runtime loading, sample/debug handling, UI synchronization, and public API glue are easier to maintain while preserving the current static SPA architecture and user-visible behavior.

## What I already know

* The roadmap marks Phase 2.1 (`ocr-demo.js` 收斂) as the next recommended refactor item.
* The project must remain a root-level static SPA; do not introduce a bundler, framework, ES modules, or generated build output.
* `tools/ocr-demo.js` is currently one browser-global script exposed as `window.pvpOcr`.
* Existing OCR behavior is covered by `tests/e2e/ocr-parser.spec.js` and `tests/e2e/ocr-calculator.spec.js` with mocked OCR/Tesseract behavior.
* Manual real-image OCR coverage exists as `npm run test:ocr-real`, but it is intentionally excluded from the default gate.
* `localStorage.ocrDemoSamples` is an existing persistence contract and should remain stable.
* Tesseract is lazy-loaded from CDN and uses `chi_tra` + `eng`.

## Requirements

* Preserve the existing static browser-global script model.
* Keep `tools/ocr-demo.js` as the owner of OCR parser/runtime/sample storage/debug output and `window.pvpOcr` unless implementation discovers a clearly lower-risk same-architecture split.
* Clarify responsibility boundaries inside `tools/ocr-demo.js`, especially around:
  * OCR field constants and pure parser helpers.
  * Fixed-panel parsing and text fallback behavior.
  * Tesseract script/worker loading and recognition orchestration.
  * Sample calibration persistence and comparison/debug helpers.
  * UI event binding/rendering and public API glue.
* Preserve `window.pvpOcr` public behavior used by calculator OCR import and tests.
* Preserve OCR output shape, including `fields`, `rawText`, `layoutWarning`, and `debug` data expected by tests.
* Preserve `localStorage` key `ocrDemoSamples` and existing defensive restore behavior.
* Preserve user-facing Traditional Chinese notifications/status text unless a change is needed for clarity.
* Avoid unrelated UI redesign, formula changes, calculator/planner sync changes, or route changes.

## Acceptance Criteria

* [ ] `tools/ocr-demo.js` has clearer internal sections or helper boundaries for parser, runtime, sample/debug, UI, and API responsibilities.
* [ ] `window.pvpOcr.recognizeFromFile(...)` continues to work with the same mocked Tesseract/test contract.
* [ ] Fixed-panel parsing still handles average defense/block/critical-resistance rows as currently tested.
* [ ] Text fallback still fills incomplete fixed-panel OCR results and records debug fallback details.
* [ ] Calculator OCR import still works for atk1/atk2/def1/def2 without changing planner baseline behavior.
* [ ] OCR error and empty-result paths still show the expected error notifications and re-enable buttons.
* [ ] No new app build, bundler, framework, module conversion, or dependency is introduced.

## Definition of Done

* Focused OCR tests pass:
  * `npm run test:single -- ocr-parser`
  * `npm run test:single -- ocr-calculator`
* Broader regression (`npm test`) is run when practical before final completion.
* No lint/typecheck success is claimed because this repo currently has no lint/typecheck scripts.
* Any docs/spec updates are made only if the refactor discovers new reusable project conventions.

## Technical Approach

Use an incremental, behavior-preserving refactor. Prefer reorganizing and extracting small local helpers within the existing IIFE before considering new browser-global files. Keep public contracts stable and let Playwright OCR tests prove behavior did not change.

## Decision (ADR-lite)

**Context**: The roadmap identifies `ocr-demo.js` as a high-value maintenance target because it mixes parsing, OCR runtime, sample/debug state, UI rendering, and API glue in one large file.

**Decision**: Start with a same-file responsibility-boundary refactor that preserves architecture and behavior. Do not migrate to framework/components/modules.

**Consequences**: This lowers regression risk and keeps deployment simple, but it may not reduce file size significantly. Future tasks can split files only if the static script-order contract and tests justify it.

## Out of Scope

* Replacing Tesseract or changing OCR language/runtime behavior.
* Running real-image OCR as the default quality gate.
* Migrating to React/Vue/Vite/ES modules or adding a build system.
* Changing calculator/planner sync behavior.
* Redesigning the OCR UI.
* Renaming existing DOM ids or `localStorage` keys.

## Technical Notes

* Roadmap reference: `docs/website-refactor-roadmap.md` Phase 2.1.
* Affected source: `tools/ocr-demo.js`.
* Key tests: `tests/e2e/ocr-parser.spec.js`, `tests/e2e/ocr-calculator.spec.js`.
* Relevant specs:
  * `.trellis/spec/frontend/index.md`
  * `.trellis/spec/frontend/directory-structure.md`
  * `.trellis/spec/frontend/state-management.md`
  * `.trellis/spec/frontend/quality-guidelines.md`
