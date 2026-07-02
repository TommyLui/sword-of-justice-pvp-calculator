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
      actualAccuracyRateBelowBase: window.pvpCombat.calculateActualAccuracyRate(1000, 5000),
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
    expect(result.actualAccuracyRateBelowBase).toBeCloseTo(9.473684210526315, 8);
    expect(result.actualCritRate).toBeCloseTo(78.97689768976898, 8);
    expect(result.actualCritRateCapped).toBe(100);
  });

  test('clamps defense mitigation rate between ten and one hundred percent', async ({ page }) => {
    const result = await page.evaluate(() => ({
      zeroDefense: window.pvpCombat.calculateDefenseRate(0),
      typicalDefense: window.pvpCombat.calculateDefenseRate(10000),
      highDefense: window.pvpCombat.calculateDefenseRate(200000),
      extremeDefense: window.pvpCombat.calculateDefenseRate(999999)
    }));

    expect(result.zeroDefense).toBe(10);
    expect(result.typicalDefense).toBeCloseTo(44.44475062000551, 8);
    expect(result.highDefense).toBe(100);
    expect(result.extremeDefense).toBe(100);
  });

  test('keeps zero-accuracy edge cases finite and bounded', async ({ page }) => {
    const result = await page.evaluate(() => {
      const baseStats = {
        attack: 20000,
        elementalAttack: 3000,
        defenseBreak: 1000,
        shieldBreak: 500,
        pvpAttack: 0,
        accuracy: 0,
        crit: 1000,
        critDamage: 150,
        extraCritRate: 0,
        pvpAttackRate: 0,
        elementalBreak: 0,
        skillAttack: 0,
        defense: 15000,
        airShield: 2000,
        elementalResistance: 1000,
        pvpResistance: 0,
        blockResistance: 0,
        criticalResistance: 500,
        criticalDefense: 0,
        skillResistance: 0
      };

      return [5000, 10688, 12000].map(blockResistance => {
        const actualAccuracyRate = window.pvpCombat.calculateActualAccuracyRate(0, blockResistance);
        const stats = window.pvpCombat.calculateCombatStats({ ...baseStats, blockResistance });
        return {
          blockResistance,
          actualAccuracyRate,
          expectedDamage: stats.expectedDamage
        };
      });
    });

    for (const edge of result) {
      expect(Number.isFinite(edge.actualAccuracyRate), `${edge.blockResistance} accuracy finite`).toBe(true);
      expect(edge.actualAccuracyRate, `${edge.blockResistance} accuracy lower bound`).toBeGreaterThanOrEqual(0);
      expect(edge.actualAccuracyRate, `${edge.blockResistance} accuracy upper bound`).toBeLessThanOrEqual(100);
      expect(Number.isFinite(edge.expectedDamage), `${edge.blockResistance} expectedDamage finite`).toBe(true);
      expect(edge.expectedDamage, `${edge.blockResistance} expectedDamage non-negative`).toBeGreaterThanOrEqual(0);
    }
  });

  test('covers remaining shield branches and minimum crit bonus behavior', async ({ page }) => {
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
    expect(result.stats.expectedDamage).toBe(112522);
    expect(result.stats.expectedDamage).toBe(Math.floor(result.stats.finalDamage * 1.5));
  });

  test('keeps critical damage bonus at least fifty percent after critical defense', async ({ page }) => {
    const result = await page.evaluate(() => {
      const stats = {
        attack: 10000,
        elementalAttack: 0,
        defenseBreak: 0,
        shieldBreak: 0,
        pvpAttack: 0,
        accuracy: 999999,
        crit: 999999,
        critDamage: 50,
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
        criticalDefense: 999999,
        skillResistance: 0
      };
      return window.pvpCombat.calculateCombatStats(stats);
    });

    expect(result.actualAccuracyRate).toBe(100);
    expect(result.actualCritRate).toBe(100);
    expect(result.expectedDamage).toBe(Math.floor(result.finalDamage * 1.5));
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

  test('evaluates rich combat matchup golden values', async ({ page }) => {
    const result = await page.evaluate(() => {
      const atk1 = { attack: 48200, elementalAttack: 9200, defenseBreak: 12500, shieldBreak: 6800, pvpAttack: 3400, accuracy: 11800, crit: 8600, critDamage: 220, extraCritRate: 12, pvpAttackRate: 9, elementalBreak: 2100, skillAttack: 800 };
      const atk2 = { attack: 51500, elementalAttack: 7600, defenseBreak: 14800, shieldBreak: 3600, pvpAttack: 1200, accuracy: 9800, crit: 11200, critDamage: 185, extraCritRate: 7, pvpAttackRate: 14, elementalBreak: 4800, skillAttack: 500 };
      const def1 = { defense: 24500, airShield: 4200, elementalResistance: 3800, pvpResistance: 2200, blockResistance: 1800, criticalResistance: 1400, criticalDefense: 26, skillResistance: 950 };
      const def2 = { defense: 31000, airShield: 8500, elementalResistance: 5400, pvpResistance: 3600, blockResistance: 5200, criticalResistance: 4300, criticalDefense: 18, skillResistance: 1600 };
      const calc = (atk, def) => window.pvpCombat.calculateCombatStats({ ...atk, ...def });
      return {
        '11': calc(atk1, def1),
        '21': calc(atk2, def1),
        '12': calc(atk1, def2),
        '22': calc(atk2, def2)
      };
    });

    expect(Math.floor(result['11'].finalDamage)).toBe(150565);
    expect(result['11'].expectedDamage).toBe(430700);
    expect(Math.floor(result['21'].finalDamage)).toBe(174279);
    expect(result['21'].expectedDamage).toBe(444151);
    expect(Math.floor(result['12'].finalDamage)).toBe(115271);
    expect(result['12'].expectedDamage).toBe(308441);
    expect(Math.floor(result['22'].finalDamage)).toBe(132372);
    expect(result['22'].expectedDamage).toBe(331170);
  });

  // decomposeDamage must echo calculateCombatStats' 9 fields exactly (guard against drift),
  // and its cascade/breakdown audit sums must hold across normal + edge cases.
  test('decomposeDamage echoes calculateCombatStats and audits clean', async ({ page }) => {
    const result = await page.evaluate(() => {
      const combat = window.pvpCombat;
      const keys = ['remainDefense', 'defenseRate', 'remainShield', 'elementalResisRate', 'actualAccuracyRate', 'actualCritRate', 'baseDamage', 'finalDamage', 'expectedDamage'];
      const zero = { attack:0,elementalAttack:0,defenseBreak:0,shieldBreak:0,pvpAttack:0,accuracy:0,crit:0,critDamage:0,extraCritRate:0,pvpAttackRate:0,elementalBreak:0,skillAttack:0,defense:0,airShield:0,elementalResistance:0,pvpResistance:0,blockResistance:0,criticalResistance:0,criticalDefense:0,skillResistance:0 };
      const typical = { ...zero, attack:20000, defenseBreak:5000, defense:15000, critDamage:150 };
      const rich = { ...zero, attack:48200, defenseBreak:12500, shieldBreak:6800, elementalAttack:9200, pvpAttack:3400, accuracy:11800, crit:8600, critDamage:220, pvpAttackRate:12, elementalBreak:2100, skillAttack:8, defense:24500, airShield:4200, elementalResistance:3800, pvpResistance:2200, blockResistance:1800, skillResistance:950, criticalDefense:2600, criticalResistance:1400 };
      const pvpRateOnly = { ...zero, pvpAttackRate:15 };
      // edge: heavy reductions that would push baseDamage negative before clamp
      const heavyReductions = { ...zero, attack:10000, defense:50000, defenseBreak:2000, airShield:5000, shieldBreak:1000, elementalAttack:3000, elementalResistance:4000, pvpResistance:8000, skillResistance:8000, criticalDefense:5000, critDamage:50 };

      function check(stats) {
        const a = combat.calculateCombatStats(stats);
        const b = combat.decomposeDamage(stats);
        const nineMatch = keys.every(k => Object.is(a[k], b[k]));
        const gl = b.cascade.grossLayers;
        let monotonic = true;
        for (let i = 1; i < gl.length; i++) { if (!(gl[i].value <= gl[i - 1].value + 1e-9)) monotonic = false; }
        const bd = b.breakdown;
        const audits = {
          nineMatch,
          finalMatch: Object.is(a.finalDamage, b.finalDamage),
          expectedMatch: Object.is(a.expectedDamage, b.expectedDamage),
          cascadeMonotonic: monotonic,
          lastLayerIsFinal: Math.abs(gl[gl.length - 1].value - a.finalDamage) < 1e-9,
          sourcesEqGross: Math.abs(bd.sourcesSum - bd.gross) < 1e-6,
          baseReconstruct: Math.abs(bd.sourcesSum + bd.reductionsSum - a.baseDamage) < 1e-6,
          expReconstruct: Math.abs(bd.finalDamage + bd.expectationSum - a.expectedDamage) < 1e-6,
          noNaN: [
            b.cascade.gross,
            b.cascade.finalDamage,
            b.cascade.expectedDamage,
            bd.sourcesSum,
            bd.reductionsSum,
            bd.adjustmentsSum,
            bd.expectationSum,
            ...b.cascade.grossLayers.flatMap(l => [l.value, l.reduced, l.reductionRate]),
            ...b.cascade.expectLayers.flatMap(l => [l.value, l.reduced, l.reductionRate]),
            ...bd.sources.map(c => c.amount),
            ...bd.reductions.map(c => c.amount),
            ...bd.adjustments.map(c => c.amount),
            ...bd.expectation.map(c => c.amount)
          ].every(v => Number.isFinite(v))
        };
        return audits;
      }
      return { zero: check(zero), typical: check(typical), rich: check(rich), pvpRateOnly: check(pvpRateOnly), heavyReductions: check(heavyReductions) };
    });

    const cases = ['zero', 'typical', 'rich', 'pvpRateOnly', 'heavyReductions'];
    for (const c of cases) {
      const a = result[c];
      expect(a.nineMatch, `${c} nineMatch`).toBe(true);
      expect(a.finalMatch, `${c} finalMatch`).toBe(true);
      expect(a.expectedMatch, `${c} expectedMatch`).toBe(true);
      expect(a.cascadeMonotonic, `${c} cascadeMonotonic`).toBe(true);
      expect(a.lastLayerIsFinal, `${c} lastLayerIsFinal`).toBe(true);
      expect(a.sourcesEqGross, `${c} sourcesEqGross`).toBe(true);
      expect(a.baseReconstruct, `${c} baseReconstruct`).toBe(true);
      expect(a.expReconstruct, `${c} expReconstruct`).toBe(true);
      expect(a.noNaN, `${c} noNaN`).toBe(true);
    }
  });

  test('decomposeDamage flags signed net-source cases instead of forcing a misleading waterfall', async ({ page }) => {
    const result = await page.evaluate(() => {
      const zero = { attack:0,elementalAttack:0,defenseBreak:0,shieldBreak:0,pvpAttack:0,accuracy:0,crit:0,critDamage:0,extraCritRate:0,pvpAttackRate:0,elementalBreak:0,skillAttack:0,defense:0,airShield:0,elementalResistance:0,pvpResistance:0,blockResistance:0,criticalResistance:0,criticalDefense:0,skillResistance:0 };
      const stats = { ...zero, pvpResistance: 46745, elementalAttack: 28106 };
      const d = window.pvpCombat.decomposeDamage(stats);
      return {
        gross: d.cascade.gross,
        finalDamage: d.finalDamage,
        signed: d.cascade.signed,
        mode: d.cascade.mode,
        note: d.cascade.note,
        hasPositiveReduction: d.breakdown.reductions.some(item => item.amount > 0),
        netReconstructsBase: Math.abs(d.breakdown.sourcesSum + d.breakdown.reductionsSum - d.baseDamage) < 1e-6,
        finalReconstructs: Math.abs(d.breakdown.baseDamage + d.breakdown.adjustmentsSum - d.finalDamage) < 1e-6
      };
    });

    expect(result.gross).toBeLessThan(0);
    expect(result.finalDamage).toBeGreaterThan(0);
    expect(result.signed).toBe(true);
    expect(result.mode).toBe('signed-breakdown');
    expect(result.note).toContain('負向');
    expect(result.hasPositiveReduction).toBe(false);
    expect(result.netReconstructsBase).toBe(true);
    expect(result.finalReconstructs).toBe(true);
  });
});
