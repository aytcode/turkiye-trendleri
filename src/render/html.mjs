import { escapeHtml as e, formatDateTr, compactNumber, formatNumber } from '../util.mjs';
import { COLUMNS, STATUS_TEXT } from './columns.mjs';
import { META, SOURCES } from '../model.mjs';

const REPO = 'https://github.com/aytcode/turkiye-trendleri';
const CHART_JS = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
const SITE = 'https://aytcode.github.io/turkiye-trendleri/';

/** JSON'u <script> içine güvenle gömmek için */
const embed = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

const weekNo = (id) => Number(id.split('-W')[1]);

/** "19–25 Ekim 2026" ya da ay değişiyorsa "28 Eylül – 4 Ekim 2026" */
function range(start, end) {
  const f = (d, o) => new Intl.DateTimeFormat('tr-TR', { ...o, timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z'));
  return start.slice(0, 7) === end.slice(0, 7)
    ? `${f(start, { day: 'numeric' })}–${formatDateTr(end)}`
    : `${f(start, { day: 'numeric', month: 'long' })} – ${formatDateTr(end)}`;
}

function layout({ title, description, base, body, data, path = '', charts = false }) {
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
<meta name="theme-color" content="#f5f5f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
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
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><rect width=%2232%22 height=%2232%22 rx=%228%22 fill=%22%231d1d1f%22/><rect x=%227%22 y=%2217%22 width=%224%22 height=%228%22 rx=%222%22 fill=%22%23fff%22/><rect x=%2214%22 y=%2211%22 width=%224%22 height=%2214%22 rx=%222%22 fill=%22%23fff%22/><rect x=%2221%22 y=%227%22 width=%224%22 height=%2218%22 rx=%222%22 fill=%22%23ff375f%22/></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/style.css">
</head>
<body>
<header class="nav">
  <div class="wrap nav-inner">
    <a class="brand" href="${base}index.html">Türkiye Trendleri</a>
    <nav>
      <a href="${base}index.html#arsiv">Arşiv</a>
      <a href="${base}ornek.html">Örnek</a>
      <a href="${REPO}">GitHub</a>
    </nav>
  </div>
</header>
<main>
${body}
</main>
<footer class="footer">
  <div class="wrap">
    <p>Veriler resmi API'lerden ve herkese açık akışlardan toplanır: Google Trends RSS, Wikimedia, YouTube Data API, X API, TikTok Research API ve Instagram Graph API.
    Platform adları sahiplerinin ticari markalarıdır; bu proje onlarla bağlantılı değildir.</p>
    <p><a href="${REPO}">Kaynak kodu</a> · MIT lisansı · <a href="${base}data/weeks.json">Açık veri (JSON)</a></p>
  </div>
</footer>
${data ? `<script id="data" type="application/json">${embed(data)}</script>` : ''}
${charts ? `<script src="${CHART_JS}"></script>
<script src="${base}assets/charts.js"></script>` : ''}
</body>
</html>
`;
}

const dot = (id) => `<i class="dot" style="--c:${META[id].color}" title="${e(META[id].name)}"></i>`;

function hero(m, title, sub) {
  return `<section class="hero wrap">
  ${m.sample ? '<p class="notice"><strong>Örnek veri.</strong> Bu sayfa tasarımı göstermek için uydurma değerlerle üretildi. Gerçek raporlar <a href="index.html#arsiv">arşivde</a>.</p>' : ''}
  <p class="eyebrow">${m.final ? '' : '<span class="live" aria-hidden="true"></span>'}${weekNo(m.week)}. hafta · ${range(m.start, m.end)}</p>
  <h1>${title}</h1>
  <p class="lede">${sub}</p>
</section>`;
}

function highlights(m) {
  const s = m.sources;
  const tiles = [];
  const add = (id, label, item, value) => item && !tiles.some((t) => t.title === item.title) && tiles.push({ id, label, title: item.title, value, url: item.url });
  if (m.overall[0]) tiles.push({ label: 'Haftanın bir numarası', title: m.overall[0].title, value: `${m.overall[0].platforms.length} platformda`, ids: [] });
  if (s.google.status === 'ok') add('google', 'En çok aranan', s.google.items[0], `${compactNumber(s.google.items[0]?.traffic)}+ arama`);
  if (s.youtube.status === 'ok') add('youtube', 'Trend video', s.youtube.items[0], `${compactNumber(s.youtube.items[0]?.views)} izlenme`);
  if (s.x.status === 'ok') add('x', 'X gündemi', s.x.items[0], `En iyi sıra ${s.x.items[0]?.bestRank}`);
  if (s.tiktok.status === 'ok') add('tiktok', 'TikTok etiketi', s.tiktok.items[0], `${compactNumber(s.tiktok.items[0]?.views)} izlenme`);
  if (s.wikipedia.status === 'ok') add('wikipedia', 'En çok okunan madde', s.wikipedia.items[0], `${compactNumber(s.wikipedia.items[0]?.views)} okunma`);
  if (!tiles.length) return '';
  return `<section class="wrap tiles">${tiles
    .slice(0, 4)
    .map((t, i) => `<div class="tile${i === 0 ? ' tile-lead' : ''}">
    <p class="tile-label">${(t.ids || [t.id]).map(dot).join('')}${e(t.label)}</p>
    <p class="tile-title">${e(t.title)}</p>
    <p class="tile-value">${e(t.value)}</p>
  </div>`)
    .join('\n')}</section>`;
}

/** Haftanın konuları: platform paylarına bölünmüş ince çubuklarla sıralı liste */
function ranking(m, limit) {
  if (!m.overall.length) return '';
  const top = m.overall.slice(0, limit);
  const max = top[0].total;
  const rows = top
    .map((t, i) => {
      const segs = t.platforms
        .map((id) => `<span style="--c:${META[id].color};width:${((t.parts[id] / max) * 100).toFixed(2)}%" title="${e(META[id].name)}: ${t.parts[id]}"></span>`)
        .join('');
      return `<li>
      <span class="rank">${i + 1}</span>
      <span class="topic"><span class="topic-title">${e(t.title)}</span><span class="topic-meta">${t.platforms.map((id) => e(META[id].name)).join(', ')}</span></span>
      <span class="bar" aria-hidden="true">${segs}</span>
      <span class="score">${t.total}</span>
    </li>`;
    })
    .join('\n');
  const legend = SOURCES.filter(({ meta }) => m.activeSources.includes(meta.id))
    .map(({ meta }) => `<span>${dot(meta.id)}${e(meta.name)}</span>`)
    .join('');
  return `<section class="wrap section">
  <div class="section-head">
    <h2>Haftanın konuları.</h2>
    <p>Her platformun ilk 30 konusu sırasına göre puan alır; aynı konu birden çok platformda geçiyorsa puanlar toplanır.</p>
  </div>
  <div class="panel">
    <ol class="ranking">${rows}</ol>
    <div class="legend">${legend}</div>
  </div>
</section>`;
}

function sourceCard(src) {
  if (src.status !== 'ok') {
    const env = src.needs?.length ? src.needs.map((k) => `<code>${e(k)}</code>`).join(' ') : '';
    return `<article class="card off" id="${src.id}">
  <header class="card-head"><h3>${dot(src.id)}${e(src.name)}</h3><span class="status">${e(STATUS_TEXT[src.status] || 'Veri yok')}</span></header>
  <p>${src.status === 'skipped' && env ? `Bağlamak için depo sırlarına ${env} ekleyin.` : e(src.reason || '')}</p>
  <a class="more" href="${REPO}#api-anahtarları">Nasıl bağlanır</a>
</article>`;
  }
  const spec = COLUMNS[src.id];
  // "sub" sütunları (kanal, ilgili haber) başlığın altında ikincil satır olarak gösterilir
  const cols = spec.cols.filter((c) => !c.sub);
  const subs = spec.cols.filter((c) => c.sub);
  const rows = src.items
    .slice(0, 10)
    .map((it, i) => {
      const cells = cols
        .map((c) => `<td class="${c.text ? 'txt' : 'num'}">${e(c.value(it))}</td>`)
        .join('');
      const sub = subs
        .map((c) => {
          const v = e(c.value(it));
          const url = c.link?.(it);
          return `<span class="sub">${url ? `<a href="${e(url)}" rel="noopener" target="_blank">${v}</a>` : v}</span>`;
        })
        .join('');
      return `<tr><td class="rank">${i + 1}</td><td class="title"><a href="${e(it.url || '#')}" rel="noopener" target="_blank">${e(it.title)}</a>${sub}</td>${cells}</tr>`;
    })
    .join('\n');
  return `<article class="card" id="${src.id}">
  <header class="card-head"><h3>${dot(src.id)}${e(src.name)}</h3><span class="status">${formatNumber(src.total)} kayıt</span></header>
  <div class="chart"><canvas data-source="${src.id}" role="img" aria-label="${e(src.name)}: ilk 10"></canvas></div>
  <div class="table-scroll"><table>
    <thead><tr><th class="rank">#</th><th>Başlık</th>${cols.map((c) => `<th class="${c.text ? 'txt' : 'num'}">${e(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
</article>`;
}

function subline(m) {
  return `${m.activeSources.length} / ${SOURCES.length} platform · ${m.snapshotDays} / 7 günlük veri${m.final ? '' : ' · güncelleniyor'}`;
}

export function reportPage(m, { base = '../', path = `hafta/${m.week}.html` } = {}) {
  const on = Object.values(m.sources).filter((s) => s.status === 'ok');
  const off = Object.values(m.sources).filter((s) => s.status !== 'ok');
  const ytCats = m.sources.youtube.status === 'ok'
    ? `<article class="card"><header class="card-head"><h3>${dot('youtube')}YouTube kategorileri</h3></header><div class="chart chart-doughnut"><canvas id="ytcats" role="img" aria-label="YouTube trend kategorileri"></canvas></div></article>`
    : '';
  const body = `${hero(m, 'Bu hafta Türkiye<br>neyi konuştu.', subline(m))}
${highlights(m)}
${ranking(m, 15)}
<section class="wrap section">
  <div class="section-head"><h2>Platformlar.</h2><p>Her kaynağın kendi ölçüsüyle ilk 10.</p></div>
  <div class="grid">
${on.map(sourceCard).join('\n')}
${ytCats}
  </div>
  ${off.length ? `<div class="grid grid-off">${off.map(sourceCard).join('\n')}</div>` : ''}
</section>
<p class="wrap rawdata">Ham veri: <a href="${base}data/${e(m.week)}.json">${e(m.week)}.json</a> · <a href="${REPO}/blob/main/reports/${e(m.week)}.md">Markdown</a></p>`;
  return layout({
    title: `${m.sample ? '[Örnek] ' : ''}Türkiye Trendleri — ${weekNo(m.week)}. hafta, ${range(m.start, m.end)}`,
    description: `Türkiye'de ${range(m.start, m.end)} haftasının en popüler konuları: ${m.overall.slice(0, 5).map((t) => t.title).join(', ')}`,
    base,
    path,
    body,
    data: m,
    charts: true,
  });
}

