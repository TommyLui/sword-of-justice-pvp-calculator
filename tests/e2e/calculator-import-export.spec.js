const path = require('path');
const os = require('os');
const fs = require('fs');
const { test, expect } = require('@playwright/test');

test.describe('calculator import export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/calculator');
    await expect(page.locator('#view-calculator')).toBeVisible();
  });

  test('imports calculator data from a payload file', async ({ page }) => {
    const payload = {
      attack1: { attack: '11111', crit: '222', defenseBreak: '333' },
      attack2: { attack: '33333' },
      defense1: { defense: '44444' },
      defense2: { defense: '55555' }
    };

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#import-btn')
    ]);
    await chooser.setFiles({
      name: 'round-trip.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(JSON.stringify(payload))
    });

    await page.waitForFunction(() => document.getElementById('atk1-attack').value === '11111');
    await expect(page.locator('#atk1-attack')).toHaveValue('11111');
    await expect(page.locator('#atk1-crit')).toHaveValue('222');
    await expect(page.locator('#atk2-attack')).toHaveValue('33333');
    await expect(page.locator('#def1-defense')).toHaveValue('44444');
    await expect(page.locator('#def2-defense')).toHaveValue('55555');
  });

  test('exports calculator data and can import it back after reset', async ({ page }) => {
    await page.fill('#atk1-attack', '12345');
    await page.dispatchEvent('#atk1-attack', 'input');
    await page.fill('#atk2-crit', '543');
    await page.dispatchEvent('#atk2-crit', 'input');
    await page.fill('#def1-defense', '67890');
    await page.dispatchEvent('#def1-defense', 'input');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#export-btn')
    ]);

    const tmpPath = path.join(os.tmpdir(), `pvp-export-${Date.now()}.txt`);
    await download.saveAs(tmpPath);
    const exported = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    expect(exported.attack1.attack).toBe('12345');
    expect(exported.attack2.crit).toBe('543');
    expect(exported.defense1.defense).toBe('67890');

    await page.click('#reset-data-btn');
    await page.click('#calculator-reset-confirm');
    await expect(page.locator('#atk1-attack')).toHaveValue('0');

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#import-btn')
    ]);
    await chooser.setFiles(tmpPath);

    await page.waitForFunction(() => document.getElementById('atk1-attack').value === '12345');
    await expect(page.locator('#atk1-attack')).toHaveValue('12345');
    await expect(page.locator('#atk2-crit')).toHaveValue('543');
    await expect(page.locator('#def1-defense')).toHaveValue('67890');
  });
});
