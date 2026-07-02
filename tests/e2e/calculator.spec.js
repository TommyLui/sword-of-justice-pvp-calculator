const { test, expect } = require('@playwright/test');

const ATTACK_FIELDS = ['attack', 'elementalAttack', 'defenseBreak', 'shieldBreak', 'pvpAttack', 'accuracy', 'crit', 'critDamage', 'extraCritRate', 'pvpAttackRate', 'elementalBreak', 'skillAttack'];
const DEFENSE_FIELDS = ['defense', 'airShield', 'elementalResistance', 'pvpResistance', 'blockResistance', 'criticalResistance', 'criticalDefense', 'skillResistance'];

async function fillCalculatorFields(page, prefix, values) {
  for (const [field, value] of Object.entries(values)) {
    const selector = `#${prefix}-${field}`;
    await page.fill(selector, String(value));
    await page.dispatchEvent(selector, 'input');
  }
}

function percentText(text) {
  const value = parseFloat(String(text || '0').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(value) ? value : 0;
}

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

  test('matches rich UI golden values and verdict best tile', async ({ page }) => {
    const atk1 = { attack: 48200, elementalAttack: 9200, defenseBreak: 12500, shieldBreak: 6800, pvpAttack: 3400, accuracy: 11800, crit: 8600, critDamage: 220, extraCritRate: 12, pvpAttackRate: 9, elementalBreak: 2100, skillAttack: 800 };
    const atk2 = { attack: 51500, elementalAttack: 7600, defenseBreak: 14800, shieldBreak: 3600, pvpAttack: 1200, accuracy: 9800, crit: 11200, critDamage: 185, extraCritRate: 7, pvpAttackRate: 14, elementalBreak: 4800, skillAttack: 500 };
    const def1 = { defense: 24500, airShield: 4200, elementalResistance: 3800, pvpResistance: 2200, blockResistance: 1800, criticalResistance: 1400, criticalDefense: 26, skillResistance: 950 };
    const def2 = { defense: 31000, airShield: 8500, elementalResistance: 5400, pvpResistance: 3600, blockResistance: 5200, criticalResistance: 4300, criticalDefense: 18, skillResistance: 1600 };

    await fillCalculatorFields(page, 'atk1', atk1);
    await fillCalculatorFields(page, 'atk2', atk2);
    await fillCalculatorFields(page, 'def1', def1);
    await fillCalculatorFields(page, 'def2', def2);
    await page.waitForFunction(() => document.getElementById('damage1_1').textContent !== '0');

    const expected = await page.evaluate(({ atk1, atk2, def1, def2, attackFields, defenseFields }) => {
      const build = (atk, def) => {
        const stats = {};
        attackFields.forEach(field => { stats[field] = atk[field]; });
        defenseFields.forEach(field => { stats[field] = def[field]; });
        return window.pvpCombat.calculateCombatStats(stats);
      };
      return {
        '11': build(atk1, def1),
        '21': build(atk2, def1),
        '12': build(atk1, def2),
        '22': build(atk2, def2)
      };
    }, { atk1, atk2, def1, def2, attackFields: ATTACK_FIELDS, defenseFields: DEFENSE_FIELDS });

    const uiMap = {
      '11': { damage: 'damage1_1', critDamage: 'critDamage1_1', accuracy: 'actualAccuracyRate1_1', crit: 'actualCritRate1_1' },
      '21': { damage: 'damage1_2', critDamage: 'critDamage1_2', accuracy: 'actualAccuracyRate1_2', crit: 'actualCritRate1_2' },
      '12': { damage: 'damage2_1', critDamage: 'critDamage2_1', accuracy: 'actualAccuracyRate2_1', crit: 'actualCritRate2_1' },
      '22': { damage: 'damage2_2', critDamage: 'critDamage2_2', accuracy: 'actualAccuracyRate2_2', crit: 'actualCritRate2_2' }
    };

    for (const [mx, ids] of Object.entries(uiMap)) {
      await expect(page.locator(`#${ids.damage}`)).toHaveText(String(Math.floor(expected[mx].finalDamage)));
      await expect(page.locator(`#${ids.critDamage}`)).toHaveText(String(expected[mx].expectedDamage));
      expect(percentText(await page.locator(`#${ids.accuracy}`).textContent()), `${mx} accuracy`).toBeCloseTo(expected[mx].actualAccuracyRate, 2);
      expect(percentText(await page.locator(`#${ids.crit}`).textContent()), `${mx} crit`).toBeCloseTo(expected[mx].actualCritRate, 2);
    }

    const best = Object.entries(expected).sort((a, b) => b[1].expectedDamage - a[1].expectedDamage)[0];
    await expect(page.locator('#vp-best-number')).toHaveText(best[1].expectedDamage.toLocaleString('zh-TW'));
    await expect(page.locator(`#vp-val-${best[0]}`)).toHaveText(best[1].expectedDamage.toLocaleString('zh-TW'));
    await expect(page.locator(`#vp-tile-${best[0]}`)).toHaveClass(/\bbest\b/);
  });

  test('calculator tabs and design panels expose finite breakdown states', async ({ page }) => {
    await expect(page.locator('#calc-tab-inputs')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#calc-panel-inputs')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#calc-panel-detail')).toHaveAttribute('aria-hidden', 'true');

    await page.click('#calc-tab-detail');
    await expect(page.locator('#calc-panel-detail')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#calc-panel-inputs')).toHaveAttribute('aria-hidden', 'true');

    await page.click('#calc-tab-inputs');
    await expect(page.locator('#calc-panel-inputs')).toHaveAttribute('aria-hidden', 'false');
    await fillCalculatorFields(page, 'atk2', { attack: 1000, accuracy: 0, critDamage: 100 });
    await fillCalculatorFields(page, 'def1', { defense: 999999, airShield: 999999, blockResistance: 12000, pvpResistance: 999999, skillResistance: 999999 });

    await page.click('#calc-tab-cascade');
    await expect(page.locator('#calc-panel-cascade')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#calc-panel-detail')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#calc-panel-cascade')).not.toContainText('克制加成');

    await page.click('#calc-tab-breakdown');
    await expect(page.locator('#calc-panel-breakdown')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#calc-panel-cascade')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#calc-breakdown-body')).toContainText('下限保護');
    const breakdownText = await page.locator('#calc-breakdown-body').textContent();
    expect(breakdownText).not.toMatch(/NaN|Infinity/);
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
