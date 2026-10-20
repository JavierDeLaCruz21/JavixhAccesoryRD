// ============================
// JAVICH SHOP - SCRIPT PRINCIPAL
// ============================

let products = [];

// Helper para escapar HTML (evita XSS)
const escapeHtml = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

async function loadProducts() {
    const grid = document.getElementById('product-grid');

    // Mostrar skeleton mientras carga
    if (grid && window.UI) {
        grid.innerHTML = `
            <div class="catalog-header">
                <p class="catalog-results">Cargando...</p>
            </div>
            <div class="products-list">${window.UI.skeletonCards(6)}</div>
        `;
    }

    try {
        const res = await fetch('api/public/products.php');
        if (!res.ok) throw new Error('Error al cargar productos');
        products = await res.json();
        if (!Array.isArray(products)) throw new Error('Respuesta inválida');
        renderProducts();
    } catch (error) {
        showToast('⚠️ No se pudieron cargar los productos', 3000);
        console.error('Error cargando productos:', error);

        if (grid && window.UI) {
            grid.innerHTML = `
                <div class="empty-state-cta">
                    <i class="fas fa-wifi empty-icon"></i>
                    <h3>No pudimos cargar los productos</h3>
                    <p>Verifica tu conexión a internet e intenta de nuevo.</p>
                    <button class="empty-action" onclick="location.reload()">
                        <i class="fas fa-rotate"></i> Reintentar
                    </button>
                </div>
            `;
        }
    }
}

const carouselItems = [
    { title: "Apple", desc: "Cabecitas y cables de carga ultra rápida para iPhone y iPad.", img: "./img/slide-apple.png", type: "product" },
    { title: "Samsung Original", desc: "Cargadores y cables originales para tu móvil y tablet Samsung.", img: "./img/slide-samsung.png", type: "product" },
    { title: "Powerbanks ANKER", desc: "Powerbanks y audífonos Soundcore: nunca te quedes sin batería.", img: "./img/slide-anker.png", type: "product" },
    {
        title: "Síguenos en Instagram",
        desc: "Mira nuestras ofertas diarias y nuevos ingresos.",
        img: "",
        type: "social",
        link: "https://www.instagram.com/javichtechaccesory_21/?hl=am-et",
        btnClass: "btn-ig",
        btnText: "Ver Instagram",
        icon: "fab fa-instagram fa-3x"
    },
    {
        title: "Haz tu pedido hoy",
        desc: "Escríbenos por WhatsApp y recibe atención personalizada.",
        img: "",
        type: "social",
        link: "https://wa.me/18295592331?text=Estoy%20interesado%20en%20uno%20de%20tus%20productos,%20c%C3%B3mo%20puedo%20cotizarlos",
        btnClass: "btn-wa",
        btnText: "Chat por WhatsApp",
        icon: "fab fa-whatsapp fa-3x"
    }
];

let cart = [];
let activeCategory = 'TODOS';
let currentSlide = 0;
let autoInterval = null;
let checkoutTimeout = null;
let toastTimeout = null;
let searchTerm = '';
let currentPage = 1;
const productsPerPage = 6;
const cartStorageKey = 'cart';
const userStorageKey = 'user';
const checkoutRedirectKey = 'checkout_redirect';

let storeSettings = { whatsapp: '18295592331', nombre_tienda: 'Javich AccesoryShop' };

async function loadStoreSettings() {
    try {
        const res = await fetch('api/public/settings.php');
        if (res.ok) {
            const data = await res.json();
            if (data && data.whatsapp) storeSettings = data;
        }
        const waBtn = document.querySelector('.btn-wa');
        if (waBtn) {
            waBtn.href = `https://wa.me/${storeSettings.whatsapp}?text=${encodeURIComponent('Estoy interesado en uno de tus productos, cómo puedo cotizarlos')}`;
        }
    } catch (e) {
        console.warn('No se pudo cargar la configuración de la tienda:', e);
    }
}

function getCurrentUser() {
    try {
        const sessionUser = sessionStorage.getItem(userStorageKey);
        if (sessionUser) {
            const parsed = JSON.parse(sessionUser);
            if (parsed && (parsed.name || parsed.email)) return parsed;
        }
    } catch (e) { console.warn('Error sessionStorage:', e); }
    try {
        const localUser = localStorage.getItem(userStorageKey);
        if (localUser) {
            const parsed = JSON.parse(localUser);
            if (parsed && (parsed.name || parsed.email)) return parsed;
        }
    } catch (e) { console.warn('Error localStorage:', e); }
    return null;
}

