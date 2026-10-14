// ==========================================
// RECUPERACIÓN DE CONTRASEÑA - PASO FINAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const email = params.get('email');
    const form = document.getElementById('reset-form');
    const msg = document.getElementById('reset-message');

    function showMsg(text, type) {
        msg.textContent = text;
        msg.className = 'reset-message ' + type;
        msg.style.display = 'block';
    }

    if (!token || !email) {
        showMsg('❌ Enlace incompleto. Solicita uno nuevo desde el inicio de sesión.', 'error');
        form.style.display = 'none';
        return;
    }

    // Toggle de contraseña (ojito)
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            const icon = btn.querySelector('i');
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;

        if (pass.length < 8) { showMsg('⚠️ La contraseña debe tener al menos 8 caracteres.', 'error'); return; }
        if (pass !== confirm) { showMsg('❌ Las contraseñas no coinciden.', 'error'); return; }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const res = await fetch('api/auth/reset-password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, email: email, password: pass })
            });
            const data = await res.json();

            if (data.success) {
                showMsg('✅ ' + data.message + ' Redirigiendo...', 'success');
                setTimeout(() => { window.location.href = 'index.html'; }, 2500);
            } else {
                showMsg('❌ ' + data.message, 'error');
                btn.disabled = false;
            }
        } catch (err) {
            console.error('Error en reset:', err);
            showMsg('⚠️ Error de conexión con el servidor.', 'error');
            btn.disabled = false;
        }
    });
});