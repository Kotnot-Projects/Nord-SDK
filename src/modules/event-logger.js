/**
 * event-logger.js - Логирование подозрительных событий
 */

class EventLogger {
    constructor() {
        this.buffer = [];
        this.maxSize = 100;
        this.autoSend = true;
        this.serverUrl = null;
    }

    init(options = {}) {
        this.maxSize = options.maxSize || 100;
        this.autoSend = options.autoSend !== false;
        this.serverUrl = options.serverUrl || null;
        
        if (this.autoSend) {
            this.startAutoSend();
        }
        
        return this;
    }

    log(event, data = {}) {
        const entry = {
            event: event,
            data: data,
            timestamp: Date.now(),
            sessionId: this.getSessionId(),
            userId: this.getUserId(),
            gameId: this.getGameId()
        };
        
        this.buffer.push(entry);
        
        // Если буфер переполнен - отправляем
        if (this.buffer.length >= this.maxSize) {
            this.flush();
        }
        
        return entry;
    }

    // Подозрительные события
    logSuspicious(type, details) {
        return this.log('suspicious', {
            type: type,
            details: details,
            isSuspicious: true
        });
    }

    // Игровые события
    logGameEvent(type, data) {
        return this.log('game_event', {
            type: type,
            ...data
        });
    }

    // Движения игрока
    logMovement(player, position, speed, delta) {
        if (speed > 50 || delta > 1000) {
            return this.logSuspicious('movement', {
                playerId: player.id,
                position: position,
                speed: speed,
                delta: delta,
                reason: speed > 50 ? 'speed_hack' : 'teleport'
            });
        }
        
        return this.log('movement', {
            playerId: player.id,
            position: position,
            speed: speed,
            delta: delta
        });
    }

    // Действия
    logAction(player, action, target) {
        return this.log('action', {
            playerId: player.id,
            action: action,
            target: target
        });
    }

    async flush() {
        if (this.buffer.length === 0) return;
        
        const events = [...this.buffer];
        this.buffer = [];
        
        if (this.serverUrl) {
            try {
                await fetch(`${this.serverUrl}/logs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        events: events,
                        timestamp: Date.now()
                    })
                });
            } catch (e) {
                console.warn('[EventLogger] Ошибка отправки:', e);
                // Возвращаем в буфер
                this.buffer = [...events, ...this.buffer];
            }
        } else {
            // Локальное логирование
            console.log('[EventLogger] Логи:', events);
        }
    }

    startAutoSend() {
        setInterval(() => {
            this.flush();
        }, 30000); // Каждые 30 секунд
    }

    getSessionId() {
        if (!window._nordSessionId) {
            window._nordSessionId = Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        }
        return window._nordSessionId;
    }

    getUserId() {
        return window._nordUserId || 'anonymous';
    }

    getGameId() {
        return window._nordGameId || 'unknown';
    }

    // Получение всех логов
    getBuffer() {
        return this.buffer;
    }

    // Очистка буфера
    clear() {
        this.buffer = [];
    }
}

export default new EventLogger();
