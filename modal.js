// ==============================================
// Entware Manager - модуль уведомлений (Modal ve Toast)
// Copyright (c) 2026 Di1r1 — https://github.com/Di1r1/entware-manager
// Sürüm: 1.1
// Tarih: 2026-09-14
// ==============================================

const Modal = {
    element: null,
    bodyElement: null,
    titleElement: null,
    initialized: false,

    init() {
        if (this.initialized) return;
        this.element = document.getElementById('infoModal');
        this.bodyElement = document.getElementById('modalBody');
        this.titleElement = document.getElementById('modalTitle');
        if (!this.element || !this.bodyElement) return;

        const closeBtn = this.element.querySelector('.close');
        if (closeBtn) closeBtn.onclick = () => this.hide();

        window.addEventListener('click', (event) => {
            if (event.target === this.element) this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });
        this.initialized = true;
    },

    show(content, isError = false, title = '') {
        if (!this.element || !this.bodyElement) return;
        if (this.titleElement && title) this.titleElement.textContent = title;
        if (isError) this.element.classList.add('error-modal');
        else this.element.classList.remove('error-modal');

        if (typeof content === 'string' && content.trim().startsWith('<')) this.bodyElement.innerHTML = content;
        else this.bodyElement.textContent = content;
        this.element.style.display = 'block';
    },

    hide() {
        if (this.element) this.element.style.display = 'none';
    },

    info(content, title = 'Информация') {
        this.show(content, false, title);
    },

    error(content, title = 'Ошибка') {
        this.show(content, true, title);
    },

    loading(title = 'Загрузка...') {
        this.show('<div class="loading-spinner"></div>', false, title);
    },

    promptPassword(title, onConfirm) {
        if (!this.element || !this.bodyElement) { onConfirm(''); return; }
        if (this.titleElement) this.titleElement.textContent = title || 'Введите пароль';
        this.element.classList.remove('error-modal');
        this.bodyElement.innerHTML = `
            <div style="padding:6px 0 4px;">
                <input type="password" id="pwInput" placeholder="Пароль"
                    style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--input-border);background:var(--input-bg);color:var(--text-primary);font-size:14px;box-sizing:border-box;">
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
                <button id="pwCancel" class="packages-delete-btn" style="background:#4a5568;">Отмена</button>
                <button id="pwOk" class="packages-delete-btn"><svg class="icon" width="14" height="14"><use href="/entware-manager/icons.svg?v=6#icon-check"/></svg> OK</button>
            </div>`;
        this.element.style.display = 'block';

        var input = document.getElementById('pwInput');
        var ok = document.getElementById('pwOk');
        var cancel = document.getElementById('pwCancel');
        var closeBtn = this.element.querySelector('.close');
        var settled = false;

        var outsideClick = function(event) {
            if (event.target === Modal.element) done('');
        };

        var done = function(val) {
            if (settled) return;
            settled = true;
            if (closeBtn) closeBtn.onclick = function() { Modal.hide(); };
            Modal.element.removeEventListener('click', outsideClick);
            Modal.hide();
            onConfirm(val);
        };

        if (input) input.focus();
        if (ok) ok.onclick = function() { done(input ? input.value : ''); };
        if (cancel) cancel.onclick = function() { done(''); };
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') { e.preventDefault(); done(input.value); }
                if (e.key === 'Escape') { e.preventDefault(); done(''); }
            });
        }
        if (closeBtn) closeBtn.onclick = function() { done(''); };
        this.element.addEventListener('click', outsideClick);
    }
};

const Toast = {
    element: null,
    hideTimer: null,

    init() {
        if (this.element && document.body.contains(this.element)) return;
        this.element = document.createElement('div');
        this.element.id = 'toast';
        document.body.appendChild(this.element);
    },

    show(message, isError = false, duration = 3000) {
        if (!this.element || !document.body.contains(this.element)) this.init();
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        }
        this.element.textContent = message;
        this.element.style.backgroundColor = isError ? '#e53e3e' : '#2ecc71';
        this.element.style.opacity = '1';
        this.hideTimer = setTimeout(() => {
            if (this.element) this.element.style.opacity = '0';
            this.hideTimer = null;
        }, duration);
    }
};

document.addEventListener('DOMContentLoaded', () => Modal.init());
