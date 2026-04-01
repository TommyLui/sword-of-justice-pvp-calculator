function initCalculator() {
    if (window.__calculatorInitialized) return;
    window.__calculatorInitialized = true;

    const notify = (options) => {
        if (window.showNotification) {
            window.showNotification(options);
        } else {
            alert(options.title + ': ' + options.message);
        }
    };

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

    function applyCompareValueClass(element, value) {
        element.classList.remove('positive', 'negative');
        if (value > 0) element.classList.add('positive');
        else if (value < 0) element.classList.add('negative');
    }

    function calculateResults() {
        const atk1Attack = parseInt(document.getElementById('atk1-attack').value) || 0;
        const atk1ElementalAttack = parseInt(document.getElementById('atk1-elementalAttack').value) || 0;
        const atk1DefenseBreak = parseInt(document.getElementById('atk1-defenseBreak').value) || 0;
        const atk1ShieldBreak = parseInt(document.getElementById('atk1-shieldBreak').value) || 0;
        const atk1PvpAttack = parseInt(document.getElementById('atk1-pvpAttack').value) || 0;
        const atk1Accuracy = parseInt(document.getElementById('atk1-accuracy').value) || 0;
        const atk1Crit = parseInt(document.getElementById('atk1-crit').value) || 0;
        const atk1CritDamage = parseInt(document.getElementById('atk1-critDamage').value) || 0;
        const atk1ExtraCritRate = parseInt(document.getElementById('atk1-extraCritRate').value) || 0;
        const atk1PvpAttackRate = parseInt(document.getElementById('atk1-pvpAttackRate').value) || 0;
        const atk1ElementalBreak = parseInt(document.getElementById('atk1-elementalBreak').value) || 0;
        const atk1SkillAttack = parseInt(document.getElementById('atk1-skillAttack').value) || 0;
        const atk2Attack = parseInt(document.getElementById('atk2-attack').value) || 0;
        const atk2ElementalAttack = parseInt(document.getElementById('atk2-elementalAttack').value) || 0;
        const atk2DefenseBreak = parseInt(document.getElementById('atk2-defenseBreak').value) || 0;
        const atk2ShieldBreak = parseInt(document.getElementById('atk2-shieldBreak').value) || 0;
        const atk2PvpAttack = parseInt(document.getElementById('atk2-pvpAttack').value) || 0;
        const atk2Accuracy = parseInt(document.getElementById('atk2-accuracy').value) || 0;
        const atk2Crit = parseInt(document.getElementById('atk2-crit').value) || 0;
        const atk2CritDamage = parseInt(document.getElementById('atk2-critDamage').value) || 0;
        const atk2ExtraCritRate = parseInt(document.getElementById('atk2-extraCritRate').value) || 0;
        const atk2PvpAttackRate = parseInt(document.getElementById('atk2-pvpAttackRate').value) || 0;
        const atk2ElementalBreak = parseInt(document.getElementById('atk2-elementalBreak').value) || 0;
        const atk2SkillAttack = parseInt(document.getElementById('atk2-skillAttack').value) || 0;
        const def1Defense = parseInt(document.getElementById('def1-defense').value) || 0;
        const def1AirShield = parseInt(document.getElementById('def1-airShield').value) || 0;
        const def1ElementalResistance = parseInt(document.getElementById('def1-elementalResistance').value) || 0;
        const def1PvpResistance = parseInt(document.getElementById('def1-pvpResistance').value) || 0;
        const def1BlockResistance = parseInt(document.getElementById('def1-blockResistance').value) || 0;
        const def1CriticalResistance = parseInt(document.getElementById('def1-criticalResistance').value) || 0;
        const def1CriticalDefense = parseInt(document.getElementById('def1-criticalDefense').value) || 0;
        const def1SkillResistance = parseInt(document.getElementById('def1-skillResistance').value) || 0;
        const def2Defense = parseInt(document.getElementById('def2-defense').value) || 0;
        const def2AirShield = parseInt(document.getElementById('def2-airShield').value) || 0;
        const def2ElementalResistance = parseInt(document.getElementById('def2-elementalResistance').value) || 0;
        const def2PvpResistance = parseInt(document.getElementById('def2-pvpResistance').value) || 0;
        const def2BlockResistance = parseInt(document.getElementById('def2-blockResistance').value) || 0;
        const def2CriticalResistance = parseInt(document.getElementById('def2-criticalResistance').value) || 0;
        const def2CriticalDefense = parseInt(document.getElementById('def2-criticalDefense').value) || 0;
        const def2SkillResistance = parseInt(document.getElementById('def2-skillResistance').value) || 0;

        const remainDefense1_1 = calculateRemainDefense(def1Defense, atk1DefenseBreak);
        const defenseRate1_1 = calculateDefenseRate(remainDefense1_1);
        const defenseRate1_1Display = defenseRate1_1.toFixed(2) + '%';
        const remainShield1_1 = calculateRemainShield(atk1ShieldBreak, def1AirShield);
        const elementalResisRate1_1 = calculateElementalResisRate(def1ElementalResistance, atk1ElementalBreak);
        const elementalResisRate1_1Display = elementalResisRate1_1.toFixed(2) + '%';
        const actualAccuracyRate1_1 = calculateActualAccuracyRate(atk1Accuracy, def1BlockResistance);
        const actualAccuracyRate1_1Display = actualAccuracyRate1_1.toFixed(2) + '%';
        const actualCritRate1_1 = calculateActualCritRate(atk1Crit, atk1ExtraCritRate, def1CriticalResistance);
        const actualCritRate1_1Display = actualCritRate1_1.toFixed(2) + '%';
        const remainDefense1_2 = calculateRemainDefense(def1Defense, atk2DefenseBreak);
        const defenseRate1_2 = calculateDefenseRate(remainDefense1_2);
        const defenseRate1_2Display = defenseRate1_2.toFixed(2) + '%';
        const remainShield1_2 = calculateRemainShield(atk2ShieldBreak, def1AirShield);
        const elementalResisRate1_2 = calculateElementalResisRate(def1ElementalResistance, atk2ElementalBreak);
        const elementalResisRate1_2Display = elementalResisRate1_2.toFixed(2) + '%';
        const actualAccuracyRate1_2 = calculateActualAccuracyRate(atk2Accuracy, def1BlockResistance);
        const actualAccuracyRate1_2Display = actualAccuracyRate1_2.toFixed(2) + '%';
        const actualCritRate1_2 = calculateActualCritRate(atk2Crit, atk2ExtraCritRate, def1CriticalResistance);
        const actualCritRate1_2Display = actualCritRate1_2.toFixed(2) + '%';
        const remainDefense2_1 = calculateRemainDefense(def2Defense, atk1DefenseBreak);
        const defenseRate2_1 = calculateDefenseRate(remainDefense2_1);
        const defenseRate2_1Display = defenseRate2_1.toFixed(2) + '%';
        const remainShield2_1 = calculateRemainShield(atk1ShieldBreak, def2AirShield);
        const elementalResisRate2_1 = calculateElementalResisRate(def2ElementalResistance, atk1ElementalBreak);
        const elementalResisRate2_1Display = elementalResisRate2_1.toFixed(2) + '%';
        const actualAccuracyRate2_1 = calculateActualAccuracyRate(atk1Accuracy, def2BlockResistance);
        const actualAccuracyRate2_1Display = actualAccuracyRate2_1.toFixed(2) + '%';
        const actualCritRate2_1 = calculateActualCritRate(atk1Crit, atk1ExtraCritRate, def2CriticalResistance);
        const actualCritRate2_1Display = actualCritRate2_1.toFixed(2) + '%';
        const remainDefense2_2 = calculateRemainDefense(def2Defense, atk2DefenseBreak);
        const defenseRate2_2 = calculateDefenseRate(remainDefense2_2);
        const defenseRate2_2Display = defenseRate2_2.toFixed(2) + '%';
        const remainShield2_2 = calculateRemainShield(atk2ShieldBreak, def2AirShield);
        const elementalResisRate2_2 = calculateElementalResisRate(def2ElementalResistance, atk2ElementalBreak);
        const elementalResisRate2_2Display = elementalResisRate2_2.toFixed(2) + '%';
        const actualAccuracyRate2_2 = calculateActualAccuracyRate(atk2Accuracy, def2BlockResistance);
        const actualAccuracyRate2_2Display = actualAccuracyRate2_2.toFixed(2) + '%';
        const actualCritRate2_2 = calculateActualCritRate(atk2Crit, atk2ExtraCritRate, def2CriticalResistance);
        const actualCritRate2_2Display = actualCritRate2_2.toFixed(2) + '%';

        document.getElementById('damage1_1').textContent = 0;
        document.getElementById('damage1_2').textContent = 0;
        document.getElementById('damage2_1').textContent = 0;
        document.getElementById('damage2_2').textContent = 0;
        const skillBase = 58000;
        const skillMultiplier = 3.38;
        const baseDamage1_1 = ((skillBase + skillMultiplier * (atk1Attack + atk1PvpAttack + atk1SkillAttack - def1PvpResistance - remainShield1_1 - def1SkillResistance)) * (1 - defenseRate1_1 / 100) + (atk1ElementalAttack * skillMultiplier * (1 - elementalResisRate1_1 / 100))) * (1 + atk1PvpAttackRate / 100);
        const finalDamage1_1 = Math.max(0, baseDamage1_1);
        document.getElementById('damage1_1').textContent = Math.floor(finalDamage1_1);
        const baseDamage1_2 = ((skillBase + skillMultiplier * (atk2Attack + atk2PvpAttack + atk2SkillAttack - def1PvpResistance - remainShield1_2 - def1SkillResistance)) * (1 - defenseRate1_2 / 100) + (atk2ElementalAttack * skillMultiplier * (1 - elementalResisRate1_2 / 100))) * (1 + atk2PvpAttackRate / 100);
        const finalDamage1_2 = Math.max(0, baseDamage1_2);
        document.getElementById('damage1_2').textContent = Math.floor(finalDamage1_2);
        const baseDamage2_1 = ((skillBase + skillMultiplier * (atk1Attack + atk1PvpAttack + atk1SkillAttack - def2PvpResistance - remainShield2_1 - def2SkillResistance)) * (1 - defenseRate2_1 / 100) + (atk1ElementalAttack * skillMultiplier * (1 - elementalResisRate2_1 / 100))) * (1 + atk1PvpAttackRate / 100);
        const finalDamage2_1 = Math.max(0, baseDamage2_1);
        document.getElementById('damage2_1').textContent = Math.floor(finalDamage2_1);
        const baseDamage2_2 = ((skillBase + skillMultiplier * (atk2Attack + atk2PvpAttack + atk2SkillAttack - def2PvpResistance - remainShield2_2 - def2SkillResistance)) * (1 - defenseRate2_2 / 100) + (atk2ElementalAttack * skillMultiplier * (1 - elementalResisRate2_2 / 100))) * (1 + atk2PvpAttackRate / 100);
        const finalDamage2_2 = Math.max(0, baseDamage2_2);
        document.getElementById('damage2_2').textContent = Math.floor(finalDamage2_2);
        const critDamage1_1 = Math.floor(finalDamage1_1 * (actualAccuracyRate1_1 / 100) * (1 + (actualCritRate1_1 / 100) * ((atk1CritDamage / 100) - def1CriticalDefense / 100)) + finalDamage1_1 * (1 - (actualAccuracyRate1_1 / 100)) * 0.5);
        document.getElementById('critDamage1_1').textContent = critDamage1_1;
        const critDamage1_2 = Math.floor(finalDamage1_2 * (actualAccuracyRate1_2 / 100) * (1 + (actualCritRate1_2 / 100) * ((atk2CritDamage / 100) - def1CriticalDefense / 100)) + finalDamage1_2 * (1 - (actualAccuracyRate1_2 / 100)) * 0.5);
        document.getElementById('critDamage1_2').textContent = critDamage1_2;
        const critDamage2_1 = Math.floor(finalDamage2_1 * (actualAccuracyRate2_1 / 100) * (1 + (actualCritRate2_1 / 100) * ((atk1CritDamage / 100) - def2CriticalDefense / 100)) + finalDamage2_1 * (1 - (actualAccuracyRate2_1 / 100)) * 0.5);
        document.getElementById('critDamage2_1').textContent = critDamage2_1;
        const critDamage2_2 = Math.floor(finalDamage2_2 * (actualAccuracyRate2_2 / 100) * (1 + (actualCritRate2_2 / 100) * ((atk2CritDamage / 100) - def2CriticalDefense / 100)) + finalDamage2_2 * (1 - (actualAccuracyRate2_2 / 100)) * 0.5);
        document.getElementById('critDamage2_2').textContent = critDamage2_2;
        const critCompare1 = critDamage1_1 !== 0 ? ((critDamage1_2 - critDamage1_1) / critDamage1_1 * 100) : 0;
        const critCompare2 = critDamage2_1 !== 0 ? ((critDamage2_2 - critDamage2_1) / critDamage2_1 * 100) : 0;
        const critCompare1Element = document.getElementById('critCompare1');
        const critCompare2Element = document.getElementById('critCompare2');
        critCompare1Element.textContent = critCompare1.toFixed(2) + '%';
        critCompare2Element.textContent = critCompare2.toFixed(2) + '%';
        applyCompareValueClass(critCompare1Element, critCompare1);
        applyCompareValueClass(critCompare2Element, critCompare2);
        document.getElementById('remainDefense1_1').textContent = remainDefense1_1;
        document.getElementById('defenseRate1_1').textContent = defenseRate1_1Display;
        document.getElementById('remainShield1_1').textContent = remainShield1_1;
        document.getElementById('elementalResisRate1_1').textContent = elementalResisRate1_1Display;
        document.getElementById('actualAccuracyRate1_1').textContent = actualAccuracyRate1_1Display;
        document.getElementById('actualCritRate1_1').textContent = actualCritRate1_1Display;
        document.getElementById('remainDefense1_2').textContent = remainDefense1_2;
        document.getElementById('defenseRate1_2').textContent = defenseRate1_2Display;
        document.getElementById('remainShield1_2').textContent = remainShield1_2;
        document.getElementById('elementalResisRate1_2').textContent = elementalResisRate1_2Display;
        document.getElementById('actualAccuracyRate1_2').textContent = actualAccuracyRate1_2Display;
        document.getElementById('actualCritRate1_2').textContent = actualCritRate1_2Display;
        document.getElementById('remainDefense2_1').textContent = remainDefense2_1;
        document.getElementById('defenseRate2_1').textContent = defenseRate2_1Display;
        document.getElementById('remainShield2_1').textContent = remainShield2_1;
        document.getElementById('elementalResisRate2_1').textContent = elementalResisRate2_1Display;
        document.getElementById('actualAccuracyRate2_1').textContent = actualAccuracyRate2_1Display;
        document.getElementById('actualCritRate2_1').textContent = actualCritRate2_1Display;
        document.getElementById('remainDefense2_2').textContent = remainDefense2_2;
        document.getElementById('defenseRate2_2').textContent = defenseRate2_2Display;
        document.getElementById('remainShield2_2').textContent = remainShield2_2;
        document.getElementById('elementalResisRate2_2').textContent = elementalResisRate2_2Display;
        document.getElementById('actualAccuracyRate2_2').textContent = actualAccuracyRate2_2Display;
        document.getElementById('actualCritRate2_2').textContent = actualCritRate2_2Display;
        document.querySelectorAll('#results span[id]').forEach(element => localStorage.setItem(`result-${element.id}`, element.textContent));
    }

    const inputs = document.querySelectorAll('#view-calculator input[type="number"]');
    inputs.forEach(input => {
        const saved = localStorage.getItem(input.id);
        if (saved !== null) input.value = saved;
        input.addEventListener('input', () => {
            localStorage.setItem(input.id, input.value);
            calculateResults();
        });
    });

    document.querySelectorAll('#results span[id]').forEach(element => {
        const saved = localStorage.getItem(`result-${element.id}`);
        if (saved !== null) element.textContent = saved;
    });

    document.getElementById('copy-left-atk-btn')?.addEventListener('click', () => {
        const properties = ['attack', 'elementalAttack', 'defenseBreak', 'shieldBreak', 'pvpAttack', 'accuracy', 'crit', 'critDamage', 'extraCritRate', 'pvpAttackRate', 'elementalBreak', 'skillAttack'];
        properties.forEach(prop => {
            const val = document.getElementById(`atk1-${prop}`).value;
            document.getElementById(`atk2-${prop}`).value = val;
            localStorage.setItem(`atk2-${prop}`, val);
        });
        calculateResults();
    });
    document.getElementById('copy-right-atk-btn')?.addEventListener('click', () => {
        const properties = ['attack', 'elementalAttack', 'defenseBreak', 'shieldBreak', 'pvpAttack', 'accuracy', 'crit', 'critDamage', 'extraCritRate', 'pvpAttackRate', 'elementalBreak', 'skillAttack'];
        properties.forEach(prop => {
            const val = document.getElementById(`atk2-${prop}`).value;
            document.getElementById(`atk1-${prop}`).value = val;
            localStorage.setItem(`atk1-${prop}`, val);
        });
        calculateResults();
    });
    document.getElementById('copy-left-def-btn')?.addEventListener('click', () => {
        const properties = ['defense', 'airShield', 'elementalResistance', 'pvpResistance', 'blockResistance', 'criticalResistance', 'criticalDefense', 'skillResistance'];
        properties.forEach(prop => {
            const val = document.getElementById(`def1-${prop}`).value;
            document.getElementById(`def2-${prop}`).value = val;
            localStorage.setItem(`def2-${prop}`, val);
        });
        calculateResults();
    });
    document.getElementById('copy-right-def-btn')?.addEventListener('click', () => {
        const properties = ['defense', 'airShield', 'elementalResistance', 'pvpResistance', 'blockResistance', 'criticalResistance', 'criticalDefense', 'skillResistance'];
        properties.forEach(prop => {
            const val = document.getElementById(`def2-${prop}`).value;
            document.getElementById(`def1-${prop}`).value = val;
            localStorage.setItem(`def1-${prop}`, val);
        });
        calculateResults();
    });

    document.getElementById('export-btn')?.addEventListener('click', () => {
        const readGroup = (prefix, keys) => Object.fromEntries(keys.map(key => [key, document.getElementById(`${prefix}${key}`).value]));
        const atkKeys = ['attack', 'elementalAttack', 'defenseBreak', 'shieldBreak', 'pvpAttack', 'accuracy', 'crit', 'critDamage', 'extraCritRate', 'pvpAttackRate', 'elementalBreak', 'skillAttack'];
        const defKeys = ['defense', 'airShield', 'elementalResistance', 'pvpResistance', 'blockResistance', 'criticalResistance', 'criticalDefense', 'skillResistance'];
        const exportData = { attack1: readGroup('atk1-', atkKeys), attack2: readGroup('atk2-', atkKeys), defense1: readGroup('def1-', defKeys), defense2: readGroup('def2-', defKeys) };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pvp-calculator-data-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify({
            type: 'success',
            title: '匯出成功',
            message: `數據已保存為 ${a.download}`,
            duration: 3000
        });
    });

    document.getElementById('import-btn')?.addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file')?.addEventListener('change', event => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                [['attack1', 'atk1-'], ['attack2', 'atk2-'], ['defense1', 'def1-'], ['defense2', 'def2-']].forEach(([group, prefix]) => {
                    if (data[group]) Object.keys(data[group]).forEach(key => { const element = document.getElementById(`${prefix}${key}`); if (element) { element.value = data[group][key]; localStorage.setItem(`${prefix}${key}`, data[group][key]); } });
                });
                calculateResults();
                notify({
                    type: 'success',
                    title: '匯入成功',
                    message: '數據已成功匯入計算器',
                    duration: 3000
                });
            } catch (error) {
                notify({
                    type: 'error',
                    title: '匯入失敗',
                    message: error.message,
                    duration: 5000
                });
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });

    calculateResults();
}
