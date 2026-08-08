/**
 * integrity.js - Проверка целостности файлов
 */

class Integrity {
    constructor() {
        this.checksums = {};
        this.passed = false;
    }

    async check() {
        const files = [
            'nac.js', 'nl.js', 'captcha.js',
            'ccp.js', 'anti-debug.js', 'packet-crypto.js'
        ];
        
        let allPassed = true;
        const results = {};
        
        for (const file of files) {
            try {
                const hash = await this.getFileHash(file);
                const expected = this.getExpectedHash(file);
                
                results[file] = {
                    passed: hash === expected,
                    hash: hash,
                    expected: expected
                };
                
                if (hash !== expected) {
                    allPassed = false;
                    console.warn(`[Integrity] ❌ ${file} изменен!`);
                }
            } catch (e) {
                results[file] = {
                    passed: false,
                    error: e.message
                };
                allPassed = false;
            }
        }
        
        this.passed = allPassed;
        return {
            passed: allPassed,
            results: results,
            timestamp: Date.now()
        };
    }

    async getFileHash(filename) {
        // В браузере получаем хэш загруженного скрипта
        const scriptContent = await this.getScriptContent(filename);
        const encoder = new TextEncoder();
        const data = encoder.encode(scriptContent);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    getScriptContent(filename) {
        return new Promise((resolve, reject) => {
            const scripts = document.querySelectorAll('script[src]');
            for (const script of scripts) {
                if (script.src.includes(filename)) {
                    fetch(script.src)
                        .then(res => res.text())
                        .then(resolve)
                        .catch(reject);
                    return;
                }
            }
            reject(new Error(`Скрипт ${filename} не найден`));
        });
    }

    getExpectedHash(filename) {
        // В реальности загружаем с сервера или встроены в билд
        // Здесь хардкод для примера
        const EXPECTED = {
            'nac.js': '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
            'nl.js': 'a8f5f167f44f4964e6c998d106b88b55b903c0a0d1fe75f7b0a53db72e0e3b61',
            'captcha.js': 'd2c2c4c0d3b8f5f6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0'
        };
        
        return EXPECTED[filename] || '';
    }

    // Автопроверка при загрузке
    autoCheck() {
        document.addEventListener('DOMContentLoaded', async () => {
            const result = await this.check();
            if (!result.passed) {
                console.error('[Integrity] ❌ Нарушена целостность!');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('nord-integrity-fail', {
                        detail: result
                    }));
                }
            } else {
                console.log('[Integrity] ✅ Все файлы валидны');
            }
        });
    }
}

export default new Integrity();
