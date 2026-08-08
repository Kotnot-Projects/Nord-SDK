/**
 * api.js - Nord SDK API Client
 * Взаимодействие с серверной частью
 * Версия: 1.0.0
 */

class NordAPI {
    constructor(options = {}) {
        this.baseURL = options.baseURL || 'https://api.nord-sdk.com/v1';
        this.apiKey = options.apiKey || null;
        this.sessionToken = options.sessionToken || null;
        this.timeout = options.timeout || 10000;
        this.retryCount = options.retryCount || 3;
        this.retryDelay = options.retryDelay || 1000;
        
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Nord-SDK/1.0.0'
        };
        
        if (this.apiKey) {
            this.headers['X-API-Key'] = this.apiKey;
        }
        
        if (this.sessionToken) {
            this.headers['Authorization'] = `Bearer ${this.sessionToken}`;
        }
    }

    // ============ ОСНОВНЫЕ МЕТОДЫ ============

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: { ...this.headers, ...options.headers },
            signal: AbortSignal.timeout(this.timeout)
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        let lastError;
        for (let attempt = 0; attempt < this.retryCount; attempt++) {
            try {
                const response = await fetch(url, config);
                
                // Обработка HTTP ошибок
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new NordAPIError(
                        errorData.message || `HTTP ${response.status}`,
                        response.status,
                        errorData
                    );
                }

                const data = await response.json();
                
                // Проверка бизнес-ошибок
                if (data.error) {
                    throw new NordAPIError(data.error, 400, data);
                }

                return data;

            } catch (error) {
                lastError = error;
                
                // Не повторяем на определенные ошибки
                if (error instanceof NordAPIError) {
                    if (error.status === 401 || error.status === 403) {
                        break; // Не повторяем на авторизацию
                    }
                }
                
                // Ждем перед повторной попыткой
                if (attempt < this.retryCount - 1) {
                    await this.sleep(this.retryDelay * (attempt + 1));
                }
            }
        }

        throw lastError;
    }

    // ============ ЛИЦЕНЗИЯ ============

    /**
     * Проверка лицензионного ключа
     */
    async validateLicense(key, gameId = null) {
        return this.request('/license/validate', {
            method: 'POST',
            body: { 
                key, 
                gameId: gameId || this.gameId,
                hwid: await this.getHWID()
            }
        });
    }

    /**
     * Активация пробной версии
     */
    async activateTrial(gameId = null) {
        return this.request('/license/trial', {
            method: 'POST',
            body: { 
                gameId: gameId || this.gameId,
                hwid: await this.getHWID()
            }
        });
    }

    /**
     * Деактивация лицензии
     */
    async deactivateLicense(key) {
        return this.request('/license/deactivate', {
            method: 'POST',
            body: { key }
        });
    }

    /**
     * Получение информации о лицензии
     */
    async getLicenseInfo(key) {
        return this.request(`/license/info/${key}`, {
            method: 'GET'
        });
    }

    // ============ АНТИЧИТ ============

    /**
     * Отправка флагов античита
     */
    async reportFlags(flags, metadata = {}) {
        return this.request('/anticheat/report', {
            method: 'POST',
            body: {
                flags,
                metadata: {
                    ...metadata,
                    hwid: await this.getHWID(),
                    timestamp: Date.now()
                }
            }
        });
    }

    /**
     * Получение списка забаненных HWID
     */
    async getBannedHWIDs() {
        return this.request('/anticheat/bans', {
            method: 'GET'
        });
    }

    /**
     * Проверка, забанен ли текущий игрок
     */
    async checkBan() {
        const hwid = await this.getHWID();
        return this.request('/anticheat/check-ban', {
            method: 'POST',
            body: { hwid }
        });
    }

    // ============ CCP (CLIENT CHECK PACKAGE) ============

    /**
     * Отправка данных клиента на сервер
     */
    async sendClientData(data) {
        return this.request('/ccp/submit', {
            method: 'POST',
            body: {
                ...data,
                hwid: await this.getHWID(),
                timestamp: Date.now()
            }
        });
    }

    /**
     * Получение пороговых значений для CCP
     */
    async getCCPThresholds() {
        return this.request('/ccp/thresholds', {
            method: 'GET'
        });
    }

    // ============ КАПЧА ============

    /**
     * Получение задачи для капчи
     */
    async getCaptchaChallenge(type = 'puzzle') {
        return this.request('/captcha/challenge', {
            method: 'POST',
            body: { 
                type,
                timestamp: Date.now()
            }
        });
    }

    /**
     * Проверка решения капчи
     */
    async verifyCaptcha(solution, challengeId) {
        return this.request('/captcha/verify', {
            method: 'POST',
            body: {
                solution,
                challengeId,
                hwid: await this.getHWID()
            }
        });
    }

    // ============ PoW (PROOF OF WORK) ============

    /**
     * Получение задачи PoW
     */
    async getPowChallenge(difficulty = 4) {
        return this.request('/pow/challenge', {
            method: 'POST',
            body: { 
                difficulty,
                hwid: await this.getHWID()
            }
        });
    }

    /**
     * Отправка решения PoW
     */
    async submitPowSolution(challengeId, nonce, hash) {
        return this.request('/pow/submit', {
            method: 'POST',
            body: {
                challengeId,
                nonce,
                hash,
                hwid: await this.getHWID()
            }
        });
    }

    // ============ ЛОГИ ============

    /**
     * Отправка логов на сервер
     */
    async sendLogs(logs) {
        return this.request('/logs/batch', {
            method: 'POST',
            body: {
                logs,
                hwid: await this.getHWID(),
                timestamp: Date.now()
            }
        });
    }

    /**
     * Отправка одного лога
     */
    async sendLog(event, data = {}) {
        return this.request('/logs/single', {
            method: 'POST',
            body: {
                event,
                data,
                hwid: await this.getHWID(),
                timestamp: Date.now()
            }
        });
    }

    // ============ СТАТИСТИКА ============

    /**
     * Отправка игровой статистики
     */
    async sendGameStats(stats) {
        return this.request('/stats/game', {
            method: 'POST',
            body: {
                ...stats,
                hwid: await this.getHWID(),
                timestamp: Date.now()
            }
        });
    }

    /**
     * Получение глобальной статистики
     */
    async getGlobalStats(gameId = null) {
        return this.request(`/stats/global${gameId ? `?gameId=${gameId}` : ''}`, {
            method: 'GET'
        });
    }

    // ============ ИГРОВЫЕ СЕССИИ ============

    /**
     * Создание игровой сессии
     */
    async createSession(gameId, playerId) {
        return this.request('/session/create', {
            method: 'POST',
            body: {
                gameId,
                playerId,
                hwid: await this.getHWID(),
                startTime: Date.now()
            }
        });
    }

    /**
     * Закрытие игровой сессии
     */
    async closeSession(sessionId, stats = {}) {
        return this.request('/session/close', {
            method: 'POST',
            body: {
                sessionId,
                stats,
                endTime: Date.now()
            }
        });
    }

    /**
     * Обновление сессии (heartbeat)
     */
    async heartbeat(sessionId) {
        return this.request('/session/heartbeat', {
            method: 'POST',
            body: {
                sessionId,
                timestamp: Date.now()
            }
        });
    }

    // ============ ОБНОВЛЕНИЯ ============

    /**
     * Проверка обновлений игры
     */
    async checkForUpdates(gameId, currentVersion) {
        return this.request('/updates/check', {
            method: 'POST',
            body: {
                gameId,
                currentVersion,
                timestamp: Date.now()
            }
        });
    }

    /**
     * Получение информации о последнем обновлении
     */
    async getUpdateInfo(gameId) {
        return this.request(`/updates/info/${gameId}`, {
            method: 'GET'
        });
    }

    // ============ ПОЛЬЗОВАТЕЛИ ============

    /**
     * Регистрация пользователя
     */
    async registerUser(username, email, password, extra = {}) {
        return this.request('/user/register', {
            method: 'POST',
            body: {
                username,
                email,
                password,
                ...extra,
                hwid: await this.getHWID()
            }
        });
    }

    /**
     * Вход пользователя
     */
    async loginUser(email, password) {
        const response = await this.request('/user/login', {
            method: 'POST',
            body: {
                email,
                password,
                hwid: await this.getHWID()
            }
        });
        
        if (response.token) {
            this.sessionToken = response.token;
            this.headers['Authorization'] = `Bearer ${response.token}`;
        }
        
        return response;
    }

    /**
     * Выход пользователя
     */
    async logoutUser() {
        const response = await this.request('/user/logout', {
            method: 'POST'
        });
        
        this.sessionToken = null;
        delete this.headers['Authorization'];
        
        return response;
    }

    // ============ ВНУТРЕННИЕ МЕТОДЫ ============

    async getHWID() {
        try {
            // Пытаемся получить HWID из модуля CCP
            if (window.CCP) {
                const data = await window.CCP.collect();
                return data.hwid;
            }
            
            // Fallback
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.fillText(navigator.userAgent, 10, 50);
            
            const data = canvas.toDataURL() + screen.width + screen.height;
            const encoder = new TextEncoder();
            const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
            return Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch {
            return 'fallback-' + Date.now();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============ SETTERS ============

    setBaseURL(url) {
        this.baseURL = url;
        return this;
    }

    setAPIKey(key) {
        this.apiKey = key;
        this.headers['X-API-Key'] = key;
        return this;
    }

    setSessionToken(token) {
        this.sessionToken = token;
        this.headers['Authorization'] = `Bearer ${token}`;
        return this;
    }

    setGameId(gameId) {
        this.gameId = gameId;
        return this;
    }

    setHeaders(headers) {
        this.headers = { ...this.headers, ...headers };
        return this;
    }

    // ============ УТИЛИТЫ ============

    /**
     * Проверка соединения с сервером
     */
    async ping() {
        try {
            const start = Date.now();
            await this.request('/ping', { method: 'HEAD' });
            return Date.now() - start;
        } catch {
            return -1;
        }
    }

    /**
     * Получение версии API
     */
    async getVersion() {
        return this.request('/version', {
            method: 'GET'
        });
    }

    /**
     * Получение статуса сервера
     */
    async getServerStatus() {
        return this.request('/status', {
            method: 'GET'
        });
    }
}

// ============ КЛАСС ОШИБКИ ============

class NordAPIError extends Error {
    constructor(message, status = 500, data = {}) {
        super(message);
        this.name = 'NordAPIError';
        this.status = status;
        this.data = data;
    }
}

// ============ ЭКСПОРТ ============

export default NordAPI;
export { NordAPIError };
