// ==========================================
// PANEL DE CLIENTE - JAVICH SHOP
// ==========================================
const API_BASE_URL = 'api/cliente';
const userStorageKey = 'user';
const cartStorageKey = 'cart';

function checkClienteAccess() {
    const user = JSON.parse(sessionStorage.getItem(userStorageKey) || localStorage.getItem(userStorageKey));
    if (!user) { window.location.href = 'index.html'; return null; }
    return user;
}

function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    document.body.classList.toggle('dark-mode', isDark);
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
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

function initSidebarToggle() {
    const sidebar = document.getElementById('cliente-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const closeBtn = document.getElementById('sidebar-close');
    if (!sidebar || !overlay) return;
    
    const openSidebar = () => { sidebar.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow = 'hidden'; };
    const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.style.overflow = ''; };
    
    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
    
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
    });
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const sections = document.querySelectorAll('.cliente-section');
    const sectionTitle = document.getElementById('section-title');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            const target = document.getElementById(`section-${section}`);
            if (target) target.classList.add('active');
            if (sectionTitle) sectionTitle.textContent = item.querySelector('span')?.textContent.trim() || item.textContent.trim();
            
            if (section === 'dashboard') loadDashboard();
            if (section === 'profile') loadProfile();
            if (section === 'orders') loadOrders();
        });
    });
}

async function loadDashboard() {
    try {
        const profileRes = await fetch(`${API_BASE_URL}/profile.php`, { credentials: 'include' });
        const profileData = await profileRes.json();
        if (profileData.success) {
            document.getElementById('info-name').textContent = profileData.data.nombre;
            document.getElementById('info-email').textContent = profileData.data.email;
            document.getElementById('info-date').textContent = new Date(profileData.data.created_at).toLocaleDateString('es-DO');
        }
        
        const ordersRes = await fetch(`${API_BASE_URL}/orders.php`, { credentials: 'include' });
        const ordersData = await ordersRes.json();
        if (ordersData.success) {
            const orders = ordersData.data;
            const completed = orders.filter(o => o.estado === 'entregado' || o.estado === 'completado').length;
            const pending = orders.filter(o => ['pendiente', 'verificando_pago', 'preparando'].includes(o.estado)).length;
            const total = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);
            
            document.getElementById('stat-orders').textContent = orders.length;
            document.getElementById('stat-completed').textContent = completed;
            document.getElementById('stat-pending').textContent = pending;
            document.getElementById('stat-total').textContent = `$${total.toFixed(2)}`;
        }
    } catch (error) { console.error('Error dashboard:', error); }
}

async function loadProfile() {
    try {
        const res = await fetch(`${API_BASE_URL}/profile.php`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            document.getElementById('profile-name').value = data.data.nombre;
            document.getElementById('profile-email').value = data.data.email;
        }
    } catch (error) { console.error('Error perfil:', error); }
}

