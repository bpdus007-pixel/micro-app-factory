// __ID__ __TITLE__ — pure logic (no DOM). Every function the UI needs for its result lives here.
import { parseNumber } from '../_shared/num.js';

/** Replace with the real calculation. Return { ok: true, ... } or { ok: false, error: '한국어 오류 문구' }. */
export function compute(input) {
  const x = parseNumber(input?.x);
  if (!Number.isFinite(x)) return { ok: false, error: '숫자를 입력하세요.' };
  return { ok: true, value: x };
}
