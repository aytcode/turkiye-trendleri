// Google Trends — Türkiye günlük arama trendleri (resmi RSS akışı, anahtar gerekmez)
import { http } from '../util.mjs';

export const meta = { id: 'google', name: 'Google Trends', color: '#4285F4', needs: [] };

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').trim()) : '';
};

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** "20.000+" -> 20000 */
const parseTraffic = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;

export async function collect() {
  const xml = await http('https://trends.google.com/trending/rss?geo=TR', { json: false });
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body], i) => ({
    title: tag(body, 'title'),
    traffic: parseTraffic(tag(body, 'ht:approx_traffic')),
    rank: i + 1,
    news: [...body.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/g)].slice(0, 2).map(([, n]) => ({
      title: tag(n, 'ht:news_item_title'),
      url: tag(n, 'ht:news_item_url'),
      source: tag(n, 'ht:news_item_source'),
    })),
  }));
  return { items: items.filter((x) => x.title) };
}

/** Günlük anlık görüntüleri haftalık listeye çevirir: trafik toplanır, gün sayısı tutulur */
export function aggregate(snapshots) {
  const map = new Map();
  for (const snap of snapshots) {
    for (const it of snap.items) {
      const key = it.title.toLocaleLowerCase('tr-TR');
      const cur = map.get(key) || { title: it.title, traffic: 0, days: new Set(), news: it.news };
      cur.traffic += it.traffic;
      cur.days.add(snap.date);
      map.set(key, cur);
    }
  }
  return [...map.values()]
    .map((x) => ({ ...x, days: x.days.size, score: x.traffic }))
    .sort((a, b) => b.score - a.score);
}