function initProfileForm() {
    const form = document.getElementById('profile-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        if (window.UI) UI.setButtonLoading(btn, true);
        
        try {
            const res = await fetch(`${API_BASE_URL}/profile.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    nombre: document.getElementById('profile-name').value.trim(),
                    email: document.getElementById('profile-email').value.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                showToast('✅ ' + data.message);
                const user = JSON.parse(sessionStorage.getItem(userStorageKey) || localStorage.getItem(userStorageKey));
                if (user) {
                    user.name = document.getElementById('profile-name').value.trim();
                    user.email = document.getElementById('profile-email').value.trim();
                    sessionStorage.setItem(userStorageKey, JSON.stringify(user));
                    localStorage.setItem(userStorageKey, JSON.stringify(user));
                    updateUserSidebarInfo(user);
                }
            } else { showToast('❌ ' + data.message); }
        } catch (error) { showToast('⚠️ Error de conexión'); }
        finally { if (window.UI) UI.setButtonLoading(btn, false); }
    });
}

function initPasswordForm() {
    const form = document.getElementById('password-form');
    const newPass = document.getElementById('new-password');
    const confirmPass = document.getElementById('confirm-password');
    // Limpiar errores al escribir
    [newPass, confirmPass, document.getElementById('current-password')].forEach(el => {
    if (el) {
        el.addEventListener('input', () => {
            if (window.UI) UI.clearFieldState(el);
        });
    }
});
    const matchMsg = document.getElementById('match-message');
    if (!form) return;
    
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            const icon = btn.querySelector('i');
            if (input.type === 'password') { input.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
            else { input.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
        });
    });
    
    const validateMatch = () => {
        if (confirmPass.value.length === 0) { matchMsg.textContent = ''; return; }
        if (newPass.value === confirmPass.value) { matchMsg.textContent = '✅ Las contraseñas coinciden'; matchMsg.className = 'match-message match'; }
        else { matchMsg.textContent = '❌ Las contraseñas no coinciden'; matchMsg.className = 'match-message no-match'; }
    };
    
    newPass.addEventListener('input', validateMatch);
    confirmPass.addEventListener('input', validateMatch);
    
    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let hasErrors = false;

    const currentPass = document.getElementById('current-password');

    if (!currentPass.value) {
        if (window.UI) UI.setFieldError(currentPass, 'La contraseña actual es obligatoria');
        hasErrors = true;
    } else {
        if (window.UI) UI.clearFieldState(currentPass);
    }

    if (newPass.value.length < 8) {
        if (window.UI) UI.setFieldError(newPass, 'Mínimo 8 caracteres');
        hasErrors = true;
    } else {
        if (window.UI) UI.clearFieldState(newPass);
    }

    if (newPass.value !== confirmPass.value) {
        if (window.UI) UI.setFieldError(confirmPass, 'Las contraseñas no coinciden');
        hasErrors = true;
    } else if (confirmPass.value) {
        if (window.UI) UI.setFieldSuccess(confirmPass, 'Coinciden');
    }

    if (hasErrors) return;
        
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Cambiando...';
        
        try {
            const res = await fetch(`${API_BASE_URL}/change-password.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    current_password: document.getElementById('current-password').value,
                    new_password: newPass.value
                })
            });
            const data = await res.json();
            if (data.success) { showToast('✅ ' + data.message); form.reset(); matchMsg.textContent = ''; }
            else { showToast('❌ ' + data.message); }
        } catch (error) { showToast('⚠️ Error de conexión'); }
        finally { if (window.UI) UI.setButtonLoading(btn, false); }
    });
}

async function loadOrders() {
const ordersList = document.getElementById('orders-list');
ordersList.innerHTML = window.UI
    ? window.UI.skeletonOrders(3)
    : '<div class="loading-cell">Cargando pedidos...</div>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/orders.php`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.success) {
            const orders = data.data;
if (orders.length === 0) {
    ordersList.innerHTML = `
        <div class="empty-state-cta">
            <i class="fas fa-shopping-bag empty-icon"></i>
            <h3>Aún no tienes pedidos</h3>
            <p>Explora nuestro catálogo y encuentra accesorios originales para tus dispositivos.</p>
            <a href="index.html" class="empty-action">
                <i class="fas fa-store"></i> Ir al catálogo
            </a>
        </div>
    `;
    return;
}
            
            ordersList.innerHTML = orders.map(order => {
                const statusClass = `status-${order.estado || 'pendiente'}`;
                const statusText = order.estado ? order.estado.charAt(0).toUpperCase() + order.estado.slice(1).replace('_', ' ') : 'Pendiente';
                const detailsHtml = order.detalles.map(d => `<div class="order-detail-item"><span>${d.producto_nombre || 'Producto'} x${d.cantidad}</span><span>$${parseFloat(d.precio_unitario).toFixed(2)}</span></div>`).join('');
                
                
               // ✅ Lista de estados finales donde NO debe mostrarse el cronómetro
                const estadosFinales = ['cancelado', 'entregado', 'completado'];
                const esEstadoFinal = estadosFinales.includes(order.estado);

                let timerHtml = '';
                // Solo mostrar cronómetro si está pendiente de pago Y el pedido NO está en estado final
                if (order.estado_pago === 'pendiente_pago' && order.fecha_expiracion && !esEstadoFinal) {
                timerHtml = `
                <div class="order-timer" data-pedido-id="${order.id}" data-expiracion="${order.fecha_expiracion}">
                <i class="fas fa-clock"></i>
                <div class="timer-content">
                <span class="timer-text">Calculando...</span>
                <a href="pago.html?pedido=${order.id}" class="btn-volver-pago">
                    <i class="fas fa-credit-card"></i> Completar pago
                </a>
                </div>
                </div>
                `;
                }

                // ✅ 2. Botón de factura: solo habilitado si el pedido fue entregado o completado
                const estadoEntregado = order.estado === 'entregado' || order.estado === 'completado';
                let invoiceButtonHtml = '';
                
                if (estadoEntregado) {
                    invoiceButtonHtml = `
                        <div class="order-actions">
                            <button class="btn-download-invoice" onclick="downloadInvoice(${order.id})" title="Descargar factura PDF">
                                <i class="fas fa-file-pdf"></i> Descargar factura
                            </button>
                        </div>
                    `;
                } else {
                    invoiceButtonHtml = `
                        <div class="order-actions">
                            <button class="btn-download-invoice" disabled title="La factura estará disponible cuando el pedido sea entregado" style="opacity: 0.5; cursor: not-allowed;">
                                <i class="fas fa-lock"></i> Factura no disponible aún
                            </button>
                        </div>
                    `;
                }

                return `<div class="order-item">
                    <div class="order-header">
                        <div>
                            <div class="order-id">Pedido #${order.id}</div>
                            <div class="order-date">${new Date(order.fecha_pedido).toLocaleDateString('es-DO')}</div>
                        </div>
                        <span class="order-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="order-details">${detailsHtml}</div>
                    ${timerHtml}
                    ${invoiceButtonHtml}
                    <div class="order-total"><span>Total:</span><span>$${parseFloat(order.total).toFixed(2)}</span></div>
                </div>`;
            }).join('');
            
            iniciarCronometrosPedidos();
        }
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        ordersList.innerHTML = '<div class="loading-cell">Error de conexión</div>';
    }
}

