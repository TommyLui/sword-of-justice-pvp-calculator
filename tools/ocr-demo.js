(function () {
    const SAMPLE_STORAGE_KEY = 'ocrDemoSamples';
    const DEFAULT_PREPROCESS = {
        grayscale: true,
        thresholdEnabled: false,
        contrast: 120,
        threshold: 165,
        scale: 1
    };
    const NORMALIZE_REPLACEMENTS = [
        ['会心', '會心'],
        ['会傷', '會傷'],
        ['会伤', '會傷'],
        ['攻击', '攻擊'],
        ['元素攻击', '元素攻擊'],
        ['元素抗', '元素抗'],
        ['防御', '防禦'],
        ['忽视', '忽視'],
        ['抵御', '抵禦'],
        ['气盾', '氣盾'],
        ['格挡', '格擋'],
        ['额外会心率', '額外會心率'],
        ['技能抵御', '技能抵禦'],
        ['流派克制百分比', '克制百分比']
    ];
    const FIELDS = [
        { key: 'attack', label: '攻擊', aliases: ['外功攻擊', '內功攻擊', '攻擊'] },
        { key: 'elementalAttack', label: '元素攻擊', aliases: ['元素攻擊'] },
        { key: 'defenseBreak', label: '破防', aliases: ['破防'] },
        { key: 'shieldBreak', label: '破盾', aliases: ['破盾'] },
        { key: 'accuracy', label: '命中', aliases: ['命中'] },
        { key: 'crit', label: '會心', aliases: ['會心'] },
        { key: 'critDamage', label: '會傷-100%', aliases: ['會心傷害', '會傷-100%', '會傷100', '會傷'] },
        { key: 'elementalBreak', label: '忽視元抗', aliases: ['忽視元抗', '忽視抗性'] },
        { key: 'pvpAttack', label: '流派克制', aliases: ['流派克制'] },
        { key: 'pvpAttackRate', label: '克制百分比', aliases: ['克制百分比', '流派克制百分比'] },
        { key: 'skillAttack', label: '技能增強', aliases: ['技能增強'] },
        { key: 'defense', label: '防禦', aliases: ['外功防禦', '內功防禦', '防禦'] },
        { key: 'airShield', label: '氣盾', aliases: ['氣盾'] },
        { key: 'elementalResistance', label: '元素抗性', aliases: ['元素抗性'] },
        { key: 'pvpResistance', label: '流派抵禦', aliases: ['流派抵禦'] },
        { key: 'blockResistance', label: '格擋', aliases: ['外功格擋', '內功格擋', '格擋'] },
        { key: 'skillResistance', label: '技能抵禦', aliases: ['技能抵禦'] },
        { key: 'criticalDefense', label: '會心防禦', aliases: ['會心防禦'] },
        { key: 'criticalResistance', label: '會心抵抗', aliases: ['會心抵抗', '抗外會心', '抗內會心'] },
        { key: 'extraCritRate', label: '額外會心率', aliases: ['額外會心率'] }
    ];

    const state = {
        worker: null,
        workerReady: false,
        loaderPromise: null,
        isRunning: false,
        file: null,
        imageUrl: '',
        imageElement: null,
        rawText: '',
        fields: {},
        preprocess: { ...DEFAULT_PREPROCESS },
        progress: 0,
        lastJobId: 0,
        samples: [],
        referenceSample: null
    };

    function createFieldEntry(value, matchedAlias, sourceSnippet) {
        return {
            value: value || '',
            matchedAlias: matchedAlias || '',
            sourceSnippet: sourceSnippet || ''
        };
    }

    function createEmptyFields() {
        const result = {};
        FIELDS.forEach(field => {
            result[field.key] = createFieldEntry('', '', '');
        });
        return result;
    }

    function cloneFields(fields) {
        const source = fields || {};
        const next = createEmptyFields();
        FIELDS.forEach(field => {
            const item = source[field.key];
            if (item && typeof item === 'object' && !Array.isArray(item)) {
                next[field.key] = createFieldEntry(item.value, item.matchedAlias, item.sourceSnippet);
                return;
            }
            next[field.key] = createFieldEntry(item, '', '');
        });
        return next;
    }

    function notify(options) {
        if (window.showNotification) {
            window.showNotification(options);
        }
    }

    function byId(id) {
        return document.getElementById(id);
    }

    function escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function toInt(value, fallback) {
        const parsed = parseInt(value, 10);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
        return fallback;
    }

    function normalizeText(text) {
        let output = String(text || '')
            .replace(/\r/g, '')
            .replace(/[：:]/g, ':')
            .replace(/[，,]/g, ',')
            .replace(/[（(]/g, '(')
            .replace(/[）)]/g, ')')
            .replace(/[﹣－—–]/g, '-')
            .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 65248))
            .replace(/[Ａ-Ｚａ-ｚ]/g, char => String.fromCharCode(char.charCodeAt(0) - 65248))
            .replace(/\u3000/g, ' ');

        NORMALIZE_REPLACEMENTS.forEach(pair => {
            output = output.replace(new RegExp(escapeRegExp(pair[0]), 'g'), pair[1]);
        });

        return output;
    }

    function extractMatchFromText(text, alias) {
        const patterns = [
            new RegExp(escapeRegExp(alias) + '\\s*[:：]?\\s*(-?\\d[\\d,]*)'),
            new RegExp(escapeRegExp(alias) + '[^\\d-]{0,14}(-?\\d[\\d,]*)'),
            new RegExp('(-?\\d[\\d,]*)\\s*' + escapeRegExp(alias))
        ];

        for (let i = 0; i < patterns.length; i += 1) {
            const match = patterns[i].exec(text);
            if (match && match[1] !== undefined) {
                return createFieldEntry(
                    match[1].replace(/,/g, ''),
                    alias,
                    text.trim()
                );
            }
        }

        return null;
    }

    function draftFieldsFromText(text) {
        const normalized = normalizeText(text);
        const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
        const next = createEmptyFields();

        FIELDS.forEach(field => {
            const aliases = field.aliases.slice().sort((a, b) => b.length - a.length);
            let found = null;

            for (let i = 0; i < aliases.length && !found; i += 1) {
                for (let j = 0; j < lines.length && !found; j += 1) {
                    found = extractMatchFromText(lines[j], aliases[i]);
                }
            }

            if (!found) {
                for (let i = 0; i < aliases.length && !found; i += 1) {
                    found = extractMatchFromText(normalized, aliases[i]);
                }
            }

            next[field.key] = found || createFieldEntry('', '', '');
        });

        return next;
    }

    function loadSamples() {
        try {
            const raw = localStorage.getItem(SAMPLE_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(item => ({
                id: String(item.id || Date.now()),
                name: String(item.name || '未命名樣本'),
                createdAt: String(item.createdAt || new Date().toISOString()),
                fileName: String(item.fileName || ''),
                rawText: String(item.rawText || ''),
                preprocess: {
                    grayscale: item.preprocess?.grayscale !== false,
                    thresholdEnabled: !!item.preprocess?.thresholdEnabled,
                    contrast: toInt(item.preprocess?.contrast, DEFAULT_PREPROCESS.contrast),
                    threshold: toInt(item.preprocess?.threshold, DEFAULT_PREPROCESS.threshold),
                    scale: toInt(item.preprocess?.scale, DEFAULT_PREPROCESS.scale)
                },
                fields: cloneFields(item.fields)
            }));
        } catch (error) {
            return [];
        }
    }

    function persistSamples() {
        localStorage.setItem(SAMPLE_STORAGE_KEY, JSON.stringify(state.samples));
    }

    function loadTesseractScript() {
        if (window.Tesseract) {
            return Promise.resolve(window.Tesseract);
        }

        if (state.loaderPromise) {
            return state.loaderPromise;
        }

        state.loaderPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-ocr-tesseract="true"]');
            if (existing) {
                existing.addEventListener('load', () => resolve(window.Tesseract), { once: true });
                existing.addEventListener('error', () => {
                    state.loaderPromise = null;
                    reject(new Error('Tesseract.js 載入失敗'));
                }, { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            script.async = true;
            script.dataset.ocrTesseract = 'true';
            script.addEventListener('load', () => resolve(window.Tesseract), { once: true });
            script.addEventListener('error', () => {
                state.loaderPromise = null;
                script.remove();
                reject(new Error('Tesseract.js 載入失敗'));
            }, { once: true });
            document.head.appendChild(script);
        });

        return state.loaderPromise;
    }

    async function ensureWorker() {
        if (state.workerReady && state.worker) return state.worker;

        setStatus('running', '載入 OCR 程式中...', '下載中');
        updateProgress(0.04);
        await loadTesseractScript();

        if (!window.Tesseract) {
            throw new Error('Tesseract.js 未載入');
        }

        setStatus('running', '初始化 OCR 引擎中...', '載入中');
        updateProgress(0.08);

        state.worker = await window.Tesseract.createWorker('chi_tra+eng', 1, {
            logger: message => {
                if (!message.status) return;
                const progress = typeof message.progress === 'number' ? message.progress : 0;
                setStatus(state.isRunning ? 'running' : 'idle', message.status, 'chi_tra + eng');
                updateProgress(progress);
            }
        });

        state.workerReady = true;
        setStatus('idle', 'OCR 引擎已就緒，等待開始辨識', 'chi_tra + eng');
        updateProgress(0);
        return state.worker;
    }

    function updateProgress(progress) {
        state.progress = Math.max(0, Math.min(1, progress || 0));
        const bar = byId('ocr-demo-progress-bar');
        if (bar) {
            bar.style.width = Math.round(state.progress * 100) + '%';
        }
    }

    function setStatus(kind, text, engineLabel) {
        const statusText = byId('ocr-demo-status-text');
        const statusPill = byId('ocr-demo-status-pill');
        const engine = byId('ocr-demo-engine-label');

        if (statusText) statusText.textContent = text;
        if (engine && engineLabel) engine.textContent = engineLabel;
        if (statusPill) {
            statusPill.className = 'ocr-demo-status-pill ' + kind;
            statusPill.textContent = kind === 'running'
                ? '辨識中'
                : kind === 'success'
                    ? '已完成'
                    : kind === 'error'
                        ? '失敗'
                        : '待命中';
        }
    }

    function hasDraftData() {
        if (state.rawText) return true;
        return FIELDS.some(field => String(state.fields[field.key]?.value || '') !== '');
    }

    function formatPreprocessSummary(preprocess) {
        const parts = [];
        parts.push(preprocess.grayscale ? '灰階' : '彩色');
        parts.push('對比 ' + preprocess.contrast + '%');
        if (preprocess.thresholdEnabled) {
            parts.push('二值化 ' + preprocess.threshold);
        }
        parts.push('放大 ' + preprocess.scale + 'x');
        return parts.join(' · ');
    }

    function updatePreprocessLabels() {
        const contrastValue = byId('ocr-demo-contrast-value');
        const thresholdValue = byId('ocr-demo-threshold-value');
        const thresholdInput = byId('ocr-demo-threshold');

        if (contrastValue) {
            contrastValue.textContent = state.preprocess.contrast + '%';
        }
        if (thresholdValue) {
            thresholdValue.textContent = String(state.preprocess.threshold);
        }
        if (thresholdInput) {
            thresholdInput.disabled = !state.preprocess.thresholdEnabled;
        }
    }

    function syncPreprocessFromControls() {
        state.preprocess = {
            grayscale: !!byId('ocr-demo-grayscale')?.checked,
            thresholdEnabled: !!byId('ocr-demo-threshold-enabled')?.checked,
            contrast: toInt(byId('ocr-demo-contrast')?.value, DEFAULT_PREPROCESS.contrast),
            threshold: toInt(byId('ocr-demo-threshold')?.value, DEFAULT_PREPROCESS.threshold),
            scale: toInt(byId('ocr-demo-scale')?.value, DEFAULT_PREPROCESS.scale)
        };
        updatePreprocessLabels();
    }

    function applyPreprocessToCanvas(target, image, preprocess) {
        if (!target || !image) return;

        const scale = Math.max(1, toInt(preprocess.scale, 1));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const ctx = target.getContext('2d');
        if (!ctx) return;

        target.width = width;
        target.height = height;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const contrastFactor = preprocess.contrast / 100;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            if (preprocess.grayscale) {
                const gray = (r * 0.299) + (g * 0.587) + (b * 0.114);
                r = gray;
                g = gray;
                b = gray;
            }

            r = ((r - 128) * contrastFactor) + 128;
            g = ((g - 128) * contrastFactor) + 128;
            b = ((b - 128) * contrastFactor) + 128;

            if (preprocess.thresholdEnabled) {
                const mono = (((r * 0.299) + (g * 0.587) + (b * 0.114)) >= preprocess.threshold) ? 255 : 0;
                r = mono;
                g = mono;
                b = mono;
            }

            data[i] = Math.max(0, Math.min(255, Math.round(r)));
            data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
        }

        ctx.putImageData(imageData, 0, 0);
    }

    function renderProcessedPreview() {
        const canvas = byId('ocr-demo-processed-canvas');
        const empty = byId('ocr-demo-processed-empty');
        const wrap = byId('ocr-demo-processed-wrap');

        if (!canvas || !empty || !wrap) return;

        if (!state.imageElement) {
            canvas.hidden = true;
            empty.hidden = false;
            wrap.classList.add('empty');
            return;
        }

        applyPreprocessToCanvas(canvas, state.imageElement, state.preprocess);
        canvas.hidden = false;
        empty.hidden = true;
        wrap.classList.remove('empty');
    }

    function updatePreview() {
        const img = byId('ocr-demo-preview');
        const empty = byId('ocr-demo-preview-empty');
        const wrap = byId('ocr-demo-preview-wrap');
        const meta = byId('ocr-demo-file-meta');

        if (!img || !empty || !wrap || !meta) return;

        if (state.imageUrl) {
            img.src = state.imageUrl;
            img.hidden = false;
            empty.hidden = true;
            wrap.classList.remove('empty');
        } else {
            img.removeAttribute('src');
            img.hidden = true;
            empty.hidden = false;
            wrap.classList.add('empty');
        }

        if (state.file) {
            const sizeKb = Math.round(state.file.size / 1024);
            const dims = state.imageElement ? (' · ' + state.imageElement.naturalWidth + '×' + state.imageElement.naturalHeight) : '';
            meta.textContent = state.file.name + ' · ' + sizeKb + ' KB' + dims;
        } else {
            meta.textContent = '尚未選擇圖片';
        }

        renderProcessedPreview();
    }

    function renderFields() {
        const container = byId('ocr-demo-fields');
        if (!container) return;

        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        FIELDS.forEach(field => {
            const item = state.fields[field.key] || createFieldEntry('', '', '');
            const wrap = document.createElement('label');
            wrap.className = 'ocr-demo-field';

            const label = document.createElement('span');
            label.className = 'ocr-demo-field-label';
            label.textContent = field.label;

            const input = document.createElement('input');
            input.className = 'ocr-demo-field-input';
            input.type = 'number';
            input.step = '1';
            input.placeholder = '未辨識';
            input.value = item.value || '';
            input.dataset.fieldKey = field.key;
            input.addEventListener('input', () => {
                state.fields[field.key].value = input.value;
                syncJsonOutput();
                renderComparison();
                updateButtons();
            });

            const meta = document.createElement('div');
            meta.className = 'ocr-demo-field-meta';

            const alias = document.createElement('span');
            alias.className = 'ocr-demo-field-alias';
            alias.textContent = item.matchedAlias ? ('命中：' + item.matchedAlias) : '命中：未匹配';

            const snippet = document.createElement('span');
            snippet.className = 'ocr-demo-field-snippet';
            snippet.textContent = item.sourceSnippet ? item.sourceSnippet : '來源：—';

            meta.appendChild(alias);
            meta.appendChild(snippet);
            wrap.appendChild(label);
            wrap.appendChild(input);
            wrap.appendChild(meta);
            fragment.appendChild(wrap);
        });

        container.appendChild(fragment);
    }

    function buildJsonPayload() {
        const payload = {
            preprocess: { ...state.preprocess },
            fields: {}
        };
        FIELDS.forEach(field => {
            const item = state.fields[field.key] || createFieldEntry('', '', '');
            payload.fields[field.key] = {
                value: item.value || '',
                matchedAlias: item.matchedAlias || '',
                sourceSnippet: item.sourceSnippet || ''
            };
        });
        return payload;
    }

    function syncJsonOutput() {
        const output = byId('ocr-demo-json-output');
        if (!output) return;
        output.value = JSON.stringify(buildJsonPayload(), null, 2);
    }

    function renderSampleSelect() {
        const select = byId('ocr-demo-sample-select');
        if (!select) return;

        const current = select.value;
        select.innerHTML = '<option value="">選擇已存樣本</option>';

        state.samples.forEach(sample => {
            const option = document.createElement('option');
            option.value = sample.id;
            option.textContent = sample.name;
            select.appendChild(option);
        });

        if (state.samples.some(sample => sample.id === current)) {
            select.value = current;
        }
    }

    function formatDate(value) {
        try {
            return new Date(value).toLocaleString('zh-TW');
        } catch (error) {
            return value;
        }
    }

    function renderSampleMeta() {
        const meta = byId('ocr-demo-sample-meta');
        const select = byId('ocr-demo-sample-select');
        if (!meta || !select) return;

        const sample = state.samples.find(item => item.id === select.value) || state.referenceSample;
        if (!sample) {
            meta.textContent = '尚未選擇樣本';
            return;
        }

        meta.textContent = [
            sample.fileName || '未記錄檔名',
            formatDate(sample.createdAt),
            formatPreprocessSummary(sample.preprocess || DEFAULT_PREPROCESS)
        ].join(' · ');
    }

    function renderComparison() {
        const empty = byId('ocr-demo-compare-empty');
        const wrap = byId('ocr-demo-compare-wrap');
        const summary = byId('ocr-demo-compare-summary');
        const body = byId('ocr-demo-compare-body');

        if (!empty || !wrap || !summary || !body) return;

        if (!state.referenceSample) {
            empty.hidden = false;
            wrap.hidden = true;
            body.innerHTML = '';
            summary.textContent = '';
            return;
        }

        empty.hidden = true;
        wrap.hidden = false;
        body.innerHTML = '';

        let sameCount = 0;
        let diffCount = 0;
        let missingCount = 0;

        FIELDS.forEach(field => {
            const current = state.fields[field.key] || createFieldEntry('', '', '');
            const sample = state.referenceSample.fields[field.key] || createFieldEntry('', '', '');
            const currentValue = String(current.value || '');
            const sampleValue = String(sample.value || '');
            const currentNum = parseInt(currentValue, 10);
            const sampleNum = parseInt(sampleValue, 10);
            const hasCurrent = currentValue !== '';
            const hasSample = sampleValue !== '';
            const same = currentValue === sampleValue;
            let diffText = '—';

            if (hasCurrent && hasSample && Number.isFinite(currentNum) && Number.isFinite(sampleNum)) {
                const delta = currentNum - sampleNum;
                diffText = (delta > 0 ? '+' : '') + delta;
            }

            if (same) {
                sameCount += 1;
            } else {
                diffCount += 1;
            }
            if (!hasCurrent || !hasSample) {
                missingCount += 1;
            }

            const row = document.createElement('tr');
            row.className = same ? 'same' : (!hasCurrent || !hasSample ? 'missing' : 'diff');
            row.innerHTML = [
                '<td>' + field.label + '</td>',
                '<td>' + (currentValue || '—') + '</td>',
                '<td>' + (sampleValue || '—') + '</td>',
                '<td>' + diffText + '</td>',
                '<td>' + (current.matchedAlias || '—') + '</td>',
                '<td>' + (sample.matchedAlias || '—') + '</td>'
            ].join('');
            body.appendChild(row);
        });

        summary.textContent = '樣本：' + state.referenceSample.name + ' · 一致 ' + sameCount + ' 項 · 不同 ' + diffCount + ' 項 · 含空白 ' + missingCount + ' 項';
    }

    function updateButtons() {
        const hasFile = !!state.file;
        const canRun = hasFile && !state.isRunning;
        const hasDraft = hasDraftData();
        const hasRawText = !!state.rawText;
        const selectedSampleId = byId('ocr-demo-sample-select')?.value || '';
        const hasSelectedSample = !!selectedSampleId;

        const runBtn = byId('ocr-demo-run-btn');
        const clearBtn = byId('ocr-demo-clear-btn');
        const copyTextBtn = byId('ocr-demo-copy-text-btn');
        const copyJsonBtn = byId('ocr-demo-copy-json-btn');
        const saveSampleBtn = byId('ocr-demo-save-sample-btn');
        const loadSampleBtn = byId('ocr-demo-load-sample-btn');
        const deleteSampleBtn = byId('ocr-demo-delete-sample-btn');

        if (runBtn) runBtn.disabled = !canRun;
        if (clearBtn) clearBtn.disabled = !hasFile && !hasDraft;
        if (copyTextBtn) copyTextBtn.disabled = !hasRawText;
        if (copyJsonBtn) copyJsonBtn.disabled = !hasDraft;
        if (saveSampleBtn) saveSampleBtn.disabled = !hasDraft;
        if (loadSampleBtn) loadSampleBtn.disabled = !hasSelectedSample;
        if (deleteSampleBtn) deleteSampleBtn.disabled = !hasSelectedSample;
    }

    function updateOutputs() {
        const rawText = byId('ocr-demo-raw-text');
        if (rawText) {
            rawText.value = state.rawText;
        }
        renderFields();
        syncJsonOutput();
        renderSampleMeta();
        renderComparison();
        updateButtons();
    }

    function clearObjectUrl() {
        if (state.imageUrl) {
            URL.revokeObjectURL(state.imageUrl);
            state.imageUrl = '';
        }
    }

    function resetState(options) {
        const keepFile = options && options.keepFile;

        if (!keepFile) {
            state.file = null;
            state.imageElement = null;
            clearObjectUrl();
            const input = byId('ocr-demo-file');
            if (input) input.value = '';
        }

        state.rawText = '';
        state.fields = createEmptyFields();
        updateProgress(0);
        setStatus('idle', keepFile ? '圖片已保留，可重新辨識' : '等待上傳圖片', state.workerReady ? 'chi_tra + eng' : '尚未初始化');
        updatePreview();
        updateOutputs();
    }

    function canvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                    return;
                }
                reject(new Error('無法建立 OCR 圖像資料'));
            }, 'image/png');
        });
    }

    async function runOcr() {
        if (!state.file || state.isRunning || !state.imageElement) return;

        state.isRunning = true;
        state.lastJobId += 1;
        const jobId = state.lastJobId;
        updateButtons();
        setStatus('running', '準備開始辨識...', state.workerReady ? 'chi_tra + eng' : '載入中');
        updateProgress(0.05);

        try {
            syncPreprocessFromControls();
            renderProcessedPreview();
            const worker = await ensureWorker();
            const canvas = byId('ocr-demo-processed-canvas');
            if (!canvas) {
                throw new Error('找不到預處理畫布');
            }
            const blob = await canvasToBlob(canvas);

            setStatus('running', 'OCR 辨識中...', 'chi_tra + eng');
            const result = await worker.recognize(blob);

            if (jobId !== state.lastJobId) {
                return;
            }

            state.rawText = String(result?.data?.text || '').trim();
            state.fields = draftFieldsFromText(state.rawText);
            updateProgress(1);
            setStatus('success', state.rawText ? '辨識完成，可直接編輯欄位草稿' : '辨識完成，但沒有抓到可用文字', 'chi_tra + eng');
            updateOutputs();

            notify({
                type: 'success',
                title: 'OCR 完成',
                message: state.rawText ? '已產生原始文字、命中資訊與欄位草稿' : '辨識完成，但目前沒有可用文字結果',
                duration: 3000
            });
        } catch (error) {
            setStatus('error', 'OCR 失敗：' + (error && error.message ? error.message : '未知錯誤'), state.workerReady ? 'chi_tra + eng' : '初始化失敗');
            updateProgress(0);
            notify({
                type: 'error',
                title: 'OCR 失敗',
                message: error && error.message ? error.message : '請重新整理後再試',
                duration: 5000
            });
        } finally {
            state.isRunning = false;
            updateButtons();
        }
    }

    async function copyText(value, successMessage) {
        if (!value) return;

        try {
            await navigator.clipboard.writeText(value);
            notify({
                type: 'success',
                title: '已複製',
                message: successMessage,
                duration: 2500
            });
        } catch (error) {
            notify({
                type: 'error',
                title: '複製失敗',
                message: '瀏覽器不允許剪貼簿操作，請手動複製。',
                duration: 4000
            });
        }
    }

    async function loadImageElement(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('圖片載入失敗'));
            img.src = url;
        });
    }

    function updateSampleNameDefault() {
        const input = byId('ocr-demo-sample-name');
        if (!input || input.value.trim()) return;
        const fileName = state.file?.name || 'ocr-sample';
        input.value = fileName.replace(/\.[^.]+$/, '');
    }

    function saveCurrentSample() {
        if (!hasDraftData()) return;

        const input = byId('ocr-demo-sample-name');
        const name = (input?.value || '').trim() || ((state.file?.name || 'ocr-sample').replace(/\.[^.]+$/, ''));
        const sample = {
            id: String(Date.now()),
            name,
            createdAt: new Date().toISOString(),
            fileName: state.file?.name || '',
            rawText: state.rawText,
            preprocess: { ...state.preprocess },
            fields: cloneFields(state.fields)
        };

        state.samples.unshift(sample);
        persistSamples();
        renderSampleSelect();
        const select = byId('ocr-demo-sample-select');
        if (select) {
            select.value = sample.id;
        }
        renderSampleMeta();
        updateButtons();
        notify({
            type: 'success',
            title: '樣本已儲存',
            message: '已保存到目前瀏覽器，可用來比對校準。',
            duration: 2800
        });
    }

    function loadSelectedSample() {
        const select = byId('ocr-demo-sample-select');
        if (!select || !select.value) return;
        const sample = state.samples.find(item => item.id === select.value);
        if (!sample) return;

        state.referenceSample = sample;
        renderSampleMeta();
        renderComparison();
        notify({
            type: 'success',
            title: '樣本已載入',
            message: '已載入比對面板。你可以調整欄位或預處理後重新辨識。',
            duration: 2800
        });
    }

    function deleteSelectedSample() {
        const select = byId('ocr-demo-sample-select');
        if (!select || !select.value) return;
        const sampleId = select.value;
        state.samples = state.samples.filter(item => item.id !== sampleId);
        if (state.referenceSample?.id === sampleId) {
            state.referenceSample = null;
        }
        persistSamples();
        renderSampleSelect();
        renderSampleMeta();
        renderComparison();
        updateButtons();
        notify({
            type: 'success',
            title: '樣本已刪除',
            message: '已從目前瀏覽器移除。',
            duration: 2500
        });
    }

    function applyPreprocessChange() {
        syncPreprocessFromControls();
        updatePreview();
        syncJsonOutput();
        if (state.file && !state.isRunning) {
            setStatus('idle', '預處理已更新，按「重新辨識」套用新設定', state.workerReady ? 'chi_tra + eng' : '尚未初始化');
        }
    }

    function resetPreprocessControls() {
        state.preprocess = { ...DEFAULT_PREPROCESS };
        hydrateControls();
        updatePreview();
        syncJsonOutput();
        if (state.file && !state.isRunning) {
            setStatus('idle', '預處理已還原為預設值，可重新辨識', state.workerReady ? 'chi_tra + eng' : '尚未初始化');
        }
    }

    function bindEvents() {
        byId('ocr-demo-pick-btn')?.addEventListener('click', () => {
            byId('ocr-demo-file')?.click();
        });

        byId('ocr-demo-file')?.addEventListener('change', async event => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            try {
                clearObjectUrl();
                state.file = file;
                state.imageUrl = URL.createObjectURL(file);
                state.imageElement = await loadImageElement(state.imageUrl);
                state.rawText = '';
                state.fields = createEmptyFields();
                updateSampleNameDefault();
                updatePreview();
                updateOutputs();
                setStatus('idle', '圖片已載入，可先調整預處理再重新辨識', state.workerReady ? 'chi_tra + eng' : '尚未初始化');
                notify({
                    type: 'info',
                    title: '圖片已載入',
                    message: '可先調整預處理，再執行 OCR。',
                    duration: 2200
                });
            } catch (error) {
                resetState();
                notify({
                    type: 'error',
                    title: '圖片載入失敗',
                    message: error && error.message ? error.message : '請重新選擇圖片',
                    duration: 4000
                });
            }
        });

        ['ocr-demo-grayscale', 'ocr-demo-threshold-enabled', 'ocr-demo-contrast', 'ocr-demo-threshold', 'ocr-demo-scale'].forEach(id => {
            byId(id)?.addEventListener('input', applyPreprocessChange);
            byId(id)?.addEventListener('change', applyPreprocessChange);
        });

        byId('ocr-demo-reset-preprocess-btn')?.addEventListener('click', () => {
            resetPreprocessControls();
        });

        byId('ocr-demo-run-btn')?.addEventListener('click', () => {
            runOcr();
        });

        byId('ocr-demo-clear-btn')?.addEventListener('click', () => {
            resetState();
        });

        byId('ocr-demo-copy-text-btn')?.addEventListener('click', () => {
            copyText(state.rawText, '原始 OCR 文字已複製');
        });

        byId('ocr-demo-copy-json-btn')?.addEventListener('click', () => {
            copyText(byId('ocr-demo-json-output')?.value || '', 'JSON 草稿已複製');
        });

        byId('ocr-demo-save-sample-btn')?.addEventListener('click', () => {
            saveCurrentSample();
        });

        byId('ocr-demo-sample-select')?.addEventListener('change', () => {
            renderSampleMeta();
            updateButtons();
        });

        byId('ocr-demo-load-sample-btn')?.addEventListener('click', () => {
            loadSelectedSample();
        });

        byId('ocr-demo-delete-sample-btn')?.addEventListener('click', () => {
            deleteSelectedSample();
        });
    }

    function hydrateControls() {
        if (byId('ocr-demo-grayscale')) byId('ocr-demo-grayscale').checked = state.preprocess.grayscale;
        if (byId('ocr-demo-threshold-enabled')) byId('ocr-demo-threshold-enabled').checked = state.preprocess.thresholdEnabled;
        if (byId('ocr-demo-contrast')) byId('ocr-demo-contrast').value = String(state.preprocess.contrast);
        if (byId('ocr-demo-threshold')) byId('ocr-demo-threshold').value = String(state.preprocess.threshold);
        if (byId('ocr-demo-scale')) byId('ocr-demo-scale').value = String(state.preprocess.scale);
        updatePreprocessLabels();
    }

    window.initOcrDemo = function initOcrDemo() {
        if (window.__ocrDemoInitialized) {
            syncPreprocessFromControls();
            updatePreview();
            updateOutputs();
            updateButtons();
            return;
        }

        window.__ocrDemoInitialized = true;
        state.fields = createEmptyFields();
        state.samples = loadSamples();
        bindEvents();
        hydrateControls();
        renderSampleSelect();
        updatePreview();
        updateOutputs();
        updateButtons();
    };
})();
