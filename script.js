function calculateResults() {
    // Helper functions
    function calculateRemainShield(shieldBreak, airShield) {
        if (shieldBreak >= airShield) return 0;
        else if (shieldBreak >= airShield / 3) return 0.5 * (airShield - shieldBreak);
        else return airShield - 2 * shieldBreak;
    }

    function calculateActualAccuracyRate(accuracy, blockResistance) {
        const diff = accuracy - blockResistance;
        const rate = Math.min((143 * diff) / (diff + 5950) / 100 + 0.95, 1);
        return (rate * 100).toFixed(2) + '%';
    }

    function calculateActualCritRate(crit, extraCritRate, criticalResistance) {
        const diff = crit - criticalResistance;
        let baseRate = 0;
        if (diff > 0) {
            baseRate = (115 * diff - 1230) / (diff + 1548) / 100;
        }
        const totalRate = baseRate + (extraCritRate / 100);
        return (totalRate * 100).toFixed(2) + '%';
    }

    // Get attacking items' total attack values (sum of all attack properties)
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

    // Calculate defense totals
    const def1Defense = parseInt(document.getElementById('def1-defense').value) || 0;
    const def1AirShield = parseInt(document.getElementById('def1-airShield').value) || 0;
    const def1ElementalResistance = parseInt(document.getElementById('def1-elementalResistance').value) || 0;
    const def1PvpResistance = parseInt(document.getElementById('def1-pvpResistance').value) || 0;
    const def1BlockResistance = parseInt(document.getElementById('def1-blockResistance').value) || 0;
    const def1CriticalResistance = parseInt(document.getElementById('def1-criticalResistance').value) || 0;
    const def1CriticalDefense = parseInt(document.getElementById('def1-criticalDefense').value) || 0;
    const def1SkillResistance = parseInt(document.getElementById('def1-skillResistance').value) || 0;
    const def1Total = def1Defense + def1AirShield + def1ElementalResistance + def1PvpResistance + def1BlockResistance + def1CriticalResistance + def1CriticalDefense + def1SkillResistance;

    const def2Defense = parseInt(document.getElementById('def2-defense').value) || 0;
    const def2AirShield = parseInt(document.getElementById('def2-airShield').value) || 0;
    const def2ElementalResistance = parseInt(document.getElementById('def2-elementalResistance').value) || 0;
    const def2PvpResistance = parseInt(document.getElementById('def2-pvpResistance').value) || 0;
    const def2BlockResistance = parseInt(document.getElementById('def2-blockResistance').value) || 0;
    const def2CriticalResistance = parseInt(document.getElementById('def2-criticalResistance').value) || 0;
    const def2CriticalDefense = parseInt(document.getElementById('def2-criticalDefense').value) || 0;
    const def2SkillResistance = parseInt(document.getElementById('def2-skillResistance').value) || 0;
    const def2Total = def2Defense + def2AirShield + def2ElementalResistance + def2PvpResistance + def2BlockResistance + def2CriticalResistance + def2CriticalDefense + def2SkillResistance;

    // Calculate sub1 properties for part1 (attack1 vs def1 and def2)
    // For part1 (def1 vs atk1 and atk2)
    // def1 Vs atk1
    const remainDefense1_1 = Math.max(0, def1Defense - atk1DefenseBreak);
    const defenseRate1_1 = ((remainDefense1_1 / (remainDefense1_1 + 10552)) * 100).toFixed(2);
    const remainShield1_1 = calculateRemainShield(atk1ShieldBreak, def1AirShield);
    const elementalResisRate1_1 = (((def1ElementalResistance - atk1ElementalBreak) / ((def1ElementalResistance - atk1ElementalBreak) + 1965)) * 100).toFixed(2) + '%';
    const actualAccuracyRate1_1 = calculateActualAccuracyRate(atk1Accuracy, def1BlockResistance);
    const actualCritRate1_1 = calculateActualCritRate(atk1Crit, atk1ExtraCritRate, def1CriticalResistance);

    // def1 Vs atk2
    const remainDefense1_2 = Math.max(0, def1Defense - atk2DefenseBreak);
    const defenseRate1_2 = ((remainDefense1_2 / (remainDefense1_2 + 10552)) * 100).toFixed(2);
    const remainShield1_2 = calculateRemainShield(atk2ShieldBreak, def1AirShield);
    const elementalResisRate1_2 = (((def1ElementalResistance - atk2ElementalBreak) / ((def1ElementalResistance - atk2ElementalBreak) + 1965)) * 100).toFixed(2) + '%';
    const actualAccuracyRate1_2 = calculateActualAccuracyRate(atk2Accuracy, def1BlockResistance);
    const actualCritRate1_2 = calculateActualCritRate(atk2Crit, atk2ExtraCritRate, def1CriticalResistance);

    // For part2 (def2 vs atk1 and atk2)
    // def2 Vs atk1
    const remainDefense2_1 = Math.max(0, def2Defense - atk1DefenseBreak);
    const defenseRate2_1 = ((remainDefense2_1 / (remainDefense2_1 + 10552)) * 100).toFixed(2);
    const remainShield2_1 = calculateRemainShield(atk1ShieldBreak, def2AirShield);
    const elementalResisRate2_1 = (((def2ElementalResistance - atk1ElementalBreak) / ((def2ElementalResistance - atk1ElementalBreak) + 1965)) * 100).toFixed(2) + '%';
    const actualAccuracyRate2_1 = calculateActualAccuracyRate(atk1Accuracy, def2BlockResistance);
    const actualCritRate2_1 = calculateActualCritRate(atk1Crit, atk1ExtraCritRate, def2CriticalResistance);

    // def2 Vs atk2
    const remainDefense2_2 = Math.max(0, def2Defense - atk2DefenseBreak);
    const defenseRate2_2 = ((remainDefense2_2 / (remainDefense2_2 + 10552)) * 100).toFixed(2);
    const remainShield2_2 = calculateRemainShield(atk2ShieldBreak, def2AirShield);
    const elementalResisRate2_2 = (((def2ElementalResistance - atk2ElementalBreak) / ((def2ElementalResistance - atk2ElementalBreak) + 1965)) * 100).toFixed(2) + '%';
    const actualAccuracyRate2_2 = calculateActualAccuracyRate(atk2Accuracy, def2BlockResistance);
    const actualCritRate2_2 = calculateActualCritRate(atk2Crit, atk2ExtraCritRate, def2CriticalResistance);
    document.getElementById('damage1_1').textContent = 0;
    document.getElementById('damage1_2').textContent = 0;
    document.getElementById('damage2_1').textContent = 0;
    document.getElementById('damage2_2').textContent = 0;

    // Calculate base damages using the provided formula
    const skillBase = 125000;
    const skillMultiplier = 7.37;
    // Attack 1 on Defense 1
    const baseDamage1_1 = ((skillBase + skillMultiplier * (atk1Attack + atk1PvpAttack + atk1SkillAttack - def1PvpResistance - remainShield1_1 - def1SkillResistance)) * (1 - parseFloat(defenseRate1_1) / 100)
        + (atk1ElementalAttack * skillMultiplier * (1 - parseFloat(elementalResisRate1_1) / 100)))
        * (1 + atk1PvpAttackRate / 100);
    const finalDamage1_1 = Math.max(0, baseDamage1_1);
    document.getElementById('damage1_1').textContent = Math.floor(finalDamage1_1);

    // Attack 2 on Defense 1
    const baseDamage1_2 = ((skillBase + skillMultiplier * (atk2Attack + atk2PvpAttack + atk2SkillAttack - def1PvpResistance - remainShield1_2 - def1SkillResistance)) * (1 - parseFloat(defenseRate1_2) / 100)
        + (atk2ElementalAttack * skillMultiplier * (1 - parseFloat(elementalResisRate1_2) / 100)))
        * (1 + atk2PvpAttackRate / 100);
    const finalDamage1_2 = Math.max(0, baseDamage1_2);
    document.getElementById('damage1_2').textContent = Math.floor(finalDamage1_2);

    // Attack 1 on Defense 2
    const baseDamage2_1 = ((skillBase + skillMultiplier * (atk1Attack + atk1PvpAttack + atk1SkillAttack - def2PvpResistance - remainShield2_1 - def2SkillResistance)) * (1 - parseFloat(defenseRate2_1) / 100)
        + (atk1ElementalAttack * skillMultiplier * (1 - parseFloat(elementalResisRate2_1) / 100)))
        * (1 + atk1PvpAttackRate / 100);
    const finalDamage2_1 = Math.max(0, baseDamage2_1);
    document.getElementById('damage2_1').textContent = Math.floor(finalDamage2_1);

    // Attack 2 on Defense 2
    const baseDamage2_2 = ((skillBase + skillMultiplier * (atk2Attack + atk2PvpAttack + atk2SkillAttack - def2PvpResistance - remainShield2_2 - def2SkillResistance)) * (1 - parseFloat(defenseRate2_2) / 100)
        + (atk2ElementalAttack * skillMultiplier * (1 - parseFloat(elementalResisRate2_2) / 100)))
        * (1 + atk2PvpAttackRate / 100);
    const finalDamage2_2 = Math.max(0, baseDamage2_2);
    document.getElementById('damage2_2').textContent = Math.floor(finalDamage2_2);


    // Calculate crit damages (expected damage including accuracy and crit)
    // Attack 1 on Defense 1
    const accuracy1_1 = parseFloat(actualAccuracyRate1_1) / 100;
    const crit1_1 = parseFloat(actualCritRate1_1) / 100;
    const critMultiplier1 = atk1CritDamage / 100;
    const critDamage1_1 = Math.floor(finalDamage1_1 * accuracy1_1 * (1 + crit1_1 * (critMultiplier1 - def1CriticalDefense / 100)) + finalDamage1_1 * (1 - accuracy1_1) * 0.5);
    document.getElementById('critDamage1_1').textContent = critDamage1_1;

    // Attack 2 on Defense 1
    const accuracy1_2 = parseFloat(actualAccuracyRate1_2) / 100;
    const crit1_2 = parseFloat(actualCritRate1_2) / 100;
    const critMultiplier1_2 = atk2CritDamage / 100;
    const critDamage1_2 = Math.floor(finalDamage1_2 * accuracy1_2 * (1 + crit1_2 * (critMultiplier1_2 - def1CriticalDefense / 100)) + finalDamage1_2 * (1 - accuracy1_2) * 0.5);
    document.getElementById('critDamage1_2').textContent = critDamage1_2;

    // Attack 1 on Defense 2
    const accuracy2_1 = parseFloat(actualAccuracyRate2_1) / 100;
    const crit2_1 = parseFloat(actualCritRate2_1) / 100;
    const critMultiplier2 = atk1CritDamage / 100;
    const critDamage2_1 = Math.floor(finalDamage2_1 * accuracy2_1 * (1 + crit2_1 * (critMultiplier2 - def2CriticalDefense / 100)) + finalDamage2_1 * (1 - accuracy2_1) * 0.5);
    document.getElementById('critDamage2_1').textContent = critDamage2_1;

    // Attack 2 on Defense 2
    const accuracy2_2 = parseFloat(actualAccuracyRate2_2) / 100;
    const crit2_2 = parseFloat(actualCritRate2_2) / 100;
    const critMultiplier2_2 = atk2CritDamage / 100;
    const critDamage2_2 = Math.floor(finalDamage2_2 * accuracy2_2 * (1 + crit2_2 * (critMultiplier2_2 - def2CriticalDefense / 100)) + finalDamage2_2 * (1 - accuracy2_2) * 0.5);
    document.getElementById('critDamage2_2').textContent = critDamage2_2;

    // Compare crit damage (percentage difference)
    const critCompare1 = critDamage1_2 !== 0
        ? ((critDamage1_2 - critDamage1_1) / critDamage1_1 * 100).toFixed(2) + '%'
        : '0%';
    document.getElementById('critCompare1').textContent = critCompare1;

    const critCompare2 = critDamage2_2 !== 0
        ? ((critDamage2_2 - critDamage2_1) / critDamage2_1 * 100).toFixed(2) + '%'
        : '0%';
    document.getElementById('critCompare2').textContent = critCompare2;

    // Update sub1
    document.getElementById('remainDefense1_1').textContent = remainDefense1_1;
    document.getElementById('defenseRate1_1').textContent = defenseRate1_1 + '%';
    document.getElementById('remainShield1_1').textContent = remainShield1_1;
    document.getElementById('elementalResisRate1_1').textContent = elementalResisRate1_1;
    document.getElementById('actualAccuracyRate1_1').textContent = actualAccuracyRate1_1;
    document.getElementById('actualCritRate1_1').textContent = actualCritRate1_1;

    document.getElementById('remainDefense1_2').textContent = remainDefense1_2;
    document.getElementById('defenseRate1_2').textContent = defenseRate1_2 + '%';
    document.getElementById('remainShield1_2').textContent = remainShield1_2;
    document.getElementById('elementalResisRate1_2').textContent = elementalResisRate1_2;
    document.getElementById('actualAccuracyRate1_2').textContent = actualAccuracyRate1_2;
    document.getElementById('actualCritRate1_2').textContent = actualCritRate1_2;

    document.getElementById('remainDefense2_1').textContent = remainDefense2_1;
    document.getElementById('defenseRate2_1').textContent = defenseRate2_1 + '%';
    document.getElementById('remainShield2_1').textContent = remainShield2_1;
    document.getElementById('elementalResisRate2_1').textContent = elementalResisRate2_1;
    document.getElementById('actualAccuracyRate2_1').textContent = actualAccuracyRate2_1;
    document.getElementById('actualCritRate2_1').textContent = actualCritRate2_1;

    document.getElementById('remainDefense2_2').textContent = remainDefense2_2;
    document.getElementById('defenseRate2_2').textContent = defenseRate2_2 + '%';
    document.getElementById('remainShield2_2').textContent = remainShield2_2;
    document.getElementById('elementalResisRate2_2').textContent = elementalResisRate2_2;
    document.getElementById('actualAccuracyRate2_2').textContent = actualAccuracyRate2_2;
    document.getElementById('actualCritRate2_2').textContent = actualCritRate2_2;

    // Save all result table content to localStorage
    document.querySelectorAll('#results span[id]').forEach(element => {
        localStorage.setItem(`result-${element.id}`, element.textContent);
    });
}

