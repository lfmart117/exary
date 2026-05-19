/* ═══════════════════════════════════════════════
   EXARY HQ — Agenda
═══════════════════════════════════════════════ */

let filter     = 'todas';
let _editingId = null;

function uid() { return crypto.randomUUID(); }
function toast(m, icon='check') {
  const t = document.getElementById('toast');
  t.innerHTML = `${ExaryIcons[icon]}<span>${m}</span>`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/* ── Solo una etiqueta: urgencia calculada ── */
function urgencyTag(complejidad, fechaEntrega) {
  if (!complejidad) return '';
  const score = ExaryState.calcScore(complejidad, fechaEntrega);
  if (score > 0.08) return '<span class="tag tag-red">Crítica</span>';
  if (score > 0.03) return '<span class="tag tag-orange">Alta</span>';
  if (score > 0.01) return '<span class="tag tag-yellow">Media</span>';
  return '<span class="tag tag-green">Baja</span>';
}
function catTag(nombre) {
  if (!nombre) return '';
  const cat   = ExaryState.getCategoriaByNombre(nombre);
  const color = cat?.color || '#6c8ef7';
  return `<span class="tag cat-tag" style="background:${color}20;color:${color};border-color:${color}40">
    <span class="cat-dot" style="background:${color}"></span>${nombre}</span>`;
}

/* ══ DifficultyPicker ══ */
const DIFF_OPTIONS = [
  { value: '',        label: 'Sin especificar', color: '#8b8d9a', dot: false },
  { value: 'Fácil',  label: 'Fácil',           color: '#34d399' },
  { value: 'Media',  label: 'Media',            color: '#fb923c' },
  { value: 'Alta',   label: 'Alta',             color: '#f87171' },
  { value: 'Difícil',label: 'Difícil',          color: '#a78bfa' }
];

class DifficultyPicker {
  constructor(container) {
    this.container = container;
    this.value     = '';
    this._open     = false;
    this._render();
    document.addEventListener('click', e => {
      if (this._open && !this.container.contains(e.target)) this._close();
    });
  }

  getValue() { return this.value; }

  setValue(v) { this.value = v || ''; this._renderTrigger(); }

  reset() { this.setValue(''); }

  _render() {
    this.container.innerHTML = `
      <div class="diffpick">
        <button class="diffpick-trigger" type="button"></button>
        <div class="diffpick-menu" hidden></div>
      </div>`;
    this._trigger = this.container.querySelector('.diffpick-trigger');
    this._menu    = this.container.querySelector('.diffpick-menu');
    this._trigger.addEventListener('click', e => {
      e.stopPropagation();
      this._open ? this._close() : this._openMenu();
    });
    this._renderTrigger();
  }

  _renderTrigger() {
    const opt = DIFF_OPTIONS.find(o => o.value === this.value) || DIFF_OPTIONS[0];
    if (this.value) {
      this._trigger.innerHTML = `<span class="diffpick-dot" style="background:${opt.color}"></span><span>${opt.label}</span>`;
      this._trigger.classList.remove('is-placeholder');
    } else {
      this._trigger.innerHTML = `<span class="diffpick-ph">Sin especificar</span>`;
      this._trigger.classList.add('is-placeholder');
    }
  }

  _openMenu() {
    this._open = true;
    this._menu.hidden = false;
    this._menu.innerHTML = DIFF_OPTIONS.map(o => `
      <button class="diffpick-item${this.value === o.value ? ' active' : ''}" data-val="${o.value}" type="button">
        ${o.value
          ? `<span class="diffpick-dot" style="background:${o.color}"></span>`
          : `<span class="diffpick-none-dot"></span>`}
        <span>${o.label}</span>
        ${this.value === o.value ? `<span class="diffpick-ck">${ExaryIcons.check}</span>` : ''}
      </button>`).join('');

    this._menu.querySelectorAll('[data-val]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.value = btn.dataset.val;
        this._renderTrigger();
        this._close();
      });
    });
  }

  _close() { this._open = false; this._menu.hidden = true; }
}

/* ── Modal ── */
function openModal(act = null) {
  _editingId = act?.id || null;
  const isEdit = !!act;

  document.querySelector('.modal-title').textContent = isEdit ? 'Editar actividad' : 'Nueva actividad';
  document.querySelector('#saveTask span').textContent = isEdit ? 'Guardar cambios' : 'Crear actividad';

  document.getElementById('taskName').value = act?.nombre || '';
  _datePicker.setValue(act?.fechaEntrega || null);
  _catPicker.value = act?.categoria || null;
  _catPicker._renderTrigger();
  _diffPicker.setValue(act?.complejidad || '');

  document.getElementById('modalOverlay').style.display = 'flex';
  document.getElementById('taskName').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  _editingId = null;
}

