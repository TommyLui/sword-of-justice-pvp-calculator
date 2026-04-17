(function initPvpCombatFormulas() {
    if (window.pvpCombat) return;

    const SKILL_BASE = 58000;
    const SKILL_MULTIPLIER = 3.38;

    function toInt(value) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? n : 0;
    }

    function calculateRemainDefense(defense, defenseBreak) {
        return Math.max(0, defense - defenseBreak);
    }

    function calculateDefenseRate(remainDefense) {
        return Math.max(10, ((remainDefense / (remainDefense + 19032)) * 100) + 10);
    }

    function calculateRemainShield(shieldBreak, airShield) {
        if (shieldBreak >= airShield) return 0;
        if (shieldBreak >= airShield / 3) return 0.5 * (airShield - shieldBreak);
        return airShield - 2 * shieldBreak;
    }

    function calculateElementalResisRate(elementalResistance, elementalBreak) {
        const diff = Math.max(0, elementalResistance - elementalBreak);
        return (diff / (diff + 4762)) * 100;
    }

    function calculateActualAccuracyRate(accuracy, blockResistance) {
        const diff = Math.max(0, accuracy - blockResistance);
        return Math.min(((143 * diff) / (diff + 10688) + 95) / 100, 1) * 100;
    }

    function calculateActualCritRate(crit, extraCritRate, criticalResistance) {
        const diff = Math.max(0, crit - criticalResistance);
        const baseRate = Math.max(0, (115 * diff - 200) / (diff + 2666) / 100);
        return Math.min(baseRate + (extraCritRate / 100), 1) * 100;
    }

    function calculateCombatStats(stats) {
        const remainDefense = calculateRemainDefense(stats.defense, stats.defenseBreak);
        const defenseRate = calculateDefenseRate(remainDefense);
        const remainShield = calculateRemainShield(stats.shieldBreak, stats.airShield);
        const elementalResisRate = calculateElementalResisRate(stats.elementalResistance, stats.elementalBreak);
        const actualAccuracyRate = calculateActualAccuracyRate(stats.accuracy, stats.blockResistance);
        const actualCritRate = calculateActualCritRate(stats.crit, stats.extraCritRate, stats.criticalResistance);
        const baseDamage = ((SKILL_BASE + SKILL_MULTIPLIER * (stats.attack + stats.pvpAttack + stats.skillAttack - stats.pvpResistance - remainShield - stats.skillResistance)) * (1 - defenseRate / 100) + (stats.elementalAttack * SKILL_MULTIPLIER * (1 - elementalResisRate / 100))) * (1 + stats.pvpAttackRate / 100);
        const finalDamage = Math.max(0, baseDamage);
        const critBonus = (stats.critDamage / 100) - (stats.criticalDefense / 100);
        const expectedDamage = Math.floor(finalDamage * (actualAccuracyRate / 100) * (1 + (actualCritRate / 100) * critBonus) + finalDamage * (1 - (actualAccuracyRate / 100)) * 0.5);

        return {
            remainDefense,
            defenseRate,
            remainShield,
            elementalResisRate,
            actualAccuracyRate,
            actualCritRate,
            baseDamage,
            finalDamage,
            expectedDamage
        };
    }

    window.pvpCombat = {
        SKILL_BASE,
        SKILL_MULTIPLIER,
        toInt,
        calculateRemainDefense,
        calculateDefenseRate,
        calculateRemainShield,
        calculateElementalResisRate,
        calculateActualAccuracyRate,
        calculateActualCritRate,
        calculateCombatStats
    };
})();
