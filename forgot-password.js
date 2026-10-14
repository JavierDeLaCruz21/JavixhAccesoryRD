// ==========================================
// RECUPERACIÓN DE CONTRASEÑA - JAVICH SHOP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('email');
    const btnSubmit = document.getElementById('btn-submit');
    const msgBox = document.getElementById('message-box');
    const formContainer = document.getElementById('forgot-form-container');
    const successContainer = document.getElementById('success-container');
    const countdownEl = document.getElementById('countdown');
    const successMessage = document.getElementById('success-message');

    let countdownInterval = null;
    let redirectTimeout = null;

    if (!form || !emailInput || !btnSubmit) {
        console.error('❌ Elementos del formulario no encontrados');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();

        // Validación básica
        if (!email) {
            showMessage('❌ Por favor ingresa tu correo electrónico', 'error');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showMessage('❌ Ingresa un correo electrónico válido', 'error');
            return;
        }

        // Estado de carga
        btnSubmit.disabled = true;
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Enviando...';
        msgBox.className = 'message-box';
        msgBox.style.display = 'none';

        try {
            const res = await fetch('api/auth/forgot-password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await res.json();

            if (data.success) {
                // ✅ MOSTRAR PANTALLA DE ÉXITO CON ANIMACIÓN
                showSuccessScreen(email);
            } else {
                showMessage('❌ ' + data.message, 'error');
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Error en forgot-password:', error);
            showMessage('⚠️ Error de conexión con el servidor.', 'error');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalText;
        }
    });

    // ✅ FUNCIÓN PARA MOSTRAR PANTALLA DE ÉXITO
    function showSuccessScreen(email) {
        // Ocultar formulario, mostrar éxito
        formContainer.style.display = 'none';
        successContainer.style.display = 'block';
        
        // Mensaje personalizado
        successMessage.innerHTML = `Hemos enviado un enlace de recuperación a <strong>${email}</strong>.<br>
                                   Revisa tu bandeja de entrada y la carpeta de Spam.`;

        // Iniciar contador regresivo
        let seconds = 5;
        countdownEl.textContent = seconds;

        countdownInterval = setInterval(() => {
            seconds--;
            countdownEl.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);

        // Redirección automática después de 5 segundos
        redirectTimeout = setTimeout(() => {
            window.location.href = 'index.html';
        }, 5000);
    }

    // ✅ FUNCIÓN PARA VOLVER AL FORMULARIO
    window.showFormAgain = function() {
        // Limpiar timeouts
        if (countdownInterval) clearInterval(countdownInterval);
        if (redirectTimeout) clearTimeout(redirectTimeout);
        
        // Resetear formulario
        form.reset();
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar enlace';
        
        // Mostrar formulario, ocultar éxito
        successContainer.style.display = 'none';
        formContainer.style.display = 'block';
    };

    // Limpieza al salir de la página
    window.addEventListener('beforeunload', () => {
        if (countdownInterval) clearInterval(countdownInterval);
        if (redirectTimeout) clearTimeout(redirectTimeout);
    });

    function showMessage(text, type) {
        if (!msgBox) return;
        msgBox.textContent = text;
        msgBox.className = 'message-box ' + type;
        msgBox.style.display = 'block';
        msgBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
});