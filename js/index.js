/* ═══════════════════════════════════════════════
   EXARY HQ — Auth
═══════════════════════════════════════════════ */

/* Si ya hay sesión activa → ir directo */
if (_sb) {
  _sb.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.href = 'home.html';
  }).catch(() => {
    // Supabase falló — si hay caché ir igual
    const cached = JSON.parse(localStorage.getItem('exary_user') || 'null');
    if (cached?.id) window.location.href = 'home.html';
  });
} else {
  // Sin Supabase — usar caché local
  const cached = JSON.parse(localStorage.getItem('exary_user') || 'null');
  if (cached?.id) window.location.href = 'home.html';
}

/* ── Tabs ── */
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab, .auth-form').forEach(el => el.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab === 'login' ? 'loginForm' : 'registerForm').classList.add('active');
  });
});

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.querySelector('span:first-child').textContent = loading
    ? 'Cargando...' : btn.dataset.label;
}
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

document.querySelectorAll('.auth-form button[type=submit]').forEach(btn => {
  btn.dataset.label = btn.querySelector('span:first-child').textContent;
});

/* ── Login ── */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn   = e.target.querySelector('button[type=submit]');
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  showError('loginError', '');

  if (!_sb) {
    showError('loginError', 'No hay conexión con el servidor. Recarga la página (Ctrl+Shift+R).');
    return;
  }

  setLoading(btn, true);
  const { error } = await _sb.auth.signInWithPassword({ email, password: pass });
  setLoading(btn, false);

  if (error) {
    showError('loginError',
      error.message.includes('Invalid login') ? 'Correo o contraseña incorrectos' :
      error.message.includes('Email not confirmed') ? 'Confirma tu correo antes de entrar' :
      error.message
    );
    return;
  }
  window.location.href = 'home.html';
});

/* ── Registro ── */
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn    = e.target.querySelector('button[type=submit]');
  const nombre = document.getElementById('regName').value.trim();
  const email  = document.getElementById('regEmail').value.trim();
  const pass   = document.getElementById('regPass').value;
  const pass2  = document.getElementById('regPass2').value;
  showError('registerError', '');

  if (pass !== pass2)  return showError('registerError', 'Las contraseñas no coinciden');
  if (pass.length < 8) return showError('registerError', 'Mínimo 8 caracteres');
  if (!nombre)         return showError('registerError', 'Ingresa tu nombre');

  if (!_sb) {
    showError('registerError', 'No hay conexión con el servidor. Recarga la página (Ctrl+Shift+R).');
    return;
  }

  setLoading(btn, true);
  const { error } = await _sb.auth.signUp({
    email, password: pass,
    options: { data: { nombre } }
  });
  setLoading(btn, false);

  if (error) {
    showError('registerError',
      error.message.includes('already registered') ? 'Este correo ya tiene una cuenta' :
      error.message
    );
    return;
  }

  const { data: { session } } = await _sb.auth.getSession().catch(() => ({ data: {} }));
  if (session) {
    window.location.href = 'home.html';
  } else {
    document.getElementById('registerForm').innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:32px;margin-bottom:12px">📬</div>
        <p style="font-weight:600;color:var(--text);margin-bottom:8px">¡Cuenta creada!</p>
        <p style="font-size:13px;color:var(--muted)">Revisa tu correo <strong>${email}</strong> y confirma tu cuenta.</p>
      </div>`;
  }
});


/* ── Recuperar contraseña ── */
document.getElementById('forgotLink')?.addEventListener('click', async e => {
  e.preventDefault();
  if (!_sb) {
    await ExaryDialog.alert('La recuperación requiere conexión a Supabase.',
      { title: 'No disponible', tone: 'warn', icon: 'close' });
    return;
  }
  const email = await ExaryDialog.prompt(
    'Ingresa tu correo y te enviaremos un link para restablecer tu contraseña.',
    { title: 'Recuperar contraseña', placeholder: 'tu@correo.com', confirmLabel: 'Enviar', icon: 'mail' }
  );
  if (!email?.trim()) return;

  const { error } = await _sb.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'reset-password.html'
  });

  if (error) {
    await ExaryDialog.alert(`Error: ${error.message}`, { title: 'Error', tone: 'warn' });
  } else {
    await ExaryDialog.alert(
      `Te enviamos un correo a <strong>${email}</strong>. Revisa tu bandeja de entrada y spam.`,
      { title: 'Correo enviado', icon: 'check' }
    );
  }
});
