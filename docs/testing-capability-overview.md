# Testing Capability Overview

## Current Automated Coverage

The repo currently has Playwright coverage for:

- route smoke tests
- calculator input / reset / localStorage restore
- calculator copy buttons and bridge side effects
- calculator import / export round-trip
- calculator ↔ planner sync
- planner 3-step flow, KPI, contribution table, top 3, and reset
- crafting load / filter / reset
- league upload / restore / tabs / filters / sorting / chart fallback / summary
- OCR calculator integration
- OCR parser mock / fallback
- formula helper and golden-value regression

## OCR Split

### Main suite

`npm test`

- fast regression checks
- excludes `ocr-real.spec.js`

### Real-image baseline

`npm run test:ocr-real`

- uses `ocr_example/ex1.png`, `ex2.png`, `ex3.png`
- runs real `window.pvpOcr.recognizeFromFile(...)`
- intended for local/manual OCR validation

## CI Split

### Main CI

- Workflow: `.github/workflows/test.yml`
- Runs on push / pull_request
- Uploads `playwright-report` and `playwright-test-results`

### Manual OCR baseline CI

- Workflow: `.github/workflows/ocr-real.yml`
- Triggered with `workflow_dispatch`
- Uploads `ocr-real-report` and `ocr-real-test-results`

## Practical Meaning

The current test architecture protects:

- formula correctness
- route availability
- localStorage restore behavior
- bridge synchronization behavior
- OCR import wiring
- OCR parser regressions

The main remaining value in future tests is mostly around:

- import / OCR error paths
- broader bridge field permutations
- deeper crafting detail interactions