function hasCurrentUser() {
    const user = getCurrentUser();
    return Boolean(user && (user.name || user.email));
}

function renderUserProfileUI() {
    const user = getCurrentUser();
    const profileChip = document.getElementById('profile-chip');
    const profileName = document.getElementById('profile-name');
    const profileMenu = document.getElementById('profile-menu');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const hamburger = document.getElementById('hamburger');

    if (user && (user.name || user.email)) {
        if (profileChip) profileChip.classList.remove('hidden');
        if (profileName) profileName.textContent = (user.name || user.email).trim().split(' ')[0] || 'Usuario';
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (profileMenu) {
            profileMenu.classList.remove('hidden');
            const existingPanelBtns = profileMenu.querySelectorAll('.panel-link');
            existingPanelBtns.forEach(btn => btn.remove());
            const panelBtn = document.createElement('a');
            panelBtn.className = 'panel-link';
            if (user.role === 'admin') {
                panelBtn.href = 'admin.html';
                panelBtn.innerHTML = '<i class="fas fa-user-shield"></i> Panel Admin';
            } else {
                panelBtn.href = 'cliente.html';
                panelBtn.innerHTML = '<i class="fas fa-user-circle"></i> Mi Cuenta';
            }
            const logoutLink = profileMenu.querySelector('a:last-child');
            if (logoutLink) {
                profileMenu.insertBefore(panelBtn, logoutLink);
            } else {
                profileMenu.appendChild(panelBtn);
            }
        }
        if (hamburger) hamburger.style.display = 'none';
    } else {
        if (profileChip) profileChip.classList.add('hidden');
        if (profileName) profileName.textContent = 'Usuario';
        if (loginBtn) loginBtn.style.display = 'block';
        if (registerBtn) registerBtn.style.display = 'block';
        if (profileMenu) profileMenu.classList.add('hidden');
        if (hamburger) hamburger.style.display = 'block';
    }
}

async function syncSessionWithServer() {
    try {
        const res = await fetch('api/cliente/session.php', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
                sessionStorage.setItem(userStorageKey, JSON.stringify(data.user));
                localStorage.setItem(userStorageKey, JSON.stringify(data.user));
                renderUserProfileUI();
                return data.user;
            }
        }
    } catch (e) {
        console.warn('Error verificando sesión con el servidor:', e);
    }
    // Si el servidor no valida la sesión, limpiar almacenamiento
    sessionStorage.removeItem(userStorageKey);
    localStorage.removeItem(userStorageKey);
    renderUserProfileUI();
    return null;
}

async function logoutCurrentUser() {
    try {
        await fetch('api/auth/logout.php', { method: 'POST', credentials: 'include' });
    } catch (error) {
        console.warn('No se pudo contactar api/auth/logout.php:', error);
    }
    try {
        sessionStorage.removeItem(userStorageKey);
        localStorage.removeItem(userStorageKey);
        sessionStorage.removeItem(checkoutRedirectKey);
        sessionStorage.removeItem('just_logged_in');
        cart = [];
        localStorage.removeItem(cartStorageKey);
        const drawer = document.getElementById('cart-drawer');
        if (drawer && drawer.classList.contains('active')) toggleCart(false);
        updateUI();
        renderUserProfileUI();
        showToast('Sesión cerrada correctamente', 2500);
        const navActions = document.getElementById('nav-actions');
        const navOverlay = document.querySelector('.nav-overlay');
        if (navActions) navActions.classList.remove('active');
        if (navOverlay) navOverlay.classList.remove('active');
    } catch (error) {
        console.warn('Error en logout:', error);
        showToast('No se pudo cerrar sesión', 2500);
    }
}

async function checkUrlForGoogleLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const loginParam = urlParams.get('login');
    const errorParam = urlParams.get('error');

    if (errorParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
        if (errorParam === 'google_not_configured') {
            showToast('⚠️ Google Login no está configurado en el servidor.', 3500);
        } else {
            showToast('❌ Error de autenticación con Google.', 3500);
        }
        return;
    }

    if (loginParam === 'success') {
        window.history.replaceState({}, document.title, window.location.pathname);
        // Validar sesión REAL en el backend
        const user = await syncSessionWithServer();
        if (!user) {
            showToast('❌ No se pudo validar la sesión con el servidor.', 3000);
            return;
        }

        const fromCheckout = sessionStorage.getItem(checkoutRedirectKey);
        if (fromCheckout === 'true') {
            sessionStorage.removeItem(checkoutRedirectKey);
            showToast('✅ Bienvenido ' + user.name + '. Redirigiendo a tu cuenta...', 2000);
            if (window.UI && window.UI.hideLoadingWhenReady) {
                window.UI.hideLoadingWhenReady([fetch('api/public/products.php').catch(() => {})]);
            }
        }

        if (user.role === 'admin') {
            showToast('✅ Bienvenido Admin, ' + user.name, 2000);
            setTimeout(() => { window.location.href = 'admin.html'; }, 500);
            return;
        }

        showToast('✅ Bienvenido, ' + user.name + '. Redirigiendo a tu cuenta...', 2000);
        setTimeout(() => { window.location.href = 'cliente.html'; }, 1200);
    } else {
        // En arranque normal, sincronizar sesión silenciosamente
        syncSessionWithServer();
    }
}

