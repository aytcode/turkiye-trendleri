import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoWeek, weekDays, normalizeKey } from '../src/util.mjs';
import { crossPlatform } from '../src/model.mjs';
import { aggregate as googleAggregate } from '../src/sources/google-trends.mjs';

test('isoWeek: yıl sınırları dahil ISO 8601 hafta numarası', () => {
  assert.equal(isoWeek(new Date('2026-10-24T12:00:00Z')), '2026-W43');
  assert.equal(isoWeek(new Date('2026-01-01T00:00:00Z')), '2026-W01');
  assert.equal(isoWeek(new Date('2027-01-01T00:00:00Z')), '2026-W53');
});

test('weekDays: Pazartesi..Pazar', () => {
  const d = weekDays('2026-W43');
  assert.equal(d.length, 7);
  assert.equal(d[0], '2026-10-19');
  assert.equal(d[6], '2026-10-25');
});

test('normalizeKey: Türkçe küçük harf ve hashtag ayrıştırma', () => {
  assert.equal(normalizeKey('#GalatasarayFenerbahçe'), 'galatasaray fenerbahçe');
  assert.equal(normalizeKey('İSTANBUL'), 'istanbul');
  assert.equal(normalizeKey('Aziz_Sancar'), 'aziz sancar');
  assert.equal(normalizeKey('Seks ve Genç Kız (film)'), 'seks ve genç kız');
});

test('crossPlatform: aynı konu farklı platformlarda birleşir', () => {
  const list = crossPlatform({
    google: { status: 'ok', items: [{ title: 'kış saati' }, { title: 'derbi' }] },
    tiktok: { status: 'ok', items: [{ title: '#kışsaati' }] },
    youtube: { status: 'ok', items: [{ title: 'Derbi maç özeti — tüm goller' }] },
    x: { status: 'skipped', items: [{ title: 'kış saati' }] },
  });
  const kis = list.find((t) => t.title === 'kış saati');
  assert.deepEqual(kis.platforms.sort(), ['google', 'tiktok']);
  assert.equal(kis.total, 200);
  assert.deepEqual(list.find((t) => t.title === 'derbi').platforms.sort(), ['google', 'youtube']);
});

test('Google Trends: günlük görüntüler toplanır', () => {
  const items = googleAggregate([
    { date: '2026-10-19', items: [{ title: 'Derbi', traffic: 1000, news: [] }] },
    { date: '2026-10-20', items: [{ title: 'derbi', traffic: 500, news: [] }, { title: 'Kar', traffic: 2000, news: [] }] },
  ]);
  assert.equal(items[0].title, 'Kar');
  assert.equal(items[1].traffic, 1500);
  assert.equal(items[1].days, 2);
});
