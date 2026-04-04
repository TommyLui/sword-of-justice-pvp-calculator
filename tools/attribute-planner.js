function initAttributePlanner() {
    if (window.__attributePlannerInitialized) return;
    window.__attributePlannerInitialized = true;

    const notify = (options) => {
        if (window.showNotification) {
            window.showNotification(options);
        } else {
            alert(options.title + ': ' + options.message);
        }
    };

    const ATTRIBUTES = [
        { id: 'attack', name: '攻擊', min: 0, max: 999999, step: 1 },
        { id: 'elementalAttack', name: '元素攻擊', min: 0, max: 999999, step: 1 },
        { id: 'defenseBreak', name: '破防', min: 0, max: 999999, step: 1 },
        { id: 'accuracy', name: '命中', min: 0, max: 999999, step: 1 },
        { id: 'crit', name: '會心', min: 0, max: 999999, step: 1 }
    ];
    const BASELINE_SYNC_KEYS = ['attack', 'elementalAttack', 'defenseBreak', 'accuracy', 'crit'];

    const state = {
        step: 1,
        baseline: {},
        candidate: {},
        lastResult: null
    };

    const SYNC_SOURCE = 'attribute-planner';
    let isApplyingSync = false;
    let hasBoundBaselineSyncInputs = false;

    const diffElementsByAttr = {};

    const loadingEl = document.getElementById('planner-loading');
    const appEl = document.getElementById('planner-app');
    const baselineFieldsEl = document.getElementById('planner-baseline-fields');
    const candidateFieldsEl = document.getElementById('planner-candidate-fields');
    const contribBodyEl = document.getElementById('planner-contrib-body');
    const top3El = document.getElementById('planner-top3');
    const notesEl = document.getElementById('planner-notes');
    const kpiEl = document.getElementById('planner-kpi');
    const resultTotalEl = document.getElementById('planner-result-total');
    const stepButtons = Array.from(document.querySelectorAll('#view-attribute-planner .planner-step'));
    const panels = Array.from(document.querySelectorAll('#view-attribute-planner .planner-panel'));
    const prevBtn = document.getElementById('planner-prev');
    const nextBtn = document.getElementById('planner-next');
    const resetCandidateBtn = document.getElementById('planner-reset-candidate');

    function toNumber(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function formatSignedPercent(valueDecimal) {
        const percent = valueDecimal * 100;
        const sign = percent >= 0 ? '+' : '';
        return sign + percent.toFixed(2) + '%';
    }

    function normalizeByAttribute(attr, value) {
        const parsed = toNumber(value, 0);
        if (!Number.isFinite(parsed)) {
            return attr.min || 0;
        }
        if (parsed < attr.min) return attr.min;
        if (parsed > attr.max) return attr.max;
        return parsed;
    }

    function createZeroStats() {
        return Object.fromEntries(ATTRIBUTES.map(attr => [attr.id, 0]));
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

    function readCombatScenario() {
        return {
            attack: toNumber(document.getElementById('atk1-attack')?.value, 0),
            elementalAttack: toNumber(document.getElementById('atk1-elementalAttack')?.value, 0),
            defenseBreak: toNumber(document.getElementById('atk1-defenseBreak')?.value, 0),
            shieldBreak: toNumber(document.getElementById('atk1-shieldBreak')?.value, 0),
            pvpAttack: toNumber(document.getElementById('atk1-pvpAttack')?.value, 0),
            accuracy: toNumber(document.getElementById('atk1-accuracy')?.value, 0),
            crit: toNumber(document.getElementById('atk1-crit')?.value, 0),
            critDamage: toNumber(document.getElementById('atk1-critDamage')?.value, 0),
            extraCritRate: toNumber(document.getElementById('atk1-extraCritRate')?.value, 0),
            pvpAttackRate: toNumber(document.getElementById('atk1-pvpAttackRate')?.value, 0),
            elementalBreak: toNumber(document.getElementById('atk1-elementalBreak')?.value, 0),
            skillAttack: toNumber(document.getElementById('atk1-skillAttack')?.value, 0),
            defense: toNumber(document.getElementById('def1-defense')?.value, 0),
            airShield: toNumber(document.getElementById('def1-airShield')?.value, 0),
            elementalResistance: toNumber(document.getElementById('def1-elementalResistance')?.value, 0),
            pvpResistance: toNumber(document.getElementById('def1-pvpResistance')?.value, 0),
            blockResistance: toNumber(document.getElementById('def1-blockResistance')?.value, 0),
            criticalResistance: toNumber(document.getElementById('def1-criticalResistance')?.value, 0),
            criticalDefense: toNumber(document.getElementById('def1-criticalDefense')?.value, 0),
            skillResistance: toNumber(document.getElementById('def1-skillResistance')?.value, 0)
        };
    }

    function calculateEffectiveDamage(stats) {
        const remainDefense = calculateRemainDefense(stats.defense, stats.defenseBreak);
        const defenseRate = calculateDefenseRate(remainDefense);
        const remainShield = calculateRemainShield(stats.shieldBreak, stats.airShield);
        const elementalResisRate = calculateElementalResisRate(stats.elementalResistance, stats.elementalBreak);
        const actualAccuracyRate = calculateActualAccuracyRate(stats.accuracy, stats.blockResistance);
        const actualCritRate = calculateActualCritRate(stats.crit, stats.extraCritRate, stats.criticalResistance);

        const skillBase = 58000;
        const skillMultiplier = 3.38;
        const baseDamage = ((skillBase + skillMultiplier * (stats.attack + stats.pvpAttack + stats.skillAttack - stats.pvpResistance - remainShield - stats.skillResistance)) * (1 - defenseRate / 100) + (stats.elementalAttack * skillMultiplier * (1 - elementalResisRate / 100))) * (1 + stats.pvpAttackRate / 100);
        const finalDamage = Math.max(0, baseDamage);

        return Math.floor(finalDamage * (actualAccuracyRate / 100) * (1 + (actualCritRate / 100) * ((stats.critDamage / 100) - stats.criticalDefense / 100)) + finalDamage * (1 - (actualAccuracyRate / 100)) * 0.5);
    }

    function buildZeroResult(note) {
        const contributions = ATTRIBUTES.map(attr => ({
            attrId: attr.id,
            attrName: attr.name,
            baselineValue: normalizeByAttribute(attr, state.baseline[attr.id]),
            candidateValue: normalizeByAttribute(attr, state.candidate[attr.id]),
            deltaGain: 0
        }));

        return {
            improvePercent: 0,
            baselineTotal: 0,
            candidateTotal: 0,
            contributions,
            top3: contributions.slice(0, 3),
            notes: [note]
        };
    }

    function calculateEstimate() {
        const scenario = readCombatScenario();
        const baselineStats = { ...scenario, ...state.baseline };
        const candidateStats = { ...scenario, ...state.candidate };
        const baselineDamage = calculateEffectiveDamage(baselineStats);
        const candidateDamage = calculateEffectiveDamage(candidateStats);

        if (baselineDamage <= 0) {
            return buildZeroResult('目前基準傷害為 0，請先在傷害計算器設定可造成傷害的比較情境。');
        }

        const contributions = ATTRIBUTES.map(attr => {
            const singleAttrCandidate = {
                ...baselineStats,
                [attr.id]: normalizeByAttribute(attr, state.candidate[attr.id])
            };
            const singleAttrDamage = calculateEffectiveDamage(singleAttrCandidate);
            const deltaGain = ((singleAttrDamage - baselineDamage) / baselineDamage) || 0;

            return {
                attrId: attr.id,
                attrName: attr.name,
                baselineValue: normalizeByAttribute(attr, state.baseline[attr.id]),
                candidateValue: normalizeByAttribute(attr, state.candidate[attr.id]),
                deltaGain
            };
        });

        return {
            improvePercent: (candidateDamage - baselineDamage) / baselineDamage,
            baselineTotal: 0,
            candidateTotal: (candidateDamage - baselineDamage) / baselineDamage,
            contributions,
            top3: [...contributions].sort((a, b) => b.deltaGain - a.deltaGain).slice(0, 3),
            notes: ['依目前傷害計算器的「進攻數值1 vs 防禦數值1」公式即時計算。']
        };
    }

    function renderResults() {
        const result = calculateEstimate();
        state.lastResult = result;
        if (!result) return;

        kpiEl.textContent = formatSignedPercent(result.improvePercent);
        resultTotalEl.textContent = formatSignedPercent(result.improvePercent);

        contribBodyEl.innerHTML = '';
        const fragment = document.createDocumentFragment();
        result.contributions.forEach(item => {
            const tr = document.createElement('tr');

            const tdName = document.createElement('td');
            tdName.textContent = item.attrName;
            tr.appendChild(tdName);

            const tdBase = document.createElement('td');
            tdBase.textContent = String(item.baselineValue);
            tr.appendChild(tdBase);

            const tdCandidate = document.createElement('td');
            tdCandidate.textContent = String(item.candidateValue);
            tr.appendChild(tdCandidate);

            const tdDelta = document.createElement('td');
            tdDelta.textContent = formatSignedPercent(item.deltaGain);
            tdDelta.className = item.deltaGain >= 0 ? 'planner-positive' : 'planner-negative';
            tr.appendChild(tdDelta);

            fragment.appendChild(tr);
        });
        contribBodyEl.appendChild(fragment);

        top3El.innerHTML = '';
        result.top3.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.attrName + ' ' + formatSignedPercent(item.deltaGain);
            top3El.appendChild(li);
        });
        if (result.top3.length === 0) {
            const li = document.createElement('li');
            li.textContent = '目前無可比較資料';
            top3El.appendChild(li);
        }

        notesEl.innerHTML = '';
        result.notes.forEach(note => {
            const p = document.createElement('p');
            p.textContent = note;
            notesEl.appendChild(p);
        });
    }

    function refreshAllDiffLabels() {
        ATTRIBUTES.forEach(attr => {
            const diffEl = diffElementsByAttr[`candidate-${attr.id}`];
            if (!diffEl) return;
            const delta = toNumber(state.candidate[attr.id], 0) - toNumber(state.baseline[attr.id], 0);
            const sign = delta >= 0 ? '+' : '';
            diffEl.textContent = `差值：${sign}${delta}`;
        });
    }

    function pushBaselineToBridge() {
        if (!window.pvpSyncBridge?.setBaselineAtk1 || isApplyingSync) return;
        window.pvpSyncBridge.setBaselineAtk1({
            attack: state.baseline.attack ?? 0,
            elementalAttack: state.baseline.elementalAttack ?? 0,
            defenseBreak: state.baseline.defenseBreak ?? 0,
            accuracy: state.baseline.accuracy ?? 0,
            crit: state.baseline.crit ?? 0
        }, { source: SYNC_SOURCE });
    }

    function applyBaselineFromBridge(payload) {
        if (!payload || payload.source === SYNC_SOURCE || !payload.baselineAtk1) return;
        isApplyingSync = true;
        const incoming = payload.baselineAtk1;

        BASELINE_SYNC_KEYS.forEach(key => {
            state.baseline[key] = toNumber(incoming[key], 0);
            const baselineInput = document.getElementById(`planner-baseline-${key}`);
            if (baselineInput) {
                baselineInput.value = String(state.baseline[key]);
            }
        });

        refreshAllDiffLabels();
        renderResults();
        isApplyingSync = false;
    }

    function bindBaselineSyncInputs() {
        if (hasBoundBaselineSyncInputs) return;

        BASELINE_SYNC_KEYS.forEach(key => {
            const input = document.getElementById(`planner-baseline-${key}`);
            if (!input) return;

            input.addEventListener('change', () => {
                pushBaselineToBridge();
            });

            input.addEventListener('blur', () => {
                pushBaselineToBridge();
            });

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    input.blur();
                }
            });
        });

        hasBoundBaselineSyncInputs = true;
    }

    function createInputField(attr, mode) {
        const wrap = document.createElement('div');
        wrap.className = 'planner-field';

        const label = document.createElement('label');
        label.className = 'planner-field-label';
        label.setAttribute('for', `planner-${mode}-${attr.id}`);
        label.textContent = attr.name;

        const input = document.createElement('input');
        input.id = `planner-${mode}-${attr.id}`;
        input.type = 'number';
        input.min = String(attr.min);
        input.max = String(attr.max);
        input.step = String(attr.step || 1);
        input.value = String(mode === 'baseline' ? state.baseline[attr.id] : state.candidate[attr.id]);

        input.addEventListener('input', () => {
            const next = toNumber(input.value, 0);
            if (mode === 'baseline') {
                state.baseline[attr.id] = next;
            } else {
                state.candidate[attr.id] = next;
            }
            refreshAllDiffLabels();
            renderResults();
        });

        let diff = null;
        if (mode === 'candidate') {
            diff = document.createElement('div');
            diff.className = 'planner-field-diff';
            diffElementsByAttr[`candidate-${attr.id}`] = diff;
        }

        wrap.appendChild(label);
        wrap.appendChild(input);

        if (mode === 'candidate') {
            const quick = document.createElement('div');
            quick.className = 'planner-quick-actions';
            [-1000, -500, -100, 100, 500, 1000].forEach(delta => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'planner-chip-btn';
                btn.textContent = (delta > 0 ? '+' : '') + delta;
                btn.addEventListener('click', () => {
                    const current = toNumber(state.candidate[attr.id], 0);
                    const next = current + delta;
                    state.candidate[attr.id] = next;
                    input.value = String(next);
                    refreshAllDiffLabels();
                    renderResults();
                });
                quick.appendChild(btn);
            });
            wrap.appendChild(quick);
        }

        if (diff) {
            wrap.appendChild(diff);
        }
        return wrap;
    }

    function renderFields() {
        Object.keys(diffElementsByAttr).forEach(key => {
            delete diffElementsByAttr[key];
        });

        hasBoundBaselineSyncInputs = false;

        baselineFieldsEl.innerHTML = '';
        candidateFieldsEl.innerHTML = '';

        const baselineFrag = document.createDocumentFragment();
        const candidateFrag = document.createDocumentFragment();

        ATTRIBUTES.forEach(attr => {
            baselineFrag.appendChild(createInputField(attr, 'baseline'));
            candidateFrag.appendChild(createInputField(attr, 'candidate'));
        });

        baselineFieldsEl.appendChild(baselineFrag);
        candidateFieldsEl.appendChild(candidateFrag);
        refreshAllDiffLabels();
        bindBaselineSyncInputs();
    }

    function setStep(nextStep) {
        state.step = Math.min(3, Math.max(1, nextStep));

        stepButtons.forEach(btn => {
            const step = Number(btn.dataset.step);
            btn.classList.toggle('active', step === state.step);
        });

        panels.forEach(panel => {
            const step = Number(panel.dataset.stepPanel);
            const isActive = step === state.step;
            panel.hidden = !isActive;
            panel.classList.toggle('active', isActive);
        });

        prevBtn.disabled = state.step === 1;
        nextBtn.textContent = state.step === 3 ? '完成' : '下一步';
    }

    function bindEvents() {
        stepButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = Number(btn.dataset.step);
                setStep(target);
            });
        });

        prevBtn?.addEventListener('click', () => setStep(state.step - 1));
        nextBtn?.addEventListener('click', () => {
            if (state.step < 3) {
                setStep(state.step + 1);
                return;
            }
            notify({ type: 'info', title: '完成', message: '你可以返回前面步驟持續微調。', duration: 2500 });
        });

        resetCandidateBtn?.addEventListener('click', () => {
            state.candidate = { ...state.baseline };
            renderFields();
            renderResults();
            notify({ type: 'success', title: '已重置', message: '目標屬性已重置為基準值', duration: 2500 });
        });

        if (window.pvpSyncBridge?.subscribe) {
            window.pvpSyncBridge.subscribe(applyBaselineFromBridge);
        }
    }

    function bootstrap() {
        loadingEl.hidden = false;
        appEl.hidden = true;

        state.baseline = createZeroStats();
        state.candidate = createZeroStats();

        renderFields();

        const existing = window.pvpSyncBridge?.getBaselineAtk1?.();
        if (existing?._meta?.hasValue) {
            applyBaselineFromBridge({
                baselineAtk1: {
                    attack: existing.attack,
                    elementalAttack: existing.elementalAttack,
                    defenseBreak: existing.defenseBreak,
                    accuracy: existing.accuracy,
                    crit: existing.crit
                },
                source: existing._meta.source || 'bridge'
            });
        } else {
            pushBaselineToBridge();
        }

        renderResults();
        setStep(1);
        bindEvents();

        loadingEl.hidden = true;
        appEl.hidden = false;
    }

    bootstrap();
}
