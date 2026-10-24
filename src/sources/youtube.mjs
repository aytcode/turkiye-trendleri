// YouTube Data API v3 — Türkiye'de trend videolar (chart=mostPopular, regionCode=TR)
// Ücretsiz kota: 10.000 birim/gün; bu çağrı 1-2 birim harcar.
import { http } from '../util.mjs';

export const meta = { id: 'youtube', name: 'YouTube', color: '#FF0033', needs: ['YOUTUBE_API_KEY'] };

const API = 'https://www.googleapis.com/youtube/v3';

export async function collect({ YOUTUBE_API_KEY: key }) {
  const [videos, cats] = await Promise.all([
    http(`${API}/videos?part=snippet,statistics&chart=mostPopular&regionCode=TR&hl=tr&maxResults=50&key=${key}`),
    http(`${API}/videoCategories?part=snippet&regionCode=TR&hl=tr&key=${key}`),
  ]);
  const catName = Object.fromEntries((cats.items || []).map((c) => [c.id, c.snippet.title]));
  return {
    items: (videos.items || []).map((v, i) => ({
      id: v.id,
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      category: catName[v.snippet.categoryId] || 'Diğer',
      tags: (v.snippet.tags || []).slice(0, 10),
      views: Number(v.statistics.viewCount || 0),
      likes: Number(v.statistics.likeCount || 0),
      comments: Number(v.statistics.commentCount || 0),
      thumbnail: v.snippet.thumbnails?.medium?.url,
      rank: i + 1,
    })),
  };
}

/** Puan = listede kalınan her gün için (51 - sıra); izlenme en son değer */
export function aggregate(snapshots) {
  const map = new Map();
  for (const snap of snapshots) {
    for (const v of snap.items) {
      const cur = map.get(v.id) || { ...v, score: 0, days: 0, bestRank: 99 };
      Object.assign(cur, { views: Math.max(cur.views, v.views), likes: Math.max(cur.likes, v.likes), comments: Math.max(cur.comments, v.comments) });
      cur.score += 51 - v.rank;
      cur.days++;
      cur.bestRank = Math.min(cur.bestRank, v.rank);
      map.set(v.id, cur);
    }
  }
  return [...map.values()]
    .map((v) => ({ ...v, url: `https://www.youtube.com/watch?v=${v.id}` }))
    .sort((a, b) => b.score - a.score || b.views - a.views);
}
