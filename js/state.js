/* ═══════════════════════════════════════════════
   EXARY HQ — State Manager
   localStorage = caché rápida
   Supabase = persistencia real (via ExaryDB)
═══════════════════════════════════════════════ */

const ExaryState = (() => {
  const load = key => JSON.parse(localStorage.getItem(key) || 'null');
  const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));
  const sync = (fn) => { if (window.ExaryDB?._ready) fn().catch(console.error); };
  const emit = (event, detail) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('exary:state-changed', { detail: { event, ...detail } }));
    }
  };

  return {
    user: load('exary_user') || { id: '', nombre: 'Usuario', email: '', foto: null },

    setUser(u) { this.user = u; save('exary_user', u); },
    logout()   { ExaryDB?.logout() || (() => {
      const theme = localStorage.getItem('exary_theme');
      localStorage.clear();
      if (theme) localStorage.setItem('exary_theme', theme);
      window.location.href = 'index.html';
    })(); },

    /* ══ Documentos ══ */
    get documents() { return load('exary_docs') || []; },
    saveDocs(docs)  { save('exary_docs', docs); },

    addDocument(doc) {
      const docs = this.documents;
      docs.unshift(doc);
      this.saveDocs(docs);
      sync(() => ExaryDB.insertDocumento(doc));
      emit('doc-added', { doc });
    },
    updateDocument(id, fields) {
      const docs = this.documents.map(d =>
        d.id === id ? { ...d, ...fields } : d
      );
      this.saveDocs(docs);
      const dbFields = {};
      if (fields.nombre    !== undefined) dbFields.nombre        = fields.nombre;
      if (fields.fecha     !== undefined) dbFields.fecha         = fields.fecha;
      if (fields.categoria !== undefined) dbFields.categoria     = fields.categoria;
      if (fields.fechaEntrega !== undefined) dbFields.fecha_entrega = fields.fechaEntrega;
      if (fields.dificultad   !== undefined) dbFields.dificultad    = fields.dificultad;
      sync(() => ExaryDB.updateDocumento(id, dbFields));
      emit('doc-updated', { id });
    },
    deleteDocument(id) {
      this.saveDocs(this.documents.filter(d => d.id !== id));
      sync(() => ExaryDB.removeDocumento(id));
      emit('doc-deleted', { id });
    },
    getDocument(id) { return this.documents.find(d => d.id === id); },

    /* ══ Chat ══ */
    get chats() { return load('exary_chats') || {}; },
    getChat(key) { return this.chats[key] || []; },

    addMessage(key, msg) {
      const all = this.chats;
      if (!all[key]) all[key] = [];
      all[key].push(msg);
      save('exary_chats', all);
      sync(() => ExaryDB.insertMensaje(key, msg));
      emit('message-added', { key });
    },

    /* ══ Actividades ══ */
    get actividades() { return load('exary_actividades') || []; },
    saveActs(a)       { save('exary_actividades', a); },

    addActividad(a) {
      const acts = this.actividades;
      acts.unshift(a);
      this.saveActs(acts);
      sync(() => ExaryDB.insertActividad(a));
      emit('act-added', { act: a });
    },
    toggleActividad(id) {
      const acts = this.actividades.map(a =>
        a.id === id ? { ...a, completada: !a.completada } : a
      );
      this.saveActs(acts);
      const updated = acts.find(a => a.id === id);
      if (updated) sync(() => ExaryDB.updateActividad(id, { completada: updated.completada }));
      emit('act-toggled', { id });
    },
    updateActividad(id, fields) {
      const acts = this.actividades.map(a =>
        a.id === id ? { ...a, ...fields } : a
      );
      this.saveActs(acts);
      // Map JS camelCase to DB snake_case
      const dbFields = {};
      if (fields.nombre       !== undefined) dbFields.nombre           = fields.nombre;
      if (fields.categoria    !== undefined) dbFields.categoria        = fields.categoria;
      if (fields.fechaEntrega !== undefined) dbFields.fecha_entrega    = fields.fechaEntrega;
      if (fields.complejidad  !== undefined) dbFields.complejidad      = fields.complejidad;
      if (fields.completada   !== undefined) dbFields.completada       = fields.completada;
      if (fields.complejidadScore !== undefined) dbFields.complejidad_score = fields.complejidadScore;
      sync(() => ExaryDB.updateActividad(id, dbFields));
      emit('act-updated', { id });
    },
    deleteActividad(id) {
      this.saveActs(this.actividades.filter(a => a.id !== id));
      sync(() => ExaryDB.removeActividad(id));
      emit('act-deleted', { id });
    },

    /* ══ Categorías ══ */
    get categorias() { return load('exary_categorias') || []; },
    saveCats(cats)   { save('exary_categorias', cats); },

    addCategoria(cat) {
      const cats = this.categorias;
      cats.push(cat);
      this.saveCats(cats);
      sync(() => ExaryDB.insertCategoria(cat));
      emit('cat-added', { cat });
    },
    deleteCategoria(id) {
      this.saveCats(this.categorias.filter(c => c.id !== id));
      sync(() => ExaryDB.removeCategoria(id));
      emit('cat-deleted', { id });
    },
    getCategoriaByNombre(nombre) {
      return this.categorias.find(c => c.nombre === nombre);
    },
    randomCatColor() {
      const palette = ['#6c8ef7','#a78bfa','#f472b6','#fb923c','#34d399',
                       '#38bdf8','#facc15','#f87171','#4ade80','#e879f9','#22d3ee','#fb7185'];
      const used = new Set(this.categorias.map(c => c.color));
      const free = palette.filter(c => !used.has(c));
      const pool = free.length ? free : palette;
      return pool[Math.floor(Math.random() * pool.length)];
    },


    /* ══ Escala de dificultad de documentos ══ */
    DIFF_SCORE: {
      'Fácil':      0.10,
      'Básico':     0.25,
      'Intermedio': 0.45,
      'Difícil':    0.65,
      'Experto':    0.82,
      'Complejo':   1.00
    },

    DIFF_COLOR: {
      'Fácil':      '#34d399',
      'Básico':     '#22d3ee',
      'Intermedio': '#38bdf8',
      'Difícil':    '#fb923c',
      'Experto':    '#f87171',
      'Complejo':   '#a78bfa'
    },

    calcDocScore(dificultad, fechaEntrega) {
      const d = this.DIFF_SCORE[dificultad] || 0;
      const dias = fechaEntrega
        ? Math.max(0, Math.ceil((new Date(fechaEntrega) - new Date()) / 86400000))
        : 999;
      return d / (dias + 1);
    },

    /* ══ Prioridad dinámica (actividades) ══ */
    calcScore(complejidad, fechaEntrega) {
      const compMap = { 'Fácil': 0.25, 'Media': 0.5, 'Alta': 0.75, 'Difícil': 1.0 };
      const c = compMap[complejidad] || 0.3;
      const dias = fechaEntrega
        ? Math.max(0, Math.ceil((new Date(fechaEntrega) - new Date()) / 86400000))
        : 99;
      return c / (dias + 1);
    },

    /* ══ Stats ══ */
    getStats() {
      const docs  = this.documents;
      const acts  = this.actividades;
      const chats = this.chats;
      const total = acts.length;
      const done  = acts.filter(a => a.completada).length;
      const msgs  = Object.values(chats).flat().filter(m => m.role === 'user').length;
      return {
        totalDocs:     docs.length,
        pendientes:    acts.filter(a => !a.completada).length,
        consultas:     msgs,
        pctCompletado: total ? Math.round((done / total) * 100) : 0
      };
    }
  };
})();
