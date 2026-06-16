# fix: OCR clipboard review findings

## Goal

Address oracle review findings for calculator OCR clipboard paste so the feature has clearer failure UX, avoids duplicate concurrent paste/OCR work, and has stronger Playwright coverage for the OCR pipeline contract and all four paste targets.

## Requirements

* Normalize clipboard read/permission errors into Traditional Chinese user-facing notifications.
* Ensure unsupported clipboard image read still tells users to use file upload.
* Disable all OCR upload/paste buttons from paste click through OCR completion or paste read failure.
* Prevent rapid multiple paste clicks from triggering overlapping clipboard reads or OCR imports.
* Strengthen E2E tests to verify clipboard image data is passed to `window.pvpOcr.recognizeFromFile()` as a `File` with the expected image MIME type.
* Add test coverage that all four paste buttons target their matching calculator section.
* Add test coverage for clipboard permission/read rejection.

## Acceptance Criteria

* [x] Permission/read failures show a zh-TW message that includes the file-upload fallback.
* [x] Paste buttons are disabled during clipboard read and OCR import.
* [x] Fast repeated paste clicks do not cause multiple OCR imports.
* [x] E2E tests assert `recognizeFromFile()` receives a clipboard `File`/image MIME type.
* [x] E2E tests cover `atk1`, `atk2`, `def1`, and `def2` paste button routing.
* [x] `npm test` passes.

## Definition of Done

* Code stays within static SPA patterns (`index.html`, `styles.css`, `tools/*.js`).
* User-facing copy remains Traditional Chinese.
* No bundler/module/tooling changes.
* Relevant Playwright tests are added/updated and full suite passes.

## Technical Approach

* Add a helper in `tools/calculator.js` to normalize clipboard errors.
* Add a short-lived busy lock around the full paste flow, distinct enough to cover `navigator.clipboard.read()` before OCR starts.
* Keep existing `runOcrImport()` pipeline shared by upload and paste.
* Update `tests/e2e/ocr-calculator.spec.js` mocks to record OCR input details and add target-routing cases.

## Out of Scope

* Global Ctrl+V / Cmd+V paste support.
* OCR demo page clipboard paste.
* Real Tesseract / real image OCR baseline changes.

## Technical Notes

* Review findings came from oracle review of commit `52dcadf`.
* Relevant files: `tools/calculator.js`, `tests/e2e/ocr-calculator.spec.js`.
* Frontend specs read: component guidelines, state management, quality guidelines, type safety.