function loadCart() {
    try {
        const savedCart = localStorage.getItem(cartStorageKey);
        cart = savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
        console.warn('No se pudo cargar el carrito:', error);
        cart = [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    } catch (error) {
        console.warn('No se pudo guardar el carrito:', error);
    }
}

function showToast(message, duration = 2500) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.remove('show');
    requestAnimationFrame(() => toast.classList.add('show'));
    toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const availableStock = parseInt(product.stock, 10) || 0;
    if (availableStock <= 0) {
        showToast('⚠️ Este producto está agotado temporalmente');
        return;
    }

    const existing = cart.find(item => item.id === id);
    if (existing) {
        if (existing.quantity >= availableStock) {
            showToast(`⚠️ Solo quedan ${availableStock} unidades disponibles de este producto`);
            return;
        }
        existing.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    updateUI();
    showToast(`✅ ${product.name} añadido al carrito`);
}

function updateQuantity(id, delta) {
    const index = cart.findIndex(item => item.id === id);
    if (index === -1) return;

    const item = cart[index];
    const product = products.find(p => p.id === id);
    const availableStock = product ? (parseInt(product.stock, 10) || 999) : 999;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        cart.splice(index, 1);
    } else if (newQty > availableStock) {
        showToast(`⚠️ Solo hay ${availableStock} unidades disponibles en stock`);
        return;
    } else {
        item.quantity = newQty;
    }
    saveCart();
    updateUI();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateUI();
    showToast('Producto eliminado');
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartItemCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getFilteredProducts() {
    const term = searchTerm.trim().toLowerCase();
    return products.filter(product => {
        const matchesCategory = activeCategory === 'TODOS' || product.category === activeCategory;
        const haystack = `${product.name} ${product.description || ''}`.toLowerCase();
        const matchesSearch = !term || haystack.includes(term);
        return matchesCategory && matchesSearch;
    });
}

function getProductBadge(product) {
    if (product.badge) return product.badge;
    if (product.isOffer) return 'Oferta';
    if (product.isNew) return 'Nuevo';
    return '';
}

function renderProducts() {
    const filtered = getFilteredProducts();
    const grid = document.getElementById('product-grid');
    if (!grid) return;

if (filtered.length === 0) {
    const hasFilters = searchTerm || activeCategory !== 'TODOS';
    grid.innerHTML = `
        <div class="empty-state-cta">
            <i class="fas fa-search empty-icon"></i>
            <h3>${hasFilters ? 'Sin resultados' : 'No hay productos disponibles'}</h3>
            <p>${hasFilters
                ? 'No encontramos productos con esos filtros. Prueba otra búsqueda.'
                : 'Vuelve pronto, estamos actualizando el catálogo.'}</p>
            ${hasFilters ? `
                <button class="empty-action" onclick="resetFilters()">
                    <i class="fas fa-rotate-left"></i> Limpiar filtros
                </button>
            ` : ''}
        </div>
    `;
    return;
}

    const totalPages = Math.max(1, Math.ceil(filtered.length / productsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * productsPerPage;
    const pageItems = filtered.slice(startIndex, startIndex + productsPerPage);

    const cards = pageItems.map(product => {
        const badge = getProductBadge(product);
        const description = product.description ? `${product.description.slice(0, 75)}${product.description.length > 75 ? '...' : ''}` : 'Accesorio de alta calidad para tus dispositivos.';
        const imageSrc = product.image || './img/android-chrome-192x192.png';
        const stock = parseInt(product.stock, 10) || 0;
        const umbral = parseInt(storeSettings.umbral_stock, 10) || 5;
        const isAgotado = stock <= 0;
        const isLowStock = !isAgotado && stock <= umbral;

        let stockBadge = '';
        if (isAgotado) {
            stockBadge = `<span class="stock-badge stock-out"><i class="fas fa-times-circle"></i> Agotado</span>`;
        } else if (isLowStock) {
            stockBadge = `<span class="stock-badge stock-low"><i class="fas fa-bolt"></i> ¡Solo ${stock} disponibles!</span>`;
        } else {
            stockBadge = `<span class="stock-badge stock-ok"><i class="fas fa-check-circle"></i> En stock (${stock})</span>`;
        }

        return `<article class="product-card ${isAgotado ? 'card-agotado' : ''}">
            ${badge ? `<span class="product-badge">${escapeHtml(badge)}</span>` : ''}
            <div class="product-img-wrapper">
                <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(product.name)}" loading="lazy" class="product-img">
            </div>
            <div class="product-info">
                <span class="product-category">${escapeHtml(product.category)}</span>
                <h3 title="${escapeHtml(product.name)}">${escapeHtml(product.name)}</h3>
                <p class="product-desc">${escapeHtml(description)}</p>
            </div>
            <div class="product-actions">
                ${stockBadge}
                <span class="price">RD$ ${parseFloat(product.price).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <button class="add-btn ${isAgotado ? 'btn-disabled' : ''}" data-id="${parseInt(product.id, 10)}" ${isAgotado ? 'disabled' : ''}>
                    ${isAgotado ? '<i class="fas fa-ban"></i> Agotado' : '<i class="fas fa-cart-plus"></i> Agregar al carrito'}
                </button>
            </div>
        </article>`;
    }).join('');

    const pagination = totalPages > 1 ? `<div class="pagination">
        <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
        <span class="page-info">Página ${currentPage} de ${totalPages}</span>
        <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
    </div>` : '';

    grid.innerHTML = `<div class="catalog-header">
        <p class="catalog-results">${filtered.length} productos encontrados</p>
    </div>
    <div class="products-list">${cards}</div>
    ${pagination}`;

document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        addToCart(id);

        // Feedback visual: "✓ Añadido" temporal
        btn.classList.add('added');
        setTimeout(() => btn.classList.remove('added'), 900);
    });
});

    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = parseInt(btn.dataset.page, 10);
            if (targetPage >= 1 && targetPage <= totalPages) {
                currentPage = targetPage;
                renderProducts();
            }
        });
    });
}

function initFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCategory = btn.dataset.filter;
            currentPage = 1;
            renderProducts();
        });
    });
}

function resetFilters() {
    searchTerm = '';
    activeCategory = 'TODOS';
    currentPage = 1;

    const searchInput = document.getElementById('product-search');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === 'TODOS');
    });

    renderProducts();
}

function initSearch() {
    const searchInput = document.getElementById('product-search');
    if (!searchInput) return;

    // Debounce: solo renderiza 300ms después de la última tecla
    const debouncedRender = (window.UI && window.UI.debounce)
        ? window.UI.debounce(() => {
            currentPage = 1;
            renderProducts();
        }, 300)
        : () => { currentPage = 1; renderProducts(); };

    searchInput.addEventListener('input', (event) => {
        searchTerm = event.target.value;
        debouncedRender();
    });
}

function renderCarousel() {
    const slideContainer = document.getElementById('carousel-slide');
    const dotsContainer = document.getElementById('carousel-dots');
    if (!slideContainer || !dotsContainer) return;

    slideContainer.innerHTML = carouselItems.map((item) => {
        const isSocial = item.type === 'social';
        return `<div class="carousel-item ${isSocial ? 'social-slide' : ''}">
            <div class="carousel-content">
                <h2>${escapeHtml(item.title)}</h2>
                <p>${escapeHtml(item.desc)}</p>
                ${!isSocial && item.img ? `<img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.title)}" class="carousel-img">` : ''}
                ${isSocial ? `
                    <div style="margin: 1rem 0;">
                        <i class="${item.icon}" style="color: ${item.btnClass === 'btn-ig' ? '#E4405F' : '#25D366'};"></i>
                    </div>
                    <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" class="promo-btn ${item.btnClass}">${escapeHtml(item.btnText)}</a>
                ` : ''}
            </div>
        </div>`;
    }).join('');

    dotsContainer.innerHTML = carouselItems.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}" data-index="${i}" role="tab" aria-selected="${i === 0}"></div>`).join('');

    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.dataset.index, 10);
            goToSlide(index);
            resetAutoSlide();
        });
    });
}

function updateCarousel() {
    const slideContainer = document.getElementById('carousel-slide');
    if (!slideContainer) return;
    slideContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    document.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
        dot.setAttribute('aria-selected', i === currentSlide);
    });
}

