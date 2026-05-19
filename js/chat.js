/* ═══════════════════════════════════════════════
   EXARY HQ — Chat con IA (Real)
═══════════════════════════════════════════════ */

let activeDocId = localStorage.getItem('exary_activeDoc') || null;
let docDropdown = null;

function ts() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
function fmt(b) { return b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB'; }

/* ── Markdown básico ── */
function md(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/```([\s\S]+?)```/g,'<pre><code>$1</code></pre>')
    .replace(/^#{1,3}\s+(.+)$/gm,'<strong>$1</strong>')
    .replace(/^[-•]\s+(.+)$/gm,'<span class="md-li">$1</span>')
    .replace(/\n/g,'<br>');
}

/* ── Tool badge ── */
const TOOL_LABELS = {
  crear_actividad:   { icon: '✚', label: 'Actividad creada', color: '#34d399' },
  marcar_actividad:  { icon: '✓', label: 'Actividad actualizada', color: '#38bdf8' },
  eliminar_actividad:{ icon: '✕', label: 'Actividad eliminada', color: '#f87171' },
  crear_categoria:   { icon: '◉', label: 'Categoría creada', color: '#a78bfa' }
};

function toolBadge(name, input, result) {
  const t = TOOL_LABELS[name] || { icon: '⚙', label: name, color: '#6c8ef7' };
  const detail = result.nombre ? `"${result.nombre}"` : '';
  return `<span class="tool-badge" style="border-color:${t.color}20;color:${t.color};background:${t.color}12">
    <span>${t.icon}</span><span>${t.label}${detail ? ' — '+detail : ''}</span>
  </span>`;
}

/* ── Dropdown de documentos ── */
function buildDropdownOptions() {
  const opts = [{ value: '', label: 'Chat general', sublabel: 'Sin documento específico', icon: 'bot' }];
  ExaryState.documents.forEach(d => opts.push({
    value:    d.id,
    label:    d.nombre,
    sublabel: `.${d.ext.toUpperCase()} · ${d.categoria || 'Sin categoría'} · ${fmt(d.size)}`,
    icon:     d.ext.toLowerCase()
  }));
  return opts;
}

function initDropdown() {
  const container = document.getElementById('docSelectorWrap');
  docDropdown = new ExaryDropdown(container, {
    placeholder: 'Selecciona un documento',
    icon:        'documents',
    emptyText:   'No tienes documentos. Súbelos desde Documentos.',
    options:     buildDropdownOptions(),
    value:       activeDocId,
    onChange: value => {
      activeDocId = value || null;
      ExaryAI._currentDocId = activeDocId;
      localStorage.setItem('exary_activeDoc', activeDocId || '');
      loadChat();
    }
  });
  ExaryAI._currentDocId = activeDocId;
  loadChat();
}

/* ── Chat window ── */
function resetChat() {
  document.getElementById('chatWindow').innerHTML = `
    <div class="chat-empty">
      <div class="chat-empty-icon">${ExaryIcons.bot}</div>
      <p style="font-size:15px;font-weight:500;color:var(--text)">Exary IA</p>
      <p style="font-size:12.5px;color:var(--muted)">Selecciona un documento o escribe tu pregunta</p>
    </div>`;
  setInputState(true);
}

function loadChat() {
  const win  = document.getElementById('chatWindow');
  const key  = activeDocId || 'general';
  const msgs = ExaryState.getChat(key);
  win.innerHTML = '';

  if (!msgs.length) {
    const doc   = activeDocId ? ExaryState.getDocument(activeDocId) : null;
    const title = doc ? `Chat sobre "${doc.nombre}"` : 'Chat general con Exary';
    const sub   = doc ? 'Pregunta cualquier cosa sobre este documento' : 'Puedo gestionar tu agenda, responder preguntas y analizar tu progreso';
    win.innerHTML = `
      <div class="chat-empty">
        <div class="chat-empty-icon">${ExaryIcons.bot}</div>
        <p style="font-size:14px;font-weight:500;color:var(--text)">${title}</p>
        <p style="font-size:12px;color:var(--muted)">${sub}</p>
      </div>`;
  } else {
    msgs.forEach(m => appendMsg(m, false));
  }

  setInputState(false);
  win.scrollTop = win.scrollHeight;
}

function appendMsg(msg, scroll = true) {
  const win   = document.getElementById('chatWindow');
  const empty = win.querySelector('.chat-empty');
  if (empty) empty.remove();

  const isUser = msg.role === 'user';
  const div    = document.createElement('div');
  div.className = `msg ${isUser ? 'user' : 'ai'}`;

  const toolsHtml = (msg.toolsUsed || [])
    .map(t => toolBadge(t.name, t.input, t.result))
    .join('');

  div.innerHTML = `
    <div class="msg-avatar ${isUser ? 'u' : ''}">${isUser ? ExaryIcons.user : ExaryIcons.bot}</div>
    <div class="msg-content">
      <div class="msg-bubble">${isUser ? msg.content.replace(/</g,'&lt;') : md(msg.content)}</div>
      ${toolsHtml ? `<div class="msg-tools">${toolsHtml}</div>` : ''}
      <div class="msg-time">${msg.time}</div>
    </div>`;

  win.appendChild(div);
  if (scroll) win.scrollTop = win.scrollHeight;
}

function showTyping() {
  const win = document.getElementById('chatWindow');
  const div = document.createElement('div');
  div.className = 'msg ai'; div.id = 'typing';
  div.innerHTML = `<div class="msg-avatar">${ExaryIcons.bot}</div>
    <div class="msg-content"><div class="msg-bubble typing-dots">
      <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    </div></div>`;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
}
function removeTyping() { document.getElementById('typing')?.remove(); }

function setInputState(disabled) {
  document.getElementById('chatInput').disabled = disabled;
  document.getElementById('chatSend').disabled  = disabled;
}

/* ── Enviar mensaje ── */
async function send() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text) return;

  const key    = activeDocId || 'general';
  const userMsg = { role: 'user', content: text, time: ts(), toolsUsed: [] };
  ExaryState.addMessage(key, userMsg);
  appendMsg(userMsg);
  input.value = '';
  setInputState(true);
  showTyping();

  try {
    let docContent = null;
    if (activeDocId) {
      const stored = await ExaryAI.ensureDocContent(activeDocId);
      if (stored) docContent = stored.type === 'text'
        ? stored.data
        : '[Documento PDF adjunto]';
    }

    // Streaming: create bubble early, update as chunks arrive
    let bubble      = null;
    let streamText  = '';

    const { text: aiText, toolsUsed } = await ExaryAI.runAgent(
      text, docContent,
      (chunk) => {
        streamText += chunk;
        if (!bubble) {
          removeTyping();
          // Create empty AI message node
          const win = document.getElementById('chatWindow');
          const div = document.createElement('div');
          div.className = 'msg ai';
          div.innerHTML = `<div class="msg-avatar">${ExaryIcons.bot}</div>
            <div class="msg-content">
              <div class="msg-bubble stream-bubble"></div>
              <div class="msg-time">${ts()}</div>
            </div>`;
          win.appendChild(div);
          bubble = div.querySelector('.stream-bubble');
        }
        bubble.innerHTML = md(streamText) + '<span class="stream-cursor">▌</span>';
        const win = document.getElementById('chatWindow');
        win.scrollTop = win.scrollHeight;
      }
    );

    // Finalize bubble
    if (bubble) {
      bubble.innerHTML = md(aiText);
      if (toolsUsed.length) {
        const toolsDiv = document.createElement('div');
        toolsDiv.className = 'msg-tools';
        toolsDiv.innerHTML = toolsUsed.map(t => toolBadge(t.name, t.input, t.result)).join('');
        bubble.parentElement.appendChild(toolsDiv);
      }
    } else {
      removeTyping();
      appendMsg({ role: 'assistant', content: aiText, time: ts(), toolsUsed });
    }

    ExaryState.addMessage(key, { role: 'assistant', content: aiText, time: ts(), toolsUsed });

  } catch (err) {
    removeTyping();
    const classified = ExaryAI.classifyError(err);

    // Mensaje especial para créditos agotados — más visible y útil
    let errContent;
    if (classified.type === 'credits') {
      errContent = `${classified.icon} **Créditos de IA agotados**\n\n` +
        `La API de Claude no puede responder porque la cuenta no tiene créditos disponibles.\n\n` +
        `**Qué puedes hacer:**\n` +
        `• Tus documentos y actividades siguen funcionando con normalidad\n` +
        `• Puedes usar la agenda manualmente sin IA\n` +
        `• Para reactivar el chat: recarga créditos en console.anthropic.com`;
    } else if (classified.type === 'auth') {
      errContent = `${classified.icon} **API Key inválida**\n\nRevisa el archivo \`js/config.js\` y verifica que la clave sea correcta.`;
    } else if (classified.type === 'rate') {
      errContent = `${classified.icon} **Demasiadas solicitudes**\n\nLa API está limitando temporalmente. Espera unos segundos e intenta de nuevo.`;
    } else if (classified.type === 'network') {
      errContent = `${classified.icon} **Sin conexión a internet**\n\nVerifica tu conexión e intenta de nuevo. Tus datos locales siguen accesibles.`;
    } else {
      errContent = `${classified.icon} **${classified.text}**`;
    }

    const errMsg = { role: 'assistant', content: errContent, time: ts(), toolsUsed: [], isError: true };
    ExaryState.addMessage(key, errMsg);
    appendMsg(errMsg);
  }

  setInputState(false);
  document.getElementById('chatInput').focus();
}

/* ── Botón limpiar historial ── */
document.getElementById('clearChatBtn')?.addEventListener('click', async () => {
  const ok = await ExaryDialog.confirm(
    'Se borrará el historial de este chat. No se puede deshacer.',
    { title: 'Limpiar historial', confirmLabel: 'Limpiar', icon: 'trash', tone: 'danger' }
  );
  if (!ok) return;
  const key = activeDocId || 'general';
  const all = ExaryState.chats;
  delete all[key];
  localStorage.setItem('exary_chats', JSON.stringify(all));
  await ExaryAI.clearHistory(activeDocId);
  if (window.ExaryDB?._online) await ExaryDB.clearChat(key).catch(() => {});
  loadChat();
});

document.getElementById('chatSend').addEventListener('click', send);
document.getElementById('chatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

window.addEventListener("exary:ready", () => { if(docDropdown) { docDropdown._options = buildDropdownOptions(); docDropdown._renderMenu?.(); } });
window.addEventListener("exary:ready", () => initDropdown());
initDropdown();
