// ==========================================
// PAGO - JAVICH SHOP
// ==========================================
const API_BASE_URL = 'api/public';
const userStorageKey = 'user';
let pedidoActual = null;
let bancoSeleccionado = null;
let timerInterval = null;

// ==========================================
// 1. PROTECCIÓN
// ==========================================
async function checkAccess() {
    const localUser = JSON.parse(sessionStorage.getItem(userStorageKey) || localStorage.getItem(userStorageKey) || 'null');
    if (!localUser) {
        window.location.href = 'index.html';
        return null;
    }
    try {
        const res = await fetch('api/cliente/session.php', { credentials: 'include' });
        if (!res.ok) throw new Error('Sesión no autorizada');
        const data = await res.json();
        if (!data.success || !data.user) {
            throw new Error('Sesión inválida');
        }
        sessionStorage.setItem(userStorageKey, JSON.stringify(data.user));
        return data.user;
    } catch (e) {
        sessionStorage.removeItem(userStorageKey);
        localStorage.removeItem(userStorageKey);
        window.location.href = 'index.html';
        return null;
    }
}

// ==========================================
// 2. UTILIDADES
// ==========================================
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

/**
 * Copia texto al portapapeles con fallback universal.
 * Funciona en HTTPS, localhost, IPs locales y móviles antiguos.
 */
async function copyToClipboard(text) {
    const cleanText = (text || '').trim();

    // Intento 1: API moderna (solo secure context)
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(cleanText);
            return true;
        } catch (err) {
            console.warn('navigator.clipboard falló, usando fallback:', err);
        }
    }

    // Fallback: textarea temporal + execCommand
    try {
        const textarea = document.createElement('textarea');
        textarea.value = cleanText;

        // Estilos para que no se vea ni cause scroll en móvil
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.width = '2em';
        textarea.style.height = '2em';
        textarea.style.padding = '0';
        textarea.style.border = 'none';
        textarea.style.outline = 'none';
        textarea.style.boxShadow = 'none';
        textarea.style.background = 'transparent';
        textarea.style.opacity = '0';
        textarea.setAttribute('readonly', '');

        document.body.appendChild(textarea);

        // iOS Safari necesita selección por rango
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            const range = document.createRange();
            range.selectNodeContents(textarea);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            textarea.setSelectionRange(0, cleanText.length);
        } else {
            textarea.select();
        }

        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        return successful;
    } catch (err) {
        console.error('Fallback de copiado también falló:', err);
        return false;
    }
}