function goToSlide(index) {
    currentSlide = (index + carouselItems.length) % carouselItems.length;
    updateCarousel();
}

function nextSlide() { goToSlide(currentSlide + 1); resetAutoSlide(); }
function prevSlide() { goToSlide(currentSlide - 1); resetAutoSlide(); }

function startAutoSlide() {
    if (autoInterval) clearInterval(autoInterval);
    autoInterval = setInterval(() => goToSlide(currentSlide + 1), 6000);
}

function resetAutoSlide() { clearInterval(autoInterval); startAutoSlide(); }

function toggleCart(show) {
    const drawer = document.getElementById('cart-drawer');
    const overlayCart = document.getElementById('overlay');
    if (!drawer || !overlayCart) return;

    if (!show && checkoutTimeout) {
        clearTimeout(checkoutTimeout);
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = 'Finalizar Compra';
        }
        checkoutTimeout = null;
        showToast('⚠️ Proceso cancelado', 1500);
    }

    if (show) {
        drawer.classList.add('active');
        overlayCart.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');
        const closeCartBtn = document.getElementById('close-cart');
        if (closeCartBtn) closeCartBtn.focus();
        document.body.style.overflow = 'hidden';
    } else {
        drawer.classList.remove('active');
        overlayCart.classList.remove('active');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

function closeCartOnEsc(e) {
    if (e.key === 'Escape') {
        const drawer = document.getElementById('cart-drawer');
        if (drawer && drawer.classList.contains('active')) toggleCart(false);
    }
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-state" style="margin: 2rem;">🛒 Tu carrito está vacío</div>';
        return;
    }
    container.innerHTML = cart.map(item => `<div class="cart-item">
        <div class="cart-item-info">
            <strong>${escapeHtml(item.name)}</strong><br>
            $${parseFloat(item.price).toFixed(2)} c/u<br>
            Subtotal: $${(parseFloat(item.price) * parseInt(item.quantity, 10)).toFixed(2)}
        </div>
        <div class="cart-item-actions">
            <button class="qty-btn" data-id="${parseInt(item.id, 10)}" data-delta="-1">-</button>
            <span>${parseInt(item.quantity, 10)}</span>
            <button class="qty-btn" data-id="${parseInt(item.id, 10)}" data-delta="1">+</button>
            <button class="remove-btn" data-id="${parseInt(item.id, 10)}"><i class="fas fa-trash-alt"></i></button>
        </div>
    </div>`).join('');

    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id, 10);
            const delta = parseInt(btn.dataset.delta, 10);
            updateQuantity(id, delta);
        });
    });

    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id, 10);
            removeFromCart(id);
        });
    });
}

function updateCartSummary() {
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');
    if (!cartTotal || !cartCount) return;
    const total = getCartTotal();
    cartTotal.innerText = `$${total.toFixed(2)}`;
    cartCount.innerText = getCartItemCount();
}

function updateUI() {
    renderCartItems();
    updateCartSummary();
}

function handleCheckout() {
    const checkoutBtn = document.getElementById('checkout-btn');
    if (!checkoutBtn || checkoutBtn.disabled) return;

    if (cart.length === 0) {
        showToast('🛒 El carrito está vacío', 2000);
        return;
    }

    const user = getCurrentUser();
    if (!user || (!user.name && !user.email)) {
        sessionStorage.setItem(checkoutRedirectKey, 'true');
        const loginModal = document.getElementById('login-modal');
        const overlay = document.getElementById('overlay');
        const drawer = document.getElementById('cart-drawer');
        if (drawer && drawer.classList.contains('active')) toggleCart(false);
        if (loginModal) {
            loginModal.classList.add('active');
            loginModal.setAttribute('aria-hidden', 'false');
        }
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        showToast('Inicia sesión para continuar con tu compra', 3500);
        return;
    }

    const originalText = checkoutBtn.innerHTML;
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Procesando...';
    if (checkoutTimeout) clearTimeout(checkoutTimeout);

    fetch('api/public/checkout.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cart: cart })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            showToast('❌ ' + data.message, 3500);
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = originalText;
            return;
        }

        const pedidoNum = data.pedido_id || 'N/A';
        showToast('✅ Pedido creado. Redirigiendo al pago...', 2000);

        setTimeout(() => {
            cart = [];
            localStorage.removeItem(cartStorageKey);
            updateUI();
            toggleCart(false);
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = originalText;
            window.location.href = 'pago.html?pedido=' + pedidoNum;
        }, 1500);
    })
    .catch(error => {
        console.error('Error en checkout:', error);
        showToast('⚠️ Error al procesar el pedido', 3000);
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = originalText;
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    document.body.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('light-mode', !isDark);
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.contains('light-mode');
    const themeToggle = document.getElementById('theme-toggle');
    if (isLight) {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function initHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navActions = document.getElementById('nav-actions');
    if (!hamburger || !navActions) return;

    let overlay = document.querySelector('.nav-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'nav-overlay';
        document.body.appendChild(overlay);
    }

    function closeMenu() {
        navActions.classList.remove('active');
        overlay.classList.remove('active');
    }
    function openMenu() {
        navActions.classList.add('active');
        overlay.classList.add('active');
    }

    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (navActions.classList.contains('active')) closeMenu();
        else openMenu();
    });
    overlay.addEventListener('click', closeMenu);
    document.querySelectorAll('.auth-item').forEach(btn => {
        btn.addEventListener('click', () => closeMenu());
    });
}

