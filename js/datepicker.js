/* ═══════════════════════════════════════════════
   EXARY HQ — Custom Date Picker
═══════════════════════════════════════════════ */

const SVG_PREV = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const SVG_NEXT = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
const SVG_CAL  = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

class ExaryDatePicker {
  constructor(container, opts = {}) {
    this.container   = container;
    this.value       = opts.value || null;
    this.placeholder = opts.placeholder || 'Sin fecha';
    this.onChange    = opts.onChange || (() => {});
    this._now        = new Date();
    this._viewing    = this.value ? new Date(this.value + 'T00:00:00') : new Date();
    this._open       = false;
    this._render();
    document.addEventListener('click', e => {
      if (this._open && !this.container.contains(e.target)) this._close();
    });
    document.addEventListener('keydown', e => {
      if (this._open && e.key === 'Escape') this._close();
    });
  }

  getValue() { return this.value; }

  setValue(v) {
    this.value = v;
    if (v) this._viewing = new Date(v + 'T00:00:00');
    this._updateTrigger();
  }

  clear() { this.setValue(null); this.onChange(null); }

  _render() {
    this.container.innerHTML = `
      <div class="exdp">
        <button class="exdp-trigger" type="button"></button>
        <div class="exdp-popup" hidden></div>
      </div>`;
    this._trigger = this.container.querySelector('.exdp-trigger');
    this._popup   = this.container.querySelector('.exdp-popup');
    this._trigger.addEventListener('click', e => {
      e.stopPropagation();
      this._open ? this._close() : this._openPicker();
    });
    this._updateTrigger();
  }

  _updateTrigger() {
    if (this.value) {
      const [y, m, d] = this.value.split('-');
      const fmt = new Date(+y, +m - 1, +d)
        .toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      this._trigger.innerHTML = `${SVG_CAL}<span>${fmt}</span>`;
      this._trigger.classList.remove('is-placeholder');
    } else {
      this._trigger.innerHTML = `${SVG_CAL}<span>${this.placeholder}</span>`;
      this._trigger.classList.add('is-placeholder');
    }
  }

  _openPicker() {
    this._open = true;
    this._popup.hidden = false;
    this._renderCalendar();
  }

  _close() {
    this._open = false;
    this._popup.hidden = true;
  }

  _renderCalendar() {
    const y  = this._viewing.getFullYear();
    const m  = this._viewing.getMonth();
    const now = this._now;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const firstDay    = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const monthLabel  = new Date(y, m, 1)
      .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    let cells = '';
    for (let i = 0; i < firstDay; i++)
      cells += `<div class="exdp-cell"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      cells += `<button class="exdp-cell exdp-day${ds===todayStr?' today':''}${ds===this.value?' sel':''}"
                  data-date="${ds}" type="button">${d}</button>`;
    }

    this._popup.innerHTML = `
      <div class="exdp-nav-row">
        <button class="exdp-nav-btn" data-dir="-1" type="button">${SVG_PREV}</button>
        <span class="exdp-month-label">${monthLabel}</span>
        <button class="exdp-nav-btn" data-dir="1" type="button">${SVG_NEXT}</button>
      </div>
      <div class="exdp-wdays">
        ${['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d=>`<span>${d}</span>`).join('')}
      </div>
      <div class="exdp-grid">${cells}</div>
      <div class="exdp-foot">
        <button class="exdp-btn-clear" type="button">Limpiar</button>
        <button class="exdp-btn-today" type="button">Hoy</button>
      </div>`;

    this._popup.querySelectorAll('.exdp-nav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this._viewing.setMonth(this._viewing.getMonth() + parseInt(btn.dataset.dir));
        this._renderCalendar();
      });
    });

    this._popup.querySelectorAll('.exdp-day').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.value = btn.dataset.date;
        this._updateTrigger();
        this._close();
        this.onChange(this.value);
      });
    });

    this._popup.querySelector('.exdp-btn-clear').addEventListener('click', e => {
      e.stopPropagation();
      this.clear();
      this._close();
    });

    this._popup.querySelector('.exdp-btn-today').addEventListener('click', e => {
      e.stopPropagation();
      this.value = todayStr;
      this._viewing = new Date();
      this._updateTrigger();
      this._close();
      this.onChange(this.value);
    });
  }
}
