/* ═══════════════════════════════════════════════
   EXARY HQ — Custom Dialogs (alert, confirm, prompt, categoryDialog, selectCategory)
═══════════════════════════════════════════════ */

const ExaryDialog = {
  _root: null,

  _ensureRoot() {
    if (this._root) return;
    this._root = document.createElement('div');
    this._root.id = 'exary-dialog-root';
    document.body.appendChild(this._root);
  },

  _close() {
    if (!this._root) return;
    const overlay = this._root.querySelector('.dlg-overlay');
    if (!overlay) return;
    overlay.classList.add('closing');
    setTimeout(() => { this._root.innerHTML = ''; }, 180);
  },

  _build({ title, body, icon = 'bot', tone = 'default', actions, onMount }) {
    this._ensureRoot();
    const iconColor = {
      default: 'var(--accent-1)',
      danger:  '#ff8c8c',
      warn:    '#ffb070',
      success: '#5fdba4'
    }[tone] || 'var(--accent-1)';

    this._root.innerHTML = `
      <div class="dlg-overlay">
        <div class="dlg" role="dialog" aria-modal="true">
          <div class="dlg-header">
            <div class="dlg-icon" style="color:${iconColor}">${ExaryIcons[icon] || ExaryIcons.bot}</div>
            <div class="dlg-title">${title}</div>
            <button class="dlg-close" data-action="cancel">${ExaryIcons.close}</button>
          </div>
          <div class="dlg-body">${body}</div>
          <div class="dlg-actions">
            ${actions.map(a => `
              <button class="dlg-btn ${a.variant || 'ghost'}" data-action="${a.action}">
                ${a.icon ? ExaryIcons[a.icon] : ''}
                <span>${a.label}</span>
              </button>`).join('')}
          </div>
        </div>
      </div>`;

    return new Promise(resolve => {
      const overlay = this._root.querySelector('.dlg-overlay');
      const handle = action => {
        const value = onMount?.getValue?.();
        this._close();
        resolve({ action, value });
      };

      this._root.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => handle(btn.dataset.action));
      });

      overlay.addEventListener('click', e => {
        if (e.target === overlay) handle('cancel');
      });

      const escHandler = e => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', escHandler);
          handle('cancel');
        }
      };
      document.addEventListener('keydown', escHandler);

      onMount?.afterRender?.(this._root, handle);
    });
  },

  // ── alert ──
  async alert(message, opts = {}) {
    return this._build({
      title: opts.title || 'Aviso',
      body: `<p>${message}</p>`,
      icon: opts.icon || 'sparkle',
      tone: opts.tone || 'default',
      actions: [
        { action: 'ok', label: 'Aceptar', variant: 'primary', icon: 'check' }
      ]
    });
  },

  // ── confirm ──
  async confirm(message, opts = {}) {
    const result = await this._build({
      title: opts.title || '¿Estás seguro?',
      body: `<p>${message}</p>`,
      icon: opts.icon || 'trash',
      tone: opts.tone || 'danger',
      actions: [
        { action: 'cancel', label: 'Cancelar', variant: 'ghost' },
        { action: 'ok',     label: opts.confirmLabel || 'Eliminar', variant: 'danger', icon: 'trash' }
      ]
    });
    return result.action === 'ok';
  },

  // ── prompt ──
  async prompt(message, opts = {}) {
    let inputEl = null;
    const result = await this._build({
      title: opts.title || 'Ingrese un valor',
      body: `
        <p>${message}</p>
        <input type="text" class="dlg-input" id="dlg-input"
          placeholder="${opts.placeholder || ''}"
          value="${opts.default || ''}"/>
      `,
      icon: opts.icon || 'edit',
      tone: 'default',
      actions: [
        { action: 'cancel', label: 'Cancelar', variant: 'ghost' },
        { action: 'ok',     label: opts.confirmLabel || 'Guardar', variant: 'primary', icon: 'check' }
      ],
      onMount: {
        afterRender: (root, handle) => {
          inputEl = root.querySelector('#dlg-input');
          inputEl.focus();
          inputEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') handle('ok');
          });
        },
        getValue: () => inputEl?.value || ''
      }
    });
    return result.action === 'ok' ? result.value : null;
  },

  // ── categoryDialog (crear categoría con color) ──
  async categoryDialog(opts = {}) {
    const PALETTE = ['#6c8ef7','#a78bfa','#f472b6','#fb923c','#34d399',
                     '#38bdf8','#facc15','#f87171','#4ade80','#e879f9','#22d3ee','#fb7185'];
    const defaultColor = opts.color || PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const swatches = PALETTE.map(c =>
      `<button type="button" class="dlg-swatch${c === defaultColor ? ' active' : ''}" data-color="${c}" style="background:${c}" title="${c}"></button>`
    ).join('');

    const result = await this._build({
      title: opts.title || 'Nueva categoría',
      body: `
        <p>Nombre</p>
        <input type="text" class="dlg-input" id="dlg-cat-name"
          placeholder="Ej: Física, Trabajo..."
          value="${opts.default || ''}"/>
        <p style="margin-top:14px;margin-bottom:6px">Color</p>
        <div class="dlg-swatches" id="dlg-swatches">${swatches}</div>
        <input type="hidden" id="dlg-cat-color" value="${defaultColor}"/>
      `,
      icon: 'sparkle',
      tone: 'default',
      actions: [
        { action: 'cancel', label: 'Cancelar', variant: 'ghost' },
        { action: 'ok',     label: 'Crear',    variant: 'primary', icon: 'check' }
      ],
      onMount: {
        afterRender: (root, handle) => {
          const nameEl  = root.querySelector('#dlg-cat-name');
          const colorEl = root.querySelector('#dlg-cat-color');
          nameEl.focus();
          nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') handle('ok'); });
          root.querySelectorAll('.dlg-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
              root.querySelectorAll('.dlg-swatch').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              colorEl.value = btn.dataset.color;
            });
          });
        },
        getValue: () => ({
          nombre: document.querySelector('#dlg-cat-name')?.value?.trim() || '',
          color:  document.querySelector('#dlg-cat-color')?.value || defaultColor
        })
      }
    });
    return result.action === 'ok' ? result.value : null;
  },

  // ── selectCategory (documentos — categorías globales) ──
  async selectCategory() {
    const PALETTE = ['#6c8ef7','#a78bfa','#f472b6','#fb923c','#34d399',
                     '#38bdf8','#facc15','#f87171','#4ade80','#e879f9','#22d3ee','#fb7185'];
    const cats     = ExaryState.categorias;
    const defColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];

    const existingHTML = cats.length
      ? `<div class="dlg-cat-list" id="dlg-cat-list">` +
        cats.map(c =>
          `<button class="dlg-cat-btn" data-name="${c.nombre}" type="button">
             <span class="dlg-cat-dot" style="background:${c.color}"></span>
             <span>${c.nombre}</span>
           </button>`
        ).join('') + `</div>`
      : `<p class="dlg-cats-empty">Sin categorías aún — crea una abajo</p>`;

    const swatches = PALETTE.map(c =>
      `<button type="button" class="dlg-swatch${c===defColor?' active':''}" data-color="${c}" style="background:${c}"></button>`
    ).join('');

    const result = await this._build({
      title: 'Categoría del documento',
      body: `
        ${cats.length ? '<p style="margin-bottom:8px;font-size:12px;color:var(--muted)">Selecciona una existente</p>' : ''}
        ${existingHTML}
        <p style="margin-top:14px;margin-bottom:6px;font-size:12px;color:var(--muted)">O crea una nueva</p>
        <input type="text" class="dlg-input" id="dlg-newcat-name" placeholder="Nombre de categoría..."/>
        <div class="dlg-swatches" style="margin-top:10px">${swatches}</div>
        <input type="hidden" id="dlg-newcat-color" value="${defColor}"/>
        <input type="hidden" id="dlg-selected-name" value=""/>
      `,
      icon: 'sparkle',
      tone: 'default',
      actions: [
        { action: 'cancel', label: 'Omitir',    variant: 'ghost' },
        { action: 'ok',     label: 'Confirmar', variant: 'primary', icon: 'check' }
      ],
      onMount: {
        afterRender: (root) => {
          const selectedEl = root.querySelector('#dlg-selected-name');
          const colorEl    = root.querySelector('#dlg-newcat-color');
          const nameEl     = root.querySelector('#dlg-newcat-name');

          root.querySelectorAll('.dlg-cat-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              root.querySelectorAll('.dlg-cat-btn').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              selectedEl.value = btn.dataset.name;
              nameEl.value = '';
            });
          });

          root.querySelectorAll('.dlg-swatch').forEach(btn => {
            btn.addEventListener('click', () => {
              root.querySelectorAll('.dlg-swatch').forEach(b => b.classList.remove('active'));
              btn.classList.add('active');
              colorEl.value = btn.dataset.color;
            });
          });

          nameEl.addEventListener('input', () => {
            if (nameEl.value.trim()) {
              root.querySelectorAll('.dlg-cat-btn').forEach(b => b.classList.remove('active'));
              selectedEl.value = '';
            }
          });
        },
        getValue: () => ({
          selected: document.querySelector('#dlg-selected-name')?.value || '',
          newName:  document.querySelector('#dlg-newcat-name')?.value?.trim() || '',
          newColor: document.querySelector('#dlg-newcat-color')?.value || defColor
        })
      }
    });

    if (result.action !== 'ok') return null;

    const { selected, newName, newColor } = result.value;

    if (newName) {
      const uid = () => crypto.randomUUID();
      if (!ExaryState.getCategoriaByNombre(newName))
        ExaryState.addCategoria({ id: uid(), nombre: newName, color: newColor });
      return newName;
    }

    return selected || null;
  }
};
