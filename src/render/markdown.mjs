import { escapeMd, formatDateTr } from '../util.mjs';
import { COLUMNS, STATUS_TEXT } from './columns.mjs';
import { META } from '../model.mjs';

const SITE = 'https://aytcode.github.io/turkiye-trendleri';

const link = (text, url) => (url ? `[${escapeMd(text)}](${url})` : escapeMd(text));

export function renderMarkdown(m) {
  const out = [];
  out.push(`# 🇹🇷 Türkiye Trendleri — ${m.week}`);
  out.push('');
  out.push(`**${formatDateTr(m.start)} – ${formatDateTr(m.end)}** · ${m.final ? 'Tamamlanan hafta' : '⏳ Hafta devam ediyor'} · ${m.snapshotDays}/7 günlük anlık görüntü`);
  out.push('');
  if (m.sample) out.push('> ⚠️ **ÖRNEK VERİ** — Bu rapor tasarımı göstermek için uydurma verilerle üretilmiştir.\n');
  out.push(`📊 Grafikli sürüm: ${SITE}/hafta/${m.week}.html`);
  out.push('');
  out.push(`Aktif kaynaklar: ${m.activeSources.map((id) => META[id].name).join(', ') || '—'}`);
  out.push('');

  out.push('## 🔥 Haftanın Konuları (platformlar arası)');
  out.push('');
  out.push('| # | Konu | Puan | Platformlar |');
  out.push('|---:|---|---:|---|');
  m.overall.slice(0, 15).forEach((t, i) => {
    out.push(`| ${i + 1} | ${escapeMd(t.title)} | ${t.total} | ${t.platforms.map((p) => META[p].name).join(', ')} |`);
  });
  out.push('');

  for (const src of Object.values(m.sources)) {
    out.push(`## ${src.name}`);
    out.push('');
    if (src.status !== 'ok') {
      const detail = src.status === 'skipped' && src.needs.length
        ? ` (${src.needs.map((k) => `\`${k}\``).join(', ')})`
        : src.reason ? ` — ${escapeMd(src.reason)}` : '';
      out.push(`_${STATUS_TEXT[src.status] || 'Veri yok'}_${detail}`);
      out.push('');
      continue;
    }
    const spec = COLUMNS[src.id];
    out.push(`| # | Başlık | ${spec.cols.map((c) => c.label).join(' | ')} |`);
    out.push(`|---:|---|${spec.cols.map((c) => (c.text ? '---' : '---:')).join('|')}|`);
    src.items.slice(0, 10).forEach((it, i) => {
      const cells = spec.cols.map((c) => link(c.value(it), c.link?.(it)));
      out.push(`| ${i + 1} | ${link(it.title, it.url)} | ${cells.join(' | ')} |`);
    });
    out.push('');
  }

  out.push('---');
  out.push(`_Oluşturulma: ${m.generatedAt.replace('T', ' ').slice(0, 16)} UTC · [turkiye-trendleri](https://github.com/aytcode/turkiye-trendleri)_`);
  return out.join('\n') + '\n';
}