function iniciarCronometrosPedidos() {
    document.querySelectorAll('.order-timer').forEach(timerEl => {
        const pedidoId = timerEl.dataset.pedidoId;
        const expiracion = new Date(timerEl.dataset.expiracion).getTime();
        const textEl = timerEl.querySelector('.timer-text');
        const btnVolverPago = timerEl.querySelector('.btn-volver-pago');

        function actualizar() {
            const restante = expiracion - Date.now();

            if (restante <= 0) {
                textEl.textContent = '⚠️ Pedido expirado';
                timerEl.classList.add('expirado');
                if (btnVolverPago) btnVolverPago.style.display = 'none';
                return;
            }

            const h = Math.floor(restante / 3600000);
            const m = Math.floor((restante % 3600000) / 60000);
            const s = Math.floor((restante % 60000) / 1000);
            textEl.textContent = `⏳ ${h}h ${m}m ${s}s restantes`;

            // Advertencia cuando queden menos de 6 horas
            if (restante < 21600000) {
                timerEl.classList.add('urgente');
            }
        }

        actualizar();
        setInterval(actualizar, 1000);
    });
}

function initLogout() {
    const btn = document.getElementById('cliente-logout');
    if (btn) {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            try { await fetch('api/auth/logout.php', { method: 'POST', credentials: 'include' }); } catch (err) {}
            finally {
                sessionStorage.removeItem(userStorageKey);
                localStorage.removeItem(userStorageKey);
                window.location.href = 'index.html';
            }
        });
    }
}

function updateUserSidebarInfo(user) {
    const name = user.name || 'Usuario';
    const email = user.email || 'usuario@email.com';
    const initial = name.charAt(0).toUpperCase();
    const elName = document.getElementById('cliente-user-name');
    const elAvatar = document.getElementById('cliente-avatar');
    const elSideName = document.getElementById('sidebar-user-name');
    const elSideEmail = document.getElementById('sidebar-user-email');
    const elSideAvatar = document.getElementById('sidebar-avatar');
    
    if (elName) elName.textContent = name;
    if (elAvatar) elAvatar.textContent = initial;
    if (elSideName) elSideName.textContent = name;
    if (elSideEmail) elSideEmail.textContent = email;
    if (elSideAvatar) elSideAvatar.textContent = initial;
}