// Auto-save inputs to localStorage and auto-calculate
const inputs = document.querySelectorAll('input[type="number"]');
inputs.forEach(input => {
    // Load saved value
    const saved = localStorage.getItem(input.id);
    if (saved !== null) {
        input.value = saved;
    }
    // Save on change and recalculate
    input.addEventListener('input', () => {
        localStorage.setItem(input.id, input.value);
        calculateResults();
    });
});

// Initial calculation on load
calculateResults();

// Load saved results
document.querySelectorAll('#results span[id]').forEach(element => {
    const saved = localStorage.getItem(`result-${element.id}`);
    if (saved !== null) {
        element.textContent = saved;
    }
});

// Copy buttons
document.getElementById('copy-atk-btn').addEventListener('click', () => {
    const properties = ['attack', 'elementalAttack', 'defenseBreak', 'shieldBreak', 'pvpAttack', 'accuracy', 'crit', 'critDamage', 'extraCritRate', 'pvpAttackRate', 'elementalBreak', 'skillAttack'];
    properties.forEach(prop => {
        const val = document.getElementById(`atk1-${prop}`).value;
        document.getElementById(`atk2-${prop}`).value = val;
        localStorage.setItem(`atk2-${prop}`, val);
    });
});

document.getElementById('copy-def-btn').addEventListener('click', () => {
    const properties = ['defense', 'airShield', 'elementalResistance', 'pvpResistance', 'blockResistance', 'criticalResistance', 'criticalDefense', 'skillResistance'];
    properties.forEach(prop => {
        const val = document.getElementById(`def1-${prop}`).value;
        document.getElementById(`def2-${prop}`).value = val;
        localStorage.setItem(`def2-${prop}`, val);
    });
});

