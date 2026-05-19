/* ═══════════════════════════════════════════════
   EXARY HQ — Theme + Palette + Video + Sync
═══════════════════════════════════════════════ */

const ExaryTheme = {
  PALETTE: ['#6c8ef7','#a78bfa','#f472b6','#fb923c','#34d399',
            '#38bdf8','#facc15','#f87171','#4ade80','#e879f9','#22d3ee','#fb7185'],

  init() {
    this.applyTheme(localStorage.getItem('exary_theme') || 'dark', false);
    this.applyPalette(JSON.parse(localStorage.getItem('exary_palette') || 'null'), false);
    this.applyVideo(localStorage.getItem('exary_bg_video') || null, false);
  },

  applyTheme(theme, syncCloud = true) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('exary_theme', theme);
    if (syncCloud) this._syncCloud();
  },

  applyPalette(p, syncCloud = true) {
    const r = document.documentElement.style;
    if (p?.a1 && p?.a2) {
      r.setProperty('--accent-1',  p.a1);
      r.setProperty('--accent-2',  p.a2);
      r.setProperty('--grad',      `linear-gradient(135deg,${p.a1},${p.a2})`);
      r.setProperty('--grad-h',    `linear-gradient(135deg,${p.a1}dd,${p.a2}dd)`);
      r.setProperty('--grad-soft', `${p.a1}1a`);
    } else {
      ['--accent-1','--accent-2','--grad','--grad-h','--grad-soft'].forEach(v =>
        r.removeProperty(v)
      );
    }
    localStorage.setItem('exary_palette', JSON.stringify(p));
    if (syncCloud) this._syncCloud();
  },

  applyVideo(video, syncCloud = true) {
    const bg = document.querySelector('.page-bg');
    if (bg) {
      if (video) {
        bg.innerHTML = `<video autoplay muted loop playsinline
          style="width:100%;height:100%;object-fit:cover;opacity:0.55;pointer-events:none;filter:saturate(120%)">
          <source src="assets/videos/${video}.mp4" type="video/mp4">
        </video>`;
      } else {
        bg.innerHTML = '';
      }
    }
    localStorage.setItem('exary_bg_video', video || '');
    if (syncCloud) this._syncCloud();
  },

  /* Sincronizar a Supabase user_metadata */
  _syncTimer: null,
  _syncCloud() {
    if (typeof _sb === 'undefined' || !_sb) return;
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(async () => {
      try {
        await _sb.auth.updateUser({
          data: {
            exary_theme:    localStorage.getItem('exary_theme'),
            exary_palette:  JSON.parse(localStorage.getItem('exary_palette') || 'null'),
            exary_bg_video: localStorage.getItem('exary_bg_video') || null
          }
        });
      } catch(e) { console.warn('settings sync:', e.message); }
    }, 600);  // debounce 600ms
  },

  /* Hidratar desde Supabase al cargar sesión — NO sobreescribir si la nube está vacía */
  hydrate(metadata) {
    if (!metadata) return;
    // Solo aplicar si la nube tiene datos — si no, mantener los locales
    if (metadata.exary_theme && metadata.exary_theme !== 'null') {
      localStorage.setItem('exary_theme', metadata.exary_theme);
    }
    if (metadata.exary_palette && typeof metadata.exary_palette === 'object') {
      localStorage.setItem('exary_palette', JSON.stringify(metadata.exary_palette));
    }
    if (metadata.exary_bg_video && metadata.exary_bg_video !== 'null') {
      localStorage.setItem('exary_bg_video', metadata.exary_bg_video);
    }
    this.init();
  }
};

document.addEventListener('DOMContentLoaded', () => ExaryTheme.init());