// ==========================================
// 3. TEMA
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    document.body.classList.toggle('dark-mode', isDark);
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    const themeToggle = document.getElementById('theme-toggle');
    if (isDark) {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// ==========================================
// 4. CARGAR PEDIDO
// ==========================================
async function cargarPedido() {
    const params = new URLSearchParams(window.location.search);
    const pedidoId = params.get('pedido');

    if (!pedidoId) {
        showToast('❌ Pedido no válido');
        setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/pago.php?pedido=${pedidoId}`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (!data.success) {
            showToast('❌ ' + (data.message || 'No se pudo cargar el pedido'));
            setTimeout(() => { window.location.href = 'index.html'; }, 2500);
            return;
        }

        pedidoActual = data.data;
        renderPedido();
        iniciarCronometro();
    } catch (error) {
        console.error('Error cargando pedido:', error);
        showToast('⚠️ Error de conexión');
    }
}

function renderPedido() {
    const container = document.getElementById('pedido-info');
    if (!pedidoActual) return;

    const detalles = pedidoActual.detalles || [];
    const productosHtml = detalles.map(d => `
        <div class="producto-item">
            <span class="producto-nombre">${d.producto_nombre || 'Producto'}</span>
            <span class="producto-cantidad">x${d.cantidad}</span>
            <span class="producto-precio">$${parseFloat(d.precio_unitario * d.cantidad).toFixed(2)}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="pedido-header">
            <div class="pedido-id">Pedido #${pedidoActual.id}</div>
            <div class="pedido-fecha">${new Date(pedidoActual.fecha_pedido).toLocaleString('es-DO')}</div>
        </div>
        <div class="productos-lista">
            ${productosHtml}
        </div>
        <div class="pedido-total">
            <span class="total-label">Total a pagar:</span>
            <span class="total-value">$${parseFloat(pedidoActual.total).toFixed(2)}</span>
        </div>
    `;
}

// ==========================================
// 5. CRONÓMETRO
// ==========================================
function iniciarCronometro() {
    if (!pedidoActual || !pedidoActual.fecha_expiracion) return;

    const expiracion = new Date(pedidoActual.fecha_expiracion).getTime();

    function actualizar() {
        const ahora = Date.now();
        const restante = expiracion - ahora;

        if (restante <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer-value').textContent = '00:00:00';
            document.getElementById('timer-card').classList.add('expirado');
            document.getElementById('timer-warning').textContent = '⚠️ Tu pedido ha expirado. Serás redirigido.';
            document.getElementById('timer-warning').style.display = 'block';
            showToast('⏰ El tiempo para pagar ha expirado');
            setTimeout(() => { window.location.href = 'index.html'; }, 3000);
            return;
        }

        const horas = Math.floor(restante / (1000 * 60 * 60));
        const minutos = Math.floor((restante % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((restante % (1000 * 60)) / 1000);

        document.getElementById('timer-value').textContent =
            `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

        if (restante < 6 * 60 * 60 * 1000) {
            document.getElementById('timer-warning').style.display = 'block';
        }
    }

    actualizar();
    timerInterval = setInterval(actualizar, 1000);
}

// ==========================================
// 6. CARGAR BANCOS
// ==========================================
async function cargarBancos() {
    try {
        const response = await fetch(`${API_BASE_URL}/bancos.php`);
        const data = await response.json();

        if (!data.success) {
            document.getElementById('bancos-container').innerHTML =
                '<div class="loading-state">No hay bancos disponibles</div>';
            return;
        }

        renderBancos(data.data);
    } catch (error) {
        console.error('Error cargando bancos:', error);
        document.getElementById('bancos-container').innerHTML =
            '<div class="loading-state">Error al cargar bancos</div>';
    }
}

function renderBancos(bancos) {
    const container = document.getElementById('bancos-container');

    if (!bancos || bancos.length === 0) {
        container.innerHTML = '<div class="loading-state">No hay bancos disponibles</div>';
        return;
    }

    container.innerHTML = bancos.map(b => `
        <div class="banco-card" data-id="${b.id}" onclick="seleccionarBanco(${b.id})">
            <img src="${b.logo || './img/android-chrome-192x192.png'}" alt="${b.nombre}" class="banco-card-img">
            <div class="banco-card-info">
                <div class="banco-card-nombre">${b.nombre}</div>
                <div class="banco-card-tipo">${b.tipo_cuenta || 'Ahorro'}</div>
            </div>
            <div class="banco-card-check"><i class="fas fa-check-circle"></i></div>
        </div>
    `).join('');
}

function seleccionarBanco(id) {
    const cards = document.querySelectorAll('.banco-card');
    cards.forEach(c => c.classList.remove('selected'));

    const card = document.querySelector(`.banco-card[data-id="${id}"]`);
    if (card) card.classList.add('selected');

    fetch(`${API_BASE_URL}/bancos.php`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const banco = data.data.find(b => b.id === id);
                if (banco) {
                    bancoSeleccionado = banco;
                    mostrarDetalleBanco(banco);
                }
            }
        });
}

