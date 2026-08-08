/**
 * packet-crypto.js - Шифрование сетевых пакетов
 */

class PacketCrypto {
    constructor() {
        this.key = null;
        this.algorithm = 'AES-GCM';
        this.sessionId = null;
    }

    init(sessionId, key) {
        this.sessionId = sessionId;
        this.key = key;
        return this;
    }

    async encrypt(data) {
        if (!this.key) {
            console.warn('[PacketCrypto] Нет ключа, используется XOR fallback');
            return this.xorEncrypt(data);
        }
        
        try {
            const encoder = new TextEncoder();
            const encoded = encoder.encode(JSON.stringify(data));
            
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const cryptoKey = await this.importKey(this.key);
            
            const encrypted = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                cryptoKey,
                encoded
            );
            
            // Объединяем IV и зашифрованные данные
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv, 0);
            result.set(new Uint8Array(encrypted), iv.length);
            
            return this.toBase64(result);
        } catch (e) {
            console.error('[PacketCrypto] Ошибка шифрования:', e);
            return this.xorEncrypt(data);
        }
    }

    async decrypt(encrypted) {
        if (!this.key) {
            console.warn('[PacketCrypto] Нет ключа, используется XOR fallback');
            return this.xorDecrypt(encrypted);
        }
        
        try {
            const data = this.fromBase64(encrypted);
            const iv = data.slice(0, 12);
            const ciphertext = data.slice(12);
            
            const cryptoKey = await this.importKey(this.key);
            
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                cryptoKey,
                ciphertext
            );
            
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (e) {
            console.error('[PacketCrypto] Ошибка дешифрования:', e);
            return this.xorDecrypt(encrypted);
        }
    }

    async importKey(key) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        
        return await crypto.subtle.importKey(
            'raw',
            keyData,
            this.algorithm,
            false,
            ['encrypt', 'decrypt']
        );
    }

    // XOR fallback (для совместимости)
    xorEncrypt(data) {
        const str = JSON.stringify(data);
        let result = '';
        const key = this.key || 'nord-sdk-default-key';
        
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        
        return btoa(result);
    }

    xorDecrypt(encrypted) {
        try {
            const str = atob(encrypted);
            let result = '';
            const key = this.key || 'nord-sdk-default-key';
            
            for (let i = 0; i < str.length; i++) {
                const charCode = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            
            return JSON.parse(result);
        } catch (e) {
            console.error('[PacketCrypto] XOR дешифрование ошибка:', e);
            return null;
        }
    }

    toBase64(data) {
        return btoa(String.fromCharCode(...data));
    }

    fromBase64(str) {
        const binary = atob(str);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    // Генерация сессионного ключа
    generateSessionKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        this.key = this.toBase64(array);
        this.sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        return {
            key: this.key,
            sessionId: this.sessionId
        };
    }
}

export default new PacketCrypto();
