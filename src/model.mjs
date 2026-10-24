// Kaynak listelerini tek bir haftalık rapor modeline dönüştürür ve platformlar arası
// "Haftanın Konuları" sıralamasını hesaplar.
import { normalizeKey } from './util.mjs';
import * as google from './sources/google-trends.mjs';
import * as wikipedia from './sources/wikipedia.mjs';
import * as youtube from './sources/youtube.mjs';
import * as x from './sources/x.mjs';
import * as tiktok from './sources/tiktok.mjs';
import * as instagram from './sources/instagram.mjs';

/** Raporda görünme sırası */
export const SOURCES = [x, tiktok, instagram, youtube, google, wikipedia];
export const META = Object.fromEntries(SOURCES.map((s) => [s.meta.id, s.meta]));

const TOP_N = 30; // Genel sıralamaya her platformdan alınan konu sayısı
const KEEP = 25; // Raporda platform başına saklanan satır

/** Sıra tabanlı puan: 1. sıra 100, 30. sıra ~3 — platformların ölçekleri farklı olduğu için */
const rankPoints = (i) => Math.round(100 * (1 - i / TOP_N));

function sameTopic(a, b) {
  // "#kışsaati" ile "kış saati" aynı konudur
  if (a === b || a.replace(/ /g, '') === b.replace(/ /g, '')) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 5 && ` ${long} `.includes(` ${short} `);
}

export function crossPlatform(sources) {
  const topics = [];
  for (const [id, src] of Object.entries(sources)) {
    if (src.status !== 'ok') continue;
    src.items.slice(0, TOP_N).forEach((item, i) => {
      const key = normalizeKey(item.title);
      if (!key) return;
      let t = topics.find((t) => t.keys.some((k) => sameTopic(k, key)));
      if (!t) topics.push((t = { keys: [], titles: [], parts: {}, total: 0 }));
      t.keys.push(key);
      t.titles.push(item.title);
      const pts = rankPoints(i);
      if ((t.parts[id] || 0) < pts) {
        t.total += pts - (t.parts[id] || 0);
        t.parts[id] = pts;
      }
    });
  }
  return topics
    .map((t) => ({
      // En kısa başlık genellikle en genel olanıdır (ör. "Galatasaray" vs. uzun video başlığı)
      title: t.titles.slice().sort((a, b) => a.length - b.length)[0],
      platforms: Object.keys(t.parts),
      parts: t.parts,
      total: t.total,
    }))
    .sort((a, b) => b.total - a.total || b.platforms.length - a.platforms.length)
    .slice(0, 20);
}

/**
 * @param sources { [id]: { status: 'ok'|'skipped'|'error', reason?, items? } }
 */
export function buildModel({ week, days, sources, snapshotDays, sample = false, now = new Date() }) {
  const today = now.toISOString().slice(0, 10);
  const trimmed = Object.fromEntries(
    SOURCES.map(({ meta }) => {
      const s = sources[meta.id] || { status: 'skipped', reason: 'Veri yok' };
      return [meta.id, { ...meta, ...s, items: (s.items || []).slice(0, KEEP), total: s.items?.length || 0 }];
    }),
  );
  const overall = crossPlatform(sources);
  return {
    week,
    days,
    start: days[0],
    end: days[6],
    final: today > days[6],
    sample,
    generatedAt: now.toISOString(),
    snapshotDays,
    activeSources: Object.values(trimmed).filter((s) => s.status === 'ok').map((s) => s.id),
    sources: trimmed,
    overall,
  };
}