function initPasswordToggle() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            const icon = btn.querySelector('i');
            if (!input || !icon) return;
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

function initPasswordStrength() {
    const passInput = document.getElementById('reg-pass');
    const confirmInput = document.getElementById('reg-pass-confirm');
    if (!passInput) return;

    const fill = document.getElementById('strength-fill');
    const text = document.getElementById('strength-text');
    const matchMessage = document.getElementById('match-message');
    const reqLength = document.getElementById('req-length');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqLowercase = document.getElementById('req-lowercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    passInput.addEventListener('input', () => {
        const value = passInput.value;
        let score = 0;
        const checks = {
            length: value.length >= 8,
            uppercase: /[A-Z]/.test(value),
            lowercase: /[a-z]/.test(value),
            number: /[0-9]/.test(value),
            special: /[#@!$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)
        };

        const updateReq = (el, isValid) => {
            if (!el) return;
            if (isValid) {
                el.classList.add('valid');
                const icon = el.querySelector('i');
                if (icon) icon.className = 'fas fa-check-circle';
            } else {
                el.classList.remove('valid');
                const icon = el.querySelector('i');
                if (icon) icon.className = 'fas fa-circle';
            }
        };

        updateReq(reqLength, checks.length);
        updateReq(reqUppercase, checks.uppercase);
        updateReq(reqLowercase, checks.lowercase);
        updateReq(reqNumber, checks.number);
        updateReq(reqSpecial, checks.special);

        Object.values(checks).forEach(valid => { if (valid) score++; });

        if (value.length === 0) {
            if (fill) fill.className = 'strength-fill';
            if (text) { text.className = 'strength-text'; text.textContent = 'Ingresa una contraseña'; }
        } else if (score <= 2) {
            if (fill) fill.className = 'strength-fill weak';
            if (text) { text.className = 'strength-text weak'; text.textContent = 'Muy débil'; }
        } else if (score === 3) {
            if (fill) fill.className = 'strength-fill fair';
            if (text) { text.className = 'strength-text fair'; text.textContent = 'Débil'; }
        } else if (score === 4) {
            if (fill) fill.className = 'strength-fill good';
            if (text) { text.className = 'strength-text good'; text.textContent = 'Buena'; }
        } else if (score === 5) {
            if (fill) fill.className = 'strength-fill strong';
            if (text) { text.className = 'strength-text strong'; text.textContent = 'Fuerte'; }
        }

        if (confirmInput && confirmInput.value) validatePasswordMatch();
    });

    function validatePasswordMatch() {
        if (!confirmInput || !matchMessage) return;
        const value = confirmInput.value;
        if (value.length === 0) {
            matchMessage.textContent = '';
            matchMessage.className = 'match-message';
            return;
        }
        if (value === passInput.value) {
            matchMessage.textContent = '✅ Las contraseñas coinciden';
            matchMessage.className = 'match-message match';
        } else {
            matchMessage.textContent = '❌ Las contraseñas no coinciden';
            matchMessage.className = 'match-message no-match';
        }
    }

    if (confirmInput) {
        confirmInput.addEventListener('input', validatePasswordMatch);
    }
}

