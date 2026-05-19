/* ═══════════════════════════════════════════════
   EXARY HQ — Motor de IA
   Soporta: PDF, DOCX, ODT, TXT
═══════════════════════════════════════════════ */

const ExaryAI = {

  /* ── Contexto completo del usuario ── */
  buildSystemPrompt(docText = null) {
    const s    = ExaryState.getStats();
    const acts = ExaryState.actividades;
    const docs = ExaryState.documents;
    const cats = ExaryState.categorias;
    const now  = new Date().toLocaleDateString('es-ES', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });

    const actLines = acts.length
      ? acts.map(a =>
          `  • [${a.completada?'✓':' '}] ID:${a.id} | "${a.nombre}"` +
          `${a.categoria    ? ` | Cat: ${a.categoria}`        : ''}` +
          `${a.fechaEntrega ? ` | Entrega: ${a.fechaEntrega}` : ''}` +
          `${a.complejidad  ? ` | Dificultad: ${a.complejidad}`: ''}`
        ).join('\n')
      : '  (sin actividades)';

    const docLines = docs.length
      ? docs.map(d =>
          `  • ID:${d.id} | "${d.nombre}.${d.ext}"` +
          `${d.categoria ? ` | Cat: ${d.categoria}` : ''}` +
          ` | Subido: ${d.fecha}`
        ).join('\n')
      : '  (sin documentos)';

    const catLines = cats.length
      ? cats.map(c => `  • "${c.nombre}" (${c.color})`).join('\n')
      : '  (sin categorías)';

    const docSection = docText
      ? `\n\nCONTENIDO DEL DOCUMENTO ACTIVO:\n${docText}`
      : '';

    return `Eres Exary, el asistente académico inteligente de Exary HQ.
Tienes acceso COMPLETO al contexto del estudiante y puedes gestionar su agenda con herramientas.
Responde siempre en español. Sé directo, útil y conciso.
Cuando el estudiante pida crear tareas, usa crear_actividad. Cuando pregunte su progreso, usa los datos reales.

FECHA HOY: ${now}

ESTADÍSTICAS:
  • Documentos: ${s.totalDocs} | Tareas pendientes: ${s.pendientes} | Completado: ${s.pctCompletado}%

CATEGORÍAS:
${catLines}

AGENDA (${acts.length} actividades):
${actLines}

DOCUMENTOS (${docs.length} archivos):
${docLines}${docSection}`;
  },

  /* ── Herramientas ── */
  TOOLS: [
    {
      name: 'crear_actividad',
      description: 'Crea una nueva actividad en la agenda. Úsala cuando el estudiante pida crear tareas o al analizar documentos.',
      input_schema: {
        type: 'object',
        properties: {
          nombre:       { type: 'string' },
          categoria:    { type: 'string',  description: 'Nombre exacto de una categoría existente, o null' },
          fechaEntrega: { type: 'string',  description: 'YYYY-MM-DD o null' },
          complejidad:  { type: 'string',  enum: ['Fácil','Media','Alta','Difícil'] },
          prioridad:    { type: 'number',  description: '0.0 a 1.0' }
        },
        required: ['nombre']
      }
    },
    {
      name: 'marcar_actividad',
      description: 'Marca una actividad como completada o pendiente.',
      input_schema: {
        type: 'object',
        properties: {
          id:         { type: 'string'  },
          completada: { type: 'boolean' }
        },
        required: ['id','completada']
      }
    },
    {
      name: 'eliminar_actividad',
      description: 'Elimina una actividad de la agenda.',
      input_schema: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    },
    {
      name: 'crear_categoria',
      description: 'Crea una categoría global disponible para documentos y agenda.',
      input_schema: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          color:  { type: 'string', description: 'Hex color ej: #6c8ef7' }
        },
        required: ['nombre','color']
      }
    }
  ],

  /* ── Ejecutar herramienta ── */
  _uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); },

  executeTool(name, input) {
    try {
      switch (name) {
        case 'crear_actividad': {
          let cat = input.categoria || null;
          if (cat && !ExaryState.getCategoriaByNombre(cat)) cat = null;
          const act = {
            id: this._uid(), nombre: input.nombre, categoria: cat,
            fechaEntrega: input.fechaEntrega || null,
            fechaCreacion: new Date().toISOString(),
            completada: false, generadaPorIA: true,
            complejidad: input.complejidad || null,
            prioridad: input.prioridad || null,
            complejidadScore: input.prioridad || Math.random() * 0.5
          };
          ExaryState.addActividad(act);
          window.dispatchEvent(new CustomEvent('exary:activity-created', {
            detail: { nombre: act.nombre, id: act.id }
          }));
          return { ok: true, id: act.id, nombre: act.nombre };
        }
        case 'marcar_actividad': {
          const acts = ExaryState.actividades;
          const act  = acts.find(a => a.id === input.id);
          if (!act) return { ok: false, error: 'No encontrada' };
          ExaryState.saveActs(acts.map(a =>
            a.id === input.id ? { ...a, completada: input.completada } : a
          ));
          return { ok: true, nombre: act.nombre, completada: input.completada };
        }
        case 'eliminar_actividad': {
          const act = ExaryState.actividades.find(a => a.id === input.id);
          if (!act) return { ok: false, error: 'No encontrada' };
          ExaryState.deleteActividad(input.id);
          return { ok: true, nombre: act.nombre };
        }
        case 'crear_categoria': {
          const PALETTE = ['#6c8ef7','#a78bfa','#f472b6','#fb923c','#34d399',
                           '#38bdf8','#facc15','#f87171','#4ade80','#e879f9'];
          const color = input.color || PALETTE[Math.floor(Math.random() * PALETTE.length)];
          if (!ExaryState.getCategoriaByNombre(input.nombre))
            ExaryState.addCategoria({ id: this._uid(), nombre: input.nombre, color });
          return { ok: true, nombre: input.nombre, color };
        }
        default: return { ok: false, error: `Herramienta desconocida: ${name}` };
      }
    } catch (e) { return { ok: false, error: e.message }; }
  },

  /* ── Token usage tracker ── */
  _tokenStats: JSON.parse(localStorage.getItem('exary_token_stats') || '{"input":0,"output":0,"calls":0}'),

  _trackTokens(usage) {
    if (!usage) return;
    this._tokenStats.input  += usage.input_tokens  || 0;
    this._tokenStats.output += usage.output_tokens || 0;
    this._tokenStats.calls  += 1;
    localStorage.setItem('exary_token_stats', JSON.stringify(this._tokenStats));
    window.dispatchEvent(new CustomEvent('exary:tokens-updated', { detail: this._tokenStats }));
  },

  getTokenStats() { return { ...this._tokenStats }; },

  resetTokenStats() {
    this._tokenStats = { input: 0, output: 0, calls: 0 };
    localStorage.setItem('exary_token_stats', JSON.stringify(this._tokenStats));
    window.dispatchEvent(new CustomEvent('exary:tokens-updated', { detail: this._tokenStats }));
  },

  /* ── Llamada a la API ── */
  async _callAPI(messages, useTools = true) {
    const body = {
      model:      EXARY_CONFIG.MODEL,
      max_tokens: EXARY_CONFIG.MAX_TOKENS,
      system:     this._currentSystem || this.buildSystemPrompt(),
      messages
    };
    if (useTools) body.tools = this.TOOLS;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       EXARY_CONFIG.API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const e = new Error(err?.error?.message || `API error ${res.status}`);
      e.status = res.status;
      throw e;
    }
    const data = await res.json();
    this._trackTokens(data.usage);
    return data;
  },

  /* ── Bucle agente ── */
  async runAgent(userMessage, docText = null, onStream = null) {
    this._currentSystem = this.buildSystemPrompt(docText);

    const chatKey = '_exary_api_' + (this._currentDocId || 'general');
    let apiMsgs   = JSON.parse(localStorage.getItem(chatKey) || '[]');
    apiMsgs.push({ role: 'user', content: userMessage });

    const toolsExecuted = [];
    let iterations = 0;

    while (iterations < 5) {
      iterations++;
      const data = await this._callAPI(apiMsgs, true);
      const textBlocks = data.content.filter(b => b.type === 'text');
      const toolBlocks = data.content.filter(b => b.type === 'tool_use');

      if (!toolBlocks.length) {
        const finalText = textBlocks.map(b => b.text).join('\n');
        apiMsgs.push({ role: 'assistant', content: data.content });
        // Cap history at 20 exchanges to avoid localStorage overflow
        if (apiMsgs.length > 40) apiMsgs = apiMsgs.slice(-40);
        localStorage.setItem(chatKey, JSON.stringify(apiMsgs));
        return { text: finalText, toolsUsed: toolsExecuted };
      }

      apiMsgs.push({ role: 'assistant', content: data.content });
      const toolResults = toolBlocks.map(tb => {
        const result = this.executeTool(tb.name, tb.input);
        toolsExecuted.push({ name: tb.name, input: tb.input, result });
        return { type: 'tool_result', tool_use_id: tb.id, content: JSON.stringify(result) };
      });
      apiMsgs.push({ role: 'user', content: toolResults });
      localStorage.setItem(chatKey, JSON.stringify(apiMsgs));
    }

    return { text: 'Superé el límite de operaciones. Intenta de nuevo.', toolsUsed: toolsExecuted };
  },

  /* ══════════════════════════════════════════
     EXTRACCIÓN DE TEXTO — PDF, DOCX, ODT, TXT
  ══════════════════════════════════════════ */
  async extractText(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'txt') {
      return this._readAsText(file);
    }

    if (ext === 'docx') {
      try {
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        return result.value || '';
      } catch (e) {
        console.warn('mammoth error:', e);
        return await this._readAsText(file);
      }
    }

    if (ext === 'odt') {
      try {
        const buf  = await file.arrayBuffer();
        const zip  = await JSZip.loadAsync(buf);
        const xml  = await zip.file('content.xml').async('text');
        // Strip XML tags, decode entities
        return xml
          .replace(/<text:p[^>]*>/g, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
          .replace(/&quot;/g,'"').replace(/&apos;/g,"'")
          .replace(/\s{2,}/g, ' ')
          .trim();
      } catch (e) {
        console.warn('ODT parse error:', e);
        return '';
      }
    }

    if (ext === 'pdf') {
      try {
        const buf    = await file.arrayBuffer();
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf    = await pdfjsLib.getDocument({ data: buf }).promise;
        const pages  = Math.min(pdf.numPages, 30);
        let text = '';
        for (let i = 1; i <= pages; i++) {
          const page    = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(it => it.str).join(' ') + '\n';
        }
        return text.trim();
      } catch (e) {
        console.warn('PDF text extract error:', e);
        return '';
      }
    }

    return '';
  },

  _readAsText(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result);
      r.onerror = rej;
      r.readAsText(file, 'utf-8');
    });
  },

  _fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result.split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  },

  /* ── Guardar contenido para chat ── */
  async storeDocContent(file, docId) {
    try {
      const text = await this.extractText(file);
      if (text) {
        localStorage.setItem(
          `_exary_doc_${docId}`,
          JSON.stringify({ type: 'text', data: text.slice(0, 18000) })
        );
      }
    } catch (e) { console.warn('storeDocContent:', e); }
  },

  getDocContent(docId) {
    try {
      return JSON.parse(localStorage.getItem(`_exary_doc_${docId}`) || 'null');
    } catch { return null; }
  },

  /* Si el contenido no está en caché, descargar desde Storage */
  async ensureDocContent(docId) {
    let stored = this.getDocContent(docId);
    if (stored) return stored;
    if (!window.ExaryDB?._online) return null;

    const doc = ExaryState.getDocument(docId);
    if (!doc?.storagePath) return null;

    const blob = await ExaryDB.downloadFile(doc.storagePath);
    if (!blob) return null;

    // Reconstruir File para que extractText funcione
    const file = new File([blob], `${doc.nombre}.${doc.ext}`, { type: blob.type });
    await this.storeDocContent(file, docId);
    return this.getDocContent(docId);
  },

  /* ── Análisis automático al subir ── */
  async analyzeDocument(file, docId) {
    const today = new Date().toISOString().split('T')[0];
    const prompt = `Analiza este documento académico. Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra.

{
  "dificultad": "Fácil|Básico|Intermedio|Difícil|Experto|Complejo",
  "categoria_sugerida": "materia o tema principal",
  "tipo_documento": "parcial|taller|tarea|guia|tesis|apuntes|proyecto|otro",
  "trd_dias": número de días recomendados para completarlo,
  "fecha_limite": "YYYY-MM-DD fecha límite estimada basada en trd_dias",
  "resumen": "máximo 2 oraciones describiendo el documento",
  "actividades": [
    {
      "nombre": "actividad específica y concreta",
      "complejidad": "Fácil|Media|Alta|Difícil",
      "prioridad": 0.0,
      "dias_desde_hoy": número
    }
  ]
}

CRITERIOS DE DIFICULTAD del documento:
- Fácil: conceptos básicos, ejercicios simples
- Básico: temas introductorios con algo de desarrollo
- Intermedio: requiere conocimiento previo, análisis moderado
- Difícil: alta densidad conceptual, múltiples temas interrelacionados
- Experto: dominio avanzado, investigación profunda requerida
- Complejo: máxima dificultad, síntesis de múltiples disciplinas

Fecha actual: ${today}. Genera entre 2 y 5 actividades relevantes y específicas al contenido real.`;

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let messages;

      if (ext === 'pdf') {
        const b64 = await this._fileToBase64(file);
        messages = [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
            { type: 'text', text: prompt }
          ]
        }];
      } else {
        const text = await this.extractText(file);
        if (!text) return null;
        messages = [{
          role: 'user',
          content: `${prompt}\n\nCONTENIDO:\n${text.slice(0, 14000)}`
        }];
      }

      this._currentSystem = this.buildSystemPrompt();
      const data  = await this._callAPI(messages, false);
      const raw   = data.content.find(b => b.type === 'text')?.text || '{}';
      const clean = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch (e) {
      console.error('analyzeDocument error:', e);
      // Re-throw credit errors so caller can show specific UI
      const classified = this.classifyError(e);
      if (classified.type === 'credits' || classified.type === 'auth') {
        throw e;
      }
      return null;
    }
  },

  /* ── Clasificar errores ── */
  classifyError(e) {
    const msg    = (e.message || '').toLowerCase();
    const status = e.status || 0;
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network'))
      return { type: 'network',  icon: '📡', text: 'Sin conexión a internet. Verifica tu red e intenta de nuevo.' };
    if (status === 401 || msg.includes('invalid x-api-key') || msg.includes('authentication') || msg.includes('api key'))
      return { type: 'auth',     icon: '🔑', text: 'API Key incorrecta. Revisa js/config.js.' };
    if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests'))
      return { type: 'rate',     icon: '⏱', text: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.' };
    if (status === 529 || msg.includes('credit') || msg.includes('billing') || msg.includes('quota') || msg.includes('overloaded'))
      return { type: 'credits',  icon: '💳', text: 'Créditos de API agotados. Recarga en console.anthropic.com.' };
    return   { type: 'unknown',  icon: '⚠️', text: `Error desconocido: ${e.message || 'sin detalles'}. Intenta recargar.` };
  },

  async clearHistory(docId) {
    const chatKey = docId || 'general';
    localStorage.removeItem('_exary_api_' + chatKey);
    if (window.ExaryDB?._online) {
      await ExaryDB.saveApiMessages(chatKey, []).catch(() => {});
    }
  }
};

window.ExaryAI = ExaryAI;
