function initLeague() {
    if (window.__leagueInitialized) return;
    window.__leagueInitialized = true;

    // ── A. 通知與常數設定 ─────────────────────────────────────────
    const notify = (options) => {
        if (window.showNotification) {
            window.showNotification(options);
        } else {
            alert(options.title + ': ' + options.message);
        }
    };

    const COLUMNS = [
        { key: 'name', label: '玩家名字', numeric: false },
        { key: 'role', label: '職業', numeric: false },
        { key: 'kills', label: '擊敗', numeric: true },
        { key: 'assists', label: '助攻', numeric: true },
        { key: 'resources', label: '資源', numeric: true },
        { key: 'playerDamage', label: '對玩家傷害', numeric: true },
        { key: 'buildingDamage', label: '對建築傷害', numeric: true },
        { key: 'healing', label: '治療值', numeric: true },
        { key: 'damageTaken', label: '承受傷害', numeric: true },
        { key: 'deaths', label: '重傷', numeric: true },
        { key: 'revive', label: '化羽/清泉', numeric: true },
        { key: 'burn', label: '焚骨', numeric: true }
    ];

    let leagueData = null;
    let activeGuild = null;
    let sortColumn = null;
    let sortAsc = true;
    let activeFilter = '';
    let comparisonChart = null;
    let classChart = null;
    let statsCache = null;

    const WAN_COLUMNS = new Set(['playerDamage', 'buildingDamage', 'healing', 'damageTaken']);
    const chartUnavailableMessage = '圖表套件未載入，目前僅顯示表格與摘要資料';
    const ROLE_COLORS = {
        '九靈': '#A78BFA',
        '素問': '#FFC0CB',
        '神相': '#3B82F6',
        '碎夢': '#38BDF8',
        '血河': '#FF5555',
        '鐵衣': '#FACC15',
        '龍吟': '#22C55E',
        '玄機': '#EAE86F'
    };

    // ── B. 純函式工具（格式化、CSV 解析、統計）───────────────────
    function formatNumber(n) {
        return Number(n).toLocaleString('zh-TW');
    }

    function formatLargeNumber(n) {
        if (n < 10000) {
            return formatNumber(n);
        }
        const totalWan = Math.floor(n / 10000);
        const yi = Math.floor(totalWan / 10000);
        const wan = totalWan % 10000;

        if (yi > 0 && wan > 0) {
            return yi.toLocaleString('zh-TW') + '億' + wan.toLocaleString('zh-TW') + '萬';
        }
        if (yi > 0) {
            return yi.toLocaleString('zh-TW') + '億';
        }
        return totalWan.toLocaleString('zh-TW') + '萬';
    }

    function parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current.trim());
        return result;
    }

    function parseCSV(text) {
        const parseNum = (value) => parseInt(String(value).replace(/,/g, ''), 10) || 0;
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        const guilds = [];
        let currentGuild = null;
        let expectingData = false;

        for (let i = 0; i < lines.length; i++) {
            const fields = parseCSVLine(lines[i]);
            const nextFields = i + 1 < lines.length ? parseCSVLine(lines[i + 1]) : null;
            const isGuildHeader = fields.length === 2 && /^\d+$/.test(fields[1]) && nextFields?.[0] === '玩家名字';
            if (isGuildHeader) {
                currentGuild = { name: fields[0], players: [] };
                guilds.push(currentGuild);
                expectingData = false;
            } else if (fields[0] === '玩家名字') {
                expectingData = true;
            } else if (expectingData && currentGuild && fields.length >= 12) {
                currentGuild.players.push({
                    name: fields[0],
                    role: fields[1],
                    kills: parseNum(fields[2]),
                    assists: parseNum(fields[3]),
                    resources: parseNum(fields[4]),
                    playerDamage: parseNum(fields[5]),
                    buildingDamage: parseNum(fields[6]),
                    healing: parseNum(fields[7]),
                    damageTaken: parseNum(fields[8]),
                    deaths: parseNum(fields[9]),
                    revive: parseNum(fields[10]),
                    burn: parseNum(fields[11])
                });
            }
        }
        return { guilds };
    }

    function guildStats(guild) {
        const s = { kills: 0, playerDamage: 0, healing: 0, deaths: 0, revive: 0, burn: 0 };
        guild.players.forEach(p => {
            s.kills += p.kills;
            s.playerDamage += p.playerDamage;
            s.healing += p.healing;
            s.deaths += p.deaths;
            s.revive += p.revive;
            s.burn += p.burn;
        });
        return s;
    }

    function buildStatsCache() {
        const cache = {};
        if (!leagueData || !leagueData.guilds) return cache;
        leagueData.guilds.forEach(g => {
            cache[g.name] = guildStats(g);
        });
        return cache;
    }

    // ── C. DOM / 主題工具 ──────────────────────────────────────────
    function getThemeColors() {
        const style = getComputedStyle(document.body);
        const text = style.getPropertyValue('--text').trim() || '#E8EEF9';
        const muted = style.getPropertyValue('--muted').trim() || '#93A4C7';
        const border = style.getPropertyValue('--border').trim() || 'rgba(214,168,74,0.1)';
        return { text, muted, border };
    }

    function isChartAvailable() {
        return typeof window.Chart === 'function';
    }

    function renderChartFallback(sectionId, canvasId, message) {
        const section = document.getElementById(sectionId);
        const canvas = document.getElementById(canvasId);
        if (!section || !canvas) return;

        if (canvas._fallbackEl) {
            canvas._fallbackEl.remove();
            canvas._fallbackEl = null;
        }

        canvas.hidden = false;
        if (!message) {
            return;
        }

        canvas.hidden = true;
        const fallback = document.createElement('div');
        fallback.className = 'league-chart-fallback';
        fallback.textContent = message;
        canvas.insertAdjacentElement('afterend', fallback);
        canvas._fallbackEl = fallback;
    }

    // ── D. 渲染函式 ────────────────────────────────────────────────
    function populateRoleFilter() {
        const select = document.getElementById('league-class-filter');
        if (!select || !leagueData || !leagueData.guilds) return;

        const roles = [...new Set(leagueData.guilds.flatMap(g => g.players.map(p => p.role)))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-TW'));

        select.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = '全部職業';
        select.appendChild(allOption);

        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role;
            select.appendChild(option);
        });

        select.value = roles.includes(activeFilter) ? activeFilter : '';
        if (!roles.includes(activeFilter)) activeFilter = '';
        select.style.color = activeFilter ? (ROLE_COLORS[activeFilter] || 'var(--text)') : 'var(--text)';
    }

    function render() {
        if (!leagueData || !leagueData.guilds.length) {
            document.getElementById('league-upload-section').hidden = false;
            document.getElementById('league-upload-bar').hidden = true;
            document.getElementById('league-content').hidden = true;
            return;
        }
        document.getElementById('league-upload-section').hidden = true;
        document.getElementById('league-upload-bar').hidden = false;
        document.getElementById('league-content').hidden = false;

        if (!activeGuild || !leagueData.guilds.find(g => g.name === activeGuild)) {
            const saved = localStorage.getItem('leagueActiveTab');
            activeGuild = (saved && leagueData.guilds.find(g => g.name === saved))
                ? saved
                : leagueData.guilds[0].name;
        }

        statsCache = buildStatsCache();
        populateRoleFilter();

        renderSummary();
        renderTabs();
        renderTable();
        renderComparisonChart();
        renderClassChart();
    }

    function renderSummary() {
        const metrics = [
            { id: 'summary-kills', key: 'kills' },
            { id: 'summary-damage', key: 'playerDamage' },
            { id: 'summary-healing', key: 'healing' },
            { id: 'summary-deaths', key: 'deaths' },
            { id: 'summary-revive', key: 'revive' },
            { id: 'summary-burn', key: 'burn' }
        ];
        const WAN_SUMMARY = new Set(['playerDamage', 'healing']);
        metrics.forEach(m => {
            const card = document.getElementById(m.id);
            const breakdownEl = card.querySelector('.league-card-breakdown');
            let total = 0;
            breakdownEl.innerHTML = '';
            leagueData.guilds.forEach((g, index) => {
                const s = statsCache[g.name] || guildStats(g);
                total += s[m.key];

                const row = document.createElement('div');
                row.className = 'league-breakdown-row';

                const label = document.createElement('span');
                label.className = 'league-breakdown-label ' + (index % 2 === 0 ? 'league-guild-blue' : 'league-guild-red');
                label.textContent = g.name + ': ';

                const value = document.createElement('span');
                value.className = index % 2 === 0 ? 'league-guild-blue' : 'league-guild-red';
                value.textContent = WAN_SUMMARY.has(m.key) ? formatLargeNumber(s[m.key]) : formatNumber(s[m.key]);

                row.appendChild(label);
                row.appendChild(value);
                breakdownEl.appendChild(row);
            });
            card.querySelector('.league-card-value').textContent = WAN_SUMMARY.has(m.key) ? formatLargeNumber(total) : formatNumber(total);
        });
    }

    function renderTabs() {
        const container = document.getElementById('league-tabs');
        container.innerHTML = '';
        leagueData.guilds.forEach(g => {
            const btn = document.createElement('button');
            btn.className = 'league-tab' + (g.name === activeGuild ? ' active' : '');
            btn.textContent = g.name + ' (' + g.players.length + ')';
            btn.addEventListener('click', () => {
                activeGuild = g.name;
                localStorage.setItem('leagueActiveTab', activeGuild);
                renderTabs();
                renderTable();
                renderClassChart();
            });
            container.appendChild(btn);
        });
    }

    function renderTable() {
        const guild = leagueData.guilds.find(g => g.name === activeGuild);
        if (!guild) return;

        document.getElementById('league-table-title').textContent = guild.name + ' — 玩家數據';
        let players = [...guild.players];

        if (activeFilter) {
            players = players.filter(p => p.role === activeFilter);
        }

        if (sortColumn) {
            const col = COLUMNS.find(c => c.key === sortColumn);
            players.sort((a, b) => {
                let va = a[sortColumn], vb = b[sortColumn];
                if (col && col.numeric) return sortAsc ? va - vb : vb - va;
                return sortAsc
                    ? String(va).localeCompare(String(vb), 'zh-TW')
                    : String(vb).localeCompare(String(va), 'zh-TW');
            });
        }

        const tbody = document.getElementById('league-table-body');
        tbody.innerHTML = '';
        if (!players.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = COLUMNS.length;
            td.textContent = '無符合條件的玩家';
            td.style.textAlign = 'center';
            td.style.color = 'var(--muted)';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        players.forEach((p, i) => {
            const tr = document.createElement('tr');
            tr.className = i % 2 === 0 ? 'league-row-even' : 'league-row-odd';
            COLUMNS.forEach(col => {
                const td = document.createElement('td');
                td.textContent = col.numeric
                    ? (WAN_COLUMNS.has(col.key) ? formatLargeNumber(p[col.key]) : formatNumber(p[col.key]))
                    : p[col.key];
                if (col.key === 'role') {
                    td.style.color = ROLE_COLORS[p[col.key]] || 'var(--text)';
                    td.style.fontWeight = '700';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        document.querySelectorAll('#league-table thead th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (th.dataset.col === sortColumn) {
                th.classList.add(sortAsc ? 'sort-asc' : 'sort-desc');
            }
        });
    }

    function renderComparisonChart() {
        const section = document.getElementById('league-comparison-section');
        if (leagueData.guilds.length < 2) {
            section.hidden = true;
            document.getElementById('league-class-section').style.gridColumn = '1 / -1';
            return;
        }
        section.hidden = false;
        document.getElementById('league-class-section').style.gridColumn = '';

        const canvas = document.getElementById('league-comparison-chart');
        if (!canvas) return;
        if (comparisonChart) comparisonChart.destroy();
        renderChartFallback('league-comparison-section', 'league-comparison-chart', '');
        if (!isChartAvailable()) {
            renderChartFallback('league-comparison-section', 'league-comparison-chart', chartUnavailableMessage);
            return;
        }

        const labels = ['擊敗', '對玩家傷害', '治療值', '重傷', '化羽/清泉', '焚骨'];
        const keys = ['kills', 'playerDamage', 'healing', 'deaths', 'revive', 'burn'];
        const totals = {};
        const theme = getThemeColors();
        keys.forEach(k => totals[k] = 0);
        leagueData.guilds.forEach(g => {
            const s = statsCache[g.name] || guildStats(g);
            keys.forEach(k => totals[k] += s[k]);
        });

        const bgColors = [
            'rgba(154,206,235,0.8)', 'rgba(255,105,97,0.8)',
            'rgba(154,206,235,0.6)', 'rgba(255,105,97,0.6)',
            'rgba(154,206,235,0.45)', 'rgba(255,105,97,0.45)'
        ];
        const bdColors = [
            'rgba(154,206,235,1)', 'rgba(255,105,97,1)',
            'rgba(154,206,235,0.9)', 'rgba(255,105,97,0.9)',
            'rgba(154,206,235,0.75)', 'rgba(255,105,97,0.75)'
        ];

        const datasets = leagueData.guilds.map((g, i) => {
            const s = statsCache[g.name] || guildStats(g);
            return {
                label: g.name,
                data: keys.map(k => totals[k] > 0 ? Math.round(s[k] / totals[k] * 100) : 0),
                backgroundColor: bgColors[i % bgColors.length],
                borderColor: bdColors[i % bdColors.length],
                borderWidth: 1
            };
        });

        comparisonChart = new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: theme.text } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ctx.dataset.label + ': ' + ctx.raw + '%'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: theme.muted },
                        grid: { color: theme.border }
                    },
                    y: {
                        max: 100,
                        ticks: { color: theme.muted, callback: v => v + '%' },
                        grid: { color: theme.border }
                    }
                }
            }
        });
    }

    function renderClassChart() {
        const guild = leagueData.guilds.find(g => g.name === activeGuild);
        if (!guild) return;

        const canvas = document.getElementById('league-class-chart');
        if (!canvas) return;
        if (classChart) classChart.destroy();
        renderChartFallback('league-class-section', 'league-class-chart', '');
        if (!isChartAvailable()) {
            renderChartFallback('league-class-section', 'league-class-chart', chartUnavailableMessage);
            return;
        }

        const counts = {};
        guild.players.forEach(p => {
            counts[p.role] = (counts[p.role] || 0) + 1;
        });

        const theme = getThemeColors();
        const labels = Object.keys(counts);
        const chartColors = labels.map(role => ROLE_COLORS[role] || '#D6A84A');

        classChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: chartColors,
                    borderColor: theme.border,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: theme.text, padding: 12 }
                    }
                }
            }
        });
    }

    // ── E. 上傳解析工具與事件綁定 ────────────────────────────────
    function handleParsedText(rawText, file) {
        try {
            leagueData = parseCSV(rawText);
            if (!leagueData.guilds.length) {
                return false;
            }
            let storageWarning = false;
            try {
                localStorage.setItem('leagueData', JSON.stringify(leagueData));
                localStorage.setItem('leagueFilename', file.name);
            } catch (storageError) {
                storageWarning = true;
            }
            document.getElementById('league-filename').textContent = file.name;
            activeGuild = null;
            sortColumn = null;
            activeFilter = '';
            localStorage.removeItem('leagueActiveTab');
            render();
            notify({
                type: storageWarning ? 'info' : 'success',
                title: storageWarning ? '匯入成功（未儲存）' : '匯入成功',
                message: storageWarning
                    ? '已載入 ' + leagueData.guilds.length + ' 個公會的數據，數據量過大無法自動儲存'
                    : '已載入 ' + leagueData.guilds.length + ' 個公會的數據',
                duration: storageWarning ? 5000 : 3000
            });
            return true;
        } catch (err) {
            return false;
        }
    }

    // Upload handlers
    document.getElementById('league-upload-btn')?.addEventListener('click', () => {
        document.getElementById('league-file').click();
    });

    document.getElementById('league-reupload-btn')?.addEventListener('click', () => {
        document.getElementById('league-file').click();
    });

    document.getElementById('league-file')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = String(ev.target.result || '');
            if (handleParsedText(text, file)) {
                return;
            }

            // Fallback for common Traditional Chinese CSV encodings from Windows exports.
            const fallbackReader = new FileReader();
            fallbackReader.onload = (ev2) => {
                const fallbackText = String(ev2.target.result || '');
                if (!handleParsedText(fallbackText, file)) {
                    notify({
                        type: 'error',
                        title: '解析失敗',
                        message: '未找到有效的公會數據，請確認CSV為 UTF-8 或 Big5/GBK 編碼',
                        duration: 5000
                    });
                }
            };
            fallbackReader.readAsText(file, 'Big5');
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
    });

    document.addEventListener('pvp:themechange', () => {
        if (!leagueData || !leagueData.guilds?.length) return;
        if (document.getElementById('view-league')?.hidden) return;
        renderComparisonChart();
        renderClassChart();
    });

    // Sort handler
    document.querySelectorAll('#league-table thead th').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.col;
            if (sortColumn === col) {
                sortAsc = !sortAsc;
            } else {
                sortColumn = col;
                const colDef = COLUMNS.find(c => c.key === col);
                sortAsc = colDef && colDef.numeric ? false : true;
            }
            renderTable();
        });
    });

    // Filter handler
    document.getElementById('league-class-filter')?.addEventListener('change', (e) => {
        activeFilter = e.target.value;
        e.target.style.color = activeFilter ? (ROLE_COLORS[activeFilter] || 'var(--text)') : 'var(--text)';
        renderTable();
    });

    // ── F. 初始化與 localStorage 還原 ─────────────────────────────
    // Load saved data
    const saved = localStorage.getItem('leagueData');
    if (saved) {
        try {
            leagueData = JSON.parse(saved);
            document.getElementById('league-filename').textContent =
                localStorage.getItem('leagueFilename') || '已儲存的數據';
            render();
        } catch (e) {
            localStorage.removeItem('leagueData');
        }
    }
}
