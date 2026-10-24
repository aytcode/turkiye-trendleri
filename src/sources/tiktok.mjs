// TikTok Research API — Türkiye'de (region_code=TR) dünün videoları, hashtag bazında toplanır.
// Erişim: https://developers.tiktok.com/products/research-api/ (akademik / onaylı başvuru)
import { http, addDays, ymd } from '../util.mjs';

export const meta = {
  id: 'tiktok',
  name: 'TikTok',
  color: '#25F4EE',
  needs: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
};

const FIELDS = 'id,video_description,create_time,view_count,like_count,comment_count,share_count,hashtag_names,username';

async function token(key, secret) {
  const res = await http('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: key, client_secret: secret, grant_type: 'client_credentials' }),
  });
  if (!res.access_token) throw new Error('TikTok token alınamadı: ' + JSON.stringify(res).slice(0, 200));
  return res.access_token;
}

export async function collect({ TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET }, now = new Date()) {
  const access = await token(TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET);
  const day = ymd(addDays(now, -1)).replace(/-/g, '');
  const videos = [];
  let cursor, searchId;
  for (let page = 0; page < 5; page++) {
    const res = await http(`https://open.tiktokapis.com/v2/research/video/query/?fields=${FIELDS}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: { and: [{ operation: 'IN', field_name: 'region_code', field_values: ['TR'] }] },
        start_date: day,
        end_date: day,
        max_count: 100,
        ...(cursor != null && { cursor, search_id: searchId }),
      }),
    });
    videos.push(...(res.data?.videos || []));
    if (!res.data?.has_more) break;
    ({ cursor, search_id: searchId } = res.data);
  }

  const tags = new Map();
  for (const v of videos) {
    for (const raw of v.hashtag_names || []) {
      const name = raw.toLocaleLowerCase('tr-TR');
      if (['fyp', 'foryou', 'keşfet', 'kesfet', 'foryoupage', 'viral', 'keşfetteyiz', 'tiktok'].includes(name)) continue;
      const cur = tags.get(name) || { title: '#' + name, videos: 0, views: 0, likes: 0 };
      cur.videos++;
      cur.views += v.view_count || 0;
      cur.likes += v.like_count || 0;
      tags.set(name, cur);
    }
  }
  return {
    sampledVideos: videos.length,
    items: [...tags.values()].sort((a, b) => b.views - a.views).slice(0, 50),
  };
}

export function aggregate(snapshots) {
  const map = new Map();
  for (const snap of snapshots) {
    for (const t of snap.items) {
      const cur = map.get(t.title) || { title: t.title, videos: 0, views: 0, likes: 0, days: 0 };
      cur.videos += t.videos;
      cur.views += t.views;
      cur.likes += t.likes;
      cur.days++;
      map.set(t.title, cur);
    }
  }
  return [...map.values()]
    .map((t) => ({ ...t, score: t.views, url: `https://www.tiktok.com/tag/${encodeURIComponent(t.title.slice(1))}` }))
    .sort((a, b) => b.score - a.score);
}