/* ── Render ── */
function render() {
  let acts = ExaryState.actividades;
  if (filter === 'pendientes')  acts = acts.filter(a => !a.completada);
  if (filter === 'completadas') acts = acts.filter(a =>  a.completada);

  const list = document.getElementById('taskList');
  if (!acts.length) {
    list.innerHTML = `<div class="empty-agenda">${ExaryIcons.agenda}<p>Sin actividades</p></div>`;
    return;
  }

  list.innerHTML = acts.map(a => `
    <div class="task-card ${a.completada ? 'done' : ''}" data-id="${a.id}">
      <div class="task-check ${a.completada ? 'checked' : ''}" data-id="${a.id}">${a.completada ? ExaryIcons.check : ''}</div>
      <div class="task-body">
        <div class="task-name-big">${a.nombre}</div>
        <div class="task-tags">
          ${urgencyTag(a.complejidad, a.fechaEntrega)}
          ${catTag(a.categoria)}
          ${a.fechaEntrega ? `<span class="tag tag-purple">${a.fechaEntrega}</span>` : ''}
          ${a.generadaPorIA ? '<span class="tag tag-purple">IA</span>' : ''}
        </div>
      </div>
      <div class="task-card-actions">
        <button class="task-edit" data-id="${a.id}" title="Editar">${ExaryIcons.edit}</button>
        <button class="task-del"  data-id="${a.id}" title="Eliminar">${ExaryIcons.trash}</button>
      </div>
    </div>`).join('');

  list.querySelectorAll('.task-check').forEach(el => {
    el.addEventListener('click', () => { ExaryState.toggleActividad(el.dataset.id); render(); });
  });
  list.querySelectorAll('.task-edit').forEach(el => {
    el.addEventListener('click', () => {
      const act = ExaryState.actividades.find(a => a.id === el.dataset.id);
      if (act) openModal(act);
    });
  });
  list.querySelectorAll('.task-del').forEach(el => {
    el.addEventListener('click', async () => {
      const act = ExaryState.actividades.find(a => a.id === el.dataset.id);
      if (!act) return;
      const ok = await ExaryDialog.confirm(
        `Esta actividad se eliminará permanentemente.`,
        { title: `¿Eliminar "${act.nombre}"?`, confirmLabel: 'Eliminar', icon: 'trash', tone: 'danger' }
      );
      if (!ok) return;
      ExaryState.deleteActividad(el.dataset.id);
      toast('Actividad eliminada', 'trash');
      render();
    });
  });
}

/* ── Filtros ── */
document.querySelectorAll('.agenda-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.agenda-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  });
});

document.getElementById('newTaskBtn').addEventListener('click', () => openModal(null));
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

/* ── Guardar ── */
document.getElementById('saveTask').addEventListener('click', () => {
  const nombre      = document.getElementById('taskName').value.trim();
  if (!nombre) return;
  const complejidad  = _diffPicker.getValue() || null;
  const fechaEntrega = _datePicker.getValue() || null;
  const categoria    = _catPicker.getValue()  || null;

  if (_editingId) {
    const fields = { nombre, complejidad, fechaEntrega, categoria,
      complejidadScore: ExaryState.calcScore(complejidad, fechaEntrega) };
    ExaryState.updateActividad(_editingId, fields);
    toast('Actividad actualizada');
  } else {
    ExaryState.addActividad({
      id: uid(), nombre, fechaEntrega, categoria,
      fechaCreacion: new Date().toISOString(),
      completada: false, generadaPorIA: false,
      complejidad, complejidadScore: ExaryState.calcScore(complejidad, fechaEntrega)
    });
    toast('Actividad creada');
  }

  closeModal();
  document.getElementById('taskName').value = '';
  render();
});

/* ── Pickers ── */
let _datePicker, _catPicker, _diffPicker;

function initPickers() {
  _datePicker = new ExaryDatePicker(
    document.getElementById('taskDateWrap'),
    { placeholder: 'Sin fecha de entrega' }
  );
  _catPicker = new CatPicker(
    document.getElementById('taskCatWrap'),
    {
      onNew: async () => {
        const result = await ExaryDialog.categoryDialog();
        if (result?.nombre) {
          if (!ExaryState.getCategoriaByNombre(result.nombre))
            ExaryState.addCategoria({ id: uid(), nombre: result.nombre, color: result.color });
          _catPicker.value = result.nombre;
          _catPicker._renderTrigger();
        }
      }
    }
  );
  _diffPicker = new DifficultyPicker(document.getElementById('taskDiffWrap'));
}

window.addEventListener('exary:ready', render);
window.addEventListener('exary:state-changed', render);
initPickers();
render();
