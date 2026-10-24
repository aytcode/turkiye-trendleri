// Instagram Graph API — Hashtag Search. Instagram "trend listesi" yayınlamadığı için,
// diğer platformlarda öne çıkan konular hashtag olarak aranır ve son 7 günün
// popüler gönderilerindeki etkileşim (beğeni + yorum) ölçülür.
// Gereken: Instagram Business/Creator hesabı + uzun ömürlü erişim jetonu.
// Sınır: 7 gün içinde en fazla 30 farklı hashtag sorgulanabilir — burada haftada en fazla 12.
import { http, log, normalizeKey } from '../util.mjs';

export const meta = {
  id: 'instagram',
  name: 'Instagram',
  color: '#E1306C',
  needs: ['IG_USER_ID', 'IG_ACCESS_TOKEN'],
};

const GRAPH = 'https://graph.facebook.com/v21.0';
const MAX_HASHTAGS = 12;

export const toHashtag = (title) => normalizeKey(title).replace(/\s+/g, '');

export async function collectWeek({ IG_USER_ID: user, IG_ACCESS_TOKEN: token }, candidates, since) {
  const items = [];
  const seen = new Set();
  for (const title of candidates) {
    const tag = toHashtag(title);
    if (tag.length < 3 || seen.has(tag)) continue;
    seen.add(tag);
    if (seen.size > MAX_HASHTAGS) break;
    try {
      const search = await http(`${GRAPH}/ig_hashtag_search?user_id=${user}&q=${encodeURIComponent(tag)}&access_token=${token}`);
      const id = search.data?.[0]?.id;
      if (!id) continue;
      const media = await http(
        `${GRAPH}/${id}/top_media?user_id=${user}&fields=like_count,comments_count,timestamp,permalink&limit=50&access_token=${token}`,
      );
      const recent = (media.data || []).filter((m) => new Date(m.timestamp) >= since);
      const likes = recent.reduce((s, m) => s + (m.like_count || 0), 0);
      const comments = recent.reduce((s, m) => s + (m.comments_count || 0), 0);
      items.push({
        title: '#' + tag,
        source: title,
        posts: recent.length,
        likes,
        comments,
        score: likes + comments,
        url: `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`,
      });
    } catch (e) {
      log(`Instagram #${tag} atlandı: ${e.message}`);
    }
  }
  return { items: items.filter((x) => x.score > 0).sort((a, b) => b.score - a.score) };
}
