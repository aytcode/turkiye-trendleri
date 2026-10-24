import { escapeHtml as e, formatDateTr, compactNumber, formatNumber } from '../util.mjs';
import { COLUMNS, STATUS_TEXT } from './columns.mjs';
import { META, SOURCES } from '../model.mjs';

const REPO = 'https://github.com/aytcode/turkiye-trendleri';
const CHART_JS = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';

/** JSON'u <script> içine güvenle gömmek için */
const embed = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

const SITE = 'https://aytcode.github.io/turkiye-trendleri/';

function layout({ title, description, base, body, data, path = '' }) {
  // Bağlantı önizlemeleri (WhatsApp, X, Telegram, Discord...) mutlak URL ister
  const url = SITE + path;
  const image = SITE + 'assets/og.png';
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(description)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${e(url)}">
<meta property="og:site_name" content="Türkiye Trendleri">
<meta property="og:locale" content="tr_TR">
<meta property="og:image" content="${image}">
<meta property="og:image:secure_url" content="${image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Türkiye'de en popüler 2026 trendleri — haftalık rapor">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(description)}">
<meta name="twitter:image" content="${image}">
<link rel="canonical" href="${e(url)}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📈</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/style.css">
</head>
<body>
<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="${base}index.html"><span class="flag">🇹🇷</span> Türkiye Trendleri <span class="year">2026</span></a>
    <nav>
      <a href="${base}index.html#arsiv">Arşiv</a>
      <a href="${base}ornek.html">Örnek rapor</a>
      <a href="${REPO}" class="gh">GitHub ★</a>
    </nav>
  </div>
</header>
<main class="wrap">
${body}
</main>
<footer class="wrap footer">
  <p>Veriler resmi API'lerden ve herkese açık akışlardan (Google Trends RSS, Wikimedia, YouTube Data API, X API, TikTok Research API, Instagram Graph API) haftalık olarak toplanır.
  Kod <a href="${REPO}">GitHub</a> üzerinde, MIT lisansıyla. Platform adları ilgili sahiplerinin ticari markalarıdır; bu proje onlarla bağlantılı değildir.</p>
</footer>
${data ? `<script id="data" type="application/json">${embed(data)}</script>
<script src="${CHART_JS}"></script>
<script src="${base}assets/charts.js"></script>` : ''}
</body>
</html>
`;
}

const chip = (id, extra = '') =>
  `<span class="chip ${extra}" style="--c:${META[id].color}"><i></i>${e(META[id].name)}</span>`;

function sourceCard(src) {
  if (src.status !== 'ok') {
    const env = src.needs?.length ? `<code>${src.needs.map(e).join('</code>, <code>')}</code>` : '';
    return `<section class="card source off" id="${src.id}">
  <div class="card-head">${chip(src.id)}<span class="badge muted">${e(STATUS_TEXT[src.status] || 'Veri yok')}</span></div>
  <p class="muted">${src.status === 'skipped' && env ? `Bu platformu etkinleştirmek için depo sırlarına ${env} ekleyin.` : e(src.reason || '')}</p>
  <a class="muted small" href="${REPO}#-api-anahtarları">Nasıl yapılır? →</a>
</section>`;
  }
  const spec = COLUMNS[src.id];
  const rows = src.items
    .slice(0, 10)
    .map((it, i) => {
      const cells = spec.cols
        .map((c) => {
          const v = e(c.value(it));
          const url = c.link?.(it);
          return `<td class="${c.text ? 'txt' : 'num'}">${url ? `<a href="${e(url)}" rel="noopener" target="_blank">${v}</a>` : v}</td>`;
        })
        .join('');
      return `<tr><td class="rank">${i + 1}</td><td class="title"><a href="${e(it.url || '#')}" rel="noopener" target="_blank">${e(it.title)}</a></td>${cells}</tr>`;
    })
    .join('\n');
  return `<section class="card source" id="${src.id}">
  <div class="card-head">${chip(src.id)}<span class="badge">${formatNumber(src.total)} kayıt</span></div>
  <div class="chart-box sm"><canvas data-source="${src.id}" aria-label="${e(src.name)} ilk 10 grafiği"></canvas></div>
  <div class="table-scroll"><table>
    <thead><tr><th>#</th><th>Başlık</th>${spec.cols.map((c) => `<th class="${c.text ? 'txt' : 'num'}">${e(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
</section>`;
}

function kpis(m) {
  const s = m.sources;
  const tiles = [];
  if (m.overall[0]) tiles.push(['Haftanın 1 numarası', m.overall[0].title, `${m.overall[0].platforms.length} platformda`]);
  if (s.google.status === 'ok' && s.google.items[0]) tiles.push(['En çok aranan', s.google.items[0].title, `${compactNumber(s.google.items[0].traffic)}+ arama`]);
  if (s.youtube.status === 'ok' && s.youtube.items[0]) tiles.push(['Trend video', s.youtube.items[0].title, `${compactNumber(s.youtube.items[0].views)} izlenme`]);
  if (s.x.status === 'ok' && s.x.items[0]) tiles.push(['X gündemi', s.x.items[0].title, `en iyi sıra #${s.x.items[0].bestRank}`]);
  if (s.tiktok.status === 'ok' && s.tiktok.items[0]) tiles.push(['TikTok hashtag', s.tiktok.items[0].title, `${compactNumber(s.tiktok.items[0].views)} izlenme`]);
  if (s.wikipedia.status === 'ok' && s.wikipedia.items[0]) tiles.push(['En çok okunan madde', s.wikipedia.items[0].title, `${compactNumber(s.wikipedia.items[0].views)} okunma`]);
  return `<div class="kpis">${tiles
    .slice(0, 4)
    .map(([k, v, sub]) => `<div class="kpi"><span class="kpi-label">${e(k)}</span><strong title="${e(v)}">${e(v)}</strong><span class="muted small">${e(sub)}</span></div>`)
    .join('')}</div>`;
}

