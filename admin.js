// ==========================================
// PANEL DE ADMIN - JAVICH SHOP
// ==========================================
const API_BASE_URL = 'api/admin';
const userStorageKey = 'user';
let editingProductId = null;
let selectedImageFile = null;
let allProducts = [];
let allUsers = [];
let storeSettings = { umbral_stock: 5 };

// Helper para escapar HTML (evita XSS)
const escapeHtml = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ==========================================
// 1. PROTECCIÓN DE RUTA
// ==========================================
function checkAdminAccess() {
    const user = JSON.parse(sessionStorage.getItem(userStorageKey) || localStorage.getItem(userStorageKey));
    if (!user || user.role !== 'admin') {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

// ==========================================
// 2. UTILIDADES
// ==========================================
function showToast(message, duration = 3000) {
    // Delegar al sistema unificado si está disponible
    if (window.UI && window.UI.showToast) {
        // Detectar tipo por emoji al inicio
        let type = 'info';
        if (/^✅/.test(message)) type = 'success';
        else if (/^❌/.test(message)) type = 'error';
        else if (/^⚠️|^⚠/.test(message)) type = 'warning';

        const cleanMsg = message.replace(/^[✅❌⚠️⚠]\s*/, '').trim();
        return window.UI.showToast(cleanMsg, type, duration);
    }
    // Fallback al toast legacy
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function getUmbral() {
    return parseInt(storeSettings.umbral_stock) || 5;
}

// ==========================================
// 3. DARK / LIGHT MODE
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
// 4. SIDEBAR MÓVIL
// ==========================================
function initSidebarToggle() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const closeBtn = document.getElementById('sidebar-close');
    if (!sidebar || !overlay) return;

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
}

// ==========================================
// 5. NAVEGACIÓN
// ==========================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const sections = document.querySelectorAll('.admin-section');
    const sectionTitle = document.getElementById('section-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            const targetSection = document.getElementById(`section-${section}`);
            if (targetSection) targetSection.classList.add('active');

            if (sectionTitle) sectionTitle.textContent = item.textContent.trim();

            if (section === 'dashboard') loadDashboard();
            if (section === 'products') loadProducts();
            if (section === 'orders') loadOrders();
            if (section === 'users') loadUsers();
            if (section === 'settings') loadSettings();

            if (window.innerWidth <= 768) {
                document.getElementById('admin-sidebar').classList.remove('open');
                document.getElementById('sidebar-overlay').classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

// ==========================================
// 6. DASHBOARD
// ==========================================
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard.php`, { credentials: 'include' });
        const data = await response.json();

        if (data.success) {
            const stats = data.data;
            document.getElementById('stat-products').textContent = stats.total_productos || 0;
            document.getElementById('stat-low-stock').textContent = stats.stock_bajo || 0;
            document.getElementById('stat-orders').textContent = stats.total_pedidos || 0;
            document.getElementById('stat-users').textContent = stats.total_usuarios || 0;

            const lowStockList = document.getElementById('low-stock-list');
            if (lowStockList) {
                if (!stats.productos_stock_bajo || stats.productos_stock_bajo.length === 0) {
                    lowStockList.innerHTML = '<p class="empty-message">No hay productos con stock bajo</p>';
                } else {
                    lowStockList.innerHTML = stats.productos_stock_bajo.map(p => `
                        <div style="padding: 0.8rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 500;">${escapeHtml(p.nombre)}</span>
                            <span class="status-badge status-inactive">Stock: ${parseInt(p.stock, 10)}</span>
                        </div>
                    `).join('');
                }
            }

            const recentList = document.getElementById('recent-activity-list');
            if (recentList) {
                if (!stats.pedidos_recientes || stats.pedidos_recientes.length === 0) {
                    recentList.innerHTML = '<p class="empty-message">Sin pedidos recientes</p>';
                } else {
                    recentList.innerHTML = stats.pedidos_recientes.map(p => `
                        <div style="padding: 0.8rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600;">Pedido #${parseInt(p.id, 10)}</div>
                                <div style="font-size: 0.85rem; color: var(--text-light);">${escapeHtml(p.cliente || 'Cliente desconocido')}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700;">$${parseFloat(p.total).toFixed(2)}</div>
                                <span class="status-badge status-${p.estado === 'entregado' ? 'completed' : escapeHtml(p.estado)}">${escapeHtml((p.estado || '').replace('_', ' '))}</span>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

// ==========================================
// 7. PRODUCTOS
// ==========================================
async function loadProducts() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    // Skeleton mientras carga
    tbody.innerHTML = (window.UI && window.UI.skeletonRows)
        ? window.UI.skeletonRows(8, 5)
        : '<tr><td colspan="8" class="loading-cell">Cargando productos...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}/products.php`, { credentials: 'include' });
        const data = await response.json();
        if (data.success && data.data) {
            allProducts = data.data;
            renderProductsTable(allProducts);
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-cell" style="color: var(--danger);">Error al cargar</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell" style="color: var(--danger);">Error de conexión</td></tr>';
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No se encontraron productos</td></tr>';
        return;
    }

    const umbral = getUmbral();
    tbody.innerHTML = products.map(p => {
        const imgHtml = p.imagen_principal
            ? `<img src="${escapeHtml(p.imagen_principal)}" alt="${escapeHtml(p.nombre)}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px;">`
            : '<div style="width: 40px; height: 40px; background: var(--bg-main); border-radius: 6px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-image" style="color: var(--text-light);"></i></div>';
        const statusClass = p.activo ? 'status-active' : 'status-inactive';
        const statusText = p.activo ? 'Activo' : 'Inactivo';
        const pid = parseInt(p.id, 10);
        return `
            <tr>
                <td>${pid}</td>
                <td>${imgHtml}</td>
                <td style="font-weight: 500;">${escapeHtml(p.nombre)}</td>
                <td>${escapeHtml(p.categoria_nombre || p.categoria || 'Sin categoría')}</td>
                <td style="font-weight: 600;">$${parseFloat(p.precio).toFixed(2)}</td>
                <td><span style="color: ${p.stock < umbral ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">${parseInt(p.stock, 10)}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="action-btn" onclick="editProduct(${pid})" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteProduct(${pid})" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function initProductSearchAndFilter() {
    const searchInput = document.getElementById('product-search');
    const categoryFilter = document.getElementById('product-category-filter');
    if (!searchInput || !categoryFilter) return;

    function filterAndRender() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const category = categoryFilter.value;
        const filtered = allProducts.filter(p => {
            const matchesSearch = !searchTerm ||
                (p.nombre && p.nombre.toLowerCase().includes(searchTerm)) ||
                (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm));
            const productCategory = (p.categoria_nombre || p.categoria || '').toLowerCase();
            const matchesCategory = category === 'TODOS' || productCategory === category.toLowerCase();
            return matchesSearch && matchesCategory;
        });
        renderProductsTable(filtered);
    }

    const debouncedFilter = (window.UI && window.UI.debounce)
        ? window.UI.debounce(filterAndRender, 250)
        : filterAndRender;

    searchInput.addEventListener('input', debouncedFilter);
    categoryFilter.addEventListener('change', filterAndRender);
}

// ==========================================
// 8. MODAL DE PRODUCTO
// ==========================================
function initImageUpload() {
    const imageUploadZone = document.getElementById('image-upload-zone');
    const imageFileInput = document.getElementById('image-file-input');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadPreview = document.getElementById('upload-preview');
    const removeImageBtn = document.getElementById('remove-image');
    if (!imageUploadZone || !imageFileInput) return;

    imageUploadZone.addEventListener('click', () => imageFileInput.click());
    imageFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleImageSelect(e.target.files[0]);
    });
    imageUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadZone.style.borderColor = 'var(--primary)';
    });
    imageUploadZone.addEventListener('dragleave', () => {
        imageUploadZone.style.borderColor = 'var(--border)';
    });
    imageUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadZone.style.borderColor = 'var(--border)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            imageFileInput.files = e.dataTransfer.files;
            handleImageSelect(e.dataTransfer.files[0]);
        }
    });
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedImageFile = null;
            document.getElementById('p-image').value = '';
            imageFileInput.value = '';
            uploadPlaceholder.style.display = 'block';
            uploadPreview.style.display = 'none';
        });
    }
}

function handleImageSelect(file) {
    if (!file.type.startsWith('image/')) { showToast('⚠️ Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('⚠️ La imagen no debe superar los 5MB'); return; }
    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('preview-image').src = e.target.result;
        document.getElementById('upload-placeholder').style.display = 'none';
        document.getElementById('upload-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    const form = document.getElementById('product-form');
    if (!modal || !form) return;

    form.reset();
    editingProductId = null;
    selectedImageFile = null;
    document.getElementById('p-image').value = '';
    document.getElementById('upload-placeholder').style.display = 'block';
    document.getElementById('upload-preview').style.display = 'none';

    if (product) {
        modalTitle.textContent = 'Editar Producto';
        editingProductId = product.id;
        document.getElementById('p-name').value = product.nombre || '';
        document.getElementById('p-category').value = product.categoria || product.categoria_nombre || 'Accesorios';
        document.getElementById('p-price').value = product.precio || '';
        document.getElementById('p-stock').value = product.stock || 0;
        document.getElementById('p-description').value = product.descripcion || '';
        document.getElementById('p-is-new').checked = product.is_new == 1;
        document.getElementById('p-is-offer').checked = product.is_offer == 1;
        if (product.imagen_principal) {
            document.getElementById('p-image').value = product.imagen_principal;
            document.getElementById('preview-image').src = product.imagen_principal;
            document.getElementById('upload-placeholder').style.display = 'none';
            document.getElementById('upload-preview').style.display = 'block';
        }
    } else {
        modalTitle.textContent = 'Nuevo Producto';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
    editingProductId = null;
    selectedImageFile = null;
}

async function editProduct(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/products.php?id=${id}`, { credentials: 'include' });
        const data = await response.json();
        if (data.success && data.data) openProductModal(data.data);
        else showToast('❌ No se pudo cargar el producto');
    } catch (error) {
        console.error('Error cargando producto:', error);
        showToast('⚠️ Error de conexión');
    }
}

async function deleteProduct(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/products.php`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id: id })
        });
        const data = await response.json();
        if (data.success) { showToast('✅ Producto eliminado'); loadProducts(); }
        else showToast('❌ ' + (data.message || 'No se pudo eliminar'));
    } catch (error) {
        console.error('Error eliminando:', error);
        showToast('⚠️ Error de conexión');
    }
}

function initProductForm() {
    const form = document.getElementById('product-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('p-name').value.trim();
        const price = parseFloat(document.getElementById('p-price').value);
        const stock = parseInt(document.getElementById('p-stock').value);
        const category = document.getElementById('p-category').value;

        if (!name) { showToast('⚠️ El nombre es obligatorio'); return; }
        if (isNaN(price) || price <= 0) { showToast('⚠️ El precio debe ser mayor a 0'); return; }
        if (isNaN(stock) || stock < 0) { showToast('⚠️ El stock no puede ser negativo'); return; }

        const formData = new FormData();
        formData.append('nombre', name);
        formData.append('categoria', category);
        const catMap = { 'Apple': 1, 'Samsung': 2, 'Anker': 3, 'Accesorios': 4 };
        formData.append('categoria_id', catMap[category] || category);
        formData.append('precio', price);
        formData.append('stock', stock);
        formData.append('descripcion', document.getElementById('p-description').value.trim());
        formData.append('is_new', document.getElementById('p-is-new').checked ? '1' : '0');
        formData.append('is_offer', document.getElementById('p-is-offer').checked ? '1' : '0');
        formData.append('activo', '1');
        if (editingProductId) formData.append('id', editingProductId);
        if (selectedImageFile) formData.append('imagen', selectedImageFile);

        const submitBtn = document.getElementById('btn-save');
        if (window.UI && UI.setButtonLoading) UI.setButtonLoading(submitBtn, true);

        try {
            const response = await fetch(`${API_BASE_URL}/products.php`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                showToast(editingProductId ? '✅ Producto actualizado' : '✅ Producto creado');
                closeProductModal();
                loadProducts();
            } else {
                showToast('❌ ' + (data.message || 'Error al guardar'));
            }
        } catch (error) {
            console.error('Error guardando:', error);
            showToast('⚠️ Error de conexión');
        } finally {
            if (window.UI && UI.setButtonLoading) UI.setButtonLoading(submitBtn, false);
        }
    });
}

// ==========================================
// 9. PEDIDOS
// ==========================================
async function loadOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;
    container.innerHTML = '<div class="loading-cell">Cargando pedidos...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/orders.php`, { credentials: 'include' });
        const data = await response.json();

        if (data.success && data.data) {
            const orders = data.data;
            if (orders.length === 0) {
                container.innerHTML = '<div class="empty-section"><i class="fas fa-shopping-cart"></i><h3>No hay pedidos</h3><p>Aún no se han realizado pedidos.</p></div>';
                return;
            }

            let html = '<div class="products-table-container"><table class="admin-table"><thead><tr><th>ID</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>';
            orders.forEach(o => {
                const oid = parseInt(o.id, 10);
                html += `
                    <tr>
                        <td><strong>#${oid}</strong></td>
                        <td>${escapeHtml(o.cliente_nombre || o.cliente_email || 'N/A')}</td>
                        <td>${new Date(o.fecha_pedido).toLocaleDateString('es-DO')}</td>
                        <td style="font-weight: 700;">$${parseFloat(o.total).toFixed(2)}</td>
                        <td>
                            <select onchange="updateOrderStatus(${oid}, this.value)" style="padding: 0.4rem; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-dark);">
                                <option value="pendiente" ${o.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="verificando_pago" ${o.estado === 'verificando_pago' ? 'selected' : ''}>Verificando pago</option>
                                <option value="preparando" ${o.estado === 'preparando' ? 'selected' : ''}>Preparando</option>
                                <option value="listo_entrega" ${o.estado === 'listo_entrega' ? 'selected' : ''}>Listo para entrega</option>
                                <option value="entregado" ${o.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
                                <option value="cancelado" ${o.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                            </select>
                        </td>
                        <td>
                            <button class="action-btn" onclick="viewOrder(${oid})" title="Ver detalles"><i class="fas fa-eye"></i></button>
                        </td>
                    </tr>
                `;
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = `<div class="empty-section"><i class="fas fa-exclamation-circle"></i><h3>Error</h3><p>${escapeHtml(data.message || 'No se pudieron cargar los pedidos.')}</p></div>`;
        }
    } catch (error) {
        console.error('Error cargando pedidos:', error);
        container.innerHTML = '<div class="empty-section"><i class="fas fa-exclamation-circle"></i><h3>Error de conexión</h3></div>';
    }
}

async function updateOrderStatus(id, estado) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders.php`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id: id, estado: estado })
        });
        const data = await response.json();
        if (data.success) showToast('✅ Estado actualizado');
        else showToast('❌ ' + (data.message || 'No se pudo actualizar'));
    } catch (error) {
        console.error('Error actualizando:', error);
        showToast('⚠️ Error de conexión');
    }
}

async function viewOrder(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders.php`, { credentials: 'include' });
        const data = await response.json();
        if (data.success) {
            const order = data.data.find(o => o.id == id);
            if (order) showOrderDetails(order);
            else showToast('❌ Pedido no encontrado');
        }
    } catch (error) {
        console.error('Error cargando pedido:', error);
        showToast('⚠️ Error de conexión');
    }
}

