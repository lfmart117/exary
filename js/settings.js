/* ═══════════════════════════════════════════════
   EXARY HQ — Panel de Ajustes
═══════════════════════════════════════════════ */

const ExarySettings = {
  _open: false,

  open() {
    if (this._open) return;
    this._open = true;
    this._render();
  },

  close() {
    const panel = document.getElementById('settings-overlay');
    if (panel) {
      panel.classList.add('closing');
      setTimeout(() => panel.remove(), 250);
    }
    this._open = false;
  },

  _render() {
    const theme   = localStorage.getItem('exary_theme') || 'dark';
    const palette = JSON.parse(localStorage.getItem('exary_palette') || 'null');
    const video   = localStorage.getItem('exary_bg_video') || '';
    const user    = ExaryState.user || {};
    const tokens  = (window.ExaryAI?.getTokenStats?.() || { input:0, output:0, calls:0 });
    const totalTokens = tokens.input + tokens.output;

    const a1 = palette?.a1 || null;
    const a2 = palette?.a2 || null;

    const swatches = (selected, key) =>
      ExaryTheme.PALETTE.map(c =>
        `<button class="swatch-btn${selected === c ? ' active' : ''}" 
          data-key="${key}" data-color="${c}"
          style="background:${c}" title="${c}"></button>`
      ).join('');

    const videoCards = [1,2,3,4].map(n =>
      `<button class="video-card${video === String(n) ? ' active' : ''}" data-video="${n}">
        <div class="video-card-preview">▶</div>
        <span>Video ${n}</span>
      </button>`
    ).join('');

    const avatarInitial = (user.nombre || user.email || '?').charAt(0).toUpperCase();
    const avatarHTML = user.foto
      ? `<img src="${user.foto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`
      : `<span style="font-size:24px;font-weight:700">${avatarInitial}</span>`;

    const overlay = document.createElement('div');
    overlay.id = 'settings-overlay';
    overlay.innerHTML = `
      <div class="settings-panel" id="settings-panel">
        <div class="settings-header">
          <div class="settings-title">${ExaryIcons.more}<span>Ajustes</span></div>
          <button class="settings-close" id="settings-close">${ExaryIcons.close}</button>
        </div>

        <div class="settings-body">

          <section class="settings-section">
            <div class="settings-section-label">Perfil</div>
            <div style="display:flex;gap:14px;align-items:center;padding:12px;background:var(--surface-2);border-radius:var(--r-sm)">
              <div id="profile-avatar" style="width:56px;height:56px;border-radius:50%;background:var(--grad,linear-gradient(135deg,#6c8ef7,#a78bfa));display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;overflow:hidden">
                ${avatarHTML}
              </div>
              <div style="flex:1;min-width:0">
                <input id="profile-name-input" type="text" value="${(user.nombre || '').replace(/"/g,'&quot;')}" placeholder="Tu nombre"
                  style="width:100%;background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--text);font-size:14px;font-weight:600;padding:4px 0;outline:none">
                <div style="font-size:11px;color:var(--muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user.email || ''}</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="btn btn-ghost" id="profile-photo-btn" style="flex:1;font-size:12px">
                ${ExaryIcons.image || ExaryIcons.more}<span>Cambiar foto</span>
              </button>
              <button class="btn btn-primary" id="profile-save-btn" style="flex:1;font-size:12px">
                ${ExaryIcons.check}<span>Guardar</span>
              </button>
            </div>
            <input id="profile-photo-file" type="file" accept="image/*" style="display:none">
          </section>

          <section class="settings-section">
            <div class="settings-section-label">Tema</div>
            <div class="theme-cards">
              <button class="theme-card${theme === 'dark' ? ' active' : ''}" data-theme="dark">
                <div class="theme-card-preview dark-preview"></div>
                <span>Oscuro</span>
              </button>
              <button class="theme-card${theme === 'light' ? ' active' : ''}" data-theme="light">
                <div class="theme-card-preview light-preview"></div>
                <span>Claro</span>
              </button>
            </div>
          </section>

          <section class="settings-section">
            <div class="settings-section-label">Paleta de colores</div>
            <div class="palette-row">
              <span class="palette-label">Color 1</span>
              <div class="swatches-row">${swatches(a1, 'a1')}</div>
            </div>
            <div class="palette-row" style="margin-top:10px">
              <span class="palette-label">Color 2</span>
              <div class="swatches-row">${swatches(a2, 'a2')}</div>
            </div>
            <div class="palette-preview" id="palette-preview">
              ${a1 && a2
                ? `<div style="background:linear-gradient(135deg,${a1},${a2});height:100%;border-radius:var(--r-sm)"></div>`
                : `<span style="color:var(--muted);font-size:12px">Sin color seleccionado</span>`
              }
            </div>
            <button class="btn btn-ghost" id="clearPalette" style="width:100%;margin-top:8px;font-size:12px">
              ${ExaryIcons.close}<span>Sin color (Monocromático)</span>
            </button>
          </section>

          <section class="settings-section">
            <div class="settings-section-label">Fondo de pantalla</div>
            <div class="video-grid">
              <button class="video-card${!video ? ' active' : ''}" data-video="">
                <div class="video-card-preview" style="font-size:18px">✕</div>
                <span>Sin video</span>
              </button>
              ${videoCards}
            </div>
          </section>

          <section class="settings-section">
            <div class="settings-section-label">Uso de IA</div>
            <div style="padding:12px;background:var(--surface-2);border-radius:var(--r-sm);display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center">
              <div>
                <div style="font-size:18px;font-weight:700;color:var(--accent-1,#6c8ef7)">${tokens.calls.toLocaleString()}</div>
                <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">Llamadas</div>
              </div>
              <div>
                <div style="font-size:18px;font-weight:700;color:var(--accent-1,#6c8ef7)">${(tokens.input/1000).toFixed(1)}K</div>
                <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">Tokens IN</div>
              </div>
              <div>
                <div style="font-size:18px;font-weight:700;color:var(--accent-1,#6c8ef7)">${(tokens.output/1000).toFixed(1)}K</div>
                <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px">Tokens OUT</div>
              </div>
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:6px;text-align:center">
              Total: ${totalTokens.toLocaleString()} tokens
            </div>
            <button class="btn btn-ghost" id="resetTokens" style="width:100%;margin-top:8px;font-size:12px">
              ${ExaryIcons.trash}<span>Reiniciar contador</span>
            </button>
          </section>

          <section class="settings-section">
            <div class="settings-section-label">Créditos</div>
            <div style="padding:14px;background:var(--surface-2);border-radius:var(--r-sm);font-size:12px;line-height:1.6;color:var(--muted)">
              <div style="color:var(--text);font-weight:600;margin-bottom:8px;font-size:13px">Videos de fondo</div>
              <div>Fuente: <a href="https://pixabay.com" target="_blank" rel="noopener" style="color:var(--accent-1,#6c8ef7);text-decoration:none">Pixabay</a></div>
              <div style="margin-top:4px">Autores:</div>
              <ul style="margin:4px 0 0 16px;padding:0">
                <li>lawlaw91</li>
                <li>Kanenori</li>
                <li>Animateon</li>
                <li>Engin_Akyurt</li>
              </ul>

              <div style="border-top:1px solid var(--border-2);margin-top:12px;padding-top:10px">
                <div style="color:var(--text);font-weight:600;margin-bottom:4px;font-size:13px">Exary HQ</div>
                <div>© ${new Date().getFullYear()} Luis Martinez</div>
                <div style="margin-top:2px;font-size:11px;opacity:0.85">Todos los derechos reservados</div>
              </div>
            </div>
          </section>

        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    // Close handlers
    document.getElementById('settings-close').addEventListener('click', () => this.close());
    overlay.addEventListener('click', e => { if (e.target === overlay) this.close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); }, { once: true });

    // Profile: save name
    document.getElementById('profile-save-btn').addEventListener('click', async () => {
      const name = document.getElementById('profile-name-input').value.trim();
      if (!name) return;
      const updated = { ...ExaryState.user, nombre: name };
      ExaryState.setUser(updated);
      try {
        if (typeof _sb !== 'undefined' && _sb) {
          await _sb.auth.updateUser({ data: { nombre: name } });
        }
      } catch (e) { console.warn('profile name sync:', e.message); }
      // Instant sidebar update
      document.querySelectorAll('.user-name').forEach(el => el.textContent = name);
      document.querySelectorAll('.user-avatar').forEach(el => {
        if (!ExaryState.user.foto) el.textContent = name.slice(0,2).toUpperCase();
      });
      this._showToast('Perfil actualizado');
    });

    // Profile: change photo
    const photoBtn = document.getElementById('profile-photo-btn');
    const photoFile = document.getElementById('profile-photo-file');
    photoBtn.addEventListener('click', () => photoFile.click());
    photoFile.addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result;
        const updated = { ...ExaryState.user, foto: dataUrl };
        ExaryState.setUser(updated);
        const imgHTML = `<img src="${dataUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
        document.getElementById('profile-avatar').innerHTML = imgHTML;
        // Instant sidebar update
        document.querySelectorAll('.user-avatar').forEach(el => el.innerHTML = imgHTML);
        try {
          if (typeof _sb !== 'undefined' && _sb) {
            await _sb.auth.updateUser({ data: { avatar_url: dataUrl } });
          }
        } catch (err) { console.warn('avatar sync:', err.message); }
        this._showToast('Foto actualizada');
      };
      reader.readAsDataURL(f);
    });

    // Reset tokens
    document.getElementById('resetTokens').addEventListener('click', () => {
      window.ExaryAI?.resetTokenStats?.();
      this.close();
      setTimeout(() => this.open(), 260);
    });

    // Theme cards
    overlay.querySelectorAll('.theme-card').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.theme-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ExaryTheme.applyTheme(btn.dataset.theme);
      });
    });

    // Color swatches
    let _a1 = a1, _a2 = a2;
    overlay.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        overlay.querySelectorAll(`.swatch-btn[data-key="${key}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (key === 'a1') _a1 = btn.dataset.color;
        else              _a2 = btn.dataset.color;

        const preview = document.getElementById('palette-preview');
        if (_a1 && _a2) {
          preview.innerHTML = `<div style="background:linear-gradient(135deg,${_a1},${_a2});height:100%;border-radius:var(--r-sm)"></div>`;
          ExaryTheme.applyPalette({ a1: _a1, a2: _a2 });
        }
      });
    });

    // Clear palette
    document.getElementById('clearPalette').addEventListener('click', () => {
      _a1 = null; _a2 = null;
      overlay.querySelectorAll('.swatch-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('palette-preview').innerHTML =
        `<span style="color:var(--muted);font-size:12px">Sin color seleccionado</span>`;
      ExaryTheme.applyPalette(null);
    });

    // Video cards
    overlay.querySelectorAll('.video-card').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.video-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ExaryTheme.applyVideo(btn.dataset.video || null);
      });
    });
  },

  _showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = `${ExaryIcons.check}<span>${msg}</span>`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }
};

window.ExarySettings = ExarySettings;
