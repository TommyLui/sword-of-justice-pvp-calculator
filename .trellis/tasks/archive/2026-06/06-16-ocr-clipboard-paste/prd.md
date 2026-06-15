# Add clipboard paste button to calculator OCR

## Goal

Allow users to import OCR screenshot into the damage calculator directly from the clipboard, in addition to the existing file-explorer flow. This reduces friction for users who take screenshots and want to paste them immediately without saving a file first.

## What I already know

* The calculator has four OCR buttons (`atk1-ocr-btn`, `atk2-ocr-btn`, `def1-ocr-btn`, `def2-ocr-btn`) that trigger a hidden file input (`#calculator-ocr-file`).
* `tools/calculator.js` calls `window.pvpOcr.recognizeFromFile(file, preprocess)`.
* `tools/ocr-demo.js` exposes `recognizeFromFile(file, preprocessOverrides)` which expects a `File`/`Blob`, loads it as an image, runs Tesseract, and returns parsed fields.
* The project already uses `navigator.clipboard.writeText` for copy buttons, so clipboard API usage exists.
* The app is served over HTTP (not `file://`), which is required for clipboard read API in secure contexts.

## Assumptions (temporary)

* We will add a separate "貼上剪貼簿" (paste from clipboard) button near each existing OCR button, or a single paste button that uses the same target as the last clicked OCR button.
* Clipboard access will use the modern `navigator.clipboard.read()` API with image fallback to a global `paste` event listener.
* Browsers that block clipboard read (e.g. without user gesture or permission) will show an error notification.

## Open Questions

* Should each of the four OCR targets get its own paste button, or should there be one shared paste button that remembers the last OCR target? → **Answered: dedicated paste button per OCR target**
* Should we support both image paste (`Ctrl+V`) and a clickable paste button, or just one of them? → **Answered: button-only paste**
* How should we handle browsers that do not support `navigator.clipboard.read()`? Fallback to `paste` event only, or show a message? → **Answered: show error notification and ask user to use file upload**
* Should the OCR demo page also get clipboard paste, or only the calculator? → **Out of scope for this task**

## Requirements

* Add a dedicated "貼上剪貼簿" button next to each of the four existing OCR buttons in the calculator.
* On click, read the clipboard image using `navigator.clipboard.read()`.
* Convert the clipboard image item into a `File`/Blob and feed it into the existing `window.pvpOcr.recognizeFromFile()` pipeline.
* Preserve existing file-explorer OCR behavior.
* Show user-visible success/error feedback using existing `window.showNotification` / `notify()`.
* If the browser does not support clipboard image read, show an error notification asking the user to use file upload instead.
* Update relevant E2E tests or add a new test spec.

## Acceptance Criteria

* [x] Each OCR target has a clickable "貼上剪貼簿" button.
* [x] Clicking the button reads an image from the clipboard and runs OCR.
* [x] Pasted image is processed by the same OCR pipeline as file-upload images.
* [x] Existing file-upload OCR still works.
* [x] Unsupported browsers show a clear error message.
* [x] `npm test` passes.

## Definition of Done

* Tests added/updated for clipboard paste path (where feasible with Playwright mocks).
* `npm test` passes.
* UI text remains in Traditional Chinese and consistent with surrounding copy.
* No regression in file-upload OCR.

## Out of Scope (explicit)

* Pasting non-image clipboard content (text, files).
* Cross-origin image handling.
* Mobile clipboard limitations beyond graceful error messages.

## Technical Notes

* Files impacted:
  * `tools/calculator.js` — bind paste buttons, read clipboard, call OCR.
  * `index.html` — add paste button(s) near OCR buttons.
  * `styles.css` — style new paste button(s).
  * `tests/e2e/ocr-calculator.spec.js` — update tests.
* Clipboard APIs require a secure context and usually a user gesture; plan to bind to click events.