function showOrderDetails(order) {
    const detalles = order.detalles || [];
    const itemsHtml = detalles.map(d => `
        <div style="display: flex; justify-content: space-between; padding: 0.6rem 0; border-bottom: 1px solid var(--border); color: var(--text-dark);">
            <span>${escapeHtml(d.producto_nombre || 'Producto')} x${parseInt(d.cantidad, 10)}</span>
            <span style="font-weight: 600;">$${parseFloat(d.precio_unitario * d.cantidad).toFixed(2)}</span>
        </div>
    `).join('');
    const statusText = (order.estado || 'pendiente').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const oid = parseInt(order.id, 10);

    const modalHtml = `
        <div class="modal-overlay active" id="order-details-modal" style="z-index: 1001;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Pedido #${oid}</h2>
                    <button class="modal-close" onclick="document.getElementById('order-details-modal').remove()">&times;</button>
                </div>
                <div class="modal-form">
                    <div style="margin-bottom: 1rem; color: var(--text-dark); line-height: 1.8;">
                        <strong>Cliente:</strong> ${escapeHtml(order.cliente_nombre || 'N/A')}<br>
                        <strong>Email:</strong> ${escapeHtml(order.cliente_email || 'N/A')}<br>
                        <strong>Fecha:</strong> ${new Date(order.fecha_pedido).toLocaleString('es-DO')}<br>
                        <strong>Estado:</strong> <span class="status-badge status-${order.estado === 'entregado' ? 'completed' : escapeHtml(order.estado)}">${escapeHtml(statusText)}</span>
                    </div>
                    <h3 style="margin: 1rem 0 0.5rem; color: var(--text-dark);">Productos:</h3>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${itemsHtml || '<p style="color: var(--text-light);">Sin detalles</p>'}
                    </div>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid var(--border); display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 700; color: var(--text-dark);">
                        <span>Total:</span>
                        <span>$${parseFloat(order.total).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ==========================================
// 10. USUARIOS
// ==========================================
async function loadUsers() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    // Skeleton mientras carga
    tbody.innerHTML = (window.UI && window.UI.skeletonRows)
        ? window.UI.skeletonRows(7, 5)
        : '<tr><td colspan="7" class="loading-cell">Cargando usuarios...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}/users.php`, { credentials: 'include' });
        const data = await response.json();

        if (data.success && data.data) {
            allUsers = data.data;
            if (allUsers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No hay usuarios registrados</td></tr>';
                return;
            }
            tbody.innerHTML = allUsers.map(u => {
                const uid = parseInt(u.id, 10);
                return `
                <tr>
                    <td>${uid}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.7rem;">
                            <div style="width: 35px; height: 35px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">${escapeHtml((u.nombre || 'U').charAt(0).toUpperCase())}</div>
                            <span style="font-weight: 500;">${escapeHtml(u.nombre)}</span>
                        </div>
                    </td>
                    <td>${escapeHtml(u.email)}</td>
                    <td><span class="status-badge ${u.rol === 'admin' ? 'status-active' : 'status-pending'}">${escapeHtml(u.rol)}</span></td>
                    <td><span class="status-badge ${u.activo == 1 ? 'status-active' : 'status-inactive'}">${u.activo == 1 ? 'Activo' : 'Desactivado'}</span></td>
                    <td>${new Date(u.created_at).toLocaleDateString('es-DO')}</td>
                    <td><button class="action-btn" onclick="openUserModal(${uid})" title="Editar"><i class="fas fa-user-edit"></i></button></td>
                </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="loading-cell" style="color: var(--danger);">Error: ${escapeHtml(data.message || 'No se pudieron cargar')}</td></tr>`;
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell" style="color: var(--danger);">Error de conexión</td></tr>';
    }
}

function openUserModal(id) {
    const user = allUsers.find(u => u.id == id);
    if (!user) return;

    document.getElementById('user-id').value = user.id;
    document.getElementById('user-name-display').value = `${user.nombre} (${user.email})`;
    document.getElementById('user-rol').value = user.rol;
    document.getElementById('user-activo').value = user.activo == 1 ? '1' : '0';

    document.getElementById('user-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
    document.body.style.overflow = '';
}

function initUserForm() {
    const form = document.getElementById('user-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            id: parseInt(document.getElementById('user-id').value),
            rol: document.getElementById('user-rol').value,
            activo: parseInt(document.getElementById('user-activo').value)
        };

        try {
            const response = await fetch(`${API_BASE_URL}/users.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                showToast('✅ ' + data.message);
                closeUserModal();
                loadUsers();
            } else {
                showToast('❌ ' + data.message);
            }
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            showToast('⚠️ Error de conexión');
        }
    });
}

// ==========================================
// 11. CONFIGURACIÓN
// ==========================================
async function fetchSettings() {
    try {
        const response = await fetch(`${API_BASE_URL}/settings.php`, { credentials: 'include' });
        const data = await response.json();
        if (data.success) storeSettings = data.data;
    } catch (error) {
        console.warn('No se pudo cargar la configuración:', error);
    }
}

async function loadSettings() {
    await fetchSettings();
    const s = storeSettings;
    document.getElementById('set-nombre').value = s.nombre_tienda || '';
    document.getElementById('set-whatsapp').value = s.whatsapp || '';
    document.getElementById('set-umbral').value = s.umbral_stock || 5;
    document.getElementById('set-notif-pedidos').checked = !!s.notif_pedidos;
    document.getElementById('set-notif-stock').checked = !!s.notif_stock;
    document.getElementById('set-resumen').checked = !!s.resumen_diario;
}

function initSettingsForm() {
    const form = document.getElementById('settings-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nombre_tienda: document.getElementById('set-nombre').value.trim(),
            whatsapp: document.getElementById('set-whatsapp').value.trim(),
            umbral_stock: parseInt(document.getElementById('set-umbral').value) || 5,
            notif_pedidos: document.getElementById('set-notif-pedidos').checked,
            notif_stock: document.getElementById('set-notif-stock').checked,
            resumen_diario: document.getElementById('set-resumen').checked
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        if (window.UI && UI.setButtonLoading) UI.setButtonLoading(submitBtn, true);

        try {
            const response = await fetch(`${API_BASE_URL}/settings.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.success) {
                storeSettings = data.data;
                showToast('✅ Configuración guardada');
            } else {
                showToast('❌ ' + (data.message || 'Error al guardar'));
            }
        } catch (error) {
            console.error('Error guardando configuración:', error);
            showToast('⚠️ Error de conexión');
        } finally {
            if (window.UI && UI.setButtonLoading) UI.setButtonLoading(submitBtn, false);
        }
    });
}

