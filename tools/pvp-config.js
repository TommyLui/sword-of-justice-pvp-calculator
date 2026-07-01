(function initPvpConfig() {
    if (window.pvpConfig) return;

    const ATTACK_FIELDS = ['attack', 'elementalAttack', 'defenseBreak', 'shieldBreak', 'pvpAttack', 'accuracy', 'crit', 'critDamage', 'extraCritRate', 'pvpAttackRate', 'elementalBreak', 'skillAttack'];
    const DEFENSE_FIELDS = ['defense', 'airShield', 'elementalResistance', 'pvpResistance', 'blockResistance', 'criticalResistance', 'criticalDefense', 'skillResistance'];
    const BRIDGE_FIELD_MAP = {
        attack: 'atk1-attack',
        elementalAttack: 'atk1-elementalAttack',
        defenseBreak: 'atk1-defenseBreak',
        shieldBreak: 'atk1-shieldBreak',
        accuracy: 'atk1-accuracy',
        crit: 'atk1-crit',
        critDamage: 'atk1-critDamage',
        elementalBreak: 'atk1-elementalBreak'
    };
    const BASELINE_SYNC_KEYS = Object.keys(BRIDGE_FIELD_MAP);
    const PLANNER_ATTRIBUTES = [
        { id: 'attack', name: '攻擊', min: 0, max: 999999, step: 1, color: '#4a9eff' },
        { id: 'elementalAttack', name: '元素攻擊', min: 0, max: 999999, step: 1, color: '#3dd4e8' },
        { id: 'defenseBreak', name: '破防', min: 0, max: 999999, step: 1, color: '#6b7eff' },
        { id: 'shieldBreak', name: '破盾', min: 0, max: 999999, step: 1, color: '#2ec9b8' },
        { id: 'accuracy', name: '命中', min: 0, max: 999999, step: 1, color: '#f5a623' },
        { id: 'crit', name: '會心', min: 0, max: 999999, step: 1, color: '#f4567a' },
        { id: 'critDamage', name: '會傷', min: 0, max: 999999, step: 1, color: '#3dd47a' },
        { id: 'elementalBreak', name: '忽視元抗', min: 0, max: 999999, step: 1, color: '#b58bff' }
    ];

    window.pvpConfig = {
        ATTACK_FIELDS,
        DEFENSE_FIELDS,
        BRIDGE_FIELD_MAP,
        BASELINE_SYNC_KEYS,
        PLANNER_ATTRIBUTES
    };
})();
