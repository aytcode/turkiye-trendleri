// X (Twitter) API v2 — Türkiye gündemi (GET /2/trends/by/woeid/23424969)
// Not: Bu uç nokta X API'nin ücretli/sınırlı katmanlarında açıktır; erişim yoksa kaynak atlanır.
import { http } from '../util.mjs';

export const meta = { id: 'x', name: 'X (Twitter)', color: '#536471', needs: ['X_BEARER_TOKEN'] };

const TURKEY_WOEID = 23424969;

export async function collect({ X_BEARER_TOKEN: token }) {
  const res = await http(`https://api.x.com/2/trends/by/woeid/${TURKEY_WOEID}?max_trends=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    items: (res.data || []).map((t, i) => ({
      title: t.trend_name,
      tweets: t.tweet_count ?? null,
      rank: i + 1,
    })),
  };
}

export function aggregate(snapshots) {
  const map = new Map();
  for (const snap of snapshots) {
    for (const t of snap.items) {
      const key = t.title.toLocaleLowerCase('tr-TR');
      const cur = map.get(key) || { title: t.title, score: 0, days: 0, tweets: 0, bestRank: 99 };
      cur.score += 51 - t.rank;
      cur.days++;
      cur.tweets = Math.max(cur.tweets, t.tweets || 0);
      cur.bestRank = Math.min(cur.bestRank, t.rank);
      map.set(key, cur);
    }
  }
  return [...map.values()]
    .map((t) => ({ ...t, url: `https://x.com/search?q=${encodeURIComponent(t.title)}` }))
    .sort((a, b) => b.score - a.score);
}