// ==========================================
// 12. LOGOUT Y UI
// ==========================================
function initLogout() {
    const logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try { await fetch('api/auth/logout.php', { method: 'POST', credentials: 'include' }); }
            catch (error) { console.warn('Error en logout:', error); }
            finally {
                sessionStorage.removeItem(userStorageKey);
                localStorage.removeItem(userStorageKey);
                window.location.href = 'index.html';
            }
        });
    }
}

function updateAdminSidebarInfo(user) {
    const name = user.name || 'Admin';
    const email = user.email || 'admin@javich.com';
    const initial = name.charAt(0).toUpperCase();

    const adminUserName = document.getElementById('admin-user-name');
    const adminAvatar = document.getElementById('admin-avatar');
    const sidebarUserName = document.getElementById('sidebar-user-name');
    const sidebarUserEmail = document.getElementById('sidebar-user-email');
    const sidebarAvatar = document.getElementById('sidebar-avatar');

    if (adminUserName) adminUserName.textContent = name;
    if (adminAvatar) adminAvatar.textContent = initial;
    if (sidebarUserName) sidebarUserName.textContent = name;
    if (sidebarUserEmail) sidebarUserEmail.textContent = email;
    if (sidebarAvatar) sidebarAvatar.textContent = initial;
}

// ==========================================
// 13. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const user = checkAdminAccess();
    if (!user) return;

    updateAdminSidebarInfo(user);
    initTheme();
    initSidebarToggle();
    initNavigation();
    initImageUpload();
    initProductForm();
    initProductSearchAndFilter();
    initUserForm();
    initSettingsForm();
    initLogout();
    await fetchSettings();
    loadDashboard();

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const btnNewProduct = document.getElementById('btn-new-product');
    if (btnNewProduct) btnNewProduct.addEventListener('click', () => openProductModal());

    const modalClose = document.getElementById('modal-close');
    const btnCancel = document.getElementById('btn-cancel');
    if (modalClose) modalClose.addEventListener('click', closeProductModal);
    if (btnCancel) btnCancel.addEventListener('click', closeProductModal);

    const productModal = document.getElementById('product-modal');
    if (productModal) {
        productModal.addEventListener('click', (e) => { if (e.target === productModal) closeProductModal(); });
    }

    const userModalClose = document.getElementById('user-modal-close');
    const userCancel = document.getElementById('user-cancel');
    if (userModalClose) userModalClose.addEventListener('click', closeUserModal);
    if (userCancel) userCancel.addEventListener('click', closeUserModal);

    const userModal = document.getElementById('user-modal');
    if (userModal) {
        userModal.addEventListener('click', (e) => { if (e.target === userModal) closeUserModal(); });
    }

    // Ocultar loading cuando el dashboard esté listo
    if (window.UI && window.UI.hideLoadingWhenReady) {
        window.UI.hideLoadingWhenReady([
            fetch(`${API_BASE_URL}/dashboard.php`, { credentials: 'include' }).catch(() => {})
        ]);
    } else {
        // Fallback por si ui-helpers no cargó
        setTimeout(() => {
            const ls = document.getElementById('loading-screen');
            if (ls) { ls.classList.add('hidden'); setTimeout(() => ls.remove(), 500); }
        }, 1500);
    }
});