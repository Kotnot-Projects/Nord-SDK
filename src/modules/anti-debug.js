/**
 * anti-debug.js - Обнаружение отладки и DevTools
 */

class AntiDebug {
    constructor() {
        this.detected = false;
        this.methods = [];
    }

    detect() {
        const checks = [
            this.checkDevTools,
            this.checkDebugger,
            this.checkVM,
            this.checkConsole
        ];
        
        const results = [];
        for (const check of checks) {
            const result = check.call(this);
            if (result.detected) {
                results.push(result);
            }
        }
        
        this.detected = results.length > 0;
        return {
            detected: this.detected,
            methods: results,
            timestamp: Date.now()
        };
    }

    checkDevTools() {
        // 1. Проверка размера окна
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        
        if (widthThreshold || heightThreshold) {
            return {
                detected: true,
                type: 'devtools_dimensions',
                details: { width: window.outerWidth - window.innerWidth, height: window.outerHeight - window.innerHeight }
            };
        }
        
        // 2. Проверка через console.log с getter
        let detected = false;
        const startTime = performance.now();
        
        // Создаем getter, который вызовется при логировании в DevTools
        Object.defineProperty(window, '__nord_debug', {
            get: function() {
                detected = true;
                return 'nord';
            }
        });
        
        console.log('%c', '__nord_debug');
        console.log(window.__nord_debug);
        
        const endTime = performance.now();
        
        // Если консоль открыта, время выполнения будет больше
        if (endTime - startTime > 100) {
            return {
                detected: true,
                type: 'devtools_console_slow',
                details: { time: endTime - startTime }
            };
        }
        
        return { detected: false };
    }

    checkDebugger() {
        // Проверка на debugger statement
        let detected = false;
        const start = performance.now();
        
        // eslint-disable-next-line no-debugger
        debugger;
        
        if (performance.now() - start > 100) {
            detected = true;
        }
        
        // Проверка через Function
        try {
            (function() {}).constructor('debugger')();
        } catch {
            detected = true;
        }
        
        return {
            detected: detected,
            type: 'debugger_detected',
            details: { method: 'debugger_statement' }
        };
    }

    checkVM() {
        // Проверка на виртуальную машину
        let detected = false;
        const checks = [];
        
        // Проверка navigator
        if (navigator.webdriver) {
            detected = true;
            checks.push('webdriver');
        }
        
        // Проверка плагинов (в VM их мало)
        if (navigator.plugins.length <= 1) {
            detected = true;
            checks.push('few_plugins');
        }
        
        // Проверка языка (в VM часто en-US)
        if (navigator.language === 'en-US' && navigator.languages.length === 1) {
            detected = true;
            checks.push('single_language');
        }
        
        return {
            detected: detected,
            type: 'vm_detected',
            details: { checks: checks }
        };
    }

    checkConsole() {
        // Проверка, что console не переопределен
        let detected = false;
        const methods = ['log', 'warn', 'error', 'info'];
        
        for (const method of methods) {
            const original = console[method];
            if (typeof original !== 'function') {
                detected = true;
                break;
            }
            
            // Проверка на подмену
            const str = original.toString();
            if (str.includes('[native code]') === false && str.includes('function') === false) {
                detected = true;
                break;
            }
        }
        
        return {
            detected: detected,
            type: 'console_hijacked',
            details: { method: 'console_check' }
        };
    }

    // Постоянный мониторинг
    startMonitoring(interval = 3000) {
        setInterval(() => {
            const result = this.detect();
            if (result.detected) {
                console.warn('[AntiDebug] Обнаружена отладка!', result);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('nord-debug-detected', {
                        detail: result
                    }));
                }
                
                // Можно предпринять действия
                if (this.options && this.options.onDetect) {
                    this.options.onDetect(result);
                }
            }
        }, interval);
    }

    setOptions(options) {
        this.options = options;
    }
}

export default new AntiDebug();
