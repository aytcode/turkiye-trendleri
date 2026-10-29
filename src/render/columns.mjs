// Her platformun tablo sütunları ve grafik metriği (Markdown ve HTML ortak kullanır)
import { formatNumber, compactNumber } from '../util.mjs';

const days = { label: 'Gün', value: (i) => `${i.days}/7` };

export const COLUMNS = {
  x: {
    metric: { label: 'Gündem puanı', value: (i) => i.score },
    cols: [
      { label: 'En iyi sıra', value: (i) => `#${i.bestRank}` },
      { label: 'Tweet', value: (i) => (i.tweets ? compactNumber(i.tweets) : '—') },
      days,
    ],
  },
  tiktok: {
    metric: { label: 'İzlenme', value: (i) => i.views },
    cols: [
      { label: 'İzlenme', value: (i) => compactNumber(i.views) },
      { label: 'Video', value: (i) => formatNumber(i.videos) },
      { label: 'Beğeni', value: (i) => compactNumber(i.likes) },
    ],
  },
  instagram: {
    metric: { label: 'Etkileşim', value: (i) => i.score },
    cols: [
      { label: 'Beğeni', value: (i) => compactNumber(i.likes) },
      { label: 'Yorum', value: (i) => compactNumber(i.comments) },
      { label: 'Gönderi', value: (i) => formatNumber(i.posts) },
    ],
  },
  youtube: {
    metric: { label: 'İzlenme', value: (i) => i.views },
    cols: [
      { label: 'Kanal', value: (i) => i.channel, sub: true },
      { label: 'İzlenme', value: (i) => compactNumber(i.views) },
      { label: 'Kategori', value: (i) => i.category, text: true },
      days,
    ],
  },
  google: {
    metric: { label: 'Tahmini arama', value: (i) => i.traffic },
    cols: [
      { label: 'Arama', value: (i) => `${compactNumber(i.traffic)}+` },
      { label: 'İlgili haber', value: (i) => i.news?.[0]?.title || '—', sub: true, link: (i) => i.news?.[0]?.url },
    ],
  },
  wikipedia: {
    metric: { label: 'Okunma', value: (i) => i.views },
    cols: [{ label: 'Okunma', value: (i) => formatNumber(i.views) }, days],
  },
};

export const STATUS_TEXT = {
  skipped: 'API anahtarı tanımlı değil',
  error: 'Veri alınamadı',
};
