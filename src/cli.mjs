#!/usr/bin/env node
// Kullanım:
//   node src/cli.mjs collect             Bugünün anlık görüntüsünü data/snapshots/ altına kaydeder
//   node src/cli.mjs report [--week ID]  Haftalık raporu üretir (varsayılan: dünün haftası)
//   node src/cli.mjs build               docs/ sitesini, reports/*.md ve README özetini yeniden üretir
//   node src/cli.mjs run                 Günlük iş: collect + bitmekte olan/yeni hafta raporu + build
//   node src/cli.mjs demo                ÖRNEK VERİ ile docs/ornek.html üretir
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, writeText, isoWeek, weekDays, addDays, ymd, log } from './util.mjs';
import { buildModel } from './model.mjs';
import { renderMarkdown } from './render/markdown.mjs';
import { reportPage, indexPage } from './render/html.mjs';
import * as google from './sources/google-trends.mjs';
import * as youtube from './sources/youtube.mjs';
import * as x from './sources/x.mjs';
import * as tiktok from './sources/tiktok.mjs';
import * as wikipedia from './sources/wikipedia.mjs';
import * as instagram from './sources/instagram.mjs';
import { demoSources } from './demo.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const P = {
  snapshots: join(ROOT, 'data/snapshots'),
  weeks: join(ROOT, 'data/weeks'),
  reports: join(ROOT, 'reports'),
  docs: join(ROOT, 'docs'),
};

const DAILY = [google, youtube, x, tiktok];
const env = process.env;
const missing = (meta) => meta.needs.filter((k) => !env[k]);

/** Hata mesajlarından olası anahtarları temizler */
const safe = (msg) => String(msg).replace(/(key|token|access_token)=[^&\s]+/gi, '$1=***').slice(0, 240);

async function runSource(mod, fn) {
  const lack = missing(mod.meta);
  if (lack.length) return { status: 'skipped', reason: `${lack.join(', ')} tanımlı değil` };
  try {
    const res = await fn();
    log(`${mod.meta.name}: ${res.items.length} kayıt`);
    return { status: 'ok', ...res };
  } catch (e) {
    log(`${mod.meta.name} HATA: ${safe(e.message)}`);
    return { status: 'error', reason: safe(e.message) };
  }
}

async function collect(now = new Date()) {
  const date = ymd(now);
  const sources = {};
  for (const mod of DAILY) sources[mod.meta.id] = await runSource(mod, () => mod.collect(env, now));
  const snap = { date, collectedAt: now.toISOString(), sources };
  await writeJson(join(P.snapshots, `${date}.json`), snap);
  log(`Anlık görüntü kaydedildi: data/snapshots/${date}.json`);
  return snap;
}

async function report(week, now = new Date()) {
  const days = weekDays(week);
  const today = ymd(now);
  const snaps = (await Promise.all(days.map((d) => readJson(join(P.snapshots, `${d}.json`))))).filter(Boolean);
  log(`${week}: ${snaps.length} günlük anlık görüntü bulundu`);

  const sources = {};
  for (const mod of DAILY) {
    const id = mod.meta.id;
    const ok = snaps
      .filter((s) => s.sources[id]?.status === 'ok')
      .map((s) => ({ date: s.date, ...s.sources[id] }));
    if (ok.length) sources[id] = { status: 'ok', items: mod.aggregate(ok) };
    else {
      // Haftada hiç başarılı veri yoksa en son durum (atlandı/hata) gösterilir
      const last = snaps.at(-1)?.sources[id];
      sources[id] = last ? { status: last.status, reason: last.reason } : { status: 'skipped', reason: 'Bu hafta için anlık görüntü yok' };
    }
  }

  sources.wikipedia = await runSource(wikipedia, () => wikipedia.collectWeek(days.filter((d) => d < today)));

  const candidates = [];
  for (const id of ['tiktok', 'x', 'google', 'wikipedia']) {
    if (sources[id].status === 'ok') candidates.push(...sources[id].items.slice(0, 6).map((i) => i.title));
  }
  sources.instagram = await runSource(instagram, () =>
    instagram.collectWeek(env, candidates, new Date(days[0] + 'T00:00:00Z')),
  );

  const model = buildModel({ week, days, sources, snapshotDays: snaps.length, now });
  await writeJson(join(P.weeks, `${week}.json`), model);
  log(`Rapor modeli: data/weeks/${week}.json (${model.activeSources.length} aktif kaynak)`);
  return model;
}

