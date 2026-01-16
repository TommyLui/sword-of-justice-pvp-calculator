document.getElementById('calculate-btn').addEventListener('click', function () {
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
        const diff = criticalResistance - crit;
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
    const atk1Total = atk1Attack + atk1ElementalAttack + atk1DefenseBreak + atk1ShieldBreak + atk1PvpAttack + atk1Accuracy + atk1Crit + atk1CritDamage + atk1ExtraCritRate + atk1PvpAttackRate + atk1ElementalBreak + atk1SkillAttack;

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
    const atk2Total = atk2Attack + atk2ElementalAttack + atk2DefenseBreak + atk2ShieldBreak + atk2PvpAttack + atk2Accuracy + atk2Crit + atk2CritDamage + atk2ExtraCritRate + atk2PvpAttackRate + atk2ElementalBreak + atk2SkillAttack;

    const totalAttack = atk1Total + atk2Total;

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
    // Vs def1
    const remainDefense1_1 = Math.max(0, def1Defense - atk1DefenseBreak);
    const defenseRate1_1 = ((remainDefense1_1 / (remainDefense1_1 + 10552)) * 100).toFixed(2) + '%';
    const remainShield1_1 = calculateRemainShield(atk1ShieldBreak, def1AirShield);
    const elementalResisRate1_1 = (((def1ElementalResistance - atk1ElementalBreak) / ((def1ElementalResistance - atk1ElementalBreak) + 1965)) * 100).toFixed(2) + '%';
    const actualAccuracyRate1_1 = calculateActualAccuracyRate(atk1Accuracy, def1BlockResistance);
    const actualCritRate1_1 = calculateActualCritRate(atk1Crit, atk1ExtraCritRate, def1CriticalResistance);

    // Vs def2
    const remainDefense1_2 = Math.max(0, def1Defense - atk2DefenseBreak);
    const defenseRate1_2 = ((remainDefense1_2 / (remainDefense1_2 + 10552)) * 100).toFixed(2) + '%';
    const remainShield1_2 = calculateRemainShield(atk2ShieldBreak, def1AirShield);
    const elementalResisRate1_2 = (((def1ElementalResistance - atk2ElementalBreak) / ((def1ElementalResistance - atk2ElementalBreak) + 1965)) * 100).toFixed(2) + '%';
    const actualAccuracyRate1_2 = calculateActualAccuracyRate(atk2Accuracy, def1BlockResistance);
    const actualCritRate1_2 = calculateActualCritRate(atk2Crit, atk2ExtraCritRate, def1CriticalResistance);

    // For part2 (attack2 vs def1 and def2)
    // Vs def1
    const remainDefense2_1 = Math.max(0, def2Defense - atk1DefenseBreak);
    const defenseRate2_1 = ((remainDefense2_1 / (remainDefense2_1 + 10552)) * 100).toFixed(2) + '%';
    const remainShield2_1 = calculateRemainShield(atk1ShieldBreak, def2AirShield);
    const elementalResisRate2_1 = (((def2ElementalResistance - atk1ElementalBreak) / ((def2ElementalResistance - atk1ElementalBreak) + 1965)) * 100).toFixed(2) + '%';
    const actualAccuracyRate2_1 = calculateActualAccuracyRate(atk1Accuracy, def2BlockResistance);
    const actualCritRate2_1 = calculateActualCritRate(atk1Crit, atk1ExtraCritRate, def2CriticalResistance);

    // Vs def2
    const remainDefense2_2 = Math.max(0, def2Defense - atk2DefenseBreak);
    const defenseRate2_2 = ((remainDefense2_2 / (remainDefense2_2 + 10552)) * 100).toFixed(2) + '%';
    const remainShield2_2 = calculateRemainShield(atk2ShieldBreak, def2AirShield);
    const elementalResisRate2_2 = (((def2ElementalResistance - atk2ElementalBreak) / ((def2ElementalResistance - atk2ElementalBreak) + 1965)) * 100).toFixed(2) + '%';
    const actualAccuracyRate2_2 = calculateActualAccuracyRate(atk2Accuracy, def2BlockResistance);
    const actualCritRate2_2 = calculateActualCritRate(atk2Crit, atk2ExtraCritRate, def2CriticalResistance);
    document.getElementById('damage1to1').textContent = 0;
    document.getElementById('damage1to2').textContent = 0;
    document.getElementById('damage2to1').textContent = 0;
    document.getElementById('damage2to2').textContent = 0;

    // Update sub1
    document.getElementById('remainDefense1_1').textContent = remainDefense1_1;
    document.getElementById('defenseRate1_1').textContent = defenseRate1_1;
    document.getElementById('remainShield1_1').textContent = remainShield1_1;
    document.getElementById('elementalResisRate1_1').textContent = elementalResisRate1_1;
    document.getElementById('actualAccuracyRate1_1').textContent = actualAccuracyRate1_1;
    document.getElementById('actualCritRate1_1').textContent = actualCritRate1_1;

    document.getElementById('remainDefense1_2').textContent = remainDefense1_2;
    document.getElementById('defenseRate1_2').textContent = defenseRate1_2;
    document.getElementById('remainShield1_2').textContent = remainShield1_2;
    document.getElementById('elementalResisRate1_2').textContent = elementalResisRate1_2;
    document.getElementById('actualAccuracyRate1_2').textContent = actualAccuracyRate1_2;
    document.getElementById('actualCritRate1_2').textContent = actualCritRate1_2;

    document.getElementById('remainDefense2_1').textContent = remainDefense2_1;
    document.getElementById('defenseRate2_1').textContent = defenseRate2_1;
    document.getElementById('remainShield2_1').textContent = remainShield2_1;
    document.getElementById('elementalResisRate2_1').textContent = elementalResisRate2_1;
    document.getElementById('actualAccuracyRate2_1').textContent = actualAccuracyRate2_1;
    document.getElementById('actualCritRate2_1').textContent = actualCritRate2_1;

    document.getElementById('remainDefense2_2').textContent = remainDefense2_2;
    document.getElementById('defenseRate2_2').textContent = defenseRate2_2;
    document.getElementById('remainShield2_2').textContent = remainShield2_2;
    document.getElementById('elementalResisRate2_2').textContent = elementalResisRate2_2;
    document.getElementById('actualAccuracyRate2_2').textContent = actualAccuracyRate2_2;
    document.getElementById('actualCritRate2_2').textContent = actualCritRate2_2;

    // Save results to localStorage
    const resultIds = [
        'remainDefense1_1', 'defenseRate1_1', 'remainShield1_1', 'elementalResisRate1_1', 'actualAccuracyRate1_1', 'actualCritRate1_1', 'damage1to1',
        'remainDefense1_2', 'defenseRate1_2', 'remainShield1_2', 'elementalResisRate1_2', 'actualAccuracyRate1_2', 'actualCritRate1_2', 'damage1to2',
        'remainDefense2_1', 'defenseRate2_1', 'remainShield2_1', 'elementalResisRate2_1', 'actualAccuracyRate2_1', 'actualCritRate2_1', 'damage2to1',
        'remainDefense2_2', 'defenseRate2_2', 'remainShield2_2', 'elementalResisRate2_2', 'actualAccuracyRate2_2', 'actualCritRate2_2', 'damage2to2'
    ];
    resultIds.forEach(id => {
        localStorage.setItem(`result-${id}`, document.getElementById(id).textContent);
    });

    // Performance analysis: find the attack property with the highest total value
    const properties = [
        { name: '攻擊', value: atk1Attack + atk2Attack },
        { name: '元素攻擊', value: atk1ElementalAttack + atk2ElementalAttack },
        { name: '破防', value: atk1DefenseBreak + atk2DefenseBreak },
        { name: '破盾', value: atk1ShieldBreak + atk2ShieldBreak },
        { name: '流派克制', value: atk1PvpAttack + atk2PvpAttack },
        { name: '命中', value: atk1Accuracy + atk2Accuracy },
        { name: '會心', value: atk1Crit + atk2Crit },
        { name: '會傷-100%', value: atk1CritDamage + atk2CritDamage },
        { name: '額外會心率', value: atk1ExtraCritRate + atk2ExtraCritRate },
        { name: '克制百分比', value: atk1PvpAttackRate + atk2PvpAttackRate },
        { name: '忽視元抗', value: atk1ElementalBreak + atk2ElementalBreak },
        { name: '技能增強', value: atk1SkillAttack + atk2SkillAttack }
    ];
    const best = properties.reduce((prev, curr) => (prev.value > curr.value) ? prev : curr);
    document.getElementById('performance').textContent = `The highest performing attack property is ${best.name} with total ${best.value}.`;
});

