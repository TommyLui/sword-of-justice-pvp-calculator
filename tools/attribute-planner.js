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

    const state = {
        db: null,
        step: 1,
        selectedTemplateId: '',
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

    function lookupCurveGain(curve, x) {
        if (!Array.isArray(curve) || curve.length === 0) {
            return { gain: 0, clamped: false };
        }

        if (curve.length === 1) {
            return { gain: curve[0].gain, clamped: x !== curve[0].x };
        }

        const clampGain = (value) => Math.max(-0.95, value);

        if (x <= curve[0].x) {
            const left = curve[0];
            const right = curve[1];
            const ratio = (x - left.x) / (right.x - left.x);
            const gain = left.gain + (right.gain - left.gain) * ratio;
            return { gain: clampGain(gain), clamped: x < curve[0].x };
        }

        const last = curve[curve.length - 1];
        if (x >= last.x) {
            const left = curve[curve.length - 2];
            const right = last;
            const ratio = (x - left.x) / (right.x - left.x);
            const gain = left.gain + (right.gain - left.gain) * ratio;
            return { gain: clampGain(gain), clamped: x > last.x };
        }

        for (let i = 1; i < curve.length; i++) {
            const left = curve[i - 1];
            const right = curve[i];
            if (x <= right.x) {
                const ratio = (x - left.x) / (right.x - left.x);
                const gain = left.gain + (right.gain - left.gain) * ratio;
                return { gain, clamped: false };
            }
        }

        return { gain: last.gain, clamped: true };
    }

    function calculateEstimate() {
        if (!state.db) {
            return null;
        }

        let baselineMultiplier = 1;
        let candidateMultiplier = 1;
        const contributions = [];
        const notes = new Set();

        state.db.attributes.forEach(attr => {
            const curve = state.db.curves[attr.id] || [];
            const baselineValue = normalizeByAttribute(attr, state.baseline[attr.id]);
            const candidateValue = normalizeByAttribute(attr, state.candidate[attr.id]);

            const baselineResult = lookupCurveGain(curve, baselineValue);
            const candidateResult = lookupCurveGain(curve, candidateValue);

            baselineMultiplier *= (1 + baselineResult.gain);
            candidateMultiplier *= (1 + candidateResult.gain);

            const deltaGain = candidateResult.gain - baselineResult.gain;

            contributions.push({
                attrId: attr.id,
                attrName: attr.name,
                baselineValue,
                candidateValue,
                deltaGain
            });

            if (baselineResult.clamped || candidateResult.clamped) {
                notes.add('部分屬性超出模型估算範圍，已使用邊界值估算。');
            }

            if (attr.id === 'accuracy' && Math.abs(deltaGain) < 1e-10 && candidateValue !== baselineValue) {
                notes.add('命中目前接近封頂，收益可能為 0。');
            }
        });

        const improvePercent = (candidateMultiplier / baselineMultiplier) - 1;
        const top3 = [...contributions]
            .sort((a, b) => b.deltaGain - a.deltaGain)
            .slice(0, 3);

        return {
            improvePercent,
            baselineTotal: baselineMultiplier - 1,
            candidateTotal: candidateMultiplier - 1,
            contributions,
            top3,
            notes: Array.from(notes)
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
        if (!state.db) return;
        state.db.attributes.forEach(attr => {
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
        const baselineKeys = ['attack', 'elementalAttack', 'defenseBreak', 'accuracy', 'crit'];
        baselineKeys.forEach(key => {
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
        const baselineKeys = ['attack', 'elementalAttack', 'defenseBreak', 'accuracy', 'crit'];
        baselineKeys.forEach(key => {
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
            [-100, -50, 50, 100].forEach(delta => {
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

        state.db.attributes.forEach(attr => {
            baselineFrag.appendChild(createInputField(attr, 'baseline'));
            candidateFrag.appendChild(createInputField(attr, 'candidate'));
        });

        baselineFieldsEl.appendChild(baselineFrag);
        candidateFieldsEl.appendChild(candidateFrag);
        refreshAllDiffLabels();
        bindBaselineSyncInputs();
    }

    function applyTemplate(templateId, options = {}) {
        const { pushToBridge = true } = options;
        const template = state.db.templates.find(t => t.id === templateId) || state.db.templates[0];
        state.selectedTemplateId = template.id;
        state.baseline = { ...template.baseline };
        state.candidate = { ...template.baseline };

        renderFields();
        renderResults();
        if (pushToBridge) {
            pushBaselineToBridge();
        }
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

    async function loadDb() {
        const pathsToTry = ['tools/attributes-db.json', '../tools/attributes-db.json'];
        let response = null;

        for (const path of pathsToTry) {
            try {
                response = await fetch(path);
                if (response.ok) {
                    break;
                }
            } catch (e) {
                // continue fallback
            }
        }

        if (!response || !response.ok) {
            throw new Error('Failed to load attributes-db.json');
        }

        const db = await response.json();
        if (!db || !Array.isArray(db.attributes) || !Array.isArray(db.templates) || !db.curves) {
            throw new Error('Invalid attributes-db.json');
        }
        return db;
    }

    (async function bootstrap() {
        try {
            loadingEl.hidden = false;
            appEl.hidden = true;

            state.db = await loadDb();
            applyTemplate(state.db.templates[0].id, { pushToBridge: false });

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

            setStep(1);
            bindEvents();

            loadingEl.hidden = true;
            appEl.hidden = false;
        } catch (error) {
            console.error('Attribute planner load failed:', error);
            loadingEl.textContent = '載入失敗，請重新整理頁面';
            notify({
                type: 'error',
                title: '載入失敗',
                message: '屬性規劃資料載入失敗，請更新資料檔',
                duration: 5000
            });
        }
    })();
}
