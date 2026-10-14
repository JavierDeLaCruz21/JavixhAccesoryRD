// ==========================================
// UI HELPERS — Sistema unificado de toasts, validación, skeletons
// Cargar en TODAS las páginas ANTES del script principal
// ==========================================

(function(window) {
    'use strict';

    // ==========================================
    // ESTILOS INYECTADOS
    // ==========================================
    function injectBaseStyles() {
        if (document.getElementById('ui-helpers-styles')) return;

        const style = document.createElement('style');
        style.id = 'ui-helpers-styles';
        style.textContent = `
            /* Skip link accesibilidad */
            .skip-link {
                position: absolute;
                top: -100px;
                left: 1rem;
                z-index: 10000;
                padding: 0.75rem 1.25rem;
                background: #2563eb;
                color: #fff;
                text-decoration: none;
                font-weight: 700;
                border-radius: 8px;
                transition: top 0.2s;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .skip-link:focus {
                top: 1rem;
                outline: 2px solid #fff;
                outline-offset: 2px;
            }

            /* Quitar outline feo al main cuando recibe foco por skip-link */
            main[tabindex="-1"]:focus {
                outline: none;
            }

            /* Toasts */
            .toast-container {
                position: fixed;
                bottom: 1.5rem;
                right: 1.5rem;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                max-width: min(400px, calc(100vw - 3rem));
                pointer-events: none;
            }
            .toast-item {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                padding: 1rem 1.1rem;
                border-radius: 12px;
                background: #fff;
                color: #1e293b;
                border-left: 4px solid #2563eb;
                box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                font-weight: 500;
                font-size: 0.95rem;
                line-height: 1.4;
                pointer-events: auto;
                animation: toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            body.dark-mode .toast-item {
                background: #1e293b;
                color: #f1f5f9;
            }
            .toast-item.toast-exit {
                animation: toastSlideOut 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
            .toast-item i { font-size: 1.15rem; flex-shrink: 0; margin-top: 0.1rem; }
            .toast-item .toast-content { flex: 1; word-break: break-word; }
            .toast-item .toast-close {
                background: none; border: none; color: inherit; opacity: 0.5;
                cursor: pointer; padding: 0; font-size: 1rem; transition: opacity 0.2s;
            }
            .toast-item .toast-close:hover { opacity: 1; }
            .toast-item.toast-success { border-left-color: #10b981; }
            .toast-item.toast-success i { color: #10b981; }
            .toast-item.toast-error { border-left-color: #ef4444; }
            .toast-item.toast-error i { color: #ef4444; }
            .toast-item.toast-warning { border-left-color: #f59e0b; }
            .toast-item.toast-warning i { color: #f59e0b; }
            .toast-item.toast-info { border-left-color: #2563eb; }
            .toast-item.toast-info i { color: #2563eb; }

            @keyframes toastSlideIn {
                from { opacity: 0; transform: translateX(30px) scale(0.96); }
                to   { opacity: 1; transform: translateX(0) scale(1); }
            }
            @keyframes toastSlideOut {
                from { opacity: 1; transform: translateX(0); }
                to   { opacity: 0; transform: translateX(30px); }
            }

            /* Validación inline */
            .input-group, .form-group { position: relative; }
            .has-error input, .has-error select, .has-error textarea {
                border-color: #ef4444 !important;
                background: rgba(239, 68, 68, 0.05) !important;
            }
            .has-error label { color: #ef4444; }
            .has-success input, .has-success select, .has-success textarea {
                border-color: #10b981 !important;
                background: rgba(16, 185, 129, 0.04) !important;
            }
            .field-error, .field-success {
                display: flex; align-items: center; gap: 0.35rem;
                margin-top: 0.35rem; font-size: 0.82rem; font-weight: 500;
                animation: shakeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .field-error { color: #ef4444; }
            .field-success { color: #10b981; }
            .field-error i, .field-success i { font-size: 0.75rem; }
            @keyframes shakeIn {
                0% { opacity: 0; transform: translateY(-4px); }
                50% { transform: translateY(0); }
                60% { transform: translateX(-3px); }
                70% { transform: translateX(3px); }
                80% { transform: translateX(-2px); }
                90% { transform: translateX(2px); }
                100% { opacity: 1; transform: translateX(0); }
            }

            /* Botón con estado de carga */
            .btn-loading {
                position: relative; color: transparent !important; pointer-events: none;
            }
            .btn-loading::after {
                content: ''; position: absolute; top: 50%; left: 50%;
                width: 18px; height: 18px; margin: -9px 0 0 -9px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top-color: #fff; border-radius: 50%;
                animation: uispin 0.7s linear infinite;
            }
            @keyframes uispin { to { transform: rotate(360deg); } }

            /* Skeletons */
            .skeleton {
                background: linear-gradient(90deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.06) 100%);
                background-size: 200% 100%;
                animation: shimmer 1.4s ease-in-out infinite;
                border-radius: 6px;
            }
            body.dark-mode .skeleton {
                background: linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 100%);
                background-size: 200% 100%;
            }
            @keyframes shimmer {
                0%   { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            .skeleton-card {
                background: rgba(0,0,0,0.02); border-radius: 16px; padding: 1.25rem;
                border: 1px solid rgba(0,0,0,0.06);
                display: flex; flex-direction: column; gap: 0.75rem;
            }
            body.dark-mode .skeleton-card {
                background: rgba(255,255,255,0.02);
                border-color: rgba(255,255,255,0.08);
            }
            .skeleton-card .sk-img { width: 100%; height: 180px; border-radius: 12px; }
            .skeleton-card .sk-line { height: 12px; border-radius: 6px; }
            .skeleton-card .sk-line.short { width: 40%; }
            .skeleton-card .sk-line.medium { width: 70%; }
            .skeleton-card .sk-line.long { width: 90%; }
            .skeleton-card .sk-price { height: 22px; width: 50%; margin-top: 0.5rem; }
            .skeleton-card .sk-btn { height: 40px; border-radius: 999px; margin-top: 0.25rem; }
            .skeleton-row .sk-cell { height: 14px; border-radius: 6px; }
            .skeleton-order {
                padding: 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.08);
                display: flex; flex-direction: column; gap: 0.8rem;
            }
            body.dark-mode .skeleton-order { border-color: rgba(255,255,255,0.1); }
            .skeleton-order .sk-line { height: 14px; border-radius: 6px; }
            .skeleton-order .sk-line.short { width: 30%; }
            .skeleton-order .sk-line.medium { width: 60%; }
            .skeleton-order .sk-line.long { width: 85%; }

            /* Empty state con CTA */
            .empty-state-cta {
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                gap: 1rem; padding: 3rem 1.5rem; text-align: center;
                background: rgba(0,0,0,0.02); border-radius: 20px;
                border: 1px dashed rgba(0,0,0,0.12);
            }
            body.dark-mode .empty-state-cta {
                background: rgba(255,255,255,0.02);
                border-color: rgba(255,255,255,0.1);
            }
            .empty-state-cta .empty-icon {
                font-size: 3.5rem; opacity: 0.35; color: #2563eb; margin-bottom: 0.5rem;
            }
            .empty-state-cta h3 { font-size: 1.15rem; font-weight: 700; margin: 0; }
            .empty-state-cta p { font-size: 0.92rem; opacity: 0.75; max-width: 380px; line-height: 1.5; margin: 0; }
            .empty-state-cta .empty-action {
                display: inline-flex; align-items: center; gap: 0.5rem;
                padding: 0.7rem 1.3rem; background: #2563eb; color: #fff;
                border: none; border-radius: 999px; font-weight: 700; font-size: 0.9rem;
                text-decoration: none; cursor: pointer; transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
                font-family: inherit;
            }
            .empty-state-cta .empty-action:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
            }
            @media (max-width: 480px) {
                .toast-container { bottom: 1rem; right: 1rem; left: 1rem; max-width: none; }
                .empty-state-cta { padding: 2rem 1rem; }
                .empty-state-cta .empty-icon { font-size: 2.8rem; }
            }

            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `;

        if (document.head) {
            document.head.appendChild(style);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.head.appendChild(style);
            });
        }
    }

    injectBaseStyles();

    // ==========================================
    // SKIP LINK — Foco real al <main>
    // ==========================================
    function initSkipLink() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.skip-link');
            if (!link) return;

            const targetId = link.getAttribute('href');
            if (!targetId || !targetId.startsWith('#')) return;

            const target = document.querySelector(targetId);
            if (!target) return;

            e.preventDefault();

            // Mover foco programáticamente
            // (el <main> debe tener tabindex="-1")
            target.focus({ preventScroll: true });

            // Scroll suave
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSkipLink);
    } else {
        initSkipLink();
    }

    // ==========================================
    // TOASTS
    // ==========================================
    const ICONS = {
        success: 'fa-circle-check',
        error:   'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info:    'fa-circle-info'
    };

    function getContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            if (document.body) {
                document.body.appendChild(container);
            } else {
                document.addEventListener('DOMContentLoaded', () => document.body.appendChild(container));
            }
        }
        return container;
    }

    function showToast(message, type = 'info', duration = 3500) {
        const container = getContainer();
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

        toast.innerHTML = `
            <i class="fas ${ICONS[type] || ICONS.info}"></i>
            <div class="toast-content">${escapeText(message)}</div>
            <button class="toast-close" aria-label="Cerrar notificación">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));

        let timeoutId = null;
        if (duration > 0) {
            timeoutId = setTimeout(() => removeToast(toast), duration);
        }

        toast.addEventListener('mouseenter', () => {
            if (timeoutId) clearTimeout(timeoutId);
        });
        toast.addEventListener('mouseleave', () => {
            if (duration > 0) timeoutId = setTimeout(() => removeToast(toast), 1500);
        });
    }

    function removeToast(toastEl) {
        if (!toastEl || !toastEl.parentNode) return;
        toastEl.classList.add('toast-exit');
        setTimeout(() => {
            if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
        }, 250);
    }

    function escapeText(str) {
        const div = document.createElement('div');
        div.textContent = String(str ?? '');
        return div.innerHTML;
    }

    showToast.success = (msg, duration) => showToast(msg, 'success', duration);
    showToast.error   = (msg, duration) => showToast(msg, 'error', duration);
    showToast.warning = (msg, duration) => showToast(msg, 'warning', duration);
    showToast.info    = (msg, duration) => showToast(msg, 'info', duration);

    // ==========================================
    // LOADING SCREEN INTELIGENTE
    // ==========================================
    function hideLoadingWhenReady(promises = [], maxWaitMs = 8000) {
        const loadingScreen = document.getElementById('loading-screen');
        if (!loadingScreen) return;

        const hide = () => {
            if (!loadingScreen.parentNode) return;
            loadingScreen.classList.add('hidden');
            setTimeout(() => loadingScreen.remove(), 500);
        };

        const fallback = setTimeout(hide, maxWaitMs);

        Promise.allSettled(promises).then(() => {
            clearTimeout(fallback);
            setTimeout(hide, 300);
        });
    }

    // ==========================================
    // DEBOUNCE
    // ==========================================
    function debounce(fn, delay = 300) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ==========================================
    // VALIDACIÓN INLINE
    // ==========================================
    function setFieldError(input, message) {
        if (!input) return;
        const group = input.closest('.input-group, .form-group');
        if (!group) return;
        group.classList.add('has-error');
        group.classList.remove('has-success');
        const existing = group.querySelector('.field-error, .field-success');
        if (existing) existing.remove();
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.innerHTML = `<i class="fas fa-circle-exclamation"></i> ${escapeText(message)}`;
        group.appendChild(errorEl);
    }

    function setFieldSuccess(input, message = '') {
        if (!input) return;
        const group = input.closest('.input-group, .form-group');
        if (!group) return;
        group.classList.add('has-success');
        group.classList.remove('has-error');
        const existing = group.querySelector('.field-error, .field-success');
        if (existing) existing.remove();
        if (message) {
            const successEl = document.createElement('div');
            successEl.className = 'field-success';
            successEl.innerHTML = `<i class="fas fa-circle-check"></i> ${escapeText(message)}`;
            group.appendChild(successEl);
        }
    }

    function clearFieldState(input) {
        if (!input) return;
        const group = input.closest('.input-group, .form-group');
        if (!group) return;
        group.classList.remove('has-error', 'has-success');
        const msg = group.querySelector('.field-error, .field-success');
        if (msg) msg.remove();
    }

    function setButtonLoading(btn, loading) {
        if (!btn) return;
        if (loading) {
            btn.classList.add('btn-loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('btn-loading');
            btn.disabled = false;
        }
    }

    // ==========================================
    // SKELETONS
    // ==========================================
    function skeletonCards(count = 6) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-card">
                    <div class="sk-img skeleton"></div>
                    <div class="sk-line medium skeleton"></div>
                    <div class="sk-line long skeleton"></div>
                    <div class="sk-line short skeleton"></div>
                    <div class="sk-price skeleton"></div>
                    <div class="sk-btn skeleton"></div>
                </div>
            `;
        }
        return html;
    }

    function skeletonRows(cols = 8, rows = 5) {
        let html = '';
        for (let i = 0; i < rows; i++) {
            html += '<tr class="skeleton-row">';
            for (let j = 0; j < cols; j++) {
                const w = j === 0 ? '40px' : (j === 1 ? '60px' : (Math.random() > 0.5 ? '90%' : '60%'));
                html += `<td><div class="sk-cell skeleton" style="width: ${w};"></div></td>`;
            }
            html += '</tr>';
        }
        return html;
    }

    function skeletonOrders(count = 3) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-order">
                    <div class="sk-line short skeleton"></div>
                    <div class="sk-line medium skeleton"></div>
                    <div class="sk-line long skeleton"></div>
                    <div class="sk-line short skeleton"></div>
                </div>
            `;
        }
        return html;
    }

    // ==========================================
    // EXPORTAR
    // ==========================================
    window.UI = {
        showToast,
        hideLoadingWhenReady,
        debounce,
        setFieldError,
        setFieldSuccess,
        clearFieldState,
        setButtonLoading,
        skeletonCards,
        skeletonRows,
        skeletonOrders
    };

    if (typeof window.showToast !== 'function') {
        window.showToast = showToast;
    }

})(window);