function mostrarDetalleBanco(banco) {
    document.getElementById('banco-logo').src = banco.logo || './img/android-chrome-192x192.png';
    document.getElementById('banco-nombre').textContent = banco.nombre;
    document.getElementById('banco-tipo').textContent = banco.tipo_cuenta || 'Ahorro';
    document.getElementById('banco-cuenta').textContent = banco.numero_cuenta;
    document.getElementById('banco-titular').textContent = banco.titular;

    document.getElementById('banco-detalle').style.display = 'block';
    document.getElementById('banco-detalle').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==========================================
// 7. COPIAR NÚMERO DE CUENTA (con fallback universal)
// ==========================================
function initCopiar() {
    const btn = document.getElementById('btn-copiar');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const cuentaEl = document.getElementById('banco-cuenta');
        const cuenta = cuentaEl ? cuentaEl.textContent.trim() : '';

        if (!cuenta) {
            showToast('⚠️ No hay número de cuenta para copiar');
            return;
        }

        const ok = await copyToClipboard(cuenta);

        if (ok) {
            btn.classList.add('copiado');
            btn.innerHTML = '<i class="fas fa-check"></i>';
            showToast('✅ Número de cuenta copiado');
            setTimeout(() => {
                btn.classList.remove('copiado');
                btn.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        } else {
            // Último recurso: mostrar el número para seleccionar manualmente
            showToast('⚠️ Copia manualmente: ' + cuenta, 6000);
        }
    });
}

// ==========================================
// 8. ENVIAR VOUCHER POR WHATSAPP
// ==========================================
function initEnviarWhatsapp() {
    const btn = document.getElementById('btn-enviar-whatsapp');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (!bancoSeleccionado || !pedidoActual) {
            showToast('⚠️ Selecciona un banco primero');
            return;
        }

        if (!confirm('¿Confirmas que ya realizaste la transferencia y deseas enviar el voucher por WhatsApp?')) {
            return;
        }

        const detalles = pedidoActual.detalles || [];
        const productosTexto = detalles.map(d => {
            const nombre = d.producto_nombre || 'Producto';
            const cantidad = d.cantidad;
            const precio = parseFloat(d.precio_unitario).toFixed(2);
            return `${cantidad} - ${nombre}\n${precio}$`;
        }).join('\n');

        const mensaje = `*Javix AccesoryShop - Voucher de Pago*\n\n` +
            `Pedido #${pedidoActual.id}\n` +
            `Banco: ${bancoSeleccionado.nombre}\n` +
            `Titular: JAVIER N SANCHEZ DE LA CRUZ\n\n` +
            `Productos:\n${productosTexto}\n\n` +
            `Total Transferido: ${parseFloat(pedidoActual.total).toFixed(2)}$\n\n` +
            `Adjunto mi comprobante de pago. Por favor confirmar recepción.`;

        let phoneNumber = '18295592331';
        try {
            const res = await fetch(`${API_BASE_URL}/settings.php`);
            const data = await res.json();
            if (data && data.whatsapp) {
                phoneNumber = data.whatsapp;
            }
        } catch (e) {
            console.warn('No se pudo cargar configuración, usando número por defecto');
        }

        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(mensaje);
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');

        try {
            await fetch(`${API_BASE_URL}/pago.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    pedido_id: pedidoActual.id,
                    banco_id: bancoSeleccionado.id
                })
            });
        } catch (e) {
            console.error('Error actualizando estado:', e);
        }

        showToast('✅ Redirigido a WhatsApp. Adjunta tu comprobante.');

        setTimeout(() => {
            window.location.href = 'cliente.html';
        }, 3000);
    });
}

// ==========================================
// 9. CERRAR DETALLE
// ==========================================
function initCerrarDetalle() {
    const btn = document.getElementById('btn-cerrar-detalle');
    if (!btn) return;

    btn.addEventListener('click', () => {
        document.getElementById('banco-detalle').style.display = 'none';
        document.querySelectorAll('.banco-card').forEach(c => c.classList.remove('selected'));
        bancoSeleccionado = null;
    });
}

// ==========================================
// 10. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAccess();
    if (!user) return;

    initTheme();
    cargarPedido();
    cargarBancos();
    initCopiar();
    initEnviarWhatsapp();
    initCerrarDetalle();

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
});