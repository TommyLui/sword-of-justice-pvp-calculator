const path = require('path');
const { test, expect } = require('@playwright/test');

const dummyImagePath = path.resolve(__dirname, '..', 'fixtures', 'dummy.png');

function createField(value) {
  return { value: String(value), matchedAlias: 'test', sourceSnippet: '' };
}

function buildResult(overrides = {}) {
  const keys = [
    'attack', 'elementalAttack', 'defenseBreak', 'accuracy', 'crit', 'elementalBreak', 'pvpAttack',
    'defense', 'blockResistance', 'criticalResistance', 'elementalResistance', 'pvpResistance'
  ];
  const fields = {};
  keys.forEach(key => {
    fields[key] = createField(overrides[key] ?? '');
  });
  return {
    templateVersion: 'fixed-panel-v1',
    strategy: 'fixed-panel-rows',
    rawText: '',
    layoutWarning: '',
    debug: {},
    fields
  };
}

test.describe('calculator OCR integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/calculator');
    await expect(page.locator('#view-calculator')).toBeVisible();
  });

  test('imports attack-side OCR fields into atk1 and syncs planner baseline', async ({ page }) => {
    const result = buildResult({
      attack: 15000,
      elementalAttack: 5000,
      defenseBreak: 3000,
      accuracy: 2000,
      crit: 1000,
      elementalBreak: 500,
      pvpAttack: 400
    });

    await page.evaluate(mock => {
      window.pvpOcr.recognizeFromFile = async () => mock;
    }, result);

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#atk1-ocr-btn')
    ]);
    await chooser.setFiles(dummyImagePath);

    await expect(page.locator('#atk1-attack')).toHaveValue('15000');
    await expect(page.locator('#atk1-defenseBreak')).toHaveValue('3000');
    await expect(page.locator('#atk1-crit')).toHaveValue('1000');
    await expect(page.locator('#atk1-pvpAttack')).toHaveValue('400');
    await page.waitForFunction(() => document.getElementById('damage1_1').textContent !== '0');

    await page.goto('/#/attribute-planner');
    await expect(page.locator('#planner-app')).toBeVisible();
    await expect(page.locator('#planner-baseline-attack')).toHaveValue('15000');
    await expect(page.locator('#planner-baseline-crit')).toHaveValue('1000');
  });

  test('imports defense-side OCR fields into def1 without polluting planner baseline', async ({ page }) => {
    await page.fill('#atk1-attack', '99');
    await page.dispatchEvent('#atk1-attack', 'input');

    const result = buildResult({
      defense: 20000,
      blockResistance: 8000,
      criticalResistance: 6000,
      elementalResistance: 4000,
      pvpResistance: 2000
    });

    await page.evaluate(mock => {
      window.pvpOcr.recognizeFromFile = async () => mock;
    }, result);

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#def1-ocr-btn')
    ]);
    await chooser.setFiles(dummyImagePath);

    await expect(page.locator('#def1-defense')).toHaveValue('20000');
    await expect(page.locator('#def1-blockResistance')).toHaveValue('8000');
    await expect(page.locator('#def1-pvpResistance')).toHaveValue('2000');

    await page.goto('/#/attribute-planner');
    await expect(page.locator('#planner-app')).toBeVisible();
    await expect(page.locator('#planner-baseline-attack')).toHaveValue('99');
  });
});