// ==========================================
// GENERACIÓN DE FACTURA PDF
// ==========================================
async function downloadInvoice(pedidoId) {
    showToast('⏳ Generando factura...', 2000);
    
    try {
        const res = await fetch(`${API_BASE_URL}/orders.php`, { credentials: 'include' });
        const data = await res.json();
        
        if (!data.success) {
            showToast('❌ Error al obtener datos del pedido');
            return;
        }
        
        const order = data.data.find(o => o.id === pedidoId);
        if (!order) {
            showToast('❌ Pedido no encontrado');
            return;
        }
        
        const userRes = await fetch(`${API_BASE_URL}/profile.php`, { credentials: 'include' });
        const userData = await userRes.json();
        const user = userData.success ? userData.data : null;
        
        const invoiceContainer = document.createElement('div');
        invoiceContainer.style.cssText = `
            position: fixed; left: -9999px; top: 0; width: 800px; background: white;
            padding: 40px; font-family: Arial, sans-serif; color: #333;
        `;
        
        const fecha = new Date(order.fecha_pedido).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
        const numeroFactura = `FAC-${String(order.id).padStart(6, '0')}`;
        
        let itemsHtml = '';
        let subtotal = 0;
        order.detalles.forEach(d => {
            const totalItem = d.cantidad * parseFloat(d.precio_unitario);
            subtotal += totalItem;
            itemsHtml += `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${d.producto_nombre || 'Producto'}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${d.cantidad}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">RD$ ${parseFloat(d.precio_unitario).toFixed(2)}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">RD$ ${totalItem.toFixed(2)}</td>
                </tr>
            `;
        });
        
        invoiceContainer.innerHTML = `
            <div style="border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="color: #2563eb; margin: 0; font-size: 28px;">JAVICH AccesoryShop</h1>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">Accesorios originales para tus dispositivos</p>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; font-size: 32px; color: #1e293b;">FACTURA</h2>
                        <p style="margin: 5px 0; font-size: 16px;"><strong>N°:</strong> ${numeroFactura}</p>
                        <p style="margin: 5px 0; font-size: 14px; color: #64748b;"><strong>Fecha:</strong> ${fecha}</p>
                    </div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
                <div style="flex: 1;">
                    <h3 style="color: #2563eb; font-size: 14px; text-transform: uppercase; margin-bottom: 10px;">Cliente</h3>
                    <p style="margin: 5px 0;"><strong>Nombre:</strong> ${user ? user.nombre : 'N/A'}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${user ? user.email : 'N/A'}</p>
                </div>
                <div style="flex: 1; text-align: right;">
                    <h3 style="color: #2563eb; font-size: 14px; text-transform: uppercase; margin-bottom: 10px;">Estado del Pedido</h3>
                    <p style="margin: 5px 0; font-size: 16px; font-weight: 600; color: ${(order.estado === 'entregado' || order.estado === 'completado') ? '#10b981' : '#f59e0b'};">
                        ${(order.estado || 'pendiente').replace('_', ' ').toUpperCase()}
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;"><strong>Método de pago:</strong> Transferencia bancaria</p>
                </div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="background: #2563eb; color: white;">
                        <th style="padding: 12px; text-align: left;">Producto</th>
                        <th style="padding: 12px; text-align: center;">Cantidad</th>
                        <th style="padding: 12px; text-align: right;">Precio Unit.</th>
                        <th style="padding: 12px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <div style="text-align: right; margin-top: 30px;">
                <div style="display: inline-block; min-width: 300px;">
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px;">
                        <span>Subtotal:</span>
                        <span style="font-weight: 600;">RD$ ${subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 15px 0; font-size: 20px; font-weight: bold; border-top: 2px solid #2563eb; color: #2563eb;">
                        <span>TOTAL:</span>
                        <span>RD$ ${parseFloat(order.total).toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #64748b; font-size: 12px;">
                <p style="margin: 5px 0;">Gracias por tu compra en Javich AccesoryShop</p>
                <p style="margin: 5px 0;">WhatsApp: +1 (829) 559-2331 | Instagram: @javichtechaccesory_21</p>
                <p style="margin: 10px 0 0 0; font-size: 11px;">Este documento es una constancia de tu pedido. Conserva esta factura para cualquier reclamo o garantía.</p>
            </div>
        `;
        
        document.body.appendChild(invoiceContainer);
        
        const canvas = await html2canvas(invoiceContainer, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`factura_${numeroFactura}.pdf`);
        
        document.body.removeChild(invoiceContainer);
        showToast('✅ Factura descargada exitosamente');
        
    } catch (error) {
        console.error('Error generando factura:', error);
        showToast('❌ Error al generar la factura');
    }
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const user = checkClienteAccess();
    if (!user) return;
    
    updateUserSidebarInfo(user);
    initTheme();
    initSidebarToggle();
    initNavigation();
    initProfileForm();
    initPasswordForm();
    initLogout();
    loadDashboard();
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    
    // Ocultar loading screen después de 1.5 segundos
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => loadingScreen.remove(), 500);
        }
    }, 1500);
});