const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');

const EXAMPLES = [
  '/ocr_example/ex1.png',
  '/ocr_example/ex2.png',
  '/ocr_example/ex3.png'
];

let localServer;

test.beforeAll(async () => {
  if (process.env.CI) return;
  localServer = spawn('npx', ['serve', '.', '--listen', '3100'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'ignore'
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
});

test.afterAll(async () => {
  if (localServer && !localServer.killed) {
    localServer.kill();
  }
});

test.describe('real-image OCR baseline', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    test.skip(!!process.env.CI, 'real Tesseract + CDN — skip in CI');
    await page.goto('http://localhost:3100/#/');
    await page.waitForFunction(() => typeof window.pvpOcr?.recognizeFromFile === 'function');
  });

  for (const imgUrl of EXAMPLES) {
    const label = imgUrl.split('/').pop();

    test(`${label} — baseline OCR remains usable`, async ({ page }) => {
      const result = await page.evaluate(async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`fetch ${url} -> ${response.status}`);
        }

        const blob = await response.blob();
        const file = new File([blob], url.split('/').pop(), { type: 'image/png' });
        return window.pvpOcr.recognizeFromFile(file);
      }, imgUrl);

      expect(result.templateVersion).toBe('fixed-panel-v1');
      expect(result.debug.filledCount).toBeGreaterThanOrEqual(8);
      expect(result.fields.attack.value).toMatch(/^\d+$/);
      expect(result.fields.defense.value).toMatch(/^\d+$/);
    });
  }
});
