/**
 * proof-of-work.js - Proof of Work для защиты от DDoS
 */

class ProofOfWork {
    constructor() {
        this.difficulty = 4; // Количество нулей в начале хэша
        this.maxNonce = 1000000;
    }

    async solve(challenge) {
        const startTime = performance.now();
        let nonce = 0;
        
        while (nonce < this.maxNonce) {
            const hash = await this.hash(challenge + nonce);
            
            // Проверяем, начинается ли хэш с нужного количества нулей
            if (hash.startsWith('0'.repeat(this.difficulty))) {
                const time = performance.now() - startTime;
                return {
                    nonce: nonce,
                    hash: hash,
                    time: Math.round(time),
                    difficulty: this.difficulty
                };
            }
            
            nonce++;
        }
        
        // Если не нашли - увеличиваем сложность на следующую попытку
        this.difficulty = Math.min(this.difficulty + 1, 6);
        return null;
    }

    async hash(data) {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async verify(challenge, nonce, hash) {
        const computedHash = await this.hash(challenge + nonce);
        return computedHash === hash && 
               hash.startsWith('0'.repeat(this.difficulty));
    }

    // Получение задачи с сервера
    async getChallenge(serverUrl) {
        try {
            const response = await fetch(`${serverUrl}/pow/challenge`, {
                method: 'GET'
            });
            const data = await response.json();
            return data.challenge;
        } catch {
            // Генерируем свой challenge если сервер недоступен
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 10);
        }
    }

    // Отправка решения на сервер
    async submitSolution(serverUrl, solution) {
        try {
            const response = await fetch(`${serverUrl}/pow/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(solution)
            });
            
            const data = await response.json();
            return data.valid === true;
        } catch {
            return false;
        }
    }
}

export default new ProofOfWork();
