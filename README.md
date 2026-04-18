# sword-of-justice-pvp-calculator

[![Run Playwright Tests](https://github.com/TommyLui/sword-of-justice-pvp-calculator/actions/workflows/test.yml/badge.svg)](https://github.com/TommyLui/sword-of-justice-pvp-calculator/actions/workflows/test.yml)

A pvp damage calculator for the online game "Sword of justice"

## Live Demo
This site is automatically deployed to GitHub Pages. Visit: https://tommylui.github.io/sword-of-justice-pvp-calculator/

## Deployment
This project uses GitHub Pages for hosting. The site is automatically deployed when changes are pushed to the main/master branch via GitHub Actions.

### Setup Instructions
To enable GitHub Pages deployment:
1. Go to your repository Settings
2. Navigate to Pages section (under Code and automation)
3. Under "Build and deployment", select "GitHub Actions" as the source
4. The workflow will automatically deploy your site on the next push

## Local Development

### Option 1: VS Code Live Server (Recommended)
1. Install the **Live Server** extension (`ritwickdey.LiveServer`) in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. Changes to HTML/CSS/JS auto-reload in the browser on save

### Option 2: npx serve
```bash
npx serve .
```
Then open `http://localhost:3000`. Manual refresh required after changes.

### Option 3: Python
```bash
python -m http.server 8000
```
Then open `http://localhost:8000`. Manual refresh required after changes.

## Automated Testing

This repo now includes Playwright E2E tests for routing, calculator, planner sync, crafting, formulas, and league upload flows.

### Install test dependencies

```bash
npm install
```

### Run all tests

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

### Run real-image OCR baseline tests locally

```bash
npm run test:ocr-real
```

These OCR baseline tests use the real sample images under `ocr_example/` and call `window.pvpOcr.recognizeFromFile(...)` directly. They are intended for local regression checks only.

They are excluded from the default `npm test` suite so the main feedback loop stays fast.

### Why OCR real-image tests are skipped in CI

`tests/e2e/ocr-real.spec.js` is skipped when `process.env.CI` is set because it depends on real Tesseract runtime behavior, CDN downloads, worker startup, and image OCR stability. This keeps the main CI suite fast and reliable while still allowing local baseline verification.

### Run OCR real-image baseline in GitHub Actions

This repo also provides a manual workflow for OCR real-image baseline checks:

- Workflow file: `.github/workflows/ocr-real.yml`
- Trigger: `workflow_dispatch`

Use it when you want to validate OCR behavior on GitHub-hosted runners without putting real-image OCR into the normal push / pull request gate.

The manual OCR workflow runs `npm run test:ocr-real` and uploads:

- `ocr-real-report`
- `ocr-real-test-results`

GitHub Actions also runs the Playwright suite on push and pull request via `.github/workflows/test.yml`.

### CI artifacts

When the GitHub Actions Playwright workflow runs, it uploads:

- `playwright-report/` — HTML report
- `test-results/` — screenshots, traces, videos, and failure artifacts

If a test fails in CI, download these artifacts from the workflow run page for debugging.
