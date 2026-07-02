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
        const rate = ((remainDefense / (remainDefense + 19032)) * 100) + 10;
        return Math.max(10, Math.min(rate, 100));
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
        const diff = accuracy - blockResistance;
        const denominator = diff + 10688;
        if (denominator <= 0) return 0;
        const rate = (((143 * diff) / denominator + 95) / 100) * 100;
        if (!Number.isFinite(rate)) return 0;
        return Math.max(0, Math.min(rate, 100));
    }

    function calculateActualCritRate(crit, extraCritRate, criticalResistance) {
        const diff = Math.max(0, crit - criticalResistance);
        const baseRate = Math.max(0, (115 * diff - 200) / (diff + 2666) / 100);
        return Math.min(baseRate + (extraCritRate / 100), 1) * 100;
    }

    function toSafeDamageFloor(value) {
        return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
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
        const critBonus = Math.max((stats.critDamage / 100) - (stats.criticalDefense / 100), 0.5);
        const expectedDamageRaw = finalDamage * (actualAccuracyRate / 100) * (1 + (actualCritRate / 100) * critBonus) + finalDamage * (1 - (actualAccuracyRate / 100)) * 0.5;
        const expectedDamage = toSafeDamageFloor(expectedDamageRaw);

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

    /**
     * 傷害分解：不改變 calculateCombatStats 的任何輸出，只把其內部計算的中間值
     * 拆成「逐層削減瀑布」與「來源/減免貢獻」兩組可視化資料。所有中間值與
     * calculateCombatStats 共用同一條計算鏈，確保 finalDamage / expectedDamage 一致。
     *
     * 級聯(cascade)分兩段：第一段「原始 → finalDamage」記錄防禦/氣盾/元抗等確定
     * 減免造成的單調遞減；第二段「finalDamage → expectedDamage」記錄命中/格擋與會心
     * 造成的期望修正。每層的 value 為「該層之後」的傷害，reduced 為該層實際削減量。
     *
     * @returns {Object} 既有 9 欄 + cascade + breakdown
     */
    function decomposeDamage(stats) {
        // ---- 共用同一條中間計算（與 calculateCombatStats 完全相同）----
        const remainDefense = calculateRemainDefense(stats.defense, stats.defenseBreak);
        const defenseRate = calculateDefenseRate(remainDefense);
        const remainShield = calculateRemainShield(stats.shieldBreak, stats.airShield);
        const elementalResisRate = calculateElementalResisRate(stats.elementalResistance, stats.elementalBreak);
        const actualAccuracyRate = calculateActualAccuracyRate(stats.accuracy, stats.blockResistance);
        const actualCritRate = calculateActualCritRate(stats.crit, stats.extraCritRate, stats.criticalResistance);

        // baseDamage 公式（與 calculateCombatStats 逐字相同）：
        //   ((SKILL_BASE + SKILL_MULTIPLIER * (atk + pvpAtk + skillAtk - pvpResis - remainShield - skillResis))
        //    * (1 - defenseRate/100) + (elemAtk * SKILL_MULTIPLIER * (1 - elementalResisRate/100)))
        //   * (1 + pvpAttackRate/100)
        const pvpRateMul = 1 + stats.pvpAttackRate / 100;
        const physicalTermRaw = SKILL_BASE + SKILL_MULTIPLIER * (stats.attack + stats.pvpAttack + stats.skillAttack - stats.pvpResistance - remainShield - stats.skillResistance);
        const physicalTermAfterDefense = physicalTermRaw * (1 - defenseRate / 100);
        const elementalTermRaw = stats.elementalAttack * SKILL_MULTIPLIER;
        const elementalTermAfterResis = elementalTermRaw * (1 - elementalResisRate / 100);
        const baseDamage = (physicalTermAfterDefense + elementalTermAfterResis) * pvpRateMul;
        const finalDamage = Math.max(0, baseDamage);
        const critBonus = Math.max((stats.critDamage / 100) - (stats.criticalDefense / 100), 0.5);
        const expectedDamageRaw = finalDamage * (actualAccuracyRate / 100) * (1 + (actualCritRate / 100) * critBonus) + finalDamage * (1 - (actualAccuracyRate / 100)) * 0.5;
        const expectedDamage = toSafeDamageFloor(expectedDamageRaw);

        // ---- cascade：逐層削減瀑布（嚴格單調遞減）----
        // gross = 防禦前傷害（已扣氣盾/技能抵禦/流派抵禦、已含 pvpAttackRate）= (physicalTermRaw + elementalTermRaw) * pvpRateMul
        // 級聯只呈現「防禦 → 元抗 → clamp」三層對「傷害」的減免；氣盾/技能抵禦/流派抵禦屬於
        // 輸入前扣減，已體現在 physicalTermRaw 內，放在 breakdown.sources 細分（避免重複扣減）。
        const gross = (physicalTermRaw + elementalTermRaw) * pvpRateMul;
        const defenseCut = physicalTermRaw * (defenseRate / 100) * pvpRateMul;
        const elementalResisCut = (elementalTermRaw - elementalTermAfterResis) * pvpRateMul;
        const clampAdjustment = finalDamage - baseDamage;
        const isSignedBreakdown = gross < 0 || defenseCut < 0 || elementalResisCut < 0;

        const afterDefense = gross - defenseCut;
        const afterElementalResis = afterDefense - elementalResisCut; // = baseDamage（未 clamp）
        const afterClamp = finalDamage;

        function layer(id, label, value, prev) {
            const reduced = (prev == null ? 0 : Math.max(0, prev - value));
            return { id, label, value: Math.max(0, value), reduced, reductionRate: prev != null && prev > 0 ? (reduced / prev) * 100 : 0 };
        }

        const grossLayers = [];
        if (isSignedBreakdown) {
            grossLayers.push(layer('signedNet', '淨來源為負', Math.max(0, gross), null));
            grossLayers.push(layer('signedFinal', '公式修正後確定傷害', finalDamage, null));
        } else {
            grossLayers.push(layer('gross', '原始傷害', gross, null));
            grossLayers.push(layer('defense', '防禦減免', afterDefense, gross));
            grossLayers.push(layer('elemental', '元抗減免', afterElementalResis, afterDefense));
            grossLayers.push(layer('clamp', '下限保護', afterClamp, afterElementalResis));
        }
        const expectLayers = [];
        expectLayers.push(layer('finalDamage', '確定傷害', finalDamage, null));
        expectLayers.push(layer('hitBlock', '命中/格擋+會心期望', expectedDamage, finalDamage));

        // ---- breakdown：來源 + 減免 + 期望修正，可稽核總和 ----
        // gross = (physicalTermRaw + elementalTermRaw) * pvpRateMul（已扣輸入前減免、未扣防禦/元抗）
        // sources（正向，總和 = gross；各項為「已扣輸入前減免」的物理/元素原值，克制百分比加成單獨一支）
        const sources = [
            { id: 'skillBase', label: '技能基礎', amount: SKILL_BASE },
            { id: 'attack', label: '攻擊', amount: stats.attack * SKILL_MULTIPLIER },
            { id: 'elemental', label: '元素攻擊', amount: elementalTermRaw },
            { id: 'pvpAttack', label: '流派克制', amount: stats.pvpAttack * SKILL_MULTIPLIER },
            { id: 'skillAttack', label: '技能增強', amount: stats.skillAttack * SKILL_MULTIPLIER },
            { id: 'pvpResis', label: '流派抵禦（扣減）', amount: -stats.pvpResistance * SKILL_MULTIPLIER },
            { id: 'shield', label: '氣盾吸收（扣減）', amount: -remainShield * SKILL_MULTIPLIER },
            { id: 'skillResis', label: '技能抵禦（扣減）', amount: -stats.skillResistance * SKILL_MULTIPLIER },
            { id: 'pvpAttackRate', label: '克制百分比加成', amount: (physicalTermRaw + elementalTermRaw) * (pvpRateMul - 1) }
        ];
        if (defenseCut < 0) {
            sources.push({ id: 'signedDefense', label: '防禦負向修正', amount: -defenseCut });
        }
        if (elementalResisCut < 0) {
            sources.push({ id: 'signedElementalResis', label: '元抗負向修正', amount: -elementalResisCut });
        }
        // reductions（負向；sources 已含輸入前扣減，故此處只列防禦/元抗；sources + reductions = baseDamage）
        const reductions = [];
        if (defenseCut >= 0) reductions.push({ id: 'defense', label: '防禦減免', amount: -defenseCut });
        if (elementalResisCut >= 0) reductions.push({ id: 'elementalResis', label: '元抗減免', amount: -elementalResisCut });
        // adjustments：baseDamage → finalDamage。baseDamage 為負時，下限保護把可顯示傷害抬回 0。
        const adjustments = [
            { id: 'clamp', label: '下限保護', amount: clampAdjustment }
        ];
        // expectation：finalDamage → expectedDamage 的修正，拆為命中/格擋與會心兩支
        const hitMissFraction = 1 - (actualAccuracyRate / 100);
        const blockPenalty = finalDamage * hitMissFraction * (1 - 0.5); // 未命中走半傷，相對全命中少 0.5
        const critExpectedBonus = finalDamage * (actualAccuracyRate / 100) * (actualCritRate / 100) * critBonus;
        const expectation = [
            { id: 'hitBlock', label: '命中/格擋修正', amount: -blockPenalty },
            { id: 'crit', label: '會心期望', amount: critExpectedBonus },
            { id: 'floor', label: '取整修正', amount: expectedDamage - (finalDamage * (actualAccuracyRate / 100) * (1 + (actualCritRate / 100) * critBonus) + finalDamage * hitMissFraction * 0.5) }
        ];

        return {
            // 既有 9 欄（與 calculateCombatStats 完全相同）
            remainDefense, defenseRate, remainShield, elementalResisRate,
            actualAccuracyRate, actualCritRate, baseDamage, finalDamage, expectedDamage,
            // 逐層削減瀑布
            cascade: {
                grossLayers,
                expectLayers,
                gross,
                finalDamage,
                expectedDamage,
                signed: isSignedBreakdown,
                mode: isSignedBreakdown ? 'signed-breakdown' : 'waterfall',
                note: isSignedBreakdown ? '負向淨來源或負向修正情境，改以分解檢視呈現，避免誤讀為單調削減瀑布。' : '',
                grossLossRate: gross > 0 ? ((gross - finalDamage) / gross) * 100 : 0,
                expectLossRate: finalDamage > 0 ? ((finalDamage - expectedDamage) / finalDamage) * 100 : 0
            },
            // 來源/減免/期望分解
            breakdown: {
                sources,
                reductions,
                adjustments,
                expectation,
                sourcesSum: sources.reduce((s, c) => s + c.amount, 0),
                reductionsSum: reductions.reduce((s, c) => s + c.amount, 0),
                adjustmentsSum: adjustments.reduce((s, c) => s + c.amount, 0),
                expectationSum: expectation.reduce((s, c) => s + c.amount, 0),
                gross, baseDamage, finalDamage, expectedDamage
            }
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
        calculateCombatStats,
        decomposeDamage
    };
})();
