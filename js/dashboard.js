function priorityClass(score) {
  if (score > 0.6)  return 'tag-red';
  if (score > 0.35) return 'tag-orange';
  return 'tag-green';
}
function priorityLabel(score) {
  if (score > 0.6)  return 'Crítica';
  if (score > 0.35) return 'Alta';
  return 'Media';
}
function diasRestantes(s) {
  if (!s) return 99;
  return Math.max(0, Math.ceil((new Date(s) - new Date()) / 86400000));
}

let _barChart = null, _donutChart = null;

function init() {
  document.getElementById('dashDate').textContent =
    new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });

  const s = ExaryState.getStats();
  document.getElementById('statDocs').textContent    = s.totalDocs;
  document.getElementById('statPending').textContent = s.pendientes;
  document.getElementById('statChats').textContent   = s.consultas;
  document.getElementById('statPct').textContent     = s.pctCompletado + '%';

  const acts = ExaryState.actividades
    .filter(a => !a.completada)
    .map(a => ({ ...a, score: ExaryState.calcScore(a.complejidad, a.fechaEntrega) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const taskEl = document.getElementById('topTasks');
  if (!acts.length) {
    taskEl.innerHTML = `<div class="empty-state"><span data-icon="check"></span><p>Sin tareas pendientes</p></div>`;
    applyIcons(taskEl);
  } else {
    taskEl.innerHTML = acts.map((a, i) => `
      <div class="task-item">
        <div class="task-rank">${i + 1}</div>
        <div class="task-body">
          <div class="task-name">${a.nombre}</div>
          <div class="task-meta">${a.categoria || 'Sin categoría'} · ${a.fechaEntrega || 'Sin fecha'}</div>
        </div>
        <span class="tag ${priorityClass(a.score)}">${priorityLabel(a.score)}</span>
      </div>`).join('');
  }

  // Top 3 documentos por urgencia (dificultad alta + plazo corto)
  const topDocsSorted = ExaryState.documents
    .map(d => ({ ...d, score: ExaryState.calcDocScore(d.dificultad, d.fechaEntrega) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const docEl = document.getElementById('topDocs');
  if (!topDocsSorted.length) {
    docEl.innerHTML = `<div class="empty-state"><span data-icon="documents"></span><p>Sin documentos aún</p></div>`;
    applyIcons(docEl);
  } else {
    docEl.innerHTML = topDocsSorted.map((d, i) => {
      const color  = ExaryState.DIFF_COLOR[d.dificultad] || '#6c8ef7';
      const diffLabel = d.dificultad || 'Sin clasificar';
      const deadline  = d.fechaEntrega || 'Sin fecha límite';
      return `<div class="task-item">
        <div class="task-rank" style="background:${color}">${i + 1}</div>
        <div class="task-body">
          <div class="task-name">${d.nombre}.${d.ext.toUpperCase()}</div>
          <div class="task-meta">${deadline}</div>
        </div>
        <span class="tag" style="background:${color}18;color:${color};border-color:${color}35">${diffLabel}</span>
      </div>`;
    }).join('');
  }

  buildChart();
}

function buildChart() {
  const acts       = ExaryState.actividades;
  const categorias = ExaryState.categorias;
  const cats       = {};

  acts.forEach(a => {
    const c = a.categoria || 'Sin categoría';
    if (!cats[c]) cats[c] = { total: 0, done: 0 };
    cats[c].total++;
    if (a.completada) cats[c].done++;
  });

  const labels = Object.keys(cats);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const tickColor  = isDark ? '#8b8d9a' : '#797a82';
  const labelColor = isDark ? '#c8c8d0' : '#3a3a3a';
  const gridColor  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

  const getColor = nombre => {
    const cat = categorias.find(c => c.nombre === nombre);
    return cat?.color || '#6c8ef7';
  };

  // Destroy previous charts to avoid duplicates on re-render
  if (_barChart)   { _barChart.destroy();   _barChart   = null; }
  if (_donutChart) { _donutChart.destroy(); _donutChart = null; }

  /* ── Bar chart ── */
  const barWrap = document.getElementById('barWrap');
  if (!labels.length) {
    barWrap.innerHTML = `<div class="empty-state" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px"><span data-icon="trending"></span><p>Sin categorías aún</p></div>`;
    applyIcons(barWrap);
  } else {
    barWrap.innerHTML = `<canvas id="categoryChart"></canvas>`;
    const pctData = labels.map(l => cats[l].total ? Math.round((cats[l].done / cats[l].total) * 100) : 0);
    const colors  = labels.map(l => getColor(l));
    _barChart = new Chart(document.getElementById('categoryChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '% completado',
          data: pctData,
          backgroundColor: colors.map(c => c + 'bb'),
          borderColor:     colors,
          borderWidth:     1,
          borderRadius:    6,
          borderSkipped:   false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            max: 100,
            ticks: { color: tickColor, callback: v => v + '%' },
            grid:  { color: gridColor }
          },
          y: { ticks: { color: labelColor }, grid: { display: false } }
        }
      }
    });
  }

  /* ── Donut chart — always visible ── */
  const ctxDonut = document.getElementById('donutChart').getContext('2d');

  if (!labels.length) {
    // Gray empty ring
    _donutChart = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [1],
          backgroundColor: [isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'],
          borderColor:     [isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.1)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { duration: 0 }
      }
    });
  } else {
    const countData = labels.map(l => cats[l].total);
    const colors    = labels.map(l => getColor(l));
    _donutChart = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: countData,
          backgroundColor: colors.map(c => c + 'bb'),
          borderColor:     colors,
          borderWidth:     2,
          hoverOffset:     10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.parsed} tarea${ctx.parsed !== 1 ? 's' : ''}` } }
        }
      }
    });
  }

  /* ── Custom category list ── */
  const donutList = document.getElementById('donutList');
  if (!labels.length) {
    donutList.innerHTML = `<p class="donut-empty">Sin categorías creadas</p>`;
  } else {
    const total = labels.reduce((s, l) => s + cats[l].total, 0);
    donutList.innerHTML = labels.map(l => {
      const color = getColor(l);
      const count = cats[l].total;
      const pct   = total ? Math.round((count / total) * 100) : 0;
      return `<div class="donut-list-item">
        <span class="donut-dot" style="background:${color}"></span>
        <span class="donut-label">${l}</span>
        <span class="donut-count">${count} tarea${count !== 1 ? 's' : ''}</span>
        <span class="donut-pct">${pct}%</span>
      </div>`;
    }).join('');
  }
}

window.addEventListener("exary:ready", init);
window.addEventListener("exary:state-changed", init);
init();
