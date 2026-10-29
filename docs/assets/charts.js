// Rapor sayfalarındaki chart.js grafikleri. Veri, sayfaya gömülü #data JSON'undan okunur.
// Grafikler web fontu yüklendikten sonra çizilir; aksi halde eksen etiketleri yanlış ölçülüp kırpılır
(document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
  const el = document.getElementById('data');
  if (!el || !window.Chart) return;
  const m = JSON.parse(el.textContent);

  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const ink2 = v('--ink-2', '#6e6e73');
  const ink3 = v('--ink-3', '#86868b');
  const hairline = v('--hairline', 'rgba(0,0,0,.08)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  Chart.defaults.font.family = v('--font', 'system-ui, sans-serif');
  Chart.defaults.font.size = 12;
  Chart.defaults.color = ink3;
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.animation = reduce ? false : { duration: 700, easing: 'easeOutQuart' };
  Object.assign(Chart.defaults.plugins.tooltip, {
    backgroundColor: 'rgba(29, 29, 31, .92)',
    titleColor: '#f5f5f7',
    bodyColor: '#f5f5f7',
    titleFont: { weight: '600', size: 13 },
    bodyFont: { size: 12 },
    padding: 10,
    cornerRadius: 10,
    displayColors: false,
    caretSize: 0,
  });

  const nf = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 });
  const full = new Intl.NumberFormat('tr-TR');
  const narrow = window.innerWidth < 640;
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  const METRIC = {
    x: ['score', 'Gündem puanı'],
    tiktok: ['views', 'İzlenme'],
    instagram: ['score', 'Etkileşim'],
    youtube: ['views', 'İzlenme'],
    google: ['traffic', 'Tahmini arama'],
    wikipedia: ['views', 'Okunma'],
  };

  // Platform başına ilk 10: ince, yuvarlak uçlu yatay çubuklar
  document.querySelectorAll('canvas[data-source]').forEach((canvas) => {
    const s = m.sources[canvas.dataset.source];
    const [field, label] = METRIC[s.id];
    const top = s.items.slice(0, 10);
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: top.map((i) => cut(i.title, narrow ? 16 : 24)),
        datasets: [{
          label,
          data: top.map((i) => i[field] || 0),
          backgroundColor: s.color,
          borderRadius: 99,
          borderSkipped: false,
          barThickness: 10,
        }],
      },
      options: {
        indexAxis: 'y',
        layout: { padding: { left: 4, right: 8 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => top[items[0].dataIndex].title,
              label: (item) => `${label}: ${full.format(item.raw)}`,
            },
          },
        },
        scales: {
          x: { grid: { color: hairline, drawTicks: false }, border: { display: false }, ticks: { padding: 6, maxTicksLimit: 5, callback: (n) => nf.format(n) } },
          y: { grid: { display: false }, border: { display: false }, ticks: { autoSkip: false, color: ink2, padding: 8 } },
        },
      },
    });
  });

  // YouTube kategori dağılımı
  const yt = document.getElementById('ytcats');
  if (yt) {
    const counts = {};
    m.sources.youtube.items.forEach((x) => (counts[x.category] = (counts[x.category] || 0) + 1));
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const palette = ['#ff375f', '#ff9f0a', '#ffd60a', '#30d158', '#64d2ff', '#0a84ff', '#5e5ce6', '#bf5af2', '#8e8e93'];
    new Chart(yt, {
      type: 'doughnut',
      data: {
        labels: entries.map((x) => x[0]),
        datasets: [{ data: entries.map((x) => x[1]), backgroundColor: palette, borderWidth: 0, borderRadius: 6, spacing: 3 }],
      },
      options: {
        cutout: '72%',
        plugins: {
          legend: { position: narrow ? 'bottom' : 'right', labels: { color: ink2, usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 14 } },
        },
      },
    });
  }
});
