// A0002 날짜 간격·D-day 계산기 — pure logic (no DOM).
// Dates are handled as integer day numbers (0 = 1970-01-01) so time zones and DST never shift results.

export const MAX_ADD_DAYS = 100000;
const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInMonth = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

/** Civil date -> day number (Howard Hinnant's days_from_civil). */
export function toDayNumber({ y, m, d }) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Day number -> civil date (civil_from_days). */
export function fromDayNumber(z) {
  const zz = z + 719468;
  const era = Math.floor(zz / 146097);
  const doe = zz - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: era * 400 + yoe + (m <= 2 ? 1 : 0), m, d };
}

export const weekdayName = (z) => WEEKDAYS[(((z + 4) % 7) + 7) % 7];

/** "2026-10-09" (also "2026.10.9", "2026/10/09") -> {y,m,d} | null when empty, malformed or nonexistent. */
export function parseDate(input) {
  const s = String(input ?? '').trim();
  const mt = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})\.?$/.exec(s);
  if (!mt) return null;
  const [y, m, d] = [Number(mt[1]), Number(mt[2]), Number(mt[3])];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
export const isoDate = ({ y, m, d }) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
export const koreanDate = (z) => {
  const c = fromDayNumber(z);
  return `${c.y}년 ${c.m}월 ${c.d}일 ${weekdayName(z)}`;
};

function readDate(input, label) {
  if (String(input ?? '').trim() === '') return { error: `${label}을 입력하세요.` };
  const c = parseDate(input);
  if (!c) return { error: `${label}이 올바른 날짜가 아닙니다. 연-월-일(예: 2026-10-09) 형식의 실제 날짜를 입력하세요.` };
  return { c, z: toDayNumber(c) };
}

/** Whole months from `a` to `b` (a <= b); an end date on the last day of its month completes the month. */
export function monthsAndDays(a, b) {
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d && b.d !== daysInMonth(b.y, b.m)) months -= 1;
  const ym = a.y * 12 + (a.m - 1) + months;
  const ay = Math.floor(ym / 12);
  const am = (ym % 12) + 1;
  const anchor = { y: ay, m: am, d: Math.min(a.d, daysInMonth(ay, am)) };
  return { months, days: toDayNumber(b) - toDayNumber(anchor) };
}

/** Days between two dates. includeStart counts both the start and end day (1월 1일~1월 3일 = 3일). */
export function diffDates({ start, end, includeStart = false }) {
  const s = readDate(start, '시작일');
  if (s.error) return { ok: false, error: s.error };
  const e = readDate(end, '종료일');
  if (e.error) return { ok: false, error: e.error };
  const raw = e.z - s.z;
  const extra = includeStart ? 1 : 0;
  const total = Math.abs(raw) + extra;
  const [from, to] = raw >= 0 ? [s.c, e.c] : [e.c, s.c];
  const md = monthsAndDays(from, to);
  return {
    ok: true,
    direction: raw > 0 ? 'after' : raw < 0 ? 'before' : 'same',
    days: total,
    weeks: Math.floor(total / 7),
    weekRest: total % 7,
    months: md.months,
    monthRest: md.days + extra,
    startLabel: koreanDate(s.z),
    endLabel: koreanDate(e.z),
  };
}

/** Date `days` after (negative: before) the base date. countBaseAsDay1: the base date is day 1 (기념일 방식). */
export function addDays({ base, days, countBaseAsDay1 = false }) {
  const b = readDate(base, '기준일');
  if (b.error) return { ok: false, error: b.error };
  const t = String(days ?? '').trim().replace(/,/g, '');
  if (t === '') return { ok: false, error: '더할 일수를 입력하세요. 이전 날짜는 -30처럼 음수로 입력합니다.' };
  if (!/^[-+]?\d+$/.test(t)) return { ok: false, error: '일수는 정수로 입력하세요 (예: 100, -30).' };
  const n = Number(t);
  if (Math.abs(n) > MAX_ADD_DAYS) {
    const lim = MAX_ADD_DAYS.toLocaleString('ko-KR');
    return { ok: false, error: `일수는 -${lim} ~ ${lim} 사이로 입력하세요.` };
  }
  if (countBaseAsDay1 && n === 0) return { ok: false, error: '기준일을 1일째로 셀 때는 0일을 쓸 수 없습니다. 1 이상 또는 -1 이하로 입력하세요.' };
  const offset = countBaseAsDay1 ? (n > 0 ? n - 1 : n + 1) : n;
  const z = b.z + offset;
  const c = fromDayNumber(z);
  if (c.y < 1 || c.y > 9999) return { ok: false, error: '결과 날짜가 0001년~9999년 범위를 벗어납니다. 일수를 줄이세요.' };
  return { ok: true, iso: isoDate(c), label: koreanDate(z), weekday: weekdayName(z), offset, baseLabel: koreanDate(b.z) };
}
