// ÖRNEK VERİ — yalnızca tasarımı göstermek için uydurulmuş değerler. Gerçek bir ölçüm değildir.
const T = [
  'Derbi', 'Asgari ücret 2027', 'Ara tatil', 'Kış saati', 'Yılbaşı tatili', 'Altın fiyatları',
  'Yeni dizi sezonu', 'Milli maç', 'Kar yağışı', 'KPSS sonuçları', 'Black Friday', 'Deprem tatbikatı',
  'Konser takvimi', 'Elektrikli otomobil', 'Yapay zeka', 'E-Devlet', 'Kahve festivali', 'Basketbol ligi',
];
const seq = (n, f) => Array.from({ length: n }, (_, i) => f(i));

export function demoSources() {
  return {
    x: {
      status: 'ok',
      items: seq(15, (i) => ({ title: i % 3 ? T[i] : '#' + T[i].replace(/\s/g, ''), score: 320 - i * 19, bestRank: 1 + (i >> 1), tweets: 180000 - i * 11000, days: 7 - (i % 5), url: '#' })),
    },
    tiktok: {
      status: 'ok',
      items: seq(15, (i) => ({ title: '#' + T[(i + 2) % T.length].toLocaleLowerCase('tr-TR').replace(/\s/g, ''), views: 42e6 - i * 2.6e6, videos: 900 - i * 50, likes: 3.1e6 - i * 1.9e5, score: 42e6 - i * 2.6e6, url: '#' })),
    },
    instagram: {
      status: 'ok',
      items: seq(10, (i) => ({ title: '#' + T[(i + 1) % T.length].toLocaleLowerCase('tr-TR').replace(/\s/g, ''), likes: 820000 - i * 70000, comments: 41000 - i * 3500, posts: 50 - i * 3, score: 861000 - i * 73500, url: '#' })),
    },
    youtube: {
      status: 'ok',
      items: seq(15, (i) => ({
        title: `${T[(i + 4) % T.length]} — ${['özet', 'canlı yayın', 'resmi klip', 'vlog', 'inceleme'][i % 5]}`,
        channel: `Örnek Kanal ${i + 1}`,
        category: ['Müzik', 'Spor', 'Eğlence', 'Oyun', 'Haberler ve Politika', 'Komedi'][i % 6],
        views: 5.4e6 - i * 3.1e5, likes: 2e5 - i * 1e4, comments: 9000 - i * 400, days: 7 - (i % 4), score: 300 - i * 18, url: '#',
      })),
    },
    google: {
      status: 'ok',
      items: seq(15, (i) => ({ title: T[(i * 2) % T.length].toLocaleLowerCase('tr-TR'), traffic: [500000, 200000, 200000, 100000, 100000][i % 5] / (1 + (i >> 2)), days: 1 + (i % 3), news: [{ title: 'Örnek haber başlığı', url: '#', source: 'Örnek' }], url: '#' })),
    },
    wikipedia: {
      status: 'ok',
      items: seq(15, (i) => ({ title: T[(i + 3) % T.length], views: 160000 - i * 9000, days: 7, url: '#' })),
    },
  };
}
