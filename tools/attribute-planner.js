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
    const kpiStripEl = document.getElementById('planner-kpi-strip');
    const summaryEl = document.getElementById('planner-summary');
    const cardsEl = document.getElementById('planner-cards');
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


    function getLevelRankings(result) {
        return Array.from({ length: STEP_LEVELS }, (_, index) => {
            const level = index + 1;
            const ranked = result.results
                .map(group => {
                    const row = group.rows[index];
                    return {
                        level,
                        attr: group.attr,
                        step: group.step,
                        appliedIncrement: row.appliedIncrement,
                        marginalGain: row.marginalGain,
                        cumulativeGain: row.cumulativeGain
                    };
                })
                .sort((a, b) => b.marginalGain - a.marginalGain);

            return {
                level,
                ranked,
                best: ranked[0] || null
            };
        });
    }

    function getTopLevelLeader(rankings) {
        const counts = new Map();
        rankings.forEach(levelRanking => {
            if (!levelRanking.best) return;
            const current = counts.get(levelRanking.best.attr.id) || {
                attr: levelRanking.best.attr,
                wins: 0
            };
            current.wins += 1;
            counts.set(levelRanking.best.attr.id, current);
        });

        return Array.from(counts.values()).sort((a, b) => b.wins - a.wins)[0] || null;
    }

    function renderKPIStrip(result) {
        if (!kpiStripEl) return;
        const activeCount = result.results.length;
        const rankings = getLevelRankings(result);
        const firstLevelBest = rankings[0]?.best || null;
        const topLeader = getTopLevelLeader(rankings);

        const bestVal = firstLevelBest
            ? `<span class="planner-kpi-val" style="color:${firstLevelBest.attr.color}">${firstLevelBest.attr.name}<small>${formatSignedPercent(firstLevelBest.marginalGain)}</small></span>`
            : '<span class="planner-kpi-val">—</span>';
        const leaderVal = topLeader
            ? `<span class="planner-kpi-val" style="color:${topLeader.attr.color}">${topLeader.attr.name}<small>${topLeader.wins} / ${STEP_LEVELS}</small></span>`
            : '<span class="planner-kpi-val">—</span>';

        kpiStripEl.innerHTML = `
            <div class="planner-kpi"><div class="planner-kpi-lbl">基準有效傷害</div><div class="planner-kpi-val">${formatInteger(result.baselineDamage)}</div></div>
            <div class="planner-kpi"><div class="planner-kpi-lbl">比較中屬性</div><div class="planner-kpi-val">${activeCount}<small>/ ${ATTRIBUTES.length}</small></div></div>
            <div class="planner-kpi"><div class="planner-kpi-lbl">第 1 級最佳 CP</div>${bestVal}</div>
            <div class="planner-kpi"><div class="planner-kpi-lbl">10 級最佳次數</div>${leaderVal}</div>
        `;
    }

    function renderSummaryBars(result) {
        if (!summaryEl) return;
        if (result.results.length === 0) {
            summaryEl.innerHTML = '';
            return;
        }
        const rankings = getLevelRankings(result);
        summaryEl.innerHTML = rankings.map(levelRanking => `
            <div class="planner-level-row">
                <div class="planner-level-label">Lv.${levelRanking.level}</div>
                <div class="planner-level-rank-list">
                    ${levelRanking.ranked.map((entry, index) => `
                        <span class="planner-level-rank" style="--rank-color:${entry.attr.color}">
                            <span class="planner-level-rank-no">#${index + 1}</span>
                            <span class="planner-swatch" style="background:${entry.attr.color}"></span>
                            <span class="planner-level-attr">${entry.attr.name}</span>
                            <span class="planner-level-gain">${formatSignedPercent(entry.marginalGain)}</span>
                        </span>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    function renderCards(result) {
        if (!cardsEl) return;
        if (result.results.length === 0) {
            cardsEl.innerHTML = '';
            return;
        }
        cardsEl.innerHTML = result.results.map(g => cardSVG(g)).join('');
    }

    function cardSVG(g) {
        const W = 240, H = 120, P = 10;
        const innerW = W - P * 2, innerH = H - P * 2;
        const marginalPts = g.rows.map(r => r.marginalGain);
        const maxM = Math.max(...marginalPts, 1e-9);
        const minM = Math.min(...marginalPts, 0);
        const span = Math.max(maxM - minM, 1e-9);
        const x = i => P + (i / (STEP_LEVELS - 1)) * innerW;
        const y = v => P + innerH - ((v - minM) / span) * innerH;

        const linePath = g.rows.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(r.marginalGain).toFixed(1)}`).join(' ');
        const areaPath = `${linePath} L${x(STEP_LEVELS - 1).toFixed(1)},${(P + innerH).toFixed(1)} L${x(0).toFixed(1)},${(P + innerH).toFixed(1)} Z`;
        const dots = g.rows.map((r, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(r.marginalGain).toFixed(1)}" r="2.4" fill="${g.attr.color}"/>`).join('');

        const first = g.rows[0].marginalGain, last = g.rows[g.rows.length - 1].marginalGain;
        const dropPct = first > 0 ? ((first - last) / first * 100) : 0;
        let trendCls = 'flat', trendTxt = '持平', trendArrow = '→';
        if (dropPct > 2) { trendCls = 'down'; trendTxt = `遞減 ${dropPct.toFixed(0)}%`; trendArrow = '↘'; }
        else if (dropPct < -1) { trendCls = 'up'; trendTxt = `遞增 ${Math.abs(dropPct).toFixed(0)}%`; trendArrow = '↗'; }

        const gridLines = [0.25, 0.5, 0.75].map(f =>
            `<line x1="${P}" y1="${(P + innerH * f).toFixed(1)}" x2="${P + innerW}" y2="${(P + innerH * f).toFixed(1)}" stroke="rgba(74,158,255,.08)" stroke-width="1"/>`
        ).join('');

        return `
            <div class="planner-card">
                <div class="planner-card-head">
                    <div class="planner-card-ttl"><span class="planner-swatch" style="background:${g.attr.color}"></span>${g.attr.name}</div>
                    <div class="planner-card-step">+${formatIncrement(g.step)} / 級</div>
                </div>
                <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${g.attr.name}邊際提升折線">
                    ${gridLines}
                    <path d="${areaPath}" fill="${g.attr.color}1a"/>
                    <path d="${linePath}" fill="none" stroke="${g.attr.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    ${dots}
                </svg>
                <div class="planner-card-foot">
                    <span class="planner-card-lbl">第 1 級增益 <span class="planner-card-v">${formatSignedPercent(first)}</span></span>
                    <span class="planner-card-trend ${trendCls}">${trendArrow} ${trendTxt}</span>
                </div>
            </div>
        `;
    }

    function renderComparison() {
        const result = calculateSteppingComparison();

        kpiEl.textContent = formatInteger(result.baselineDamage);
        steppingResultsEl.innerHTML = '';
        notesEl.innerHTML = '';

        renderKPIStrip(result);
        renderSummaryBars(result);
        renderCards(result);

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
            empty.textContent = '請為至少一項屬性設定階梯增量。';
            empty.className = 'planner-empty-note';
            steppingResultsEl.appendChild(empty);
        } else {
            const wrap = document.createElement('div');
            wrap.className = 'planner-contrib-wrap';

            const table = document.createElement('table');
            table.className = 'planner-contrib-table planner-combined-table';

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');

            const thLevel = document.createElement('th');
            thLevel.textContent = '等級';
            headerRow.appendChild(thLevel);

            result.results.forEach(group => {
                ['累積增量', '本級提升', '累積提升'].forEach(label => {
                    const th = document.createElement('th');
                    th.textContent = `${group.attr.name}(${label})`;
                    headerRow.appendChild(th);
                });
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            for (let level = 1; level <= STEP_LEVELS; level++) {
                const tr = document.createElement('tr');

                const tdLevel = document.createElement('td');
                tdLevel.textContent = String(level);
                tr.appendChild(tdLevel);

                result.results.forEach(group => {
                    const row = group.rows[level - 1];

                    const tdIncrement = document.createElement('td');
                    tdIncrement.textContent = '+' + formatIncrement(row.appliedIncrement);
                    tr.appendChild(tdIncrement);

                    const tdMarginal = document.createElement('td');
                    tdMarginal.textContent = formatSignedPercent(row.marginalGain);
                    tdMarginal.className = row.marginalGain >= 0 ? 'planner-positive' : 'planner-negative';
                    tr.appendChild(tdMarginal);

                    const tdCumulative = document.createElement('td');
                    tdCumulative.textContent = formatSignedPercent(row.cumulativeGain);
                    tdCumulative.className = 'planner-cumulative' + (row.cumulativeGain >= 0 ? ' planner-positive' : ' planner-negative');
                    tr.appendChild(tdCumulative);
                });

                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            wrap.appendChild(table);
            steppingResultsEl.appendChild(wrap);
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
        wrap.className = 'planner-field planner-field-readonly';

        const label = document.createElement('label');
        label.className = 'planner-field-label';
        label.setAttribute('for', `planner-baseline-${attr.id}`);
        label.innerHTML = `<span class="planner-swatch" style="background:${attr.color}"></span>${attr.name}`;

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
        label.innerHTML = `<span class="planner-swatch" style="background:${attr.color}"></span>${attr.name}`;

        const input = document.createElement('input');
        input.id = `planner-step-${attr.id}`;
        input.type = 'number';
        input.min = '0';
        input.step = String(attr.step || 1);
        input.value = state.steps[attr.id] ? String(state.steps[attr.id]) : '';
        input.placeholder = '0';
        input.inputMode = 'numeric';

        function normalizeStepInputDisplay() {
            const next = Math.max(0, toNumber(input.value, 0));
            input.value = next > 0 ? String(next) : '';
        }

        input.addEventListener('input', () => {
            const next = Math.max(0, toNumber(input.value, 0));
            state.steps[attr.id] = next;
            saveStepToStorage(attr.id, next);
            debouncedRenderComparison();
        });

        input.addEventListener('blur', normalizeStepInputDisplay);
        input.addEventListener('change', normalizeStepInputDisplay);

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

    function bindEvents() {
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
