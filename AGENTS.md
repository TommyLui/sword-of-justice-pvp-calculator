# AGENTS.md

# Agents 工作守則

## 0. 首要原則

- 本節是最高優先規則；若後文與本節衝突，以本節為準。
- 除非使用者明確要求其他語言，代理人的所有回覆應使用繁體中文。
- 程式碼、指令、錯誤訊息、API 名稱、套件名稱與專有名詞可保留原文，避免翻譯造成歧義。
- 先理解使用者目標、限制、現有程式碼與專案慣例，再提出或實作方案。
- 優先做最小、清楚、可驗證、可回滾的正確變更；避免無關重構與範圍擴張。
- 對使用者描述的觀察、斷言、歸因與方案保持驗證意識，不把未確認內容當成事實。
- 有測試或驗證方式時，先用行為導向的檢查確認問題或需求，再實作與收尾。
- 宣稱完成、成功、通過或沒有問題前，必須先執行相符的測試、lint、建置或等價驗證。
- 不繞過驗證、不停用測試、不交付明知無法編譯、無法啟動或失敗的成果。
- 不讀取、輸出或提交憑證、token、私鑰與敏感個資；危險操作須先說明風險並等待確認。
- 除非使用者明確要求，不主動 commit、push、刪除資料或修改無關檔案。
- 回報時結論先行，清楚說明已完成事項、驗證結果、剩餘風險與未做事項原因。

## 1. 卡關處理

- 同一問題最多嘗試 3 次；每次重試都必須更換假設、方法或觀察角度。
- 達到上限後停止盲目嘗試，並記錄：嘗試過什麼、錯誤訊息、推測失敗原因。
- 找 2 到 3 個相似實作或替代方案作比較。
- 重新檢查問題是否可切小、抽象層是否錯誤、是否存在更簡單的方案。
- 必要時改用不同工具、不同架構角度，或移除不必要抽象。

## 2. 溝通與回報

- 回覆以結論先行，再展開原因、步驟與證據。
- 涉及架構決策、多文件變更或不確定方案時，必須讓關鍵理由可見。
- 區分事實、推論、假設與建議；不要把猜測包裝成結論。
- 回報內容應包含已完成事項、驗證結果、風險、未做事項與原因。
- 不要求使用者提供能透過本地工具取得的資訊。
- 不用過度客套或空泛保證；以可檢查的結果與具體下一步為主。

## 3. 安全與隱私

- 使用最小權限與最小資料原則。
- 不讀取、輸出或提交憑證、token、私鑰與敏感個資。
- 對外部服務、遠端環境、付款、權限、隱私、安全、並發與效能相關改動，完成後追加 self-review。
- 對危險操作先備份、說明風險、提供回復方案，再等待必要確認。
- 不把本地私有路徑、機器識別資訊或短期診斷細節寫入文件、日誌或回報。

## Repo Shape
- The shipped app is a root-level static SPA: `index.html`, `styles.css`, and global scripts in `tools/`; do not introduce a bundler/module system unless explicitly asked.
- `package.json` exists only for Playwright/serve dev dependencies and test scripts; there is no app build step, lint script, formatter config, or typecheck config.
- User-facing app copy is mostly Traditional Chinese (`zh-TW`); keep new UI text consistent with surrounding copy.

## Commands
- Install deps with `npm install` for local work or `npm ci` to match CI.
- Main regression suite: `npm test` (`playwright test`, Chromium only, auto-serves `npx serve . --listen 3000`).
- Focus a test by grep: `npm run test:single -- league`; headed/debug variants are `npm run test:headed` and `npm run test:debug`.
- Real-image OCR baseline: `npm run test:ocr-real`; it uses `ocr_example/*.png`, real Tesseract/CDN behavior, and is intentionally excluded from the default suite.
- Serve manually over HTTP, not `file://`: `npx serve .` or `python -m http.server 8000`; `tools/crafting.js` fetches JSON so `file://` gives misleading failures.

