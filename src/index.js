/**
 * Nord SDK - Главный модуль
 * Экспорт всего API
 */

import NordAntiCheat from './core/nac.js';
import NordLicense from './core/nl.js';
import NordCaptcha from './core/captcha.js';
import CCP from './modules/ccp.js';
import Integrity from './modules/integrity.js';
import AntiDebug from './modules/anti-debug.js';
import PacketCrypto from './modules/packet-crypto.js';
import ProofOfWork from './modules/proof-of-work.js';
import EventLogger from './modules/event-logger.js';
import Sandbox from './modules/sandbox.js';

// API для публичного использования
class NordSDK {
    constructor(options = {}) {
        this.options = options;
        this.antiCheat = new NordAntiCheat(options.antiCheat || {});
        this.license = new NordLicense(options.license || {});
        this.captcha = new NordCaptcha(options.captcha || {});
        
        // Модули
        this.modules = {
            ccp: CCP,
            integrity: Integrity,
            antiDebug: AntiDebug,
            packetCrypto: PacketCrypto,
            proofOfWork: ProofOfWork,
            eventLogger: EventLogger,
            sandbox: Sandbox
        };
        
        // Автоинициализация
        if (options.autoInit !== false) {
            this.init();
        }
    }

    async init() {
        console.log('🚀 Nord SDK initialized');
        
        // Запуск CCP мониторинга
        if (this.options.monitor !== false) {
            CCP.startMonitoring(5000);
        }
        
        // Проверка целостности
        if (this.options.integrityCheck !== false) {
            Integrity.autoCheck();
        }
        
        // Анти-отладка
        if (this.options.antiDebug !== false) {
            AntiDebug.setOptions(this.options.antiDebugOptions || {});
            AntiDebug.startMonitoring(3000);
        }
        
        return this;
    }

    // Публичное API
    getStatus() {
        return {
            antiCheat: this.antiCheat.getStatus(),
            license: this.license.getInfo(),
            modules: Object.keys(this.modules),
            version: '1.0.0'
        };
    }

    // Капча
    async showCaptcha(type = 'puzzle') {
        this.captcha.options.type = type;
        this.captcha.render();
        return new Promise((resolve) => {
            this.captcha.options.onSolve = (token) => {
                resolve(token);
            };
        });
    }

    // Лицензия
    async validateLicense(key) {
        return await this.license.validate(key);
    }

    // CCP
    async collectClientData() {
        return await CCP.collect();
    }

    // Шифрование
    encrypt(data) {
        return PacketCrypto.encrypt(data);
    }

    decrypt(data) {
        return PacketCrypto.decrypt(data);
    }

    // PoW
    async solveProofOfWork(challenge) {
        return await ProofOfWork.solve(challenge);
    }

    // Логирование
    log(event, data) {
        return EventLogger.log(event, data);
    }

    // Песочница
    enableSandbox() {
        Sandbox.enable();
    }

    disableSandbox() {
        Sandbox.disable();
    }

    // Уничтожение
    destroy() {
        this.antiCheat.destroy();
        console.log('🛑 Nord SDK destroyed');
    }
}

// Экспорт для npm
export {
    NordSDK as default,
    NordAntiCheat,
    NordLicense,
    NordCaptcha,
    CCP,
    Integrity,
    AntiDebug,
    PacketCrypto,
    ProofOfWork,
    EventLogger,
    Sandbox
};

// Экспорт в глобальный объект для браузера
if (typeof window !== 'undefined') {
    window.NordSDK = NordSDK;
    window.nord = new NordSDK({ autoInit: false });
}
