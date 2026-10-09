// Pure number helpers shared by apps (no DOM). Safe to import from Node tests.

/**
 * Parse a user-entered number. Accepts "1,234.5", " 12 ", "-3".
 * Returns NaN for empty or malformed input (never silently 0).
 */
export function parseNumber(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : NaN;
  if (input == null) return NaN;
  const s = String(input).trim().replace(/,/g, '');
  if (s === '' || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Format with thousands separators and at most `digits` fraction digits (ko-KR). */
export function formatNumber(n, digits = 2) {
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits });
}
