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
    const cardsEl = document.getElementById('planner-cards');
    const resetStepsBtn = document.getElementById('planner-reset-steps');

    // ---- tab group elements ----
    const tabGroupEl = document.getElementById('planner-tab-group');
    const tabButtons = tabGroupEl ? Array.from(tabGroupEl.querySelectorAll('[role="tab"]')) : [];
    const badgeSummaryEl = document.getElementById('planner-badge-summary');
    const badgeTrendEl = document.getElementById('planner-badge-trend');
    const badgeDetailEl = document.getElementById('planner-badge-detail');
    const metaSummaryEl = document.getElementById('planner-meta-summary');
    const metaTrendEl = document.getElementById('planner-meta-trend');
    const metaDetailEl = document.getElementById('planner-meta-detail');
    const tabPanelMap = {
        'planner-tab-summary': { panel: 'planner-panel-summary', meta: metaSummaryEl },
        'planner-tab-trend': { panel: 'planner-panel-trend', meta: metaTrendEl },
        'planner-tab-detail': { panel: 'planner-panel-detail', meta: metaDetailEl }
    };

    // ---- level sub-tab (summary redesign) ----
    const summarySubtabListEl = document.getElementById('planner-summary-subtabs');
    const summaryContentEl = document.getElementById('planner-summary-content');
    const summaryContentTitleEl = document.getElementById('planner-summary-content-title');
    const summaryContentSubmetaEl = document.getElementById('planner-summary-content-submeta');
    const summaryToolbarEl = document.getElementById('planner-summary-toolbar');
    const summaryContentMetaEl = document.getElementById('planner-summary-content-meta');
    // active summary sub-tab: 'overview' or 'lv:<N>' (1..STEP_LEVELS)
    let activeSummarySubtab = 'overview';
    let summarySubtabsBuilt = false;

    function activateTab(tabId, { focus = false } = {}) {
        const target = tabPanelMap[tabId];
        if (!target) return;
        tabButtons.forEach(btn => {
            const isActive = btn.id === tabId;
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.setAttribute('tabindex', isActive ? '0' : '-1');
            const panelId = tabPanelMap[btn.id]?.panel;
            const panelEl = panelId ? document.getElementById(panelId) : null;
            if (panelEl) panelEl.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });
        Object.values(tabPanelMap).forEach(t => {
            if (t.meta) t.meta.hidden = !(t === target);
        });
        if (focus) {
            const btn = document.getElementById(tabId);
            if (btn) btn.focus();
        }
    }

    if (tabGroupEl) {
        tabButtons.forEach(btn => btn.addEventListener('click', () => activateTab(btn.id)));
        tabGroupEl.addEventListener('keydown', (event) => {
            // Only handle keyboard nav when focus is on a main tab button;
            // ignore events from the summary level sub-tabs (they have their own handler).
            if (event.defaultPrevented) return;
            if (!tabButtons.includes(event.target)) return;
            const activeIdx = tabButtons.findIndex(b => b === event.target);
            if (activeIdx === -1) return;
            let next = null;
            if (event.key === 'ArrowRight') next = (activeIdx + 1) % tabButtons.length;
            else if (event.key === 'ArrowLeft') next = (activeIdx - 1 + tabButtons.length) % tabButtons.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = tabButtons.length - 1;
            if (next !== null) {
                event.preventDefault();
                activateTab(tabButtons[next].id, { focus: true });
            }
        });
    }

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
        if (!summaryContentEl) return;
        if (badgeSummaryEl) badgeSummaryEl.textContent = result.results.length;

        // empty-state: reset to overview, hide toolbar + content-meta, show note in content
        if (result.results.length === 0) {
            activeSummarySubtab = 'overview';
            if (summaryToolbarEl) summaryToolbarEl.hidden = true;
            if (summaryContentMetaEl) summaryContentMetaEl.hidden = true;
            if (summarySubtabListEl) summarySubtabListEl.innerHTML = '';
            summarySubtabsBuilt = false;
            summaryContentEl.innerHTML = '<p class="planner-empty-note">請為至少一項屬性設定階梯增量。</p>';
            summaryContentEl.removeAttribute('aria-labelledby');
            if (summaryContentTitleEl) summaryContentTitleEl.textContent = '每級邊際增益排序';
            if (summaryContentSubmetaEl) summaryContentSubmetaEl.textContent = '';
            return;
        }

        // ensure toolbar + content-meta visible
        if (summaryToolbarEl) summaryToolbarEl.hidden = false;
        if (summaryContentMetaEl) summaryContentMetaEl.hidden = false;

        buildSummarySubtabs();
        updateSummarySubtabStates();
        renderSummaryContent(result);
    }

    // ---- level sub-tab strip (build once, then only update states) ----
    function buildSummarySubtabs() {
        if (!summarySubtabListEl || summarySubtabsBuilt) return;
        const tabs = [{ id: 'overview', label: '全部總覽', badge: null }];
        for (let lv = 1; lv <= STEP_LEVELS; lv++) {
            tabs.push({ id: 'lv:' + lv, label: 'Lv.' + lv, badge: lv });
        }
        summarySubtabListEl.innerHTML = tabs.map(t => {
            const btnId = 'planner-summary-subtab-' + (t.id === 'overview' ? 'overview' : 'lv-' + t.id.split(':')[1]);
            return `<button class="planner-subtab-btn" role="tab" id="${btnId}" data-subtab="${t.id}" aria-selected="false" aria-controls="planner-summary-content" tabindex="-1" type="button">
                ${t.label}${t.badge !== null ? `<span class="planner-subtab-badge">${String(t.badge).padStart(2, '0')}</span>` : ''}
            </button>`;
        }).join('');
        summarySubtabListEl.querySelectorAll('.planner-subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeSummarySubtab = btn.dataset.subtab;
                updateSummarySubtabStates();
                renderSummaryContent(calculateSteppingComparison());
                btn.focus();
            });
        });
        summarySubtabsBuilt = true;
    }

    // update aria-selected / tabindex / aria-labelledby on existing buttons + panel
    // (buttons are built once by buildSummarySubtabs; this only mutates attributes,
    //  so horizontal scrollLeft is inherently preserved — no save/restore needed)
    function updateSummarySubtabStates() {
        if (!summarySubtabListEl) return;
        const buttons = summarySubtabListEl.querySelectorAll('.planner-subtab-btn');
        buttons.forEach(btn => {
            const isActive = btn.dataset.subtab === activeSummarySubtab;
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            btn.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        // point panel's aria-labelledby at the active subtab for screen readers
        if (summaryContentEl) {
            const activeBtn = summarySubtabListEl.querySelector(`[data-subtab="${activeSummarySubtab}"]`);
            if (activeBtn) summaryContentEl.setAttribute('aria-labelledby', activeBtn.id);
        }
    }

    function summarySubtabOrder() {
        const ids = ['overview'];
        for (let lv = 1; lv <= STEP_LEVELS; lv++) ids.push('lv:' + lv);
        return ids;
    }

    function cycleSummarySubtab(delta) {
        const order = summarySubtabOrder();
        const idx = order.indexOf(activeSummarySubtab);
        if (idx < 0) return;
        activeSummarySubtab = order[(idx + delta + order.length) % order.length];
        updateSummarySubtabStates();
        renderSummaryContent(calculateSteppingComparison());
        const btn = summarySubtabListEl.querySelector(`[data-subtab="${activeSummarySubtab}"]`);
        if (btn) btn.focus();
    }

    function jumpSummarySubtab(target) {
        activeSummarySubtab = target;
        updateSummarySubtabStates();
        renderSummaryContent(calculateSteppingComparison());
        const btn = summarySubtabListEl.querySelector(`[data-subtab="${target}"]`);
        if (btn) btn.focus();
    }

    if (summarySubtabListEl) {
        summarySubtabListEl.addEventListener('keydown', (event) => {
            // stopPropagation so the outer tab-group handler never sees sub-tab keys
            switch (event.key) {
                case 'ArrowRight': event.preventDefault(); event.stopPropagation(); cycleSummarySubtab(1); break;
                case 'ArrowLeft':  event.preventDefault(); event.stopPropagation(); cycleSummarySubtab(-1); break;
                case 'Home':       event.preventDefault(); event.stopPropagation(); jumpSummarySubtab('overview'); break;
                case 'End':        event.preventDefault(); event.stopPropagation(); jumpSummarySubtab('lv:' + STEP_LEVELS); break;
            }
        });
    }

    // ---- dispatch content render based on active sub-tab ----
    function renderSummaryContent(result) {
        const sub = activeSummarySubtab;
        if (sub === 'overview') {
            if (summaryContentTitleEl) summaryContentTitleEl.textContent = '全部總覽';
            if (summaryContentSubmetaEl) summaryContentSubmetaEl.textContent = '每條線為一個屬性，追蹤其在各等級的邊際增益排名變化';
            renderBumpChart(result);
        } else {
            const lv = Number(sub.split(':')[1]);
            renderLevelBars(result, lv);
        }
    }

    // ---- bump chart (ranking trajectory) for 全部總覽 ----
    function renderBumpChart(result) {
        if (!summaryContentEl) return;
        if (!result.results.length) {
            summaryContentEl.innerHTML = '<p class="planner-empty-note">請為至少一項屬性設定階梯增量，才能檢視排名軌跡。</p>';
            return;
        }

        const rankings = getLevelRankings(result); // [{level, ranked:[{attr,...,marginalGain}], best}]
        const N = result.results.length;

        // per-attribute rank trajectories
        const trajs = result.results.map(group => {
            const ranks = [];
            for (let i = 0; i < STEP_LEVELS; i++) {
                const found = rankings[i].ranked.findIndex(e => e.attr.id === group.attr.id);
                ranks.push(found >= 0 ? (found + 1) : N);
            }
            return { attr: group.attr, ranks };
        });

        // SVG layout: 760 wide; height scales with active attribute count
        const W = 760;
        const P_L = 40, P_R = 130, P_T = 18, P_B = 36;
        const ROW_GAP = 38;        // px per rank step
        const MIN_INNER_H = 60;    // min plot height (avoids collapsed look for N=1)
        const innerH = Math.max((N - 1) * ROW_GAP, MIN_INNER_H);
        const H = P_T + P_B + innerH;
        const innerW = W - P_L - P_R;
        const xForLevel = lv => P_L + ((lv - 1) / (STEP_LEVELS - 1)) * innerW;
        const yForRank = r => P_T + ((r - 1) / Math.max(N - 1, 1)) * innerH;

        let grid = '';
        for (let r = 1; r <= N; r++) {
            const y = yForRank(r);
            grid += `<line class="planner-bump-grid" x1="${P_L}" y1="${y.toFixed(1)}" x2="${(P_L + innerW).toFixed(1)}" y2="${y.toFixed(1)}"/>`;
            grid += `<text class="planner-bump-axis" x="${(P_L - 8).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end">#${r}</text>`;
        }
        let xlabels = '';
        for (let lv = 1; lv <= STEP_LEVELS; lv++) {
            const x = xForLevel(lv);
            xlabels += `<text class="planner-bump-axis" x="${x.toFixed(1)}" y="${(P_T + innerH + 18).toFixed(1)}" text-anchor="middle">Lv.${lv}</text>`;
        }
        const axes = `
            <line class="planner-bump-axis-line" x1="${P_L}" y1="${P_T}" x2="${P_L}" y2="${(P_T + innerH).toFixed(1)}"/>
            <line class="planner-bump-axis-line" x1="${P_L}" y1="${(P_T + innerH).toFixed(1)}" x2="${(P_L + innerW).toFixed(1)}" y2="${(P_T + innerH).toFixed(1)}"/>
        `;

        let polys = '';
        let dotsAndRanks = '';
        const endLabelAnchors = [];
        trajs.forEach(t => {
            const pts = t.ranks.map((r, i) => `${xForLevel(i + 1).toFixed(1)},${yForRank(r).toFixed(1)}`);
            const linePath = 'M' + pts.join(' L');
            polys += `<path class="planner-bump-line" d="${linePath}" stroke="${t.attr.color}" opacity="0.92"/>`;

            t.ranks.forEach((r, i) => {
                const cx = xForLevel(i + 1);
                const cy = yForRank(r);
                dotsAndRanks += `<circle class="planner-bump-dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="${t.attr.color}"/>`;
                dotsAndRanks += `<text class="planner-bump-rank" x="${cx.toFixed(1)}" y="${(cy - 6).toFixed(1)}" text-anchor="middle">${r}</text>`;
            });

            endLabelAnchors.push({ attr: t.attr, y: yForRank(t.ranks[STEP_LEVELS - 1]) });
        });

        // stagger end labels vertically to avoid overlap
        endLabelAnchors.sort((a, b) => a.y - b.y);
        const minGap = 14;
        for (let i = 1; i < endLabelAnchors.length; i++) {
            if (endLabelAnchors[i].y - endLabelAnchors[i - 1].y < minGap) {
                endLabelAnchors[i].y = endLabelAnchors[i - 1].y + minGap;
            }
        }
        endLabelAnchors.forEach(a => {
            a.y = Math.max(P_T + 4, Math.min(P_T + innerH - 4, a.y));
        });
        let endLabels = '';
        endLabelAnchors.forEach(a => {
            const lx = P_L + innerW + 8;
            const name = a.attr.name.length > 5 ? a.attr.name.slice(0, 4) + '…' : a.attr.name;
            const txtW = name.length * 9 + 12;
            endLabels += `<rect class="planner-bump-label-bg" x="${(lx - 4).toFixed(1)}" y="${(a.y - 8).toFixed(1)}" width="${txtW}" height="16" rx="4"/>`;
            endLabels += `<circle cx="${(lx - 2).toFixed(1)}" cy="${a.y.toFixed(1)}" r="3.5" fill="${a.attr.color}"/>`;
            endLabels += `<text class="planner-bump-label" x="${(lx + 10).toFixed(1)}" y="${(a.y + 3).toFixed(1)}" fill="${a.attr.color}">${name}</text>`;
        });

        const svg = `
            <svg class="planner-bump-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="各等級邊際增益排名軌跡圖">
                ${grid}
                ${axes}
                ${xlabels}
                ${polys}
                ${dotsAndRanks}
                ${endLabels}
            </svg>
        `;

        summaryContentEl.innerHTML = `
            <p class="planner-bump-caption"><span class="planner-bump-em">bump chart</span> · 每條線為一個屬性，追蹤其在各等級的邊際增益排名變化。線往上 = 排名提升。每個圓點旁的數字為該級排名。</p>
            <div class="planner-bump-wrap">${svg}</div>
        `;
    }

    // ---- horizontal bar ranking for a specific level (diverging: +right / -left) ----
    function renderLevelBars(result, lv) {
        if (!summaryContentEl) return;
        if (summaryContentTitleEl) summaryContentTitleEl.textContent = `Lv.${lv} 邊際增益排序`;
        if (summaryContentSubmetaEl) summaryContentSubmetaEl.textContent = `每 +階梯量 該屬性於第 ${lv} 級的傷害邊際提升 %`;

        if (!result.results.length) {
            summaryContentEl.innerHTML = '<p class="planner-empty-note">請為至少一項屬性設定階梯增量。</p>';
            return;
        }

        // reuse the shared ranking helper (sorted by marginalGain desc per level)
        const ranked = getLevelRankings(result)[lv - 1].ranked
            .map(entry => ({ attr: entry.attr, marginal: entry.marginalGain }));

        const maxAbs = Math.max(...ranked.map(r => Math.abs(r.marginal)), 1e-9);
        const tint = c => `${c}33`;

        summaryContentEl.innerHTML = ranked.map((r, i) => {
            const pct = (Math.abs(r.marginal) / maxAbs * 100).toFixed(1);
            const isNegative = r.marginal < 0;
            const fillStyle = `width:${pct}%;background:linear-gradient(90deg,${tint(r.attr.color)},${r.attr.color})`;
            // negative bars anchor to the right edge and grow leftward
            const fillClass = isNegative ? 'planner-bar-fill planner-bar-fill-negative' : 'planner-bar-fill';
            const fill = isNegative
                ? `<div class="${fillClass}" style="${fillStyle}"></div>`
                : `<div class="${fillClass}" style="${fillStyle}"></div>`;
            const pctClass = isNegative ? 'planner-bar-pct planner-bar-pct-negative' : 'planner-bar-pct';
            return `
                <div class="planner-bar-row ${isNegative ? 'planner-bar-row-negative' : ''}">
                    <div class="planner-bar-name"><span class="planner-swatch" style="background:${r.attr.color}"></span>${r.attr.name}</div>
                    <div class="planner-bar-track">${fill}</div>
                    <div class="${pctClass}" style="color:${r.attr.color}">${formatSignedPercent(r.marginal)}</div>
                    <div class="planner-bar-rank">#${i + 1}</div>
                </div>
            `;
        }).join('');
    }

    function renderCards(result) {
        if (!cardsEl) return;
        if (badgeTrendEl) badgeTrendEl.textContent = result.results.length;
        if (result.results.length === 0) {
            cardsEl.innerHTML = '<p class="planner-empty-note">請為至少一項屬性設定階梯增量。</p>';
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

        // baseline-damage guard: render a consistent empty state before drawing panels
        if (result.baselineDamage <= 0) {
            const empty = document.createElement('p');
            empty.textContent = '目前基準傷害為 0，請先在傷害計算器設定可造成傷害的比較情境。';
            empty.className = 'planner-empty-note';

            // KPI strip: show baseline 0 + dashes for best/leader (no meaningful comparison)
            if (kpiStripEl) {
                kpiStripEl.innerHTML = `
                    <div class="planner-kpi"><div class="planner-kpi-lbl">基準有效傷害</div><div class="planner-kpi-val">0</div></div>
                    <div class="planner-kpi"><div class="planner-kpi-lbl">比較中屬性</div><div class="planner-kpi-val">—</div></div>
                    <div class="planner-kpi"><div class="planner-kpi-lbl">第 1 級最佳 CP</div><div class="planner-kpi-val">—</div></div>
                    <div class="planner-kpi"><div class="planner-kpi-lbl">10 級最佳次數</div><div class="planner-kpi-val">—</div></div>
                `;
            }
            if (badgeSummaryEl) badgeSummaryEl.textContent = '0';
            if (badgeTrendEl) badgeTrendEl.textContent = '0';
            if (badgeDetailEl) badgeDetailEl.textContent = '0';

            // summary: hide toolbar + content-meta, single warning in content
            activeSummarySubtab = 'overview';
            if (summaryToolbarEl) summaryToolbarEl.hidden = true;
            if (summaryContentMetaEl) summaryContentMetaEl.hidden = true;
            if (summarySubtabListEl) { summarySubtabListEl.innerHTML = ''; summarySubtabsBuilt = false; }
            if (summaryContentTitleEl) summaryContentTitleEl.textContent = '每級邊際增益排序';
            if (summaryContentSubmetaEl) summaryContentSubmetaEl.textContent = '';
            if (summaryContentEl) {
                summaryContentEl.innerHTML = '';
                summaryContentEl.appendChild(empty.cloneNode(true));
                summaryContentEl.removeAttribute('aria-labelledby');
            }

            // trend cards: warning
            if (cardsEl) {
                cardsEl.innerHTML = '';
                cardsEl.appendChild(empty.cloneNode(true));
            }

            // detail table: warning
            steppingResultsEl.appendChild(empty.cloneNode(true));

            result.notes.forEach(note => {
                const p = document.createElement('p');
                p.textContent = note;
                notesEl.appendChild(p);
            });
            return;
        }

        renderKPIStrip(result);
        renderSummaryBars(result);
        renderCards(result);
        if (badgeDetailEl) badgeDetailEl.textContent = result.results.length;

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
