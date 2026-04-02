(function initPvpSyncBridge() {
    if (window.__pvpSyncBridgeInitialized) return;
    window.__pvpSyncBridgeInitialized = true;

    const CHANNEL = 'pvp-sync:update';
    const ATTR_KEYS = ['attack', 'elementalAttack', 'defenseBreak', 'accuracy', 'crit'];

    const state = {
        baselineAtk1: {
            attack: 0,
            elementalAttack: 0,
            defenseBreak: 0,
            accuracy: 0,
            crit: 0
        },
        hasValue: false,
        updatedAt: 0,
        source: ''
    };

    function toInt(value) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? n : 0;
    }

    function sanitizePartial(partial) {
        const next = {};
        ATTR_KEYS.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(partial, key)) {
                next[key] = toInt(partial[key]);
            }
        });
        return next;
    }

    function getBaselineAtk1() {
        return {
            ...state.baselineAtk1,
            _meta: {
                hasValue: state.hasValue,
                updatedAt: state.updatedAt,
                source: state.source
            }
        };
    }

    function setBaselineAtk1(partial, options = {}) {
        const { source = 'unknown', onlyIfEmpty = false } = options;
        if (onlyIfEmpty && state.hasValue) {
            return false;
        }

        const clean = sanitizePartial(partial || {});
        if (Object.keys(clean).length === 0) {
            return false;
        }

        state.baselineAtk1 = {
            ...state.baselineAtk1,
            ...clean
        };
        state.hasValue = true;
        state.updatedAt = Date.now();
        state.source = source;

        window.dispatchEvent(new CustomEvent(CHANNEL, {
            detail: {
                baselineAtk1: { ...state.baselineAtk1 },
                updatedAt: state.updatedAt,
                source: state.source
            }
        }));
        return true;
    }

    function subscribe(listener) {
        const wrapped = (event) => listener(event.detail);
        window.addEventListener(CHANNEL, wrapped);
        return () => window.removeEventListener(CHANNEL, wrapped);
    }

    window.pvpSyncBridge = {
        getBaselineAtk1,
        setBaselineAtk1,
        subscribe
    };
})();
