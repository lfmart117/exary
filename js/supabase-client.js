/* ═══════════════════════════════════════════════
   EXARY HQ — Supabase Client
═══════════════════════════════════════════════ */
let _sb = null;
try {
  if (window.supabase?.createClient) {
    _sb = window.supabase.createClient(
      'https://taddefvyfnnwfgrdezxk.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZGRlZnZ5Zm5ud2ZncmRlenhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNjc2OTQsImV4cCI6MjA5NDc0MzY5NH0.p-K7PSEO2C18w7ZIkEooke5z4v_p1qem8_HgazqNChg'
    );
  } else {
    console.warn('Supabase CDN no disponible — modo local activo');
  }
} catch(e) {
  console.warn('Supabase init falló:', e.message);
}
