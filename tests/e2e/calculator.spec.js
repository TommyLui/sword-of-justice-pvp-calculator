const { test, expect } = require('@playwright/test');

test.describe('calculator flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/calculator');
    await expect(page.locator('#view-calculator')).toBeVisible();
  });

  test('updates damage results after input', async ({ page }) => {
    await page.fill('#atk1-attack', '20000');
    await page.dispatchEvent('#atk1-attack', 'input');

    await page.waitForFunction(() => document.getElementById('damage1_1').textContent !== '0');
    const damage = await page.locator('#damage1_1').textContent();
    expect(parseInt(damage || '0', 10)).toBeGreaterThan(0);
  });

  test('supports reset dialog cancel and confirm', async ({ page }) => {
    await page.fill('#atk1-attack', '12345');
    await page.dispatchEvent('#atk1-attack', 'input');

    await page.click('#reset-data-btn');
    await expect(page.locator('#calculator-reset-dialog')).toBeVisible();
    await page.click('#calculator-reset-cancel');
    await expect(page.locator('#calculator-reset-dialog')).toBeHidden();
    await expect(page.locator('#atk1-attack')).toHaveValue('12345');

    await page.click('#reset-data-btn');
    await page.click('#calculator-reset-confirm');
    await expect(page.locator('#atk1-attack')).toHaveValue('0');
  });

  test('restores values from localStorage after reload', async ({ page }) => {
    await page.fill('#atk1-attack', '54321');
    await page.dispatchEvent('#atk1-attack', 'input');
    await page.reload();
    await expect(page.locator('#atk1-attack')).toHaveValue('54321');
  });
});
