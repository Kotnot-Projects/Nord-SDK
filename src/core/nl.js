/**
 * nl.js - Nord License Manager
 * Версия: 1.0.0
 */

class NordLicense {
    constructor(options = {}) {
        this.options = {
            serverUrl: 'https://api.nord-sdk.com/license',
            gracePeriod: 300000, // 5 минут
            checkInterval: 60000,
            ...options
        };
        
        this.key = null;
        this.valid = false;
        this.data = null;
        this.graceTimer = null;
    }

    async validate(key) {
        this.key = key;
        
        try {
            const response = await fetch(`${this.options.serverUrl}/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });
            
            const data = await response.json();
            
            if (data.valid) {
                this.valid = true;
                this.data = data;
                this.startPeriodicCheck();
                console.log('[NordLicense] ✅ Лицензия валидна');
                return true;
            } else {
                this.valid = false;
                console.warn('[NordLicense] ❌ Неверный ключ');
                this.startGracePeriod();
                return false;
            }
        } catch (e) {
            console.error('[NordLicense] Ошибка проверки:', e);
            return false;
        }
    }

    startGracePeriod() {
        if (this.graceTimer) clearTimeout(this.graceTimer);
        
        this.graceTimer = setTimeout(() => {
            if (!this.valid) {
                console.error('[NordLicense] ⏰ Грейс-период истек');
                this.onLicenseFailed();
            }
        }, this.options.gracePeriod);
    }

    startPeriodicCheck() {
        setInterval(async () => {
            if (this.key) {
                const isValid = await this.validate(this.key);
                if (!isValid) {
                    this.onLicenseFailed();
                }
            }
        }, this.options.checkInterval);
    }

    onLicenseFailed() {
        // Блокировка игры
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nord-license-failed'));
        }
        
        if (this.options.onFail) {
            this.options.onFail();
        }
    }

    getInfo() {
        return {
            valid: this.valid,
            key: this.key,
            data: this.data,
            expires: this.data?.expires || null
        };
    }

    async activateTrial() {
        try {
            const response = await fetch(`${this.options.serverUrl}/trial`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.key) {
                return this.validate(data.key);
            }
            return false;
        } catch {
            return false;
        }
    }
}

export default NordLicense;
