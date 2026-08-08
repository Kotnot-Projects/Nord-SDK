/**
 * captcha.js - Nord Captcha
 * Версия: 1.0.0
 */

class NordCaptcha {
    constructor(options = {}) {
        this.options = {
            type: 'puzzle', // puzzle, click, swipe
            container: '#captcha-container',
            serverUrl: 'https://api.nord-sdk.com/captcha',
            ...options
        };
        
        this.solved = false;
        this.token = null;
        this.element = null;
    }

    render() {
        this.element = document.querySelector(this.options.container);
        if (!this.element) {
            console.error('[NordCaptcha] Контейнер не найден');
            return;
        }
        
        // Рендерим капчу в зависимости от типа
        switch (this.options.type) {
            case 'puzzle':
                this.renderPuzzle();
                break;
            case 'click':
                this.renderClick();
                break;
            case 'swipe':
                this.renderSwipe();
                break;
            default:
                this.renderPuzzle();
        }
    }

    renderPuzzle() {
        // Пример простой головоломки
        this.element.innerHTML = `
            <div class="nord-captcha">
                <div class="nord-captcha-puzzle">
                    <canvas id="captcha-canvas" width="300" height="200"></canvas>
                    <div class="nord-captcha-slider">
                        <input type="range" id="captcha-slider" min="0" max="100" value="0">
                        <span>Передвиньте ползунок чтобы собрать пазл</span>
                    </div>
                    <button id="captcha-submit">Проверить</button>
                </div>
            </div>
        `;
        
        this.setupPuzzleEvents();
    }

    setupPuzzleEvents() {
        const slider = document.getElementById('captcha-slider');
        const submit = document.getElementById('captcha-submit');
        const canvas = document.getElementById('captcha-canvas');
        
        // Рисуем фоновое изображение (в реальности загружаем с сервера)
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, 300, 200);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText('Переместите', 80, 60);
        ctx.fillText('ползунок', 100, 100);
        
        let solved = false;
        
        slider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value > 85) {
                solved = true;
                slider.style.background = 'linear-gradient(to right, #00b894, #00b894)';
                document.querySelector('.nord-captcha-slider span').textContent = '✅ Готово!';
            } else {
                solved = false;
                slider.style.background = 'linear-gradient(to right, #dfe6e9, #dfe6e9)';
                document.querySelector('.nord-captcha-slider span').textContent = 'Передвиньте ползунок чтобы собрать пазл';
            }
        });
        
        submit.addEventListener('click', async () => {
            if (solved) {
                await this.verify();
            } else {
                alert('Соберите пазл сначала!');
            }
        });
    }

    renderClick() {
        // Капча-клик (выбор правильных изображений)
        this.element.innerHTML = `
            <div class="nord-captcha">
                <h3>Выберите все изображения с транспортом</h3>
                <div class="nord-captcha-grid">
                    ${Array(9).fill(0).map((_, i) => `
                        <div class="captcha-item" data-id="${i}">
                            <img src="https://picsum.photos/seed/${i}/100/100" alt="item">
                        </div>
                    `).join('')}
                </div>
                <button id="captcha-verify">Проверить</button>
            </div>
        `;
        
        this.setupClickEvents();
    }

    setupClickEvents() {
        const items = this.element.querySelectorAll('.captcha-item');
        let selected = new Set();
        
        items.forEach(item => {
            item.addEventListener('click', () => {
                item.classList.toggle('selected');
                if (item.classList.contains('selected')) {
                    selected.add(item.dataset.id);
                } else {
                    selected.delete(item.dataset.id);
                }
            });
        });
        
        document.getElementById('captcha-verify').addEventListener('click', async () => {
            // В реальности проверяем на сервере
            if (selected.size >= 3) {
                await this.verify();
            } else {
                alert('Выберите минимум 3 картинки');
            }
        });
    }

    renderSwipe() {
        // Свайп-капча
        this.element.innerHTML = `
            <div class="nord-captcha">
                <div class="nord-captcha-swipe">
                    <div class="swipe-track">
                        <div class="swipe-thumb" id="swipe-thumb">
                            ➡️
                        </div>
                    </div>
                    <span>Потяните вправо для верификации</span>
                </div>
            </div>
        `;
        
        this.setupSwipeEvents();
    }

    setupSwipeEvents() {
        const thumb = document.getElementById('swipe-thumb');
        let isDragging = false;
        let startX = 0;
        let currentX = 0;
        
        thumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const delta = e.clientX - startX;
            currentX = Math.min(Math.max(delta, 0), 250);
            thumb.style.transform = `translateX(${currentX}px)`;
            
            if (currentX >= 250) {
                isDragging = false;
                thumb.style.transform = 'translateX(250px)';
                thumb.style.background = '#00b894';
                thumb.textContent = '✅';
                this.verify();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging && currentX < 250) {
                isDragging = false;
                thumb.style.transform = 'translateX(0)';
            }
        });
    }

    async verify() {
        try {
            const response = await fetch(`${this.options.serverUrl}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    type: this.options.type,
                    solved: true 
                })
            });
            
            const data = await response.json();
            
            if (data.token) {
                this.solved = true;
                this.token = data.token;
                console.log('[NordCaptcha] ✅ Решена');
                this.onSolved(data.token);
                return data.token;
            }
        } catch (e) {
            console.error('[NordCaptcha] Ошибка:', e);
        }
    }

    onSolved(token) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nord-captcha-solved', { 
                detail: { token } 
            }));
        }
        
        if (this.options.onSolve) {
            this.options.onSolve(token);
        }
    }

    isSolved() {
        return this.solved;
    }

    getToken() {
        return this.token;
    }
}

export default NordCaptcha;
