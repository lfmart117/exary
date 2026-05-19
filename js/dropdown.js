/* ═══════════════════════════════════════════════
   EXARY HQ — Custom Dropdown
   Replace native <select> with a styled dropdown.
═══════════════════════════════════════════════ */

class ExaryDropdown {
  constructor(container, opts = {}) {
    this.container   = container;
    this.placeholder = opts.placeholder || '— Selecciona —';
    this.icon        = opts.icon || 'documents';
    this.options     = opts.options || [];
    this.value       = opts.value || null;
    this.onChange    = opts.onChange || (() => {});
    this.emptyText   = opts.emptyText || 'No hay opciones disponibles';
    this.open        = false;
    this._render();
    this._bindOutside();
  }

  setOptions(options) {
    this.options = options;
    this._renderMenu();
  }

  setValue(value) {
    this.value = value;
    this._renderTrigger();
    this._renderMenu();
  }

  getSelectedOption() {
    return this.options.find(o => o.value === this.value);
  }

  _render() {
    this.container.innerHTML = `
      <div class="exdd">
        <button class="exdd-trigger" type="button"></button>
        <div class="exdd-menu" hidden></div>
      </div>`;
    this.trigger = this.container.querySelector('.exdd-trigger');
    this.menu    = this.container.querySelector('.exdd-menu');

    this.trigger.addEventListener('click', e => {
      e.stopPropagation();
      this.toggle();
    });

    this._renderTrigger();
    this._renderMenu();
  }

  _renderTrigger() {
    const sel = this.getSelectedOption();
    const iconHTML = ExaryIcons[this.icon] || ExaryIcons.documents;
    this.trigger.innerHTML = `
      <span class="exdd-leading">${iconHTML}</span>
      <span class="exdd-value">${sel ? sel.label : this.placeholder}</span>
      <span class="exdd-caret">${ExaryIcons.arrowRight}</span>
    `;
    this.trigger.classList.toggle('placeholder', !sel);
  }

  _renderMenu() {
    if (!this.options.length) {
      this.menu.innerHTML = `
        <div class="exdd-empty">
          ${ExaryIcons[this.icon]}
          <span>${this.emptyText}</span>
        </div>`;
      return;
    }

    this.menu.innerHTML = this.options.map(o => `
      <button class="exdd-item ${o.value === this.value ? 'selected' : ''}" data-value="${o.value}" type="button">
        <span class="exdd-item-icon">${o.icon ? ExaryIcons[o.icon] : ExaryIcons.documents}</span>
        <span class="exdd-item-label">
          <span class="exdd-item-title">${o.label}</span>
          ${o.sublabel ? `<span class="exdd-item-sub">${o.sublabel}</span>` : ''}
        </span>
        ${o.value === this.value ? `<span class="exdd-item-check">${ExaryIcons.check}</span>` : ''}
      </button>
    `).join('');

    this.menu.querySelectorAll('.exdd-item').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.select(btn.dataset.value);
      });
    });
  }

  toggle() {
    this.open ? this.close() : this.openMenu();
  }

  openMenu() {
    if (!this.options.length) return;
    this.open = true;
    this.menu.hidden = false;
    this.container.classList.add('open');
  }

  close() {
    this.open = false;
    this.menu.hidden = true;
    this.container.classList.remove('open');
  }

  select(value) {
    this.setValue(value);
    this.close();
    this.onChange(value, this.getSelectedOption());
  }

  _bindOutside() {
    document.addEventListener('click', e => {
      if (this.open && !this.container.contains(e.target)) this.close();
    });
    document.addEventListener('keydown', e => {
      if (this.open && e.key === 'Escape') this.close();
    });
  }
}
