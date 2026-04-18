const { test, expect } = require('@playwright/test');

test.describe('calculator flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/calculator');
    await expect(page.locator('#view-calculator')).toBeVisible();
    await page.evaluate(() => {
      localStorage.clear();
      window.__bridgeFired = false;
      window.addEventListener('pvp-sync:update', () => {
        window.__bridgeFired = true;
      }, { once: true });
    });
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

  test('copy-left-atk copies atk1 to atk2 without bridge side effect', async ({ page }) => {
    await page.fill('#atk1-attack', '11111');
    await page.fill('#atk1-crit', '22222');
    await page.fill('#atk1-pvpAttack', '33333');
    await page.dispatchEvent('#atk1-attack', 'input');
    await page.dispatchEvent('#atk1-crit', 'input');
    await page.dispatchEvent('#atk1-pvpAttack', 'input');

    await page.evaluate(() => {
      window.__bridgeFired = false;
    });

    await page.click('#copy-left-atk-btn');

    await expect(page.locator('#atk2-attack')).toHaveValue('11111');
    await expect(page.locator('#atk2-crit')).toHaveValue('22222');
    await expect(page.locator('#atk2-pvpAttack')).toHaveValue('33333');

    const bridgeFired = await page.evaluate(() => !!window.__bridgeFired);
    expect(bridgeFired).toBe(false);
  });

  test('copy-right-atk copies atk2 to atk1 and publishes bridge once', async ({ page }) => {
    await page.fill('#atk2-attack', '44444');
    await page.fill('#atk2-crit', '55555');
    await page.fill('#atk2-pvpAttack', '66666');
    await page.dispatchEvent('#atk2-attack', 'input');
    await page.dispatchEvent('#atk2-crit', 'input');
    await page.dispatchEvent('#atk2-pvpAttack', 'input');

    await page.evaluate(() => {
      window.__bridgeFired = false;
    });

    await page.click('#copy-right-atk-btn');

    await expect(page.locator('#atk1-attack')).toHaveValue('44444');
    await expect(page.locator('#atk1-crit')).toHaveValue('55555');
    await expect(page.locator('#atk1-pvpAttack')).toHaveValue('66666');

    const bridge = await page.evaluate(() => window.pvpSyncBridge.getBaselineAtk1());
    expect(bridge.attack).toBe(44444);
    expect(bridge.crit).toBe(55555);
    expect(bridge).not.toHaveProperty('pvpAttack');

    const bridgeFired = await page.evaluate(() => !!window.__bridgeFired);
    expect(bridgeFired).toBe(true);
  });

  test('copy-left-def and copy-right-def copy defense fields without bridge side effects', async ({ page }) => {
    await page.fill('#def1-defense', '77777');
    await page.fill('#def1-pvpResistance', '88888');
    await page.dispatchEvent('#def1-defense', 'input');
    await page.dispatchEvent('#def1-pvpResistance', 'input');

    await page.evaluate(() => {
      window.__bridgeFired = false;
    });

    await page.click('#copy-left-def-btn');
    await expect(page.locator('#def2-defense')).toHaveValue('77777');
    await expect(page.locator('#def2-pvpResistance')).toHaveValue('88888');

    await page.fill('#def2-defense', '99999');
    await page.fill('#def2-pvpResistance', '12345');
    await page.dispatchEvent('#def2-defense', 'input');
    await page.dispatchEvent('#def2-pvpResistance', 'input');

    await page.evaluate(() => {
      window.__bridgeFired = false;
    });

    await page.click('#copy-right-def-btn');
    await expect(page.locator('#def1-defense')).toHaveValue('99999');
    await expect(page.locator('#def1-pvpResistance')).toHaveValue('12345');

    const bridgeFired = await page.evaluate(() => !!window.__bridgeFired);
    expect(bridgeFired).toBe(false);
  });
});
