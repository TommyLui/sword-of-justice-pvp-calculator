# Frontend Development Guidelines

> Project-specific conventions for frontend development in this repository.

---

## Overview

This directory documents the actual frontend conventions used by the Sword of Justice PvP calculator SPA. The app is a root-level static site with browser-global JavaScript under `tools/`, global CSS, hash routing, explicit `localStorage` ownership, defensive runtime parsing, and Playwright regression tests.

These guidelines intentionally describe the current codebase rather than aspirational framework patterns. Future implementation and check agents should follow these files before changing app code.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Static SPA layout, feature-file ownership, script order | Complete |
| [Component Guidelines](./component-guidelines.md) | Native DOM UI patterns, styling, accessibility | Complete |
| [Hook Guidelines](./hook-guidelines.md) | `init*` functions, route/theme/sync events, lazy loading | Complete |
| [State Management](./state-management.md) | File-local state, `localStorage`, hash route state, sync bridge | Complete |
| [Quality Guidelines](./quality-guidelines.md) | Forbidden patterns, testing map, review checklist | Complete |
| [Type Safety](./type-safety.md) | Plain JavaScript runtime validation and shape checks | Complete |

---

## Pre-Development Checklist

Before editing frontend code:

1. Confirm the change fits the shipped static SPA shape (`index.html`, `styles.css`, `tools/*.js`) and does not require new tooling.
2. Read the specific guideline file for the affected area.
3. Identify which feature script owns the behavior and which stable DOM ids/localStorage keys/tests depend on it.
4. If routes, calculator/planner sync, persistence, OCR, CSV, or fetched JSON are involved, check the corresponding quality and state-management sections.

---

## Quality Check

After editing frontend code:

1. Run focused Playwright coverage for the affected area when app behavior changed.
2. For docs-only/spec-only changes, inspect the changed Markdown and ensure no scaffold placeholders remain.
3. Do not claim lint/typecheck success; this repo currently has no lint or typecheck scripts.
4. Report the exact verification performed and any remaining risk.

---

**Language**: Frontend spec documentation is written in **English**. User-facing app copy remains mostly **Traditional Chinese (`zh-TW`)**.
