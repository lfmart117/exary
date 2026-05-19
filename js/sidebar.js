/* ═══════════════════════════════════════════════
   EXARY HQ — Sidebar (con FAB móvil)
═══════════════════════════════════════════════ */

function injectSidebar(activePage) {
  const user     = ExaryState.user;
  const initials = (user.nombre || 'US').slice(0, 2).toUpperCase();

  const nav = [
    { href: 'dashboard.html',  icon: 'dashboard',  label: 'Dashboard',   id: 'dashboard'  },
    { href: 'documentos.html', icon: 'documents',  label: 'Documentos',  id: 'documentos' },
    { href: 'chat.html',       icon: 'chat',       label: 'Chat con IA', id: 'chat'       },
    { href: 'agenda.html',     icon: 'agenda',     label: 'Agenda',      id: 'agenda'     }
  ];

  const navHTML = nav.map(n => `
    <a href="${n.href}" class="nav-item ${n.id === activePage ? 'active' : ''}">
      ${ExaryIcons[n.icon]}<span>${n.label}</span>
    </a>`).join('');

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <img src="assets/logo.png" alt="Exary HQ" class="brand-logo">
      <span class="brand-name">Exary</span>
    </div>
    <nav class="nav-links">${navHTML}</nav>
    <div class="sidebar-footer">
      <div class="user-row">
        <div class="user-avatar">
          ${user.foto ? `<img src="${user.foto}" alt=""/>` : initials}
        </div>
        <div class="user-info">
          <div class="user-name">${user.nombre || 'Usuario'}</div>
          <div class="user-email">${user.email || ''}</div>
        </div>
      </div>
      <button class="btn-sb" id="settingsBtn">
        ${ExaryIcons.more}<span>Ajustes</span>
      </button>
      <button class="btn-sb danger" id="logoutBtn">
        ${ExaryIcons.logout}<span>Cerrar sesión</span>
      </button>
    </div>`;

  // FAB hamburger (solo visible en móvil via CSS)
  const fab = document.createElement('button');
  fab.className = 'mobile-menu-fab';
  fab.setAttribute('aria-label', 'Abrir menú');
  fab.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
    <line x1="4" y1="7"  x2="20" y2="7"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="17" x2="20" y2="17"/>
  </svg>`;

  // Overlay para cerrar al tocar fuera
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';

  document.body.insertBefore(sidebar, document.body.firstChild);
  document.body.insertBefore(overlay, document.body.firstChild);
  document.body.insertBefore(fab, document.body.firstChild);

  const closeSidebar = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  };
  const openSidebar = () => {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
  };

  fab.addEventListener('click', e => {
    e.stopPropagation();
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);

  // Cerrar al tocar un link de navegación
  sidebar.querySelectorAll('.nav-item').forEach(a =>
    a.addEventListener('click', closeSidebar)
  );

  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    closeSidebar();
    ExarySettings?.open();
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await ExaryDB.logout();
  });

  // Re-render sidebar header on user state changes (profile edits)
  window.addEventListener('exary:ready', () => {
    const u = ExaryState.user;
    const av = sidebar.querySelector('.user-avatar');
    const nm = sidebar.querySelector('.user-name');
    const em = sidebar.querySelector('.user-email');
    if (av) av.innerHTML = u.foto ? `<img src="${u.foto}" alt=""/>` : (u.nombre || 'US').slice(0,2).toUpperCase();
    if (nm) nm.textContent = u.nombre || 'Usuario';
    if (em) em.textContent = u.email || '';
  });
}