// Auto-save inputs to localStorage
const inputs = document.querySelectorAll('input[type="number"]');
inputs.forEach(input => {
    // Load saved value
    const saved = localStorage.getItem(input.id);
    if (saved !== null) {
        input.value = saved;
    }
    // Save on change
    input.addEventListener('input', () => {
        localStorage.setItem(input.id, input.value);
    });
});

// Load saved results
const resultIds = [
    'remainDefense1_1', 'defenseRate1_1', 'remainShield1_1', 'elementalResisRate1_1', 'actualAccuracyRate1_1', 'actualCritRate1_1', 'damage1to1',
    'remainDefense1_2', 'defenseRate1_2', 'remainShield1_2', 'elementalResisRate1_2', 'actualAccuracyRate1_2', 'actualCritRate1_2', 'damage1to2',
    'remainDefense2_1', 'defenseRate2_1', 'remainShield2_1', 'elementalResisRate2_1', 'actualAccuracyRate2_1', 'actualCritRate2_1', 'damage2to1',
    'remainDefense2_2', 'defenseRate2_2', 'remainShield2_2', 'elementalResisRate2_2', 'actualAccuracyRate2_2', 'actualCritRate2_2', 'damage2to2'
];
resultIds.forEach(id => {
    const saved = localStorage.getItem(`result-${id}`);
    if (saved !== null) {
        document.getElementById(id).textContent = saved;
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