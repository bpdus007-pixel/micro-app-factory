// A0001 단위가격 비교 계산기 — pure logic (no DOM).
import { parseNumber } from '../_shared/num.js';

export const UNITS = {
  g: { dim: 'weight', factor: 1 },
  kg: { dim: 'weight', factor: 1000 },
  ml: { dim: 'volume', factor: 1 },
  L: { dim: 'volume', factor: 1000 },
  ea: { dim: 'count', factor: 1 },
};

const BASIS = {
  weight: { per: 100, label: '100g당' },
  volume: { per: 100, label: '100ml당' },
  count: { per: 1, label: '1개당' },
};

export const MAX_ITEMS = 10;

/** True when every user-entered field of the row is blank (row is ignored). */
export function isBlankRow(row) {
  return ['price', 'amount', 'pack'].every((k) => row[k] == null || String(row[k]).trim() === '');
}

/**
 * Compare unit prices.
 * rows: [{ name, price, amount, unit, pack }] — strings or numbers; pack defaults to 1.
 * Returns { ok: true, basisLabel, items: [...], cheapest } or { ok: false, error }.
 */
export function compareUnitPrices(rows) {
  if (!Array.isArray(rows)) return { ok: false, error: '입력 형식이 올바르지 않습니다.' };
  const filled = rows.map((r, i) => ({ ...r, _index: i })).filter((r) => !isBlankRow(r));
  if (filled.length < 2) return { ok: false, error: '비교할 상품을 2개 이상 입력하세요.' };
  if (filled.length > MAX_ITEMS) return { ok: false, error: `상품은 최대 ${MAX_ITEMS}개까지 비교할 수 있습니다.` };

  let dim = null;
  const items = [];
  for (const r of filled) {
    const label = (r.name && String(r.name).trim()) || `상품 ${r._index + 1}`;
    const price = parseNumber(r.price);
    const amount = parseNumber(r.amount);
    const packRaw = r.pack == null || String(r.pack).trim() === '' ? 1 : parseNumber(r.pack);
    const unit = UNITS[r.unit];
    if (!unit) return { ok: false, error: `${label}: 단위를 선택하세요.` };
    if (!Number.isFinite(price) || price <= 0) return { ok: false, error: `${label}: 가격은 0보다 큰 숫자여야 합니다.` };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: `${label}: 용량은 0보다 큰 숫자여야 합니다.` };
    if (!Number.isFinite(packRaw) || packRaw < 1 || !Number.isInteger(packRaw)) {
      return { ok: false, error: `${label}: 묶음 수량은 1 이상의 정수여야 합니다.` };
    }
    if (dim && unit.dim !== dim) {
      return { ok: false, error: '무게(g·kg), 부피(ml·L), 개수 단위를 섞어서 비교할 수 없습니다.' };
    }
    dim = unit.dim;
    const baseQty = amount * unit.factor * packRaw;
    items.push({ index: r._index, name: label, price, baseQty, perUnit: (price / baseQty) * BASIS[dim].per });
  }

  const min = Math.min(...items.map((x) => x.perUnit));
  const sorted = [...items].sort((a, b) => a.perUnit - b.perUnit);
  for (const it of items) {
    it.rank = sorted.indexOf(it) + 1;
    it.diffPct = min > 0 ? ((it.perUnit - min) / min) * 100 : 0;
    it.isCheapest = Math.abs(it.perUnit - min) < 1e-9;
  }
  const cheapest = items.filter((x) => x.isCheapest).map((x) => x.name);
  return { ok: true, basisLabel: BASIS[dim].label, items, cheapest };
}
