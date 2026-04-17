function initCalculator() {
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

    document.getElementById('calculator-reset-dialog')?.setAttribute('hidden', 'hidden');

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

    const bridgeFieldMap = config.BRIDGE_FIELD_MAP;
    const attackProperties = config.ATTACK_FIELDS;
    const defenseProperties = config.DEFENSE_FIELDS;
    const bridgeInputIds = new Set(Object.values(bridgeFieldMap));
    const SYNC_SOURCE = 'calculator';
    const OCR_IMPORT_CONFIG = {
        atk1: { fields: ['attack', 'elementalAttack', 'defenseBreak', 'accuracy', 'crit', 'elementalBreak', 'pvpAttack'] },
        atk2: { fields: ['attack', 'elementalAttack', 'defenseBreak', 'accuracy', 'crit', 'elementalBreak', 'pvpAttack'] },
        def1: { fields: ['defense', 'blockResistance', 'criticalResistance', 'elementalResistance', 'pvpResistance'] },
        def2: { fields: ['defense', 'blockResistance', 'criticalResistance', 'elementalResistance', 'pvpResistance'] }
    };
    const OCR_TARGET_LABELS = {
        atk1: '進攻數值1',
        atk2: '進攻數值2',
        def1: '防禦數值1',
        def2: '防禦數值2'
    };
    const OCR_BUTTON_IDS = ['atk1-ocr-btn', 'atk2-ocr-btn', 'def1-ocr-btn', 'def2-ocr-btn'];

    let isApplyingBridgeUpdate = false;
    let pendingOcrTarget = '';
    let isOcrImporting = false;

    function applyCompareValueClass(element, value) {
        element.classList.remove('positive', 'negative');
        if (value > 0) element.classList.add('positive');
        else if (value < 0) element.classList.add('negative');
    }

    function getInputValue(id) {
        return combat.toInt(document.getElementById(id)?.value);
    }

    function buildStats(prefixAtk, prefixDef) {
        return {
            attack: getInputValue(`${prefixAtk}-attack`),
            elementalAttack: getInputValue(`${prefixAtk}-elementalAttack`),
            defenseBreak: getInputValue(`${prefixAtk}-defenseBreak`),
            shieldBreak: getInputValue(`${prefixAtk}-shieldBreak`),
            pvpAttack: getInputValue(`${prefixAtk}-pvpAttack`),
            accuracy: getInputValue(`${prefixAtk}-accuracy`),
            crit: getInputValue(`${prefixAtk}-crit`),
            critDamage: getInputValue(`${prefixAtk}-critDamage`),
            extraCritRate: getInputValue(`${prefixAtk}-extraCritRate`),
            pvpAttackRate: getInputValue(`${prefixAtk}-pvpAttackRate`),
            elementalBreak: getInputValue(`${prefixAtk}-elementalBreak`),
            skillAttack: getInputValue(`${prefixAtk}-skillAttack`),
            defense: getInputValue(`${prefixDef}-defense`),
            airShield: getInputValue(`${prefixDef}-airShield`),
            elementalResistance: getInputValue(`${prefixDef}-elementalResistance`),
            pvpResistance: getInputValue(`${prefixDef}-pvpResistance`),
            blockResistance: getInputValue(`${prefixDef}-blockResistance`),
            criticalResistance: getInputValue(`${prefixDef}-criticalResistance`),
            criticalDefense: getInputValue(`${prefixDef}-criticalDefense`),
            skillResistance: getInputValue(`${prefixDef}-skillResistance`)
        };
    }

    function syncInputsFromStorage() {
        document.querySelectorAll('#view-calculator input[type="number"]').forEach(input => {
            const saved = localStorage.getItem(input.id);
            if (saved !== null) {
                input.value = saved;
            }
        });
    }

    function syncResultsFromStorage() {
        document.querySelectorAll('#results span[id]').forEach(element => {
            const saved = localStorage.getItem(`result-${element.id}`);
            if (saved !== null) {
                element.textContent = saved;
            }
        });
    }

    function readAtk1SyncData() {
        const data = {};
        Object.keys(bridgeFieldMap).forEach(bridgeKey => {
            const inputId = bridgeFieldMap[bridgeKey];
            const input = document.getElementById(inputId);
            data[bridgeKey] = input ? combat.toInt(input.value) : 0;
        });
        return data;
    }

    function calculateResults() {
        const matchup1_1 = combat.calculateCombatStats(buildStats('atk1', 'def1'));
        const matchup1_2 = combat.calculateCombatStats(buildStats('atk2', 'def1'));
        const matchup2_1 = combat.calculateCombatStats(buildStats('atk1', 'def2'));
        const matchup2_2 = combat.calculateCombatStats(buildStats('atk2', 'def2'));

        document.getElementById('damage1_1').textContent = Math.floor(matchup1_1.finalDamage);
        document.getElementById('damage1_2').textContent = Math.floor(matchup1_2.finalDamage);
        document.getElementById('damage2_1').textContent = Math.floor(matchup2_1.finalDamage);
        document.getElementById('damage2_2').textContent = Math.floor(matchup2_2.finalDamage);
        document.getElementById('critDamage1_1').textContent = matchup1_1.expectedDamage;
        document.getElementById('critDamage1_2').textContent = matchup1_2.expectedDamage;
        document.getElementById('critDamage2_1').textContent = matchup2_1.expectedDamage;
        document.getElementById('critDamage2_2').textContent = matchup2_2.expectedDamage;

        const critCompare1 = matchup1_1.expectedDamage !== 0 ? ((matchup1_2.expectedDamage - matchup1_1.expectedDamage) / matchup1_1.expectedDamage * 100) : 0;
        const critCompare2 = matchup2_1.expectedDamage !== 0 ? ((matchup2_2.expectedDamage - matchup2_1.expectedDamage) / matchup2_1.expectedDamage * 100) : 0;
        const critCompare1Element = document.getElementById('critCompare1');
        const critCompare2Element = document.getElementById('critCompare2');
        critCompare1Element.textContent = critCompare1.toFixed(2) + '%';
        critCompare2Element.textContent = critCompare2.toFixed(2) + '%';
        applyCompareValueClass(critCompare1Element, critCompare1);
        applyCompareValueClass(critCompare2Element, critCompare2);

        document.getElementById('remainDefense1_1').textContent = matchup1_1.remainDefense;
        document.getElementById('defenseRate1_1').textContent = matchup1_1.defenseRate.toFixed(2) + '%';
        document.getElementById('remainShield1_1').textContent = matchup1_1.remainShield;
        document.getElementById('elementalResisRate1_1').textContent = matchup1_1.elementalResisRate.toFixed(2) + '%';
        document.getElementById('actualAccuracyRate1_1').textContent = matchup1_1.actualAccuracyRate.toFixed(2) + '%';
        document.getElementById('actualCritRate1_1').textContent = matchup1_1.actualCritRate.toFixed(2) + '%';

        document.getElementById('remainDefense1_2').textContent = matchup1_2.remainDefense;
        document.getElementById('defenseRate1_2').textContent = matchup1_2.defenseRate.toFixed(2) + '%';
        document.getElementById('remainShield1_2').textContent = matchup1_2.remainShield;
        document.getElementById('elementalResisRate1_2').textContent = matchup1_2.elementalResisRate.toFixed(2) + '%';
        document.getElementById('actualAccuracyRate1_2').textContent = matchup1_2.actualAccuracyRate.toFixed(2) + '%';
        document.getElementById('actualCritRate1_2').textContent = matchup1_2.actualCritRate.toFixed(2) + '%';

        document.getElementById('remainDefense2_1').textContent = matchup2_1.remainDefense;
        document.getElementById('defenseRate2_1').textContent = matchup2_1.defenseRate.toFixed(2) + '%';
        document.getElementById('remainShield2_1').textContent = matchup2_1.remainShield;
        document.getElementById('elementalResisRate2_1').textContent = matchup2_1.elementalResisRate.toFixed(2) + '%';
        document.getElementById('actualAccuracyRate2_1').textContent = matchup2_1.actualAccuracyRate.toFixed(2) + '%';
        document.getElementById('actualCritRate2_1').textContent = matchup2_1.actualCritRate.toFixed(2) + '%';

        document.getElementById('remainDefense2_2').textContent = matchup2_2.remainDefense;
        document.getElementById('defenseRate2_2').textContent = matchup2_2.defenseRate.toFixed(2) + '%';
        document.getElementById('remainShield2_2').textContent = matchup2_2.remainShield;
        document.getElementById('elementalResisRate2_2').textContent = matchup2_2.elementalResisRate.toFixed(2) + '%';
        document.getElementById('actualAccuracyRate2_2').textContent = matchup2_2.actualAccuracyRate.toFixed(2) + '%';
        document.getElementById('actualCritRate2_2').textContent = matchup2_2.actualCritRate.toFixed(2) + '%';

        document.querySelectorAll('#results span[id]').forEach(element => {
            localStorage.setItem(`result-${element.id}`, element.textContent);
        });
    }

    const publishToBridge = () => {
        if (!window.pvpSyncBridge?.setBaselineAtk1 || isApplyingBridgeUpdate) return;
        window.pvpSyncBridge.setBaselineAtk1(readAtk1SyncData(), { source: SYNC_SOURCE });
    };

    const applyFromBridge = (payload) => {
        if (!payload || payload.source === SYNC_SOURCE) return;
        const data = payload.baselineAtk1 || {};
        isApplyingBridgeUpdate = true;
        Object.keys(bridgeFieldMap).forEach(bridgeKey => {
            if (data[bridgeKey] !== undefined) {
                const inputId = bridgeFieldMap[bridgeKey];
                const input = document.getElementById(inputId);
                if (input) {
                    input.value = data[bridgeKey];
                    localStorage.setItem(inputId, String(data[bridgeKey]));
                }
            }
        });
        calculateResults();
        isApplyingBridgeUpdate = false;
    };

    function hydrateCalculatorState() {
        syncInputsFromStorage();
        syncResultsFromStorage();

        if (window.pvpSyncBridge?.setBaselineAtk1) {
            const seedData = readAtk1SyncData();
            const existing = window.pvpSyncBridge.getBaselineAtk1?.();

            if (existing?._meta?.hasValue && existing._meta.source !== SYNC_SOURCE) {
                const hasStoredBridgeValue = Object.values(seedData).some(value => value !== 0);
                if (!hasStoredBridgeValue) {
                    applyFromBridge({
                        baselineAtk1: {
                            attack: existing.attack,
                            elementalAttack: existing.elementalAttack,
                            defenseBreak: existing.defenseBreak,
                            shieldBreak: existing.shieldBreak,
                            accuracy: existing.accuracy,
                            crit: existing.crit,
                            critDamage: existing.critDamage,
                            elementalBreak: existing.elementalBreak
                        },
                        source: existing._meta.source
                    });
                    return;
                }
            }

            window.pvpSyncBridge.setBaselineAtk1(seedData, { source: SYNC_SOURCE });
        }

        calculateResults();
    }

    function setCalculatorInputValue(inputId, value) {
        const input = document.getElementById(inputId);
        if (!input) return false;
        input.value = String(value);
        localStorage.setItem(inputId, String(value));
        return true;
    }

    function applyOcrToTarget(targetKey, ocrResult) {
        const importConfig = OCR_IMPORT_CONFIG[targetKey];
        if (!importConfig) {
            throw new Error('未設定 OCR 匯入目標');
        }

        const importedFields = [];
        importConfig.fields.forEach(fieldKey => {
            const field = ocrResult?.fields?.[fieldKey];
            const value = String(field?.value || '').trim();
            if (!value) return;

            const inputId = `${targetKey}-${fieldKey}`;
            if (setCalculatorInputValue(inputId, value)) {
                importedFields.push(fieldKey);
            }
        });

        if (!importedFields.length) {
            throw new Error(targetKey.startsWith('atk') ? 'OCR 沒有辨識到可匯入的進攻數值' : 'OCR 沒有辨識到可匯入的防禦數值');
        }

        calculateResults();
        if (targetKey === 'atk1' && importedFields.some(fieldKey => bridgeInputIds.has(`${targetKey}-${fieldKey}`))) {
            publishToBridge();
        }

        const importedLabels = importedFields
            .map(fieldKey => {
                const label = document.querySelector(`label[for="${targetKey}-${fieldKey}"]`);
                return label ? label.textContent.replace(':', '').trim() : fieldKey;
            })
            .join('、');

        notify({
            type: 'success',
            title: 'OCR 匯入成功',
            message: `${importedLabels} 已匯入 ${OCR_TARGET_LABELS[targetKey] || targetKey}；其餘未辨識欄位保留原值`,
            duration: 3800
        });
    }

    function setOcrButtonsDisabled(disabled) {
        OCR_BUTTON_IDS.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.disabled = disabled;
            }
        });
    }

    async function handleOcrFileSelection(file) {
        if (!file) return;
        const targetKey = pendingOcrTarget;
        pendingOcrTarget = '';
        if (!targetKey) return;
        if (isOcrImporting) return;

        const ocrApi = window.pvpOcr;
        if (!ocrApi?.recognizeFromFile) {
            notify({
                type: 'error',
                title: 'OCR 不可用',
                message: 'OCR 模組尚未載入，請重新整理頁面後再試',
                duration: 5000
            });
            return;
        }

        try {
            isOcrImporting = true;
            setOcrButtonsDisabled(true);
            notify({
                type: 'info',
                title: 'OCR 辨識中',
                message: `正在讀取 ${OCR_TARGET_LABELS[targetKey] || targetKey}，首次使用可能需要下載辨識引擎。`,
                duration: 2500
            });
            const result = await ocrApi.recognizeFromFile(file, ocrApi.getDefaultPreprocess?.());
            applyOcrToTarget(targetKey, result);
        } catch (error) {
            notify({
                type: 'error',
                title: 'OCR 匯入失敗',
                message: error && error.message ? error.message : `請重新選擇 ${OCR_TARGET_LABELS[targetKey] || targetKey} 的圖片後再試`,
                duration: 5000
            });
        } finally {
            isOcrImporting = false;
            setOcrButtonsDisabled(false);
        }
    }

    function bindOcrButton(buttonId, targetKey) {
        document.getElementById(buttonId)?.addEventListener('click', () => {
            if (isOcrImporting) return;
            pendingOcrTarget = targetKey;
            document.getElementById('calculator-ocr-file')?.click();
        });
    }

    if (window.__calculatorInitialized) {
        hydrateCalculatorState();
        return;
    }
    window.__calculatorInitialized = true;

    document.querySelectorAll('#view-calculator input[type="number"]').forEach(input => {
        input.addEventListener('input', () => {
            localStorage.setItem(input.id, input.value);
            calculateResults();
            if (bridgeInputIds.has(input.id)) {
                publishToBridge();
            }
        });
    });

    if (window.pvpSyncBridge?.subscribe) {
        window.pvpSyncBridge.subscribe(applyFromBridge);
    }

    Object.values(bridgeFieldMap).forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('blur', publishToBridge);
            input.addEventListener('change', publishToBridge);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                }
            });
        }
    });

    document.getElementById('copy-left-atk-btn')?.addEventListener('click', () => {
        attackProperties.forEach(prop => {
            const val = document.getElementById(`atk1-${prop}`).value;
            document.getElementById(`atk2-${prop}`).value = val;
            localStorage.setItem(`atk2-${prop}`, val);
        });
        calculateResults();
    });

    document.getElementById('copy-right-atk-btn')?.addEventListener('click', () => {
        attackProperties.forEach(prop => {
            const val = document.getElementById(`atk2-${prop}`).value;
            document.getElementById(`atk1-${prop}`).value = val;
            localStorage.setItem(`atk1-${prop}`, val);
        });
        calculateResults();
        publishToBridge();
    });

    document.getElementById('copy-left-def-btn')?.addEventListener('click', () => {
        defenseProperties.forEach(prop => {
            const val = document.getElementById(`def1-${prop}`).value;
            document.getElementById(`def2-${prop}`).value = val;
            localStorage.setItem(`def2-${prop}`, val);
        });
        calculateResults();
    });

    document.getElementById('copy-right-def-btn')?.addEventListener('click', () => {
        defenseProperties.forEach(prop => {
            const val = document.getElementById(`def2-${prop}`).value;
            document.getElementById(`def1-${prop}`).value = val;
            localStorage.setItem(`def1-${prop}`, val);
        });
        calculateResults();
    });

    bindOcrButton('atk1-ocr-btn', 'atk1');
    bindOcrButton('atk2-ocr-btn', 'atk2');
    bindOcrButton('def1-ocr-btn', 'def1');
    bindOcrButton('def2-ocr-btn', 'def2');

    document.getElementById('export-btn')?.addEventListener('click', () => {
        const readGroup = (prefix, keys) => Object.fromEntries(keys.map(key => [key, document.getElementById(`${prefix}${key}`).value]));
        const exportData = {
            attack1: readGroup('atk1-', attackProperties),
            attack2: readGroup('atk2-', attackProperties),
            defense1: readGroup('def1-', defenseProperties),
            defense2: readGroup('def2-', defenseProperties)
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pvp-calculator-data-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify({
            type: 'success',
            title: '匯出成功',
            message: `數據已保存為 ${a.download}`,
            duration: 3000
        });
    });

    document.getElementById('import-btn')?.addEventListener('click', () => document.getElementById('import-file').click());

    function openResetDialog() {
        const dialog = document.getElementById('calculator-reset-dialog');
        if (!dialog) return;
        dialog.hidden = false;
        document.getElementById('calculator-reset-cancel')?.focus();
    }

    function closeResetDialog() {
        const dialog = document.getElementById('calculator-reset-dialog');
        if (!dialog) return;
        dialog.hidden = true;
    }

    function resetCalculatorData() {
        document.querySelectorAll('#view-calculator input[type="number"]').forEach(input => {
            input.value = '0';
            localStorage.setItem(input.id, '0');
        });

        document.querySelectorAll('#results span[id]').forEach(element => {
            element.textContent = element.id.includes('Rate') || element.id.includes('Compare') ? '0%' : '0';
            localStorage.setItem(`result-${element.id}`, element.textContent);
        });

        calculateResults();
        publishToBridge();

        notify({
            type: 'success',
            title: '重置完成',
            message: '計算器資料已重置為預設值',
            duration: 3000
        });
    }

    document.getElementById('reset-data-btn')?.addEventListener('click', () => {
        openResetDialog();
    });

    document.getElementById('calculator-reset-cancel')?.addEventListener('click', () => {
        closeResetDialog();
    });

    document.getElementById('calculator-reset-confirm')?.addEventListener('click', () => {
        resetCalculatorData();
        closeResetDialog();
    });

    document.getElementById('calculator-reset-dialog')?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.dataset.closeDialog === 'true') {
            closeResetDialog();
        }
    });

    document.getElementById('calculator-reset-dialog')?.addEventListener('keydown', (event) => {
        const dialog = document.getElementById('calculator-reset-dialog');
        if (dialog?.hidden) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            closeResetDialog();
        }
    });

    document.getElementById('import-file')?.addEventListener('change', event => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                [['attack1', 'atk1-'], ['attack2', 'atk2-'], ['defense1', 'def1-'], ['defense2', 'def2-']].forEach(([group, prefix]) => {
                    if (data[group]) {
                        Object.keys(data[group]).forEach(key => {
                            const element = document.getElementById(`${prefix}${key}`);
                            if (element) {
                                element.value = data[group][key];
                                localStorage.setItem(`${prefix}${key}`, data[group][key]);
                            }
                        });
                    }
                });
                calculateResults();
                publishToBridge();
                notify({
                    type: 'success',
                    title: '匯入成功',
                    message: '數據已成功匯入計算器',
                    duration: 3000
                });
            } catch (error) {
                notify({
                    type: 'error',
                    title: '匯入失敗',
                    message: error.message,
                    duration: 5000
                });
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });

    document.getElementById('calculator-ocr-file')?.addEventListener('change', event => {
        const file = event.target.files && event.target.files[0];
        handleOcrFileSelection(file);
        event.target.value = '';
    });

    hydrateCalculatorState();
}