function init() {
    initPasswordToggle();
    initPasswordStrength();
    loadStoreSettings();
    checkUrlForGoogleLogin();

    const currentUser = getCurrentUser();
    const justLoggedIn = sessionStorage.getItem('just_logged_in');
    if (currentUser && currentUser.role === 'admin' && justLoggedIn === 'true') {
        sessionStorage.removeItem('just_logged_in');
        if (!window.location.pathname.includes('admin.html')) {
            window.location.href = 'admin.html';
            return;
        }
    }

    loadCart();
    renderUserProfileUI();
    initTheme();
    renderCarousel();
    updateCarousel();
    startAutoSlide();
    loadProducts();
    initFilters();
    initSearch();
    updateUI();
    initHamburger();

    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.innerHTML = '&#10094;';
    if (nextBtn) nextBtn.innerHTML = '&#10095;';

    const cartIcon = document.getElementById('cart-icon');
    const closeCartBtn = document.getElementById('close-cart');
    const overlay = document.getElementById('overlay');
    const checkoutBtn = document.getElementById('checkout-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoLink = document.getElementById('logo-link');
    const profileChip = document.getElementById('profile-chip');
    const profileMenu = document.getElementById('profile-menu');
    const logoutBtn = document.getElementById('logout-btn');

    if (logoLink) {
        logoLink.addEventListener('click', (e) => { e.preventDefault(); });
    }

    if (profileChip) {
        profileChip.addEventListener('click', () => {
            if (!hasCurrentUser()) return;
            const isOpen = profileMenu && !profileMenu.classList.contains('hidden');
            if (profileMenu) {
                profileMenu.classList.toggle('hidden', isOpen);
                profileChip.setAttribute('aria-expanded', String(!isOpen));
            }
        });
        profileChip.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                profileChip.click();
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (profileMenu) profileMenu.classList.add('hidden');
            if (profileChip) profileChip.setAttribute('aria-expanded', 'false');
            logoutCurrentUser();
        });
    }

    document.addEventListener('click', (event) => {
        if (profileMenu && !profileMenu.contains(event.target) && profileChip && !profileChip.contains(event.target)) {
            profileMenu.classList.add('hidden');
            profileChip.setAttribute('aria-expanded', 'false');
        }
    });

    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');

    function openAuthModal(modal) {
        const navActions = document.getElementById('nav-actions');
        const navOverlay = document.querySelector('.nav-overlay');
        if (navActions) navActions.classList.remove('active');
        if (navOverlay) navOverlay.classList.remove('active');
        if (overlay) overlay.classList.add('active');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeAuthModals() {
        if (loginModal) {
            loginModal.classList.remove('active');
            loginModal.setAttribute('aria-hidden', 'true');
        }
        if (registerModal) {
            registerModal.classList.remove('active');
            registerModal.setAttribute('aria-hidden', 'true');
        }
        const drawer = document.getElementById('cart-drawer');
        if (!drawer || !drawer.classList.contains('active')) {
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal(loginModal);
        });
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal(registerModal);
        });
    }

    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');

    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.classList.remove('active');
            registerModal.classList.add('active');
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerModal.classList.remove('active');
            loginModal.classList.add('active');
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Limpiar errores al escribir
['login-email', 'login-pass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', () => {
            if (window.UI) UI.clearFieldState(el);
        });
    }
});
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const emailInput = document.getElementById('login-email');
            const passInput = document.getElementById('login-pass');
            const submitBtn = loginForm.querySelector('.auth-submit-btn');

    // Validación inline
    if (window.UI) {
        let hasErrors = false;

    // Email
    const email = emailInput ? emailInput.value.trim() : '';
        if (!email) {
        UI.setFieldError(emailInput, 'El correo es obligatorio');
        hasErrors = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        UI.setFieldError(emailInput, 'Correo no válido');
        hasErrors = true;
        } else {
            UI.clearFieldState(emailInput);
}

    // Password
    const pass = passInput ? passInput.value : '';
    if (!pass) {
        UI.setFieldError(passInput, 'La contraseña es obligatoria');
        hasErrors = true;
    } else {
        UI.clearFieldState(passInput);
    }

    if (hasErrors) return;
}

            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Verificando...';

            try {
                const response = await fetch('api/auth/login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        email: emailInput.value.trim(),
                        password: passInput.value.trim()
                    })
                });
                const data = await response.json();

                if (data.success) {
                    const userData = data.user;
                    sessionStorage.setItem(userStorageKey, JSON.stringify(userData));
                    localStorage.setItem(userStorageKey, JSON.stringify(userData));
                    sessionStorage.setItem('just_logged_in', 'true');
                    showToast('✅ ' + data.message, 2000);
                    closeAuthModals();
                    loginForm.reset();

                    setTimeout(() => {
                        const fromCheckout = sessionStorage.getItem(checkoutRedirectKey);
                        if (fromCheckout === 'true') {
                            sessionStorage.removeItem(checkoutRedirectKey);
                            showToast('✅ Bienvenido ' + userData.name + '. Redirigiendo a tu cuenta...', 2000);
                        } else {
                            showToast('✅ Bienvenido ' + userData.name + '. Accediendo a tu cuenta...', 2000);
                        }
                        setTimeout(() => {
                            if (userData.role === 'admin') {
                                const redirectUrl = fromCheckout === 'true' ? 'admin.html?from=checkout' : 'admin.html';
                                window.location.href = redirectUrl;
                            } else {
                                const redirectUrl = fromCheckout === 'true' ? 'cliente.html?from=checkout' : 'cliente.html';
                                window.location.href = redirectUrl;
                            }
                        }, 1500);
                    }, 500);
                } else {
                    showToast('❌ ' + data.message, 3500);
                }
            } catch (error) {
                console.error('Error en login:', error);
                showToast('⚠️ Error de conexión con el servidor', 3000);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        const step1 = document.getElementById('register-step-1');
        const step2 = document.getElementById('register-step-2');
        const btnNext = document.getElementById('btn-register-next');
        const btnBack = document.getElementById('btn-register-back');
        const regName = document.getElementById('reg-name');
        const regEmail = document.getElementById('reg-email');
        const regPass = document.getElementById('reg-pass');
        const regPassConfirm = document.getElementById('reg-pass-confirm');

if (btnNext) {
    btnNext.addEventListener('click', () => {
        let hasErrors = false;

        // Nombre
        const name = regName.value.trim();
        if (!name) {
            if (window.UI) UI.setFieldError(regName, 'El nombre es obligatorio');
            hasErrors = true;
        } else if (name.length < 2) {
            if (window.UI) UI.setFieldError(regName, 'Mínimo 2 caracteres');
            hasErrors = true;
        } else {
            if (window.UI) UI.clearFieldState(regName);
        }

        // Email
        const email = regEmail.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            if (window.UI) UI.setFieldError(regEmail, 'El correo es obligatorio');
            hasErrors = true;
        } else if (!emailRegex.test(email)) {
            if (window.UI) UI.setFieldError(regEmail, 'Correo no válido');
            hasErrors = true;
        } else {
            if (window.UI) UI.clearFieldState(regEmail);
        }

        if (hasErrors) return;

        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
        setTimeout(() => regPass.focus(), 100);
    });
}
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const passValue = regPass.value.trim();
            const confirmValue = regPassConfirm.value.trim();

            if (passValue.length < 8) {
                showToast('⚠️ La contraseña debe tener al menos 8 caracteres', 3000);
                return;
            }
            if (!/[A-Z]/.test(passValue) || !/[a-z]/.test(passValue) || !/[0-9]/.test(passValue)) {
                showToast('⚠️ La contraseña debe tener mayúsculas, minúsculas y números', 3000);
                return;
            }
            if (passValue !== confirmValue) {
                showToast('❌ Las contraseñas no coinciden', 3000);
                return;
            }

            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Creando cuenta...';

            try {
                const response = await fetch('api/auth/register.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: regName.value.trim(),
                        email: regEmail.value.trim(),
                        password: passValue
                    })
                });
                const data = await response.json();

                if (data.success) {
                    showToast('✅ ' + data.message, 3000);
                    registerForm.reset();
                    if (step2) step2.style.display = 'none';
                    if (step1) step1.style.display = 'block';
                    document.getElementById('register-modal').classList.remove('active');
                    document.getElementById('login-modal').classList.add('active');
                } else {
                    showToast('❌ ' + data.message, 3500);
                }
            } catch (error) {
                console.error('Error en registro:', error);
                showToast('⚠️ Error al conectar con el servidor', 3000);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    document.querySelectorAll('.close-auth').forEach(btn => {
        btn.addEventListener('click', closeAuthModals);
    });

    if (overlay) {
        overlay.addEventListener('click', () => {
            toggleCart(false);
            closeAuthModals();
        });
    }

    function handleGoogleAuth() {
        showToast('Redirigiendo a Google...', 2000);
        setTimeout(() => {
            window.location.href = 'api/auth/google-login.php';
        }, 400);
    }

    const googleBtns = document.querySelectorAll('.google-auth-btn');
    googleBtns.forEach(btn => {
        btn.addEventListener('click', handleGoogleAuth);
    });

    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (cartIcon) cartIcon.addEventListener('click', () => toggleCart(true));
    if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCart(false));
    document.addEventListener('keydown', closeCartOnEsc);
    if (checkoutBtn) checkoutBtn.addEventListener('click', handleCheckout);
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    // Ocultar loading screen después de 1.5 segundos
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => loadingScreen.remove(), 500);
        }
    }, 1500);
}

document.addEventListener('DOMContentLoaded', init);