## Deploy / CI
- GitHub Pages deploys the repo root as-is from `.github/workflows/deploy.yml` (`upload-pages-artifact` path `.`) on `main`/`master` pushes or manual dispatch; there is no generated output directory.
- `.github/workflows/test.yml` runs Node 20, `npm ci`, installs Playwright Chromium, then `npx playwright test` on push/PR.
- `.github/workflows/ocr-real.yml` is manual-only and runs `npm run test:ocr-real -- --retries=1` with OCR artifacts uploaded separately.

## App Shell
- `index.html` owns the hash router, desktop sidebar, mobile bottom nav, dark-mode persistence (`localStorage.darkMode`), `window.showNotification(...)`, and inline CSS; do not assume `styles.css` is the only styling source.
- Current routed views are home, `#/calculator`, `#/attribute-planner`, `#/crafting`, and `#/league`. If routes change, update the view markup, both navs, `ROUTES`, and route init/event handling together.
- Script order is dependency order: Chart.js CDN, `tools/pvp-config.js`, `tools/combat-formulas.js`, `tools/calculator.js`, `tools/league.js`, `tools/crafting.js`, `tools/sync-bridge.js`, `tools/attribute-planner.js`, `tools/ocr-demo.js`.
- Tool scripts are global functions/objects with one-time `window.__...Initialized` guards; revisiting routes should reuse existing DOM/state instead of rebinding listeners.

## Source Files
- `tools/pvp-config.js` owns attack/defense field lists and the calculator ↔ planner bridge map; update `BRIDGE_FIELD_MAP` / `BASELINE_SYNC_KEYS` before touching synced attributes elsewhere.
- `tools/combat-formulas.js` exposes `window.pvpCombat`; calculator and planner math share it, with golden-value coverage in `tests/e2e/formulas.spec.js`.
- `tools/sync-bridge.js` is the calculator/planner sync channel (`window.pvpSyncBridge` + `pvp-sync:update`); preserve `source` metadata and re-entry guards to avoid feedback loops.
- `tools/calculator.js` persists numeric inputs by DOM id and result spans as `result-<spanId>` in `localStorage`; it also owns OCR import, import/export, reset, and copy-left/right behavior.
- `tools/attribute-planner.js` is a 3-step planner for only the calculator `atk1` vs `def1` scenario; baseline fields sync bi-directionally with calculator `atk1` only.
- `tools/crafting.js` loads `tools/crafting-db.json` with fallback path `../tools/crafting-db.json` and keeps explicit loading/error states visible.
- `tools/league.js` parses uploaded CSV, retries with `Big5` after UTF-8, and caches parsed data, filename, and active tab in `localStorage`.
- `tools/ocr-demo.js` provides `window.pvpOcr` for calculator OCR/tests, lazy-loads `tesseract.js` from CDN, uses `chi_tra` + `eng`, and stores sample calibrations under `localStorage.ocrDemoSamples`.

## Editing Conventions
- Match the existing plain-function, browser-global style and small file-local state; avoid new abstractions unless they remove real duplication.
- Use `window.showNotification(...)` or local `notify()` wrappers for user-visible success/error feedback.
- Keep defensive parsing for inputs, JSON, and CSV: `parseInt(..., 10)` helpers, shape checks, and `try/catch`.
- Follow the existing DOM-API rendering style for data-driven UI instead of injecting raw HTML.

## Verification
- Prefer focused Playwright specs after changes, then `npm test` when practical.
- Route smoke coverage is `tests/e2e/routing.spec.js`; include affected route specs such as `crafting.spec.js`, `league.spec.js`, `sync.spec.js`, `ocr-calculator.spec.js`, or `ocr-parser.spec.js`.
- After calculator, planner, `pvp-config.js`, or `sync-bridge.js` changes, verify sync both ways: calculator `atk1` → planner baseline and planner baseline → calculator.
- After persistence changes, reload once; dark mode, calculator values/results, league cached data, and OCR samples are restored from `localStorage`.
- OCR real-image tests should not be used as the default gate; use `npm run test:ocr-real` only when real Tesseract/sample-image behavior matters.
<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->
