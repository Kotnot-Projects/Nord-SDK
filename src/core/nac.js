/**
 * nac.js - Nord Anti-Cheat Core
 * Версия: 1.0.0
 */

class NordAntiCheat {
    constructor(options = {}) {
        this.options = {
            debug: false,
            autoStart: true,
            checksInterval: 5000,
            ...options
        };
        
        this.flags = [];
        this.isRunning = false;
        this.modules = {};
        
        if (this.options.autoStart) {
            this.init();
        }
    }

    async init() {
        console.log('[NordAC] Инициализация...');
        this.isRunning = true;
        
        // Загрузка модулей
        await this.loadModules();
        
        // Запуск проверок
        this.startChecks();
        
        return this;
    }

    async loadModules() {
        const modules = [
            'ccp', 'integrity', 'anti-debug', 
            'packet-crypto', 'proof-of-work', 
            'event-logger', 'sandbox'
        ];
        
        for (const mod of modules) {
            try {
                const module = await import(`../modules/${mod}.js`);
                this.modules[mod] = module.default;
                if (this.options.debug) {
                    console.log(`[NordAC] Модуль ${mod} загружен`);
                }
            } catch (e) {
                console.warn(`[NordAC] Ошибка загрузки ${mod}:`, e);
            }
        }
    }

    startChecks() {
        setInterval(() => {
            this.runChecks();
        }, this.options.checksInterval);
    }

    async runChecks() {
        const results = {};
        
        // CCP: HWID + IP + FPS + Пинг + Дрожание
        if (this.modules.ccp) {
            results.ccp = await this.modules.ccp.collect();
        }
        
        // Integrity
        if (this.modules.integrity) {
            results.integrity = await this.modules.integrity.check();
            if (!results.integrity.passed) {
                this.addFlag('INTEGRITY_FAIL');
            }
        }
        
        // Anti-Debug
        if (this.modules['anti-debug']) {
            const debug = await this.modules['anti-debug'].detect();
            if (debug.detected) {
                this.addFlag('DEBUGGER_DETECTED');
            }
        }
        
        return results;
    }

    addFlag(flag) {
        if (!this.flags.includes(flag)) {
            this.flags.push(flag);
            console.warn(`[NordAC] Флаг: ${flag}`);
            this.onFlagDetected(flag);
        }
    }

    onFlagDetected(flag) {
        // Отправка на сервер
        if (typeof window !== 'undefined' && window.nordServer) {
            window.nordServer.reportFlag(flag);
        }
        
        // Callback
        if (this.options.onFlag) {
            this.options.onFlag(flag);
        }
    }

    getStatus() {
        return {
            running: this.isRunning,
            flags: this.flags,
            modules: Object.keys(this.modules),
            isClean: this.flags.length === 0
        };
    }

    destroy() {
        this.isRunning = false;
        this.flags = [];
        this.modules = {};
        console.log('[NordAC] Остановлен');
    }
}

// Экспорт
export default NordAntiCheat;
