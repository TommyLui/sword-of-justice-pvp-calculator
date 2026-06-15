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

    const combat = window.pvpCombat;
    if (!combat) {
        notify({
            type: 'error',
            title: '載入失敗',
            message: '傷害公式模組未載入，請重新整理頁面',
            duration: 5000
        });
        return;
    }

    const config = window.pvpConfig;
    if (!config) {
        notify({
            type: 'error',
            title: '載入失敗',
            message: '欄位設定模組未載入，請重新整理頁面',
            duration: 5000
        });
        return;
    }

    const ATTRIBUTES = config.PLANNER_ATTRIBUTES;
    const STEP_LEVELS = 10;
    const STEP_STORAGE_PREFIX = 'planner-step-';

    const state = {
        wizardStep: 1,
        baseline: {},
        steps: {}
    };

    let debouncedRenderComparison;

    const loadingEl = document.getElementById('planner-loading');
    const appEl = document.getElementById('planner-app');
    const baselineFieldsEl = document.getElementById('planner-baseline-fields');
    const stepFieldsEl = document.getElementById('planner-step-fields');
    const steppingResultsEl = document.getElementById('planner-stepping-results');
    const notesEl = document.getElementById('planner-notes');
    const kpiEl = document.getElementById('planner-kpi');
    const stepButtons = Array.from(document.querySelectorAll('#view-attribute-planner .planner-step'));
    const panels = Array.from(document.querySelectorAll('#view-attribute-planner .planner-panel'));
    const prevBtn = document.getElementById('planner-prev');
    const nextBtn = document.getElementById('planner-next');
    const resetStepsBtn = document.getElementById('planner-reset-steps');

    function toNumber(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function formatSignedPercent(valueDecimal) {
        const percent = valueDecimal * 100;
        const sign = percent >= 0 ? '+' : '';
        return sign + percent.toFixed(2) + '%';
    }

    function formatInteger(value) {
        const n = Number(value);
        return Number.isFinite(n) ? Math.floor(n).toLocaleString('zh-TW') : '0';
    }

    function formatIncrement(value) {
        const n = Number(value);
        return Number.isFinite(n) ? n.toLocaleString('zh-TW') : '0';
    }

    function loadStepsFromStorage() {
        const steps = createZeroStats();
        ATTRIBUTES.forEach(attr => {
            const saved = localStorage.getItem(STEP_STORAGE_PREFIX + attr.id);
            if (saved !== null) {
                steps[attr.id] = Math.max(0, toNumber(saved, 0));
            }
        });
        return steps;
    }

    function saveStepToStorage(attrId, value) {
        const key = STEP_STORAGE_PREFIX + attrId;
        if (value > 0) {
            localStorage.setItem(key, String(value));
        } else {
            localStorage.removeItem(key);
        }
    }

    function clearStepsStorage() {
        ATTRIBUTES.forEach(attr => {
            localStorage.removeItem(STEP_STORAGE_PREFIX + attr.id);
        });
    }

    function debounce(fn, delay) {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    function createZeroStats() {
        return Object.fromEntries(ATTRIBUTES.map(attr => [attr.id, 0]));
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

    function calculateSteppingComparison() {
        const scenario = readCombatScenario();
        const baselineStats = { ...scenario, ...state.baseline };
        const baselineDamage = combat.calculateCombatStats(baselineStats).expectedDamage;
        const results = [];

        ATTRIBUTES.forEach(attr => {
            const step = toNumber(state.steps[attr.id], 0);
            if (step <= 0) return;

            const rows = [];
            let previousDamage = baselineDamage;
            const baselineValue = toNumber(state.baseline[attr.id], 0);

            for (let level = 1; level <= STEP_LEVELS; level++) {
                const increment = level * step;
                const attrValue = baselineValue + increment;
                const stats = { ...baselineStats, [attr.id]: attrValue };
                const damage = combat.calculateCombatStats(stats).expectedDamage;
                const marginalGain = previousDamage > 0 ? ((damage - previousDamage) / previousDamage) : 0;
                const cumulativeGain = baselineDamage > 0 ? ((damage - baselineDamage) / baselineDamage) : 0;

                rows.push({
                    level,
                    increment,
                    appliedIncrement: attrValue - baselineValue,
                    damage,
                    marginalGain,
                    cumulativeGain
                });
                previousDamage = damage;
            }

            results.push({ attr, step, rows });
        });

        return {
            baselineDamage,
            results,
            notes: ['依目前傷害計算器的「進攻數值1 vs 防禦數值1」公式即時計算。']
        };
    }

    function renderComparison() {
        const result = calculateSteppingComparison();

        kpiEl.textContent = formatInteger(result.baselineDamage);
        steppingResultsEl.innerHTML = '';
        notesEl.innerHTML = '';

        if (result.baselineDamage <= 0) {
            const empty = document.createElement('p');
            empty.textContent = '目前基準傷害為 0，請先在傷害計算器設定可造成傷害的比較情境。';
            empty.className = 'planner-empty-note';
            steppingResultsEl.appendChild(empty);

            result.notes.forEach(note => {
                const p = document.createElement('p');
                p.textContent = note;
                notesEl.appendChild(p);
            });
            return;
        }

        if (result.results.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = '請在「增量」步驟為至少一項屬性設定階梯增量。';
            empty.className = 'planner-empty-note';
            steppingResultsEl.appendChild(empty);
        } else {
            const fragment = document.createDocumentFragment();
            result.results.forEach(group => {
                const section = document.createElement('div');
                section.className = 'planner-stepping-group';

                const heading = document.createElement('h4');
                heading.textContent = `${group.attr.name}（每階 +${group.step}）`;
                section.appendChild(heading);

                const wrap = document.createElement('div');
                wrap.className = 'planner-contrib-wrap';

                const table = document.createElement('table');
                table.className = 'planner-contrib-table';

                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                ['等級', '增加數值', '邊際提升', '累積提升'].forEach(text => {
                    const th = document.createElement('th');
                    th.textContent = text;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                group.rows.forEach(row => {
                    const tr = document.createElement('tr');

                    const tdLevel = document.createElement('td');
                    tdLevel.textContent = String(row.level);
                    tr.appendChild(tdLevel);

                    const tdIncrement = document.createElement('td');
                    tdIncrement.textContent = '+' + formatIncrement(row.appliedIncrement);
                    tr.appendChild(tdIncrement);

                    const tdMarginal = document.createElement('td');
                    tdMarginal.textContent = formatSignedPercent(row.marginalGain);
                    tdMarginal.className = row.marginalGain >= 0 ? 'planner-positive' : 'planner-negative';
                    tr.appendChild(tdMarginal);

                    const tdCumulative = document.createElement('td');
                    tdCumulative.textContent = formatSignedPercent(row.cumulativeGain);
                    tdCumulative.className = row.cumulativeGain >= 0 ? 'planner-positive' : 'planner-negative';
                    tr.appendChild(tdCumulative);

                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                wrap.appendChild(table);
                section.appendChild(wrap);
                fragment.appendChild(section);
            });
            steppingResultsEl.appendChild(fragment);
        }

        result.notes.forEach(note => {
            const p = document.createElement('p');
            p.textContent = note;
            notesEl.appendChild(p);
        });
    }

    debouncedRenderComparison = debounce(renderComparison, 150);

    function createBaselineField(attr) {
        const wrap = document.createElement('div');
        wrap.className = 'planner-field';

        const label = document.createElement('label');
        label.className = 'planner-field-label';
        label.setAttribute('for', `planner-baseline-${attr.id}`);
        label.textContent = attr.name;

        const input = document.createElement('input');
        input.id = `planner-baseline-${attr.id}`;
        input.type = 'number';
        input.value = String(state.baseline[attr.id] || 0);
        input.disabled = true;
        input.title = '此數值來自傷害計算器的進攻數值1';

        wrap.appendChild(label);
        wrap.appendChild(input);
        return wrap;
    }

    function createStepField(attr) {
        const wrap = document.createElement('div');
        wrap.className = 'planner-field';

        const label = document.createElement('label');
        label.className = 'planner-field-label';
        label.setAttribute('for', `planner-step-${attr.id}`);
        label.textContent = attr.name;

        const input = document.createElement('input');
        input.id = `planner-step-${attr.id}`;
        input.type = 'number';
        input.min = '0';
        input.step = String(attr.step || 1);
        input.value = state.steps[attr.id] ? String(state.steps[attr.id]) : '';
        input.placeholder = '例如：200';

        input.addEventListener('input', () => {
            const next = Math.max(0, toNumber(input.value, 0));
            state.steps[attr.id] = next;
            saveStepToStorage(attr.id, next);
            debouncedRenderComparison();
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                input.blur();
            }
        });

        wrap.appendChild(label);
        wrap.appendChild(input);
        return wrap;
    }

    function renderFields() {
        baselineFieldsEl.innerHTML = '';
        stepFieldsEl.innerHTML = '';

        const baselineFrag = document.createDocumentFragment();
        const stepFrag = document.createDocumentFragment();

        ATTRIBUTES.forEach(attr => {
            baselineFrag.appendChild(createBaselineField(attr));
            stepFrag.appendChild(createStepField(attr));
        });

        baselineFieldsEl.appendChild(baselineFrag);
        stepFieldsEl.appendChild(stepFrag);
    }

    function applyBaselineFromBridge(payload) {
        if (!payload || !payload.baselineAtk1) return;
        const incoming = payload.baselineAtk1;

        ATTRIBUTES.forEach(attr => {
            if (incoming[attr.id] !== undefined) {
                state.baseline[attr.id] = toNumber(incoming[attr.id], 0);
            }
        });

        ATTRIBUTES.forEach(attr => {
            const input = document.getElementById(`planner-baseline-${attr.id}`);
            if (input) {
                input.value = String(state.baseline[attr.id] || 0);
            }
        });

        renderComparison();
    }

    function setStep(nextStep) {
        state.wizardStep = Math.min(3, Math.max(1, nextStep));

        stepButtons.forEach(btn => {
            const step = Number(btn.dataset.step);
            const isActive = step === state.wizardStep;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
        });

        panels.forEach(panel => {
            const step = Number(panel.dataset.stepPanel);
            const isActive = step === state.wizardStep;
            panel.hidden = !isActive;
            panel.classList.toggle('active', isActive);
        });

        prevBtn.disabled = state.wizardStep === 1;
        nextBtn.textContent = state.wizardStep === 3 ? '完成' : '下一步';

        if (state.wizardStep === 3) {
            renderComparison();
        }
    }

    function bindEvents() {
        stepButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = Number(btn.dataset.step);
                setStep(target);
            });
        });

        prevBtn?.addEventListener('click', () => setStep(state.wizardStep - 1));
        nextBtn?.addEventListener('click', () => {
            if (state.wizardStep < 3) {
                setStep(state.wizardStep + 1);
                return;
            }
            notify({ type: 'info', title: '完成', message: '你可以返回前面步驟持續微調。', duration: 2500 });
        });

        resetStepsBtn?.addEventListener('click', () => {
            state.steps = createZeroStats();
            clearStepsStorage();
            renderFields();
            renderComparison();
            notify({ type: 'success', title: '已重置', message: '所有階梯增量已重置為 0', duration: 2500 });
        });

        if (window.pvpSyncBridge?.subscribe) {
            window.pvpSyncBridge.subscribe(applyBaselineFromBridge);
        }
    }

    function bootstrap() {
        loadingEl.hidden = false;
        appEl.hidden = true;

        state.baseline = createZeroStats();
        state.steps = loadStepsFromStorage();

        renderFields();

        const existing = window.pvpSyncBridge?.getBaselineAtk1?.();
        if (existing?._meta?.hasValue) {
            const baselineAtk1 = {};
            ATTRIBUTES.forEach(attr => {
                baselineAtk1[attr.id] = existing[attr.id] ?? 0;
            });
            applyBaselineFromBridge({
                baselineAtk1,
                source: existing._meta.source || 'bridge'
            });
        } else {
            renderComparison();
        }

        setStep(1);
        bindEvents();

        loadingEl.hidden = true;
        appEl.hidden = false;
    }

    bootstrap();
}

if (!window.__attributePlannerRouteListenerBound) {
    window.__attributePlannerRouteListenerBound = true;
    document.addEventListener('pvp:routechange', event => {
        if (event?.detail?.route === 'attribute-planner') {
            initAttributePlanner();
        }
    });
}
