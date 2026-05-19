/* ═══════════════════════════════════════════════
   EXARY HQ — Documentos
═══════════════════════════════════════════════ */

let currentFilter = 'todos';
let currentView   = 'grid';

function uid()  { return crypto.randomUUID(); }
function fmt(b) { return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'; }

function toast(m, icon='check') {
  const t = document.getElementById('toast');
  t.innerHTML = `${ExaryIcons[icon]}<span>${m}</span>`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function docCatTag(nombre) {
  if (!nombre) return '';
  const cat   = ExaryState.getCategoriaByNombre(nombre);
  const color = cat?.color || '#6c8ef7';
  return `<span class="tag cat-tag" style="background:${color}20;color:${color};border-color:${color}40">
    <span class="cat-dot" style="background:${color}"></span>${nombre}</span>`;
}

function diffTag(dificultad) {
  if (!dificultad) return '';
  const color = ExaryState.DIFF_COLOR[dificultad] || '#6c8ef7';
  return `<span class="tag" style="background:${color}18;color:${color};border-color:${color}35">${dificultad}</span>`;
}

function render() {
  const list   = document.getElementById('docsList');
  const search = document.getElementById('searchInput').value.toLowerCase();
  let docs = ExaryState.documents;

  if (currentFilter !== 'todos') docs = docs.filter(d => d.ext === currentFilter);
  if (search) docs = docs.filter(d =>
    d.nombre.toLowerCase().includes(search) || (d.categoria||'').toLowerCase().includes(search)
  );

  list.className = 'docs-grid' + (currentView === 'list' ? ' list-mode' : '');

  if (!docs.length) {
    list.innerHTML = `<div class="empty-docs">${ExaryIcons.documents}<p>Sin documentos</p></div>`;
    return;
  }

  list.innerHTML = docs.map(d => `
    <div class="doc-card" data-id="${d.id}">
      <div class="doc-card-top">
        <div class="doc-type-icon">${ExaryIcons.forExt(d.ext)}</div>
        <div>
          <div class="doc-name">${d.nombre}</div>
          <div class="doc-ext-tag">.${d.ext.toUpperCase()}</div>
        </div>
      </div>
      <div class="doc-meta">
        <span>${fmt(d.size)}</span>
        <span>${d.fecha}</span>
        ${docCatTag(d.categoria)}
        ${diffTag(d.dificultad)}
        ${d.fechaEntrega ? `<span class="tag tag-purple">📅 ${d.fechaEntrega}</span>` : ''}
      </div>
      ${d.resumen ? `<div class="doc-resumen">${d.resumen}</div>` : ''}
      <div class="doc-actions">
        <button class="doc-action-btn edit-doc" data-id="${d.id}">${ExaryIcons.edit}<span>Editar</span></button>
        <button class="doc-action-btn chat" data-id="${d.id}">${ExaryIcons.bot}<span>Chat IA</span></button>
        <button class="doc-action-btn del"  data-id="${d.id}">${ExaryIcons.trash}</button>
      </div>
    </div>`).join('');

  list.querySelectorAll('.edit-doc').forEach(btn => btn.addEventListener('click', () => {
    editDocument(btn.dataset.id);
  }));

  list.querySelectorAll('.chat').forEach(btn => btn.addEventListener('click', () => {
    localStorage.setItem('exary_activeDoc', btn.dataset.id);
    window.location.href = 'chat.html';
  }));

  list.querySelectorAll('.del').forEach(btn => btn.addEventListener('click', async () => {
    const doc = ExaryState.getDocument(btn.dataset.id);
    if (!doc) return;
    const ok = await ExaryDialog.confirm(
      `Esto eliminará permanentemente <strong>${doc.nombre}.${doc.ext}</strong> y su historial de chat.`,
      { title: `¿Eliminar "${doc.nombre}"?`, confirmLabel: 'Eliminar', icon: 'trash', tone: 'danger' }
    );
    if (!ok) return;
    ExaryState.deleteDocument(btn.dataset.id);
    localStorage.removeItem(`_exary_doc_${btn.dataset.id}`);
    localStorage.removeItem(`_exary_api_${btn.dataset.id}`);
    toast('Documento eliminado', 'trash');
    render();
  }));
}

/* ── Editar documento ── */
async function editDocument(id) {
  const doc = ExaryState.getDocument(id);
  if (!doc) return;

  const cats = ExaryState.categorias;
  const catOptions = cats.map(c => {
    const sel = c.nombre === doc.categoria ? 'selected' : '';
    return `<option value="${c.nombre}" ${sel}>${c.nombre}</option>`;
  }).join('');

  const body = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <label style="font-size:12px;color:var(--muted)">Nombre
        <input id="editDocName" type="text" value="${(doc.nombre||'').replace(/"/g,'&quot;')}"
          style="width:100%;margin-top:4px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);font-size:13px;outline:none">
      </label>
      <label style="font-size:12px;color:var(--muted)">Fecha de subida
        <input id="editDocFecha" type="text" value="${doc.fecha || ''}" placeholder="DD/MM/YYYY"
          style="width:100%;margin-top:4px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);font-size:13px;outline:none">
      </label>
      <label style="font-size:12px;color:var(--muted)">Fecha de entrega
        <input id="editDocEntrega" type="date" value="${doc.fechaEntrega || ''}"
          style="width:100%;margin-top:4px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);font-size:13px;outline:none;color-scheme:dark">
      </label>
      <label style="font-size:12px;color:var(--muted)">Categoría
        <select id="editDocCat"
          style="width:100%;margin-top:4px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);font-size:13px;outline:none;appearance:auto">
          <option value="">Sin categoría</option>
          ${catOptions}
        </select>
      </label>
    </div>`;

  const result = await ExaryDialog._build({
    title: `Editar "${doc.nombre}"`,
    body,
    icon: 'edit',
    tone: 'default',
    actions: [
      { label: 'Cancelar', action: 'cancel', variant: 'ghost' },
      { label: 'Guardar', action: 'save', variant: 'primary', icon: 'check' }
    ],
    onMount: {
      getValue() {
        return {
          nombre:       document.querySelector('#editDocName')?.value.trim() || '',
          fecha:        document.querySelector('#editDocFecha')?.value.trim() || '',
          fechaEntrega: document.querySelector('#editDocEntrega')?.value || null,
          categoria:    document.querySelector('#editDocCat')?.value || null
        };
      },
      afterRender(root) {
        const inp = root.querySelector('#editDocName');
        if (inp) { inp.focus(); inp.select(); }
      }
    }
  });

  if (result.action !== 'save' || !result.value?.nombre) return;

  ExaryState.updateDocument(id, result.value);
  toast('Documento actualizado');
  render();
}

/* ── Upload + Análisis IA — 100% defensivo ── */
async function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf','docx','odt','txt'].includes(ext)) {
    await ExaryDialog.alert('Solo se aceptan PDF, DOCX, ODT y TXT.',
      { title: 'Formato no soportado', icon: 'close', tone: 'warn' });
    return;
  }

  const cat = await ExaryDialog.selectCategory();

  const progress    = document.getElementById('uploadProgress');
  const bar         = document.getElementById('progressBar');
  const statusLabel = document.getElementById('uploadStatus');
  progress.style.display = 'block';
  bar.style.width = '0%';

  const setStatus = t => { if (statusLabel) statusLabel.textContent = t; };
  const docId = uid();

  console.log('[handleFile] START', { name: file.name, ext, docId, size: file.size });

  // Construir doc base ANTES de operaciones que podrían fallar
  const doc = {
    id:              docId,
    nombre:          file.name.replace(/\.[^.]+$/, ''),
    ext,
    size:            file.size,
    fecha:           new Date().toLocaleDateString('es-ES'),
    categoria:       cat || null,
    resumen:         null,
    dificultad:      null,
    fechaEntrega:    null,
    complejidadScore: 0.5,
    storagePath:     null
  };

  let analysis = null;
  let analysisError = null;

  try {
    setStatus('Subiendo archivo...');
    await animateBar(bar, 0, 40, 400);

    // 1. Extracción local para chat (no crítico)
    setStatus('Procesando documento...');
    try {
      await ExaryAI.storeDocContent(file, docId);
      console.log('[handleFile] storeDocContent OK');
    } catch (e) {
      console.warn('[handleFile] storeDocContent failed:', e);
    }
    await animateBar(bar, 40, 55, 200);

    // 2. Storage (no crítico — si falla, sigue funcionando local)
    if (window.ExaryDB?._online) {
      setStatus('Guardando en la nube...');
      try {
        doc.storagePath = await ExaryDB.uploadFile(file, docId, ext);
        console.log('[handleFile] uploadFile OK', doc.storagePath);
      } catch (e) {
        console.warn('[handleFile] uploadFile failed:', e);
      }
    } else {
      console.warn('[handleFile] ExaryDB not online, skipping storage');
    }
    await animateBar(bar, 55, 65, 200);

    // 3. Análisis IA (no crítico)
    setStatus('Analizando con IA...');
    try {
      analysis = await ExaryAI.analyzeDocument(file, docId);
      console.log('[handleFile] analyzeDocument OK', analysis ? 'parsed' : 'null');
    } catch (e) {
      console.warn('[handleFile] analyzeDocument failed:', e);
      analysisError = e;
    }
    await animateBar(bar, 65, 90, 300);

    // 4. Aplicar resultados del análisis (si los hay)
    if (analysis) {
      doc.resumen          = analysis.resumen || null;
      doc.dificultad       = analysis.dificultad || null;
      doc.fechaEntrega     = analysis.fecha_limite || null;
      doc.complejidadScore = ExaryState.DIFF_SCORE[analysis.dificultad] || 0.5;

      if (!doc.categoria && analysis.categoria_sugerida) {
        const suggested = analysis.categoria_sugerida;
        if (!ExaryState.getCategoriaByNombre(suggested)) {
          ExaryState.addCategoria({
            id: uid(),
            nombre: suggested,
            color: ExaryState.randomCatColor()
          });
        }
        doc.categoria = suggested;
      }
    }

    // 5. SIEMPRE guardar el documento, pase lo que pase arriba
    ExaryState.addDocument(doc);
    console.log('[handleFile] addDocument OK');

    // 6. Actividades generadas por IA
    if (analysis?.actividades?.length) {
      const today = new Date();
      analysis.actividades.forEach(a => {
        try {
          const due = new Date(today);
          due.setDate(today.getDate() + (a.dias_desde_hoy || analysis.trd_dias || 7));
          ExaryState.addActividad({
            id:               uid(),
            nombre:           a.nombre,
            categoria:        doc.categoria || null,
            fechaEntrega:     due.toISOString().split('T')[0],
            fechaCreacion:    new Date().toISOString(),
            completada:       false,
            generadaPorIA:    true,
            complejidad:      a.complejidad || 'Media',
            complejidadScore: ExaryState.calcScore(a.complejidad, due.toISOString().split('T')[0])
          });
        } catch (e) {
          console.warn('[handleFile] addActividad failed:', e);
        }
      });
    }

    await animateBar(bar, 90, 100, 200);

    setTimeout(() => {
      progress.style.display = 'none';
      bar.style.width = '0%';
      setStatus('');
      const actCount = analysis?.actividades?.length || 0;
      const diffText = doc.dificultad ? ` · ${doc.dificultad}` : '';

      if (analysisError) {
        toast(`Subido sin análisis IA (sin créditos o error)`, 'warn');
      } else if (actCount) {
        toast(`Subido${diffText} · ${actCount} actividades creadas`);
      } else {
        toast(`Documento subido${diffText}`);
      }
      render();
    }, 300);

  } catch (e) {
    console.error('[handleFile] CRITICAL ERROR:', e);
    // Aún así, guardar el documento con datos básicos
    try {
      ExaryState.addDocument(doc);
      console.log('[handleFile] Saved doc despite error');
    } catch (e2) {
      console.error('[handleFile] addDocument also failed:', e2);
    }

    progress.style.display = 'none';
    bar.style.width = '0%';
    setStatus('');
    await ExaryDialog.alert(
      `El documento se guardó pero hubo un error: ${e.message || 'desconocido'}. Revisa la consola.`,
      { title: 'Error parcial', icon: 'warn', tone: 'warn' }
    );
    render();
  }
}

function animateBar(bar, from, to, ms) {
  return new Promise(res => {
    const steps = 20, step = (to - from) / steps;
    let cur = from;
    const iv = setInterval(() => {
      cur += step; bar.style.width = Math.min(cur, to) + '%';
      if (cur >= to) { clearInterval(iv); res(); }
    }, ms / steps);
  });
}

/* ── Event listeners ── */
document.getElementById('fileInput').addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
  e.target.value = '';
});
const zone = document.getElementById('uploadZone');
zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
zone.addEventListener('drop', e => {
  e.preventDefault(); zone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
zone.addEventListener('click', () => document.getElementById('fileInput').click());

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});
document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('viewGrid').addEventListener('click', () => {
  currentView = 'grid';
  document.getElementById('viewGrid').classList.add('active');
  document.getElementById('viewList').classList.remove('active');
  render();
});
document.getElementById('viewList').addEventListener('click', () => {
  currentView = 'list';
  document.getElementById('viewList').classList.add('active');
  document.getElementById('viewGrid').classList.remove('active');
  render();
});

window.addEventListener('exary:ready', render);
window.addEventListener('exary:state-changed', render);
render();
