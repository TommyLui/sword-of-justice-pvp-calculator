# Testing Guide

## Scope

This repo uses Playwright E2E tests as the primary automated regression layer.

Current coverage includes:

- routing smoke tests
- calculator core flows
- calculator ↔ planner sync
- calculator import/export
- calculator OCR integration
- OCR parser mock/fallback behavior
- crafting list load/filter/reset
- league upload / restore / tabs / filters / sorting / chart fallback / summary cards
- real-image OCR baseline (local/manual only)

## Install

```bash
npm install
```

## Common Commands

### Run the main suite

```bash
npm test
```

### Run headed mode

```bash
npm run test:headed
```

### Run debug mode

```bash
npm run test:debug
```

### Run a subset by grep

```bash
npm run test:single -- league
```

### Run real-image OCR baseline locally

```bash
npm run test:ocr-real
```

## CI Workflows

### Main Playwright suite

- Workflow: `.github/workflows/test.yml`
- Trigger: `push`, `pull_request`

Artifacts:

- `playwright-report`
- `playwright-test-results`

### Manual OCR real-image baseline

- Workflow: `.github/workflows/ocr-real.yml`
- Trigger: `workflow_dispatch`

Artifacts:

- `ocr-real-report`
- `ocr-real-test-results`

## Practical Notes

- Use HTTP only; the suite assumes the app is served via `npx serve .`
- `tests/e2e/ocr-real.spec.js` is intentionally skipped in normal CI and only meant for local/manual OCR regression checks
- When adding new tests, prefer stable selectors (`id`, explicit route ids, fixed button ids)
- When testing OCR integration, mock `window.pvpOcr.recognizeFromFile` unless the goal is a real-image baseline

## Formula Safety Summary

- The calculator and planner now share one formula source: `tools/combat-formulas.js`
- A dedicated audit doc exists at `docs/superpowers/specs/2026-04-18-formula-equivalence-audit.md`
- Regression coverage for formulas lives in `tests/e2e/formulas.spec.js`
- Current audit conclusion: recent refactors extracted shared math, but did not change the formula behavior
