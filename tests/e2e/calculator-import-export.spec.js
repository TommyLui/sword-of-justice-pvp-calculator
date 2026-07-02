const path = require('path');
const os = require('os');
const fs = require('fs');
const { test, expect } = require('@playwright/test');

const ATTACK_FIELDS = ['attack', 'elementalAttack', 'defenseBreak', 'shieldBreak', 'pvpAttack', 'accuracy', 'crit', 'critDamage', 'extraCritRate', 'pvpAttackRate', 'elementalBreak', 'skillAttack'];
const DEFENSE_FIELDS = ['defense', 'airShield', 'elementalResistance', 'pvpResistance', 'blockResistance', 'criticalResistance', 'criticalDefense', 'skillResistance'];

function buildValues(fields, start) {
  return Object.fromEntries(fields.map((field, index) => [field, String(start + index * 111)]));
}

async function fillGroup(page, prefix, values) {
  for (const [field, value] of Object.entries(values)) {
    const selector = `#${prefix}-${field}`;
    await page.fill(selector, value);
    await page.dispatchEvent(selector, 'input');
  }
}

async function expectGroup(page, prefix, values) {
  for (const [field, value] of Object.entries(values)) {
    await expect(page.locator(`#${prefix}-${field}`), `${prefix}-${field}`).toHaveValue(value);
  }
}

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
    const attack1 = buildValues(ATTACK_FIELDS, 10000);
    const attack2 = buildValues(ATTACK_FIELDS, 20000);
    const defense1 = buildValues(DEFENSE_FIELDS, 30000);
    const defense2 = buildValues(DEFENSE_FIELDS, 40000);

    await fillGroup(page, 'atk1', attack1);
    await fillGroup(page, 'atk2', attack2);
    await fillGroup(page, 'def1', defense1);
    await fillGroup(page, 'def2', defense2);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#export-btn')
    ]);

    const tmpPath = path.join(os.tmpdir(), `pvp-export-${Date.now()}.txt`);
    await download.saveAs(tmpPath);
    const exported = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    expect(exported.attack1).toEqual(attack1);
    expect(exported.attack2).toEqual(attack2);
    expect(exported.defense1).toEqual(defense1);
    expect(exported.defense2).toEqual(defense2);

    await page.click('#reset-data-btn');
    await page.click('#calculator-reset-confirm');
    await expect(page.locator('#atk1-attack')).toHaveValue('0');

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#import-btn')
    ]);
    await chooser.setFiles(tmpPath);

    await page.waitForFunction(() => document.getElementById('atk1-attack').value === '10000');
    await expectGroup(page, 'atk1', attack1);
    await expectGroup(page, 'atk2', attack2);
    await expectGroup(page, 'def1', defense1);
    await expectGroup(page, 'def2', defense2);
  });

  test('shows error notification for invalid calculator import JSON', async ({ page }) => {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('#import-btn')
    ]);
    await chooser.setFiles({
      name: 'bad.json.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('{ bad json')
    });

    await expect(page.locator('.notification.error .notification-title')).toHaveText('匯入失敗');
    await expect(page.locator('#atk1-attack')).toHaveValue('0');
  });
});
