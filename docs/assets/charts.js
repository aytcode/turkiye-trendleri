// Rapor sayfalarındaki chart.js grafikleri. Veri, sayfaya gömülü #data JSON'undan okunur.
// Grafikler web fontu yüklendikten sonra çizilir; aksi halde eksen etiketleri yanlış ölçülüp kırpılır
(document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
  const el = document.getElementById('data');
  if (!el || !window.Chart) return;
  const m = JSON.parse(el.textContent);

  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue('--muted').trim() || '#666';
  const grid = css.getPropertyValue('--line').trim() || '#ddd';
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.color = ink;
  Chart.defaults.maintainAspectRatio = false;

  const nf = new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 });
  const narrow = window.innerWidth < 640;
  const cut = (s, n = narrow ? 18 : 28) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  const METRIC = {
    x: ['score', 'Gündem puanı'],
    tiktok: ['views', 'İzlenme'],
    instagram: ['score', 'Etkileşim'],
    youtube: ['views', 'İzlenme'],
    google: ['traffic', 'Tahmini arama'],
    wikipedia: ['views', 'Okunma'],
  };

  const hbar = (canvas, labels, datasets, stacked) =>
    new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        indexAxis: 'y',
        layout: { padding: { left: 4 } },
        plugins: {
          legend: { display: stacked, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } },
          tooltip: { callbacks: { title: (items) => items[0].dataset.fullLabels?.[items[0].dataIndex] ?? items[0].label } },
        },
        scales: {
          x: { stacked, grid: { color: grid }, ticks: { callback: (v) => nf.format(v) } },
          y: { stacked, grid: { display: false }, ticks: { autoSkip: false } },
        },
        datasets: { bar: { borderRadius: 4, maxBarThickness: 22 } },
      },
    });

  // Haftanın Konuları — platformlara göre yığılmış çubuk
  const overall = document.getElementById('overall');
  if (overall && m.overall.length) {
    const top = m.overall.slice(0, Number(overall.dataset.limit) || 15);
    const datasets = Object.values(m.sources)
      .filter((s) => s.status === 'ok')
      .map((s) => ({
        label: s.name,
        backgroundColor: s.color,
        data: top.map((t) => t.parts[s.id] || 0),
        fullLabels: top.map((t) => t.title),
      }));
    hbar(overall, top.map((t) => cut(t.title)), datasets, true);
  }

  // Platform başına ilk 10
  document.querySelectorAll('canvas[data-source]').forEach((canvas) => {
    const s = m.sources[canvas.dataset.source];
    const [field, label] = METRIC[s.id];
    const top = s.items.slice(0, 10);
    hbar(canvas, top.map((i) => cut(i.title, narrow ? 16 : 24)), [
      { label, data: top.map((i) => i[field] || 0), backgroundColor: s.color, fullLabels: top.map((i) => i.title) },
    ], false);
  });

  // YouTube kategori dağılımı
  const yt = document.getElementById('ytcats');
  if (yt) {
    const counts = {};
    m.sources.youtube.items.forEach((v) => (counts[v.category] = (counts[v.category] || 0) + 1));
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const palette = ['#FF0033', '#FF6B35', '#F7B32B', '#2EC4B6', '#3A86FF', '#8338EC', '#FB5607', '#06D6A0', '#999'];
    new Chart(yt, {
      type: 'doughnut',
      data: {
        labels: entries.map((e) => e[0]),
        datasets: [{ data: entries.map((e) => e[1]), backgroundColor: palette, borderWidth: 0 }],
      },
      options: { cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10 } } } },
    });
  }
});