// Dark Mode Toggle
document.getElementById('dark-mode-btn').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    document.getElementById('dark-mode-btn').textContent = isDarkMode ? '日間模式' : '夜間模式';
});

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    document.getElementById('dark-mode-btn').textContent = '日間模式';
}

// Export Function
document.getElementById('export-btn').addEventListener('click', () => {
    // Collect all attack data
    const atk1Data = {
        attack: document.getElementById('atk1-attack').value,
        elementalAttack: document.getElementById('atk1-elementalAttack').value,
        defenseBreak: document.getElementById('atk1-defenseBreak').value,
        shieldBreak: document.getElementById('atk1-shieldBreak').value,
        pvpAttack: document.getElementById('atk1-pvpAttack').value,
        accuracy: document.getElementById('atk1-accuracy').value,
        crit: document.getElementById('atk1-crit').value,
        critDamage: document.getElementById('atk1-critDamage').value,
        extraCritRate: document.getElementById('atk1-extraCritRate').value,
        pvpAttackRate: document.getElementById('atk1-pvpAttackRate').value,
        elementalBreak: document.getElementById('atk1-elementalBreak').value,
        skillAttack: document.getElementById('atk1-skillAttack').value
    };

    const atk2Data = {
        attack: document.getElementById('atk2-attack').value,
        elementalAttack: document.getElementById('atk2-elementalAttack').value,
        defenseBreak: document.getElementById('atk2-defenseBreak').value,
        shieldBreak: document.getElementById('atk2-shieldBreak').value,
        pvpAttack: document.getElementById('atk2-pvpAttack').value,
        accuracy: document.getElementById('atk2-accuracy').value,
        crit: document.getElementById('atk2-crit').value,
        critDamage: document.getElementById('atk2-critDamage').value,
        extraCritRate: document.getElementById('atk2-extraCritRate').value,
        pvpAttackRate: document.getElementById('atk2-pvpAttackRate').value,
        elementalBreak: document.getElementById('atk2-elementalBreak').value,
        skillAttack: document.getElementById('atk2-skillAttack').value
    };

    // Collect all defense data
    const def1Data = {
        defense: document.getElementById('def1-defense').value,
        airShield: document.getElementById('def1-airShield').value,
        elementalResistance: document.getElementById('def1-elementalResistance').value,
        pvpResistance: document.getElementById('def1-pvpResistance').value,
        blockResistance: document.getElementById('def1-blockResistance').value,
        criticalResistance: document.getElementById('def1-criticalResistance').value,
        criticalDefense: document.getElementById('def1-criticalDefense').value,
        skillResistance: document.getElementById('def1-skillResistance').value
    };

    const def2Data = {
        defense: document.getElementById('def2-defense').value,
        airShield: document.getElementById('def2-airShield').value,
        elementalResistance: document.getElementById('def2-elementalResistance').value,
        pvpResistance: document.getElementById('def2-pvpResistance').value,
        blockResistance: document.getElementById('def2-blockResistance').value,
        criticalResistance: document.getElementById('def2-criticalResistance').value,
        criticalDefense: document.getElementById('def2-criticalDefense').value,
        skillResistance: document.getElementById('def2-skillResistance').value
    };

    const exportData = {
        attack1: atk1Data,
        attack2: atk2Data,
        defense1: def1Data,
        defense2: def2Data
    };

    // Create JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create a blob and download link
    const blob = new Blob([jsonString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pvp-calculator-data-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Import Function
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Import attack1 data
            if (data.attack1) {
                Object.keys(data.attack1).forEach(key => {
                    const element = document.getElementById(`atk1-${key}`);
                    if (element) {
                        element.value = data.attack1[key];
                        localStorage.setItem(`atk1-${key}`, data.attack1[key]);
                    }
                });
            }

            // Import attack2 data
            if (data.attack2) {
                Object.keys(data.attack2).forEach(key => {
                    const element = document.getElementById(`atk2-${key}`);
                    if (element) {
                        element.value = data.attack2[key];
                        localStorage.setItem(`atk2-${key}`, data.attack2[key]);
                    }
                });
            }

            // Import defense1 data
            if (data.defense1) {
                Object.keys(data.defense1).forEach(key => {
                    const element = document.getElementById(`def1-${key}`);
                    if (element) {
                        element.value = data.defense1[key];
                        localStorage.setItem(`def1-${key}`, data.defense1[key]);
                    }
                });
            }

            // Import defense2 data
            if (data.defense2) {
                Object.keys(data.defense2).forEach(key => {
                    const element = document.getElementById(`def2-${key}`);
                    if (element) {
                        element.value = data.defense2[key];
                        localStorage.setItem(`def2-${key}`, data.defense2[key]);
                    }
                });
            }

            // Recalculate after import
            calculateResults();
            alert('數據匯入成功!');
        } catch (error) {
            alert('數據匯入錯誤: ' + error.message);
        }
    };
    reader.readAsText(file);

    // Reset file input so the same file can be imported again
    event.target.value = '';
});