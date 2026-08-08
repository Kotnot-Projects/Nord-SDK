/**
 * sandbox.js - Режим песочницы для разработки
 */

class Sandbox {
    constructor() {
        this.isEnabled = false;
        this.mockData = {};
        this.bypassChecks = false;
    }

    enable() {
        this.isEnabled = true;
        this.bypassChecks = true;
        
        // Проверяем режим разработки
        if (this.isDevelopmentMode()) {
            console.log('🔧 [Sandbox] Режим разработки активирован');
            this.setupMocks();
        }
        
        return this;
    }

    disable() {
        this.isEnabled = false;
        this.bypassChecks = false;
        console.log('🔧 [Sandbox] Режим разработки отключен');
        return this;
    }

    isDevelopmentMode() {
        // Проверка через localStorage
        if (localStorage.getItem('nord_sandbox') === 'true') {
            return true;
        }
        
        // Проверка через URL параметр
        if (window.location.search.includes('nord_sandbox=true')) {
            return true;
        }
        
        // Проверка окружения
        if (process && process.env && process.env.NODE_ENV === 'development') {
            return true;
        }
        
        return false;
    }

    setupMocks() {
        // Мок для CCP
        this.mockData.ccp = {
            hwid: 'sandbox-hwid-12345',
            ip: '127.0.0.1',
            fps: 60,
            ping: 15,
            jitter: 2,
            timestamp: Date.now()
        };
        
        // Мок для лицензии
        this.mockData.license = {
            valid: true,
            key: 'SANDBOX-LICENSE-KEY-12345',
            data: {
                type: 'developer',
                expires: '2099-12-31',
                features: ['all']
            }
        };
        
        // Переопределяем некоторые функции
        this.hookFunctions();
    }

    hookFunctions() {
        // Перехват проверок
        if (window.NordAntiCheat) {
            const originalAddFlag = window.NordAntiCheat.prototype.addFlag;
            window.NordAntiCheat.prototype.addFlag = function(flag) {
                if (this.sandboxBypass) return;
                originalAddFlag.call(this, flag);
            };
            window.NordAntiCheat.prototype.sandboxBypass = true;
        }
        
        // Мок для Integrity
        if (window.Integrity) {
            const originalCheck = window.Integrity.check;
            window.Integrity.check = function() {
                if (this.sandboxBypass) {
                    return Promise.resolve({ passed: true, results: {}, timestamp: Date.now() });
                }
                return originalCheck.call(this);
            };
            window.Integrity.sandboxBypass = true;
        }
    }

    getMockData(type) {
        return this.mockData[type] || null;
    }

    // Настройка кастомных моков
    setMock(type, data) {
        this.mockData[type] = data;
        return this;
    }

    // Включение/выключение через API
    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.isEnabled;
    }

    // Статус
    getStatus() {
        return {
            enabled: this.isEnabled,
            bypassChecks: this.bypassChecks,
            mockData: Object.keys(this.mockData),
            developmentMode: this.isDevelopmentMode()
        };
    }
}

export default new Sandbox();