export function indexPage(weeks, latest) {
  const archive = weeks
    .map((w) => `<a class="week" href="hafta/${e(w.week)}.html">
  <span class="week-head"><span class="week-no">${weekNo(w.week)}. hafta</span>${w.final ? '' : '<span class="live" aria-label="devam ediyor"></span>'}</span>
  <span class="week-range">${range(w.start, w.end)}</span>
  <ol>${w.top.slice(0, 3).map((t) => `<li>${e(t)}</li>`).join('')}</ol>
  <span class="week-dots">${w.activeSources.map(dot).join('')}</span>
</a>`)
    .join('\n');
  const body = `${latest
    ? hero(latest, "Türkiye'nin gündemi.<br><span class=\"soft\">Her hafta, tek sayfada.</span>", 'X, TikTok, Instagram, YouTube, Google ve Vikipedi’den toplanan Türkiye trendleri — otomatik ve açık kaynak.')
    : '<section class="hero wrap"><h1>Henüz rapor yok.</h1></section>'}
${latest ? `<p class="wrap cta"><a class="button" href="hafta/${e(latest.week)}.html">Bu haftanın raporu</a><a class="more" href="${REPO}">GitHub’da incele</a></p>` : ''}
${latest ? highlights(latest) : ''}
${latest ? ranking(latest, 10) : ''}
<section class="wrap section" id="arsiv">
  <div class="section-head"><h2>Arşiv.</h2><p>Geçmiş haftaların raporları.</p></div>
  <div class="weeks">${archive}</div>
</section>
<section class="wrap section">
  <div class="section-head"><h2>Nasıl çalışır.</h2></div>
  <ol class="steps">
    <li><strong>Her gün toplar.</strong> GitHub Actions; Google Trends, YouTube, X ve TikTok’tan Türkiye trendlerinin anlık görüntüsünü alır.</li>
    <li><strong>Haftalık birleştirir.</strong> Görüntüler birleşir; Vikipedi okunmaları ve Instagram etiket etkileşimi eklenir.</li>
    <li><strong>Platformlar arası sıralar.</strong> Aynı konu farklı yerlerde geçiyorsa tek bir başlıkta toplanır ve puanlanır.</li>
    <li><strong>Yayınlar.</strong> Markdown ve bu sayfa üretilir, depoya kaydedilir ve GitHub Pages’e gönderilir.</li>
  </ol>
</section>`;
  return layout({
    title: "Türkiye'de En Popüler 2026 Trendleri — haftalık rapor",
    description: 'X, TikTok, Instagram, YouTube, Google Trends ve Vikipedi verileriyle Türkiye\'nin haftalık trend raporu. Açık kaynak, her hafta otomatik güncellenir.',
    base: '',
    body,
  });
}
