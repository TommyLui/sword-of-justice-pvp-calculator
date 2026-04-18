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
      remainShield3: window.pvpCombat.calculateRemainShield(9000, 9000),
      elementalResisRate: window.pvpCombat.calculateElementalResisRate(5000, 1000),
      actualAccuracyRate: window.pvpCombat.calculateActualAccuracyRate(5000, 1000),
      actualCritRate: window.pvpCombat.calculateActualCritRate(5000, 10, 1000),
      actualCritRateCapped: window.pvpCombat.calculateActualCritRate(999999, 100, 0)
    }));

    expect(result.remainDefense1).toBe(7000);
    expect(result.remainDefense2).toBe(0);
    expect(result.defenseRate).toBe(10);
    expect(result.remainShield1).toBe(9000);
    expect(result.remainShield2).toBe(2500);
    expect(result.remainShield3).toBe(0);
    expect(result.elementalResisRate).toBeCloseTo(45.65167769915545, 8);
    expect(result.actualAccuracyRate).toBeCloseTo(100, 8);
    expect(result.actualCritRate).toBeCloseTo(78.97689768976898, 8);
    expect(result.actualCritRateCapped).toBe(100);
  });

  test('covers remaining shield branches and negative crit bonus behavior', async ({ page }) => {
    const result = await page.evaluate(() => {
      const stats = {
        attack: 10000,
        elementalAttack: 0,
        defenseBreak: 0,
        shieldBreak: 4000,
        pvpAttack: 0,
        accuracy: 999999,
        crit: 999999,
        critDamage: 50,
        extraCritRate: 0,
        pvpAttackRate: 0,
        elementalBreak: 0,
        skillAttack: 0,
        defense: 0,
        airShield: 9000,
        elementalResistance: 0,
        pvpResistance: 0,
        blockResistance: 0,
        criticalResistance: 0,
        criticalDefense: 100,
        skillResistance: 0
      };

      return {
        remainShieldMid: window.pvpCombat.calculateRemainShield(4000, 9000),
        remainShieldLow: window.pvpCombat.calculateRemainShield(2000, 9000),
        stats: window.pvpCombat.calculateCombatStats(stats)
      };
    });

    expect(result.remainShieldMid).toBe(2500);
    expect(result.remainShieldLow).toBe(5000);
    expect(result.stats.actualAccuracyRate).toBe(100);
    expect(result.stats.actualCritRate).toBe(100);
    expect(result.stats.expectedDamage).toBeLessThan(result.stats.finalDamage);
  });

  test('evaluates zero and typical combat stats golden values', async ({ page }) => {
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

    expect(result.zero).toEqual({
      remainDefense: 0,
      defenseRate: 10,
      remainShield: 0,
      elementalResisRate: 0,
      actualAccuracyRate: 95,
      actualCritRate: 0,
      baseDamage: 52200,
      finalDamage: 52200,
      expectedDamage: 50895
    });

    expect(result.zero.expectedDamage).toBe(50895);
    expect(result.typical.remainDefense).toBe(10000);
    expect(result.typical.expectedDamage).toBe(68032);
  });
});