async function build() {
  const files = (await readdir(P.weeks).catch(() => [])).filter((f) => /^\d{4}-W\d{2}\.json$/.test(f)).sort().reverse();
  const weeks = [];
  for (const f of files) {
    const m = JSON.parse(await readFile(join(P.weeks, f), 'utf8'));
    weeks.push(m);
    await writeText(join(P.reports, `${m.week}.md`), renderMarkdown(m));
    await writeText(join(P.docs, 'hafta', `${m.week}.html`), reportPage(m));
    await writeJson(join(P.docs, 'data', `${m.week}.json`), m);
  }
  const summary = weeks.map((m) => ({
    week: m.week,
    start: m.start,
    end: m.end,
    final: m.final,
    activeSources: m.activeSources,
    top: m.overall.slice(0, 5).map((t) => t.title),
    url: `hafta/${m.week}.html`,
  }));
  await writeJson(join(P.docs, 'data', 'weeks.json'), summary);
  await writeText(join(P.docs, 'index.html'), indexPage(summary, weeks[0]));
  await writeText(join(P.docs, '.nojekyll'), '');
  if (weeks[0]) await updateReadme(weeks[0]);
  log(`Site üretildi: ${weeks.length} hafta`);
}

/** README'deki <!-- SON-RAPOR --> bloğunu en güncel ilk 10 ile değiştirir */
async function updateReadme(m) {
  const path = join(ROOT, 'README.md');
  const readme = await readFile(path, 'utf8').catch(() => null);
  if (!readme) return;
  const rows = m.overall
    .slice(0, 10)
    .map((t, i) => `| ${i + 1} | ${t.title.replace(/\|/g, '\\|')} | ${t.platforms.length} |`)
    .join('\n');
  const block = `<!-- SON-RAPOR:BASLA -->
**${m.week}** (${m.start} → ${m.end})${m.final ? '' : ' · ⏳ hafta devam ediyor'} — [grafikli rapor](https://aytcode.github.io/turkiye-trendleri/hafta/${m.week}.html) · [Markdown](reports/${m.week}.md)

| # | Konu | Platform sayısı |
|---:|---|---:|
${rows}
<!-- SON-RAPOR:BITIR -->`;
  await writeText(path, readme.replace(/<!-- SON-RAPOR:BASLA -->[\s\S]*?<!-- SON-RAPOR:BITIR -->/, block));
}

async function demo() {
  const week = isoWeek(new Date());
  const m = buildModel({ week, days: weekDays(week), sources: demoSources(), snapshotDays: 7, sample: true });
  m.final = true;
  await writeText(join(P.docs, 'ornek.html'), reportPage(m, { base: '' }));
  await writeText(join(P.reports, 'ORNEK.md'), renderMarkdown(m));
  log('Örnek rapor: docs/ornek.html, reports/ORNEK.md');
}

const [cmd, ...args] = process.argv.slice(2);
const weekArg = args[args.indexOf('--week') + 1];
const now = new Date();

switch (cmd) {
  case 'collect':
    await collect(now);
    break;
  case 'report':
    await report(args.includes('--week') ? weekArg : isoWeek(addDays(now, -1)), now);
    await build();
    break;
  case 'build':
    await build();
    break;
  case 'run': {
    await collect(now);
    // Pazartesi: geçen haftayı kesinleştir; her gün: içinde bulunulan haftayı güncelle
    for (const week of new Set([isoWeek(addDays(now, -1)), isoWeek(now)])) await report(week, now);
    await build();
    break;
  }
  case 'demo':
    await demo();
    break;
  default:
    console.log('Komutlar: collect | report [--week 2026-W43] | build | run | demo');
    process.exitCode = cmd ? 1 : 0;
}