function hero(m, h1) {
  return `<section class="hero">
  ${m.sample ? '<div class="sample-banner">⚠️ ÖRNEK VERİ — Bu sayfa tasarımı göstermek için uydurma verilerle üretilmiştir. Gerçek raporlar için <a href="index.html">arşive</a> bakın.</div>' : ''}
  <p class="eyebrow">${e(m.week)} · ${m.final ? 'Tamamlanan hafta' : '<span class="live"></span> Hafta devam ediyor'}</p>
  <h1>${h1}</h1>
  <p class="lede">${formatDateTr(m.start)} – ${formatDateTr(m.end)} · ${m.snapshotDays}/7 günlük veri · ${m.activeSources.length}/${SOURCES.length} platform aktif</p>
  <div class="chips">${SOURCES.map(({ meta }) => chip(meta.id, m.activeSources.includes(meta.id) ? '' : 'off')).join('')}</div>
</section>`;
}

function overallSection(m, limit = 15) {
  if (!m.overall.length) return '';
  return `<section class="card">
  <div class="card-head"><h2>🔥 Haftanın Konuları</h2><span class="muted small">Platformlar arası birleşik puan (sıra tabanlı, platform başına en çok 100)</span></div>
  <div class="chart-box lg" style="height:${Math.max(260, Math.min(limit, m.overall.length) * 30 + 60)}px"><canvas id="overall" data-limit="${limit}" aria-label="Haftanın konuları grafiği"></canvas></div>
</section>`;
}

export function reportPage(m, { base = '../', path = `hafta/${m.week}.html` } = {}) {
  const ytCats = m.sources.youtube.status === 'ok'
    ? `<section class="card"><div class="card-head"><h2>🎬 YouTube trend kategorileri</h2></div><div class="chart-box md"><canvas id="ytcats" aria-label="YouTube kategori dağılımı"></canvas></div></section>`
    : '';
  const body = `${hero(m, `Türkiye'de bu hafta neler konuşuldu?`)}
${kpis(m)}
${overallSection(m)}
<div class="grid">
${Object.values(m.sources).filter((s) => s.status === 'ok').map(sourceCard).join('\n')}
${ytCats}
${Object.values(m.sources).filter((s) => s.status !== 'ok').map(sourceCard).join('\n')}
</div>
<p class="muted small center">Ham veri: <a href="${base}data/${e(m.week)}.json">${e(m.week)}.json</a> · Markdown: <a href="${REPO}/blob/main/reports/${e(m.week)}.md">${e(m.week)}.md</a></p>`;
  return layout({
    title: `${m.sample ? '[Örnek] ' : ''}Türkiye Trendleri ${m.week} — X, TikTok, Instagram, YouTube, Google`,
    description: `Türkiye'de ${formatDateTr(m.start)} – ${formatDateTr(m.end)} haftasının en popüler konuları: ${m.overall.slice(0, 5).map((t) => t.title).join(', ')}`,
    base,
    path,
    body,
    data: m,
  });
}

export function indexPage(weeks, latest) {
  const archive = weeks
    .map((w) => `<a class="week" href="hafta/${e(w.week)}.html">
  <span class="week-id">${e(w.week)}</span>
  <span class="muted small">${formatDateTr(w.start)} – ${formatDateTr(w.end)}${w.final ? '' : ' · devam ediyor'}</span>
  <ol>${w.top.map((t) => `<li>${e(t)}</li>`).join('')}</ol>
  <span class="dots">${w.activeSources.map((id) => `<i title="${e(META[id].name)}" style="--c:${META[id].color}"></i>`).join('')}</span>
</a>`)
    .join('\n');
  const body = `${latest ? hero(latest, `Türkiye'de en popüler <span class="accent">2026</span> trendleri`) : '<section class="hero"><h1>Henüz rapor yok</h1></section>'}
${latest ? kpis(latest) : ''}
${latest ? overallSection(latest, 10) : ''}
${latest ? `<p class="center"><a class="btn" href="hafta/${e(latest.week)}.html">${e(latest.week)} raporunun tamamı →</a></p>` : ''}
<section id="arsiv">
  <h2>📚 Haftalık arşiv</h2>
  <div class="weeks">${archive}</div>
</section>
<section class="card how">
  <h2>Nasıl çalışır?</h2>
  <ol>
    <li><b>Her gün</b> GitHub Actions; Google Trends, YouTube, X ve TikTok'tan Türkiye trendlerinin anlık görüntüsünü alır.</li>
    <li><b>Her hafta</b> anlık görüntüler birleştirilir, Vikipedi okunmaları ve Instagram hashtag etkileşimi eklenir.</li>
    <li>Platformlar arası eşleşen konular tek bir <b>"Haftanın Konuları"</b> listesinde puanlanır.</li>
    <li>Markdown + bu grafikli sayfa üretilir, depoya kaydedilir ve GitHub Pages'e yayınlanır.</li>
  </ol>
  <p class="muted small">Ham veriler JSON olarak açıktır: <a href="data/weeks.json">data/weeks.json</a></p>
</section>`;
  return layout({
    title: "Türkiye'de En Popüler 2026 Trendleri — haftalık rapor",
    description: 'X, TikTok, Instagram, YouTube, Google Trends ve Vikipedi verileriyle Türkiye\'nin haftalık trend raporu. Açık kaynak, her hafta otomatik güncellenir.',
    base: '',
    body,
    data: latest,
  });
}
