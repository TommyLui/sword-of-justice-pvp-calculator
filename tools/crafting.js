function initCrafting() {
    if (window.__craftingInitialized) return;
    window.__craftingInitialized = true;

    const notify = (options) => {
        if (window.showNotification) {
            window.showNotification(options);
        } else {
            alert(options.title + ': ' + options.message);
        }
    };

    // State
    let records = [];
    let filtered = [];
    let selectedId = null;
    let isLoading = false;
    let loadPromise = null;

    // DOM elements
    const searchInput = document.getElementById('crafting-search');
    const seasonFilter = document.getElementById('crafting-season-filter');
    const slotFilter = document.getElementById('crafting-slot-filter');
    const tagFilter = document.getElementById('crafting-tag-filter');
    const sortSelect = document.getElementById('crafting-sort');
    const resetBtn = document.getElementById('crafting-reset');
    const listContainer = document.getElementById('crafting-list');
    const countEl = document.getElementById('crafting-count');
    const detailContainer = document.getElementById('crafting-detail');

    // Season to seasonYear mapping
    const SEASON_YEAR_MAP = {
        'S1': '江湖緣起\n（第一賽年）',
        'S2': '江湖緣起\n（第一賽年）',
        'S3': '江湖緣起\n（第一賽年）',
        'S4': '千機紀年\n（第二賽年）',
        'S5': '千機紀年\n（第二賽年）',
        'S6': '千機紀年\n（第二賽年）',
        'S7': '沙與海之歌\n（第三賽年）',
        'S8': '沙與海之歌\n（第三賽年）',
        'S9': '沙與海之歌\n（第三賽年）'
    };

    // Slot order for tie-breaker (unknown slots sort after known)
    const SLOT_ORDER = ['武器', '防具', '腰帶', '鞋子', '項鍊'];

    // Helper to format season display (replace newline with ' · ')
    function formatSeasonDisplay(season) {
        if (!season) return '';
        return season.replace(/\n/g, ' · ');
    }

    function normalizeEffectText(text) {
        if (!text) return '';
        // Keep intentional blank-line breaks, but remove single line-wrap breaks.
        return text
            .replace(/\r/g, '')
            .replace(/\n{2,}/g, '\u0000')
            .replace(/\n/g, '')
            .replace(/\u0000/g, '\n\n')
            .trim();
    }

    // Extract season number for sorting
    function getSeasonNumber(season) {
        if (!season) return 9999; // Unknown seasons sort last
        const match = season.match(/S(\d+)/);
        return match ? parseInt(match[1], 10) : 9999;
    }

    // Load data
    async function loadData() {
        // Prevent re-entry race conditions
        if (isLoading && loadPromise) {
            return loadPromise;
        }
        if (records.length > 0) {
            return Promise.resolve();
        }

        isLoading = true;
        // Show loading state
        listContainer.innerHTML = '<div class="crafting-loading">載入中...</div>';
        detailContainer.innerHTML = '<div class="crafting-loading">載入中...</div>';
        
        loadPromise = (async () => {
            try {
                // Fallback: try multiple paths for robustness
                let response;
                const pathsToTry = [
                    'tools/crafting-db.json',
                    '../tools/crafting-db.json'
                ];
                
                for (const path of pathsToTry) {
                    try {
                        response = await fetch(path);
                        if (response.ok) break;
                    } catch (e) {
                        // Continue to next path
                    }
                }
                
                if (!response || !response.ok) {
                    throw new Error('Failed to load data');
                }
                
                const data = await response.json();
                
                // Normalize data: add seasonSortKey and correct seasonYear
                records = data.map(record => {
                    const seasonNum = getSeasonNumber(record.season);
                    const correctSeasonYear = SEASON_YEAR_MAP[record.season?.match(/S\d+/)?.[0]] || record.seasonYear;
                    
                    return {
                        ...record,
                        seasonYear: correctSeasonYear,
                        effectText: normalizeEffectText(record.effectText),
                        _seasonSortKey: seasonNum
                    };
                });
                
                initializeFilters();
                applyFilters();
            } catch (error) {
                console.error('Error loading crafting data:', error);
                listContainer.innerHTML = '<div class="crafting-empty">載入失敗，請重新整理頁面</div>';
                detailContainer.innerHTML = '<div class="crafting-detail-empty">載入失敗</div>';
                notify({
                    type: 'error',
                    title: '載入失敗',
                    message: '打造資料載入失敗，請聯絡管理員更新資料快照',
                    duration: 5000
                });
            } finally {
                isLoading = false;
                loadPromise = null;
            }
        })();

        return loadPromise;
    }

    // Initialize filter options from data
    function initializeFilters() {
        const seasons = [...new Set(records.map(r => r.season).filter(s => s))];
        const slots = [...new Set(records.map(r => r.slot).filter(s => s))];
        const tags = [...new Set(records.map(r => r.effectTag).filter(t => t))];

        // Populate season filter (sorted by season number ascending)
        seasonFilter.innerHTML = '<option value="">全部賽季</option>';
        seasons.sort((a, b) => {
            const numA = getSeasonNumber(a);
            const numB = getSeasonNumber(b);
            return numA - numB;
        });
        seasons.forEach(season => {
            const option = document.createElement('option');
            const seasonCode = season.match(/S\d+/)?.[0] || season;
            option.value = seasonCode;
            option.textContent = formatSeasonDisplay(season);
            seasonFilter.appendChild(option);
        });

        // Populate slot filter (sorted by SLOT_ORDER, then unknown slots)
        slotFilter.innerHTML = '<option value="">全部部位</option>';
        slots.sort((a, b) => {
            const idxA = SLOT_ORDER.indexOf(a);
            const idxB = SLOT_ORDER.indexOf(b);
            const orderA = idxA === -1 ? SLOT_ORDER.length : idxA;
            const orderB = idxB === -1 ? SLOT_ORDER.length : idxB;
            return orderA - orderB;
        });
        slots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot;
            option.textContent = slot;
            slotFilter.appendChild(option);
        });

        // Populate tag filter (with untagged option)
        tagFilter.innerHTML = '<option value="">全部標籤</option>';
        // Add untagged option
        const untaggedOption = document.createElement('option');
        untaggedOption.value = '__empty__';
        untaggedOption.textContent = '（無標籤）';
        tagFilter.appendChild(untaggedOption);
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
    }

    // Apply filters and search
    function applyFilters() {
        const search = searchInput.value.toLowerCase().trim();
        const seasonCode = seasonFilter.value;
        const slot = slotFilter.value;
        const tag = tagFilter.value;
        const sort = sortSelect.value;

        // Filter
        filtered = records.filter(record => {
            // Search filter
            if (search) {
                const searchMatch = 
                    (record.skillName && record.skillName.toLowerCase().includes(search)) ||
                    (record.effectTag && record.effectTag.toLowerCase().includes(search)) ||
                    (record.source && record.source.toLowerCase().includes(search)) ||
                    (record.boss && record.boss.toLowerCase().includes(search));
                if (!searchMatch) return false;
            }

            // Season filter (use season code)
            if (seasonCode) {
                const recordSeasonCode = record.season?.match(/S\d+/)?.[0] || '';
                if (recordSeasonCode !== seasonCode) return false;
            }

            // Slot filter
            if (slot && record.slot !== slot) return false;

            // Tag filter (support __empty__ for untagged)
            if (tag === '__empty__') {
                if (record.effectTag) return false;
            } else if (tag && record.effectTag !== tag) {
                return false;
            }

            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            let cmp = 0;
            
            if (sort === 'season-desc' || sort === 'season-asc') {
                // Use pre-computed season sort key
                cmp = (a._seasonSortKey || 9999) - (b._seasonSortKey || 9999);
                if (sort === 'season-desc') cmp = -cmp;
            } else if (sort === 'skill-asc' || sort === 'skill-desc') {
                cmp = (a.skillName || '').localeCompare(b.skillName || '', 'zh-TW');
                if (sort === 'skill-desc') cmp = -cmp;
            }

            // Tie-breaker: slot then skillName
            if (cmp === 0) {
                const slotA = SLOT_ORDER.indexOf(a.slot);
                const slotB = SLOT_ORDER.indexOf(b.slot);
                // Unknown slots sort after known slots
                const slotIdxA = slotA === -1 ? SLOT_ORDER.length : slotA;
                const slotIdxB = slotB === -1 ? SLOT_ORDER.length : slotB;
                cmp = slotIdxA - slotIdxB;
            }
            if (cmp === 0) {
                cmp = (a.skillName || '').localeCompare(b.skillName || '', 'zh-TW');
            }

            return cmp;
        });

        // Update count
        countEl.textContent = filtered.length;

        // Reconcile selectedId BEFORE renderList
        if (selectedId && !filtered.find(r => r.id === selectedId)) {
            selectedId = filtered.length > 0 ? filtered[0].id : null;
        }
        if (!selectedId && filtered.length > 0) {
            selectedId = filtered[0].id;
        }

        // Render list
        renderList();

        // Render detail
        renderDetail();
    }

    // Render list using DOM APIs (no innerHTML with raw data)
    function renderList() {
        // Clear existing content
        listContainer.innerHTML = '';
        
        if (filtered.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'crafting-empty';
            emptyDiv.textContent = '找不到符合條件的特技';
            listContainer.appendChild(emptyDiv);
            return;
        }

        const fragment = document.createDocumentFragment();
        
        filtered.forEach(record => {
            const item = document.createElement('div');
            item.className = `crafting-item${record.id === selectedId ? ' active' : ''}`;
            item.dataset.id = record.id;
            
            // Name
            const nameDiv = document.createElement('div');
            nameDiv.className = 'crafting-item-name';
            nameDiv.textContent = record.skillName || '未命名';
            item.appendChild(nameDiv);
            
            // Meta (season + slot)
            const metaDiv = document.createElement('div');
            metaDiv.className = 'crafting-item-meta';
            
            const seasonSpan = document.createElement('span');
            seasonSpan.className = 'crafting-item-season';
            seasonSpan.textContent = record.season ? formatSeasonDisplay(record.season) : '';
            metaDiv.appendChild(seasonSpan);
            
            const slotSpan = document.createElement('span');
            slotSpan.className = 'crafting-item-slot';
            slotSpan.textContent = record.slot || '';
            metaDiv.appendChild(slotSpan);
            
            item.appendChild(metaDiv);
            
            // Source
            const sourceDiv = document.createElement('div');
            sourceDiv.className = 'crafting-item-source';
            sourceDiv.textContent = record.source || '';
            item.appendChild(sourceDiv);
            
            // Tag (if exists)
            if (record.effectTag) {
                const tagDiv = document.createElement('div');
                tagDiv.className = 'crafting-item-tag';
                tagDiv.textContent = record.effectTag;
                item.appendChild(tagDiv);
            }
            
            // Click handler
            item.addEventListener('click', () => {
                selectedId = record.id;
                renderList();
                renderDetail();
            });
            
            fragment.appendChild(item);
        });
        
        listContainer.appendChild(fragment);
    }

    // Render detail using DOM APIs (no innerHTML with raw data)
    function renderDetail() {
        // Clear existing content
        detailContainer.innerHTML = '';
        
        if (!selectedId) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'crafting-detail-empty';
            emptyDiv.textContent = '請選擇一個特技查看詳情';
            detailContainer.appendChild(emptyDiv);
            return;
        }

        const record = records.find(r => r.id === selectedId);
        if (!record) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'crafting-detail-empty';
            emptyDiv.textContent = '找不到特技資料';
            detailContainer.appendChild(emptyDiv);
            return;
        }

        const fragment = document.createDocumentFragment();
        
        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'crafting-detail-header';
        
        const titleH3 = document.createElement('h3');
        titleH3.className = 'crafting-detail-title';
        titleH3.textContent = record.skillName || '未命名';
        headerDiv.appendChild(titleH3);
        
        if (record.effectTag) {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'crafting-detail-tag';
            tagSpan.textContent = record.effectTag;
            headerDiv.appendChild(tagSpan);
        }
        
        fragment.appendChild(headerDiv);
        
        // Metadata section (renamed class to avoid collision)
        const metaSection = document.createElement('div');
        metaSection.className = 'crafting-detail-meta';
        
        // Helper to create row
        const createRow = (label, value) => {
            const row = document.createElement('div');
            row.className = 'crafting-detail-row';
            
            const labelSpan = document.createElement('span');
            labelSpan.className = 'crafting-detail-label';
            labelSpan.textContent = label;
            
            const valueSpan = document.createElement('span');
            valueSpan.className = 'crafting-detail-value';
            valueSpan.textContent = value || '-';
            
            row.appendChild(labelSpan);
            row.appendChild(valueSpan);
            
            return row;
        };
        
        metaSection.appendChild(createRow('賽季', record.season ? formatSeasonDisplay(record.season) : null));
        metaSection.appendChild(createRow('賽年', record.seasonYear ? record.seasonYear.replace(/\n/g, ' · ') : null));
        metaSection.appendChild(createRow('部位', record.slot));
        metaSection.appendChild(createRow('首領', record.boss));
        metaSection.appendChild(createRow('來源', record.source));
        
        fragment.appendChild(metaSection);
        
        // Effect section
        const effectDiv = document.createElement('div');
        effectDiv.className = 'crafting-detail-effect';
        
        const effectTitle = document.createElement('div');
        effectTitle.className = 'crafting-detail-effect-title';
        effectTitle.textContent = '特技效果';
        effectDiv.appendChild(effectTitle);
        
        const effectText = document.createElement('div');
        effectText.className = 'crafting-detail-effect-text';
        effectText.textContent = record.effectText || '-';
        // Use CSS white-space: pre-wrap for line breaks (set in CSS)
        effectDiv.appendChild(effectText);
        
        fragment.appendChild(effectDiv);
        
        detailContainer.appendChild(fragment);
    }

    // Event listeners
    searchInput?.addEventListener('input', applyFilters);
    seasonFilter?.addEventListener('change', applyFilters);
    slotFilter?.addEventListener('change', applyFilters);
    tagFilter?.addEventListener('change', applyFilters);
    sortSelect?.addEventListener('change', applyFilters);

    resetBtn?.addEventListener('click', () => {
        searchInput.value = '';
        seasonFilter.value = '';
        slotFilter.value = '';
        tagFilter.value = '';
        sortSelect.value = 'season-desc';
        // Reset scroll position
        listContainer.scrollTop = 0;
        applyFilters();
    });

    // Initialize
    loadData();
}

if (!window.__craftingRouteListenerBound) {
    window.__craftingRouteListenerBound = true;
    document.addEventListener('pvp:routechange', event => {
        if (event?.detail?.route === 'crafting') {
            initCrafting();
        }
    });
}
