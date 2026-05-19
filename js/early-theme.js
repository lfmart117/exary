/* Ejecutar ANTES de que el CSS cargue — previene parpadeo de tema/paleta/video */
(function() {
  var t = localStorage.getItem('exary_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  try {
    var p = JSON.parse(localStorage.getItem('exary_palette') || 'null');
    if (p && p.a1 && p.a2) {
      var s = document.documentElement.style;
      s.setProperty('--accent-1', p.a1);
      s.setProperty('--accent-2', p.a2);
      s.setProperty('--grad',      'linear-gradient(135deg,' + p.a1 + ',' + p.a2 + ')');
      s.setProperty('--grad-h',    'linear-gradient(135deg,' + p.a1 + 'dd,' + p.a2 + 'dd)');
      s.setProperty('--grad-soft', p.a1 + '1a');
    }
  } catch(e) {}

  // Pre-aplicar video de fondo lo antes posible (reduce flash entre páginas)
  document.addEventListener('DOMContentLoaded', function() {
    try {
      var v = localStorage.getItem('exary_bg_video') || '';
      var bg = document.querySelector('.page-bg');
      if (v && bg) {
        bg.innerHTML = '<video autoplay muted loop playsinline ' +
          'style="width:100%;height:100%;object-fit:cover;opacity:0.55;pointer-events:none;filter:saturate(120%)">' +
          '<source src="assets/videos/' + v + '.mp4" type="video/mp4"></video>';
      }
    } catch(e) {}
  });
})();
