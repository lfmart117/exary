/* ═══════════════════════════════════════════════
   EXARY HQ — Database Layer (Supabase)
   Fail-safe: si Supabase no está disponible,
   la app funciona 100% con localStorage.
═══════════════════════════════════════════════ */

const ExaryDB = {
  _ready:  false,
  _userId: null,
  _online: false,   // true solo si Supabase respondió OK

  async init() {
    // Si Supabase no cargó → modo local, disparar ready igual
    if (!_sb) {
      this._fireReady();
      return;
    }

    try {
      const { data: { session }, error } = await _sb.auth.getSession();

      if (error) throw error;

      if (!session) {
        // Sin sesión y sin caché → login
        const cached = JSON.parse(localStorage.getItem('exary_user') || 'null');
        if (!cached?.id) {
          window.location.href = 'index.html';
          return;
        }
        // Sin sesión pero hay caché (sesión expiró) → login
        window.location.href = 'index.html';
        return;
      }

      // Sesión válida
      this._userId = session.user.id;
      this._ready  = true;
      this._online = true;

      const u = session.user;
      ExaryState.setUser({
        id:     u.id,
        nombre: u.user_metadata?.nombre || u.email.split('@')[0],
        email:  u.email,
        foto:   u.user_metadata?.avatar_url || null
      });

      // Hidratar ajustes (tema, paleta, video) desde la nube
      ExaryTheme.hydrate(u.user_metadata);

      try {
        await this.loadAll();
      } catch (loadErr) {
        console.warn('loadAll falló:', loadErr.message);
      }

    } catch(e) {
      console.warn('Supabase no disponible, usando caché local:', e.message);
      this._showOfflineBadge();
    }

    if (!this._online) this._showOfflineBadge();

    console.log('[ExaryDB] init completo — online:', this._online, '| userId:', this._userId?.slice(0,8));
    this._fireReady();
  },

  _showOfflineBadge() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('exary-offline-badge')) return;
    const ready = () => {
      if (!document.body) { setTimeout(ready, 100); return; }
      const b = document.createElement('div');
      b.id = 'exary-offline-badge';
      b.innerHTML = '⚠ Modo local — Supabase no responde. Datos guardados solo en este navegador. <span style="text-decoration:underline;cursor:pointer" onclick="location.reload()">Reintentar</span>';
      Object.assign(b.style, {
        position: 'fixed', bottom: '12px', left: '50%',
        transform: 'translateX(-50%)', zIndex: '10000',
        background: '#dc2626', color: '#fff',
        padding: '8px 16px', borderRadius: '8px',
        fontSize: '12px', fontWeight: '600',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        fontFamily: 'Ubuntu, sans-serif'
      });
      document.body.appendChild(b);
    };
    ready();
  },

  _fireReady() {
    window.dispatchEvent(new CustomEvent('exary:ready'));
  },

  async loadAll() {
    if (!_sb || !this._userId) return;

    const safeQuery = async (table, order, asc = true) => {
      try {
        const r = await _sb.from(table).select('*').order(order, { ascending: asc });
        if (r.error) {
          console.warn(`loadAll ${table} error:`, r.error.message);
          return [];
        }
        return r.data || [];
      } catch (e) {
        console.warn(`loadAll ${table}:`, e.message || e);
        return [];
      }
    };

    const [catsData, docsData, actsData, msgsData] = await Promise.all([
      safeQuery('categorias', 'created_at', true),
      safeQuery('documentos', 'created_at', false),
      safeQuery('actividades', 'fecha_creacion', false),
      safeQuery('mensajes_chat', 'created_at', true)
    ]);

    // Solo sobreescribir localStorage si hay datos reales de Supabase
    if (catsData.length) ExaryState.saveCats(catsData.map(c => ({
      id: c.id, nombre: c.nombre, color: c.color
    })));

    if (docsData.length) ExaryState.saveDocs(docsData.map(d => ({
      id: d.id, nombre: d.nombre, ext: d.ext, size: d.size,
      fecha: d.fecha, categoria: d.categoria, resumen: d.resumen,
      dificultad: d.dificultad || null,
      fechaEntrega: d.fecha_entrega || null,
      complejidadScore: d.complejidad_score,
      storagePath: d.storage_path || null
    })));

    if (actsData.length) ExaryState.saveActs(actsData.map(a => ({
      id: a.id, nombre: a.nombre, categoria: a.categoria,
      fechaEntrega:    a.fecha_entrega,
      fechaCreacion:   a.fecha_creacion,
      completada:      a.completada,
      generadaPorIA:   a.generada_por_ia,
      complejidad:     a.complejidad,
      prioridad:       a.prioridad,
      complejidadScore: a.complejidad_score
    })));

    if (msgsData.length) {
      const chats = {};
      msgsData.forEach(m => {
        if (!chats[m.chat_key]) chats[m.chat_key] = [];
        chats[m.chat_key].push({
          role: m.role, content: m.content,
          toolsUsed: m.tools_used || [], time: m.time
        });
      });
      localStorage.setItem('exary_chats', JSON.stringify(chats));
    }
  },

  /* ── Guard para operaciones Supabase ── */
  _can() { return _sb && this._online && this._userId; },

  /* ══ Categorías ══ */
  async insertCategoria(cat) {
    if (!this._can()) return;
    const { error } = await _sb.from('categorias').insert({
      id: cat.id, user_id: this._userId, nombre: cat.nombre, color: cat.color
    });
    if (error) console.warn('insertCategoria:', error.message);
  },
  async removeCategoria(id) {
    if (!this._can()) return;
    await _sb.from('categorias').delete().eq('id', id);
  },

  /* ══ Documentos ══ */
  async insertDocumento(doc) {
    if (!this._can()) return false;
    try {
      const { error } = await _sb.from('documentos').insert({
        id: doc.id, user_id: this._userId,
        nombre: doc.nombre, ext: doc.ext, size: doc.size,
        fecha: doc.fecha, categoria: doc.categoria,
        resumen: doc.resumen, complejidad_score: doc.complejidadScore,
        dificultad: doc.dificultad || null,
        fecha_entrega: doc.fechaEntrega || null,
        storage_path: doc.storagePath || null
      });
      if (error) {
        console.error('[insertDocumento] FAILED:', error.message, error);
        return false;
      }
      console.log('[insertDocumento] OK:', doc.nombre);
      return true;
    } catch (e) {
      console.error('[insertDocumento] EXCEPTION:', e);
      return false;
    }
  },
  async removeDocumento(id) {
    if (!this._can()) return;
    const docKey = this._userId + '_' + id;
    const doc = ExaryState.getDocument(id);
    // Eliminar archivo del Storage
    if (doc?.storagePath) {
      await _sb.storage.from('documentos').remove([doc.storagePath]).catch(() => {});
    }
    await Promise.all([
      _sb.from('documentos').delete().eq('id', id),
      _sb.from('mensajes_chat').delete().eq('chat_key', id),
      _sb.from('api_messages').delete().eq('chat_key', docKey)
    ]);
  },
  async updateDocumento(id, fields) {
    if (!this._can()) return;
    try {
      const { error } = await _sb.from('documentos').update(fields).eq('id', id);
      if (error) console.warn('updateDocumento:', error.message);
    } catch (e) { console.warn('updateDocumento exception:', e); }
  },

  /* ══ Storage ══ */
  async uploadFile(file, docId, ext) {
    if (!this._can()) return null;
    try {
      const path = `${this._userId}/${docId}.${ext}`;
      const { error } = await _sb.storage.from('documentos').upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });
      if (error) { console.warn('uploadFile error:', error.message); return null; }
      return path;
    } catch (e) {
      console.warn('uploadFile exception:', e.message || e);
      return null;
    }
  },

  async downloadFile(path) {
    if (!this._can() || !path) return null;
    try {
      const { data, error } = await _sb.storage.from('documentos').download(path);
      if (error) { console.warn('downloadFile:', error.message); return null; }
      return data;
    } catch (e) {
      console.warn('downloadFile exception:', e.message || e);
      return null;
    }
  },

  /* ══ Actividades ══ */
  async insertActividad(a) {
    if (!this._can()) return;
    const { error } = await _sb.from('actividades').insert({
      id: a.id, user_id: this._userId,
      nombre: a.nombre, categoria: a.categoria,
      fecha_entrega:   a.fechaEntrega  || null,
      fecha_creacion:  a.fechaCreacion,
      completada:      a.completada,
      generada_por_ia: a.generadaPorIA,
      complejidad:     a.complejidad,
      prioridad:       a.prioridad,
      complejidad_score: a.complejidadScore
    });
    if (error) console.warn('insertActividad:', error.message);
  },
  async updateActividad(id, fields) {
    if (!this._can()) return;
    await _sb.from('actividades').update(fields).eq('id', id);
  },
  async removeActividad(id) {
    if (!this._can()) return;
    await _sb.from('actividades').delete().eq('id', id);
  },

  /* ══ Mensajes ══ */
  async insertMensaje(chatKey, msg) {
    if (!this._can()) return;
    const { error } = await _sb.from('mensajes_chat').insert({
      user_id: this._userId, chat_key: chatKey,
      role: msg.role, content: msg.content,
      tools_used: msg.toolsUsed || [], time: msg.time
    });
    if (error) console.warn('insertMensaje:', error.message);
  },
  async clearChat(chatKey) {
    if (!this._can()) return;
    await _sb.from('mensajes_chat').delete().eq('chat_key', chatKey);
  },

  /* ══ API Messages (historial Claude) ══ */
  async saveApiMessages(chatKey, messages) {
    if (!this._can()) return;
    // Usar user_id como prefijo para evitar conflictos de unicidad
    const key = this._userId + '_' + chatKey;
    await _sb.from('api_messages').delete().eq('chat_key', key);
    if (messages.length) {
      await _sb.from('api_messages').insert({
        user_id: this._userId, chat_key: key,
        messages, updated_at: new Date().toISOString()
      }).catch(e => console.warn('saveApiMessages:', e.message));
    }
  },
  async getApiMessages(chatKey) {
    if (!this._can()) return null;
    const key = this._userId + '_' + chatKey;
    const { data } = await _sb.from('api_messages')
      .select('messages')
      .eq('chat_key', key)
      .maybeSingle();
    return data?.messages || null;
  },

  /* ══ Auth ══ */
  async logout() {
    if (_sb) await _sb.auth.signOut().catch(() => {});
    // Preservar settings visuales del dispositivo
    const theme   = localStorage.getItem('exary_theme');
    const palette = localStorage.getItem('exary_palette');
    const video   = localStorage.getItem('exary_bg_video');
    const tokens  = localStorage.getItem('exary_token_stats');
    localStorage.clear();
    if (theme)   localStorage.setItem('exary_theme', theme);
    if (palette) localStorage.setItem('exary_palette', palette);
    if (video)   localStorage.setItem('exary_bg_video', video);
    if (tokens)  localStorage.setItem('exary_token_stats', tokens);
    window.location.href = 'index.html';
  }
};

ExaryDB.init();

// Exponer en window para que window.ExaryDB?._ready funcione en otros módulos
window.ExaryDB = ExaryDB;
