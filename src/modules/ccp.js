/**
 * ccp.js - Nord Client Check Package (CCP)
 * Собирает: HWID, IP, FPS, Пинг, Дрожание (Jitter)
 */

class CCP {
    constructor() {
        this.hwid = null;
        this.ip = null;
        this.fps = 0;
        this.ping = 0;
        this.jitter = 0;
        this.pingHistory = [];
    }

    async collect() {
        return {
            hwid: await this.getHWID(),
            ip: await this.getIP(),
            fps: this.getFPS(),
            ping: await this.getPing(),
            jitter: this.getJitter(),
            timestamp: Date.now()
        };
    }

    async getHWID() {
        if (this.hwid) return this.hwid;
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');
            
            // Рисуем уникальную картинку
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Nord', 2, 15);
            ctx.fillStyle = 'rgba(102, 200, 0, 0.7)';
            ctx.fillText('SDK', 4, 45);
            
            // Добавляем WebGL
            let gl = canvas.getContext('webgl');
            if (!gl) gl = canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    ctx.fillText(vendor + renderer, 10, 100);
                }
            }
            
            // Собираем данные
            const data = [
                canvas.toDataURL('image/png'),
                screen.width + 'x' + screen.height,
                navigator.userAgent,
                navigator.language,
                new Date().getTimezoneOffset()
            ].join('|||');
            
            // Хэшируем
            this.hwid = await this.hash(data);
            return this.hwid;
        } catch (e) {
            console.warn('[CCP] Ошибка HWID:', e);
            return 'fallback-' + Date.now();
        }
    }

    async hash(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async getIP() {
        if (this.ip) return this.ip;
        
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.ip = data.ip;
            return this.ip;
        } catch {
            // Fallback через другой сервис
            try {
                const response = await fetch('https://api.seeip.org/jsonip');
                const data = await response.json();
                this.ip = data.ip;
                return this.ip;
            } catch {
                return '0.0.0.0';
            }
        }
    }

    getFPS() {
        let frames = 0;
        let lastTime = performance.now();
        
        const countFPS = () => {
            frames++;
            const now = performance.now();
            if (now >= lastTime + 1000) {
                this.fps = Math.round(frames * 1000 / (now - lastTime));
                frames = 0;
                lastTime = now;
            }
            requestAnimationFrame(countFPS);
        };
        
        countFPS();
        return this.fps;
    }

    async getPing() {
        const start = performance.now();
        try {
            await fetch(`${window.location.origin}/ping`, { 
                method: 'HEAD',
                cache: 'no-store'
            });
            const end = performance.now();
            this.ping = Math.round(end - start);
        } catch {
            // Fallback если нет своего сервера
            try {
                const start2 = performance.now();
                await fetch('https://httpbin.org/delay/0', { 
                    method: 'HEAD',
                    cache: 'no-store'
                });
                const end2 = performance.now();
                this.ping = Math.round(end2 - start2);
            } catch {
                this.ping = 999;
            }
        }
        
        // Сохраняем для jitter
        this.pingHistory.push(this.ping);
        if (this.pingHistory.length > 10) {
            this.pingHistory.shift();
        }
        
        return this.ping;
    }

    getJitter() {
        if (this.pingHistory.length < 2) return 0;
        
        let sum = 0;
        for (let i = 1; i < this.pingHistory.length; i++) {
            sum += Math.abs(this.pingHistory[i] - this.pingHistory[i-1]);
        }
        this.jitter = Math.round(sum / (this.pingHistory.length - 1));
        return this.jitter;
    }

    // Метод для непрерывного мониторинга
    startMonitoring(interval = 5000) {
        setInterval(async () => {
            const data = await this.collect();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('nord-ccp-update', { 
                    detail: data 
                }));
            }
        }, interval);
    }
}

export default new CCP();
