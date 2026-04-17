const { test, expect } = require('@playwright/test');

test.describe('combat formulas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
  });

  test('evaluates formula helper boundaries', async ({ page }) => {
    const result = await page.evaluate(() => ({
      remainDefense1: window.pvpCombat.calculateRemainDefense(10000, 3000),
      remainDefense2: window.pvpCombat.calculateRemainDefense(3000, 10000),
      defenseRate: window.pvpCombat.calculateDefenseRate(0),
      remainShield1: window.pvpCombat.calculateRemainShield(0, 9000),
      remainShield2: window.pvpCombat.calculateRemainShield(4000, 9000),
      remainShield3: window.pvpCombat.calculateRemainShield(9000, 9000)
    }));

    expect(result).toEqual({
      remainDefense1: 7000,
      remainDefense2: 0,
      defenseRate: 10,
      remainShield1: 9000,
      remainShield2: 2500,
      remainShield3: 0
    });
  });

  test('evaluates combat stats golden values', async ({ page }) => {
    const result = await page.evaluate(() => {
      const zero = {
        attack: 0,
        elementalAttack: 0,
        defenseBreak: 0,
        shieldBreak: 0,
        pvpAttack: 0,
        accuracy: 0,
        crit: 0,
        critDamage: 0,
        extraCritRate: 0,
        pvpAttackRate: 0,
        elementalBreak: 0,
        skillAttack: 0,
        defense: 0,
        airShield: 0,
        elementalResistance: 0,
        pvpResistance: 0,
        blockResistance: 0,
        criticalResistance: 0,
        criticalDefense: 0,
        skillResistance: 0
      };
      const typical = {
        ...zero,
        attack: 20000,
        defenseBreak: 5000,
        defense: 15000,
        critDamage: 150
      };
      return {
        zero: window.pvpCombat.calculateCombatStats(zero),
        typical: window.pvpCombat.calculateCombatStats(typical)
      };
    });

    expect(result.zero.expectedDamage).toBe(50895);
    expect(result.typical.remainDefense).toBe(10000);
    expect(result.typical.expectedDamage).toBe(68032);
  });
});
