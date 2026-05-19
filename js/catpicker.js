/* ═══════════════════════════════════════════════
   EXARY HQ — CatPicker (global, shared)
═══════════════════════════════════════════════ */
class CatPicker {
  constructor(container, { onChange, onNew } = {}) {
    this.container = container;
    this.value     = null;
    this.onChange  = onChange || (() => {});
    this.onNew     = onNew   || (() => {});
    this._open     = false;
    this._render();
    document.addEventListener('click', e => {
      if (this._open && !this.container.contains(e.target)) this._close();
    });
    document.addEventListener('keydown', e => {
      if (this._open && e.key === 'Escape') this._close();
    });
  }

  getValue() { return this.value; }
  reset()    { this.value = null; this._renderTrigger(); }

  _render() {
    this.container.innerHTML = `
      <div class="catpick">
        <button class="catpick-trigger" type="button"></button>
        <div class="catpick-menu" hidden></div>
      </div>`;
    this._trigger = this.container.querySelector('.catpick-trigger');
    this._menu    = this.container.querySelector('.catpick-menu');
    this._trigger.addEventListener('click', e => {
      e.stopPropagation();
      this._open ? this._close() : this._openMenu();
    });
    this._renderTrigger();
  }

  _renderTrigger() {
    const cat = ExaryState.getCategoriaByNombre(this.value);
    if (cat) {
      this._trigger.innerHTML = `<span class="catpick-dot" style="background:${cat.color}"></span><span>${cat.nombre}</span>`;
      this._trigger.classList.remove('is-placeholder');
    } else {
      this._trigger.innerHTML = `<span class="catpick-ph">Sin categoría</span>`;
      this._trigger.classList.add('is-placeholder');
    }
  }

  _renderMenu() {
    const cats = ExaryState.categorias;
    let html = `<button class="catpick-item" data-val="" type="button">
      <span class="catpick-none-dot"></span><span>Sin categoría</span>
    </button>`;
    html += cats.map(c => `
      <button class="catpick-item${this.value === c.nombre ? ' active' : ''}" data-val="${c.nombre}" type="button">
        <span class="catpick-dot" style="background:${c.color}"></span>
        <span>${c.nombre}</span>
        ${this.value === c.nombre ? `<span class="catpick-ck">${ExaryIcons.check}</span>` : ''}
      </button>`).join('');
    html += `<div class="catpick-divider"></div>
      <button class="catpick-item catpick-new-btn" type="button">
        <span class="catpick-plus">＋</span><span>Nueva categoría...</span>
      </button>`;
    this._menu.innerHTML = html;

    this._menu.querySelectorAll('[data-val]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.value = btn.dataset.val || null;
        this._renderTrigger();
        this._close();
        this.onChange(this.value);
      });
    });

    this._menu.querySelector('.catpick-new-btn').addEventListener('click', async e => {
      e.stopPropagation();
      this._close();
      await this.onNew();
    });
  }

  _openMenu() { this._open = true; this._menu.hidden = false; this._renderMenu(); }
  _close()    { this._open = false; this._menu.hidden = true; }
}
