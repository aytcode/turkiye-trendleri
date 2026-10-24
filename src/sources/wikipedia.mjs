// Türkçe Vikipedi — en çok okunan maddeler (Wikimedia REST API, anahtar gerekmez)
import { http, log } from '../util.mjs';

export const meta = { id: 'wikipedia', name: 'Vikipedi', color: '#7A7A7A', needs: [] };

const SKIP = /^(Anasayfa|Ana_Sayfa|Özel:|Vikipedi:|Dosya:|Kategori:|Portal:|Yardım:|Şablon:|Kullanıcı:|Tartışma:|-)/;
// Her hafta zirvede olan "kalıcı" sayfalar trend sayılmaz; yetişkin içerik raporda gösterilmez
const EVERGREEN = new Set(['YouTube', 'Türkiye', 'Google', 'Instagram', 'Facebook', 'WhatsApp', 'Netflix', 'TikTok', 'ChatGPT', 'Twitter', 'X_(sosyal_ağ)', 'Mustafa_Kemal_Atatürk', 'İstanbul', 'Vikipedi']);
const NSFW = /seks|sex|porno|porn|xxx|erotik|çıplak|nude|onlyfans/i;

async function topForDay(date) {
  const [y, m, d] = date.split('-');
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/tr.wikipedia/all-access/${y}/${m}/${d}`;
  const res = await http(url);
  return res.items?.[0]?.articles ?? [];
}

/** Haftanın günleri için okunma sayılarını toplar (henüz yayınlanmamış günler atlanır) */
export async function collectWeek(days) {
  const map = new Map();
  let covered = 0;
  for (const day of days) {
    let articles;
    try {
      articles = await topForDay(day);
    } catch (e) {
      if (e.status === 404) continue; // Wikimedia veriyi ~1 gün gecikmeli yayınlar
      throw e;
    }
    covered++;
    for (const a of articles) {
      if (SKIP.test(a.article) || EVERGREEN.has(a.article) || NSFW.test(a.article)) continue;
      const cur = map.get(a.article) || { title: a.article.replace(/_/g, ' '), article: a.article, views: 0, days: 0 };
      cur.views += a.views;
      cur.days++;
      map.set(a.article, cur);
    }
  }
  log(`Vikipedi: ${covered}/${days.length} gün verisi alındı`);
  const items = [...map.values()]
    .map((x) => ({ ...x, url: `https://tr.wikipedia.org/wiki/${encodeURIComponent(x.article)}`, score: x.views }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
  return { items, coveredDays: covered };
}
