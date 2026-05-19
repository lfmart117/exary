/* ═══════════════════════════════════════════════
   EXARY HQ — Notificaciones globales de IA
═══════════════════════════════════════════════ */

const ExaryNotify = (() => {
  let _container = null;
  let _pending   = [];
  let _timer     = null;

  function init() {
    _container = document.createElement('div');
    _container.id = 'ai-notify-root';
    document.body.appendChild(_container);

    window.addEventListener('exary:activity-created', e => {
      _pending.push(e.detail);
      clearTimeout(_timer);
      // Agrupar actividades creadas en un solo 500ms
      _timer = setTimeout(flush, 500);
    });
  }

  function flush() {
    if (!_pending.length) return;
    const acts = [..._pending];
    _pending = [];
    show(acts);
  }

  function show(acts) {
    const n   = document.createElement('div');
    n.className = 'ai-notif';

    const listHtml = acts.map(a =>
      `<div class="ai-notif-item"><span class="ai-notif-dot"></span><span>${a.nombre}</span></div>`
    ).join('');

    n.innerHTML = `
      <div class="ai-notif-head">
        <div class="ai-notif-icon">${ExaryIcons.bot}</div>
        <div>
          <div class="ai-notif-title">Exary creó ${acts.length} actividad${acts.length !== 1 ? 'es' : ''}</div>
          <div class="ai-notif-sub">añadidas a tu agenda</div>
        </div>
        <button class="ai-notif-close">${ExaryIcons.close}</button>
      </div>
      <div class="ai-notif-list">${listHtml}</div>
      <a href="agenda.html" class="ai-notif-link">Ver Agenda →</a>`;

    n.querySelector('.ai-notif-close').addEventListener('click', () => dismiss(n));
    _container.appendChild(n);

    requestAnimationFrame(() => n.classList.add('visible'));
    setTimeout(() => dismiss(n), 7000);
  }

  function dismiss(n) {
    n.classList.remove('visible');
    n.classList.add('hiding');
    setTimeout(() => n.remove(), 350);
  }

  init();
})();
