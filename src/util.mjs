import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const USER_AGENT =
  'turkiye-trendleri-bot/1.0 (+https://github.com/aytcode/turkiye-trendleri)';

/** fetch + zaman aşımı + anlaşılır hata mesajı */
export async function http(url, { timeout = 20000, json = true, ...init } = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': USER_AGENT, ...(init.headers || {}) },
    signal: AbortSignal.timeout(timeout),
  });
  const body = json ? await res.json().catch(() => null) : await res.text();
  if (!res.ok) {
    const detail = json ? JSON.stringify(body)?.slice(0, 300) : String(body).slice(0, 300);
    const err = new Error(`HTTP ${res.status} — ${url.split('?')[0]} — ${detail}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

export async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function writeText(path, text) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, 'utf8');
}

export const writeJson = (path, data) => writeText(path, JSON.stringify(data, null, 2) + '\n');

/** YYYY-MM-DD (UTC) */
export const ymd = (d) => d.toISOString().slice(0, 10);

export function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** ISO 8601 hafta kimliği, ör. 2026-W43 */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Bir ISO haftasının Pazartesi..Pazar günleri */
export function weekDays(weekId) {
  const [y, w] = weekId.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday = addDays(jan4, -((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => ymd(addDays(monday, i)));
}

/** Türkçe kurallarına uygun küçük harf + sadeleştirme; platformlar arası eşleştirme anahtarı */
export function normalizeKey(text) {
  let s = String(text).trim();
  // #GalatasarayFenerbahçe -> galatasaray fenerbahçe (yalnızca hashtag'lerde)
  if (s.startsWith('#')) s = s.slice(1).replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2');
  return s
    .replace(/_/g, ' ')
    .toLocaleLowerCase('tr-TR')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^\p{L}\p{N} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const formatNumber = (n) =>
  n == null || Number.isNaN(n) ? '—' : new Intl.NumberFormat('tr-TR').format(Math.round(n));

export function compactNumber(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function formatDateTr(dateStr) {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(dateStr + 'T00:00:00Z'));
}

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const escapeMd = (s) => String(s ?? '').replace(/([\\|*_`[\]<>])/g, '\\$1').replace(/\n/g, ' ');

export const log = (...args) => console.log('[trendler]', ...args);
