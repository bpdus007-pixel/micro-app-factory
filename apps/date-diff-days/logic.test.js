import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffDates, addDays, parseDate, toDayNumber, fromDayNumber, weekdayName, monthsAndDays } from './logic.js';

test('day numbers: epoch, known weekdays, round trip', () => {
  assert.equal(toDayNumber({ y: 1970, m: 1, d: 1 }), 0);
  assert.equal(toDayNumber({ y: 2000, m: 1, d: 1 }), 10957);
  assert.equal(weekdayName(10957), '토요일');
  assert.equal(weekdayName(toDayNumber({ y: 2026, m: 10, d: 9 })), '금요일');
  for (const z of [-719162, -1, 0, 59, 11016, 20735, 2932896]) assert.equal(toDayNumber(fromDayNumber(z)), z);
});

test('normal: 2026-01-01 -> 2026-12-25 = 358 days, 51w 1d, 11 months 24 days', () => {
  const r = diffDates({ start: '2026-01-01', end: '2026-12-25' });
  assert.equal(r.ok, true);
  assert.equal(r.direction, 'after');
  assert.equal(r.days, 358);
  assert.equal(r.weeks, 51);
  assert.equal(r.weekRest, 1);
  assert.equal(r.months, 11);
  assert.equal(r.monthRest, 24);
  assert.equal(r.endLabel, '2026년 12월 25일 금요일');
});

test('normal: include start day adds one', () => {
  const r = diffDates({ start: '2026-01-01', end: '2026-01-03', includeStart: true });
  assert.equal(r.days, 3);
  assert.equal(r.monthRest, 3);
});

test('boundary: leap years, same day, reverse order, end of month', () => {
  assert.equal(diffDates({ start: '2024-02-28', end: '2024-03-01' }).days, 2);
  assert.equal(diffDates({ start: '2023-02-28', end: '2023-03-01' }).days, 1);
  const same = diffDates({ start: '2026-10-09', end: '2026.10.9' });
  assert.equal(same.direction, 'same');
  assert.equal(same.days, 0);
  const rev = diffDates({ start: '2026-03-10', end: '2026-03-01' });
  assert.equal(rev.direction, 'before');
  assert.equal(rev.days, 9);
  assert.deepEqual(monthsAndDays({ y: 2026, m: 1, d: 31 }, { y: 2026, m: 2, d: 28 }), { months: 1, days: 0 });
  assert.deepEqual(monthsAndDays({ y: 2026, m: 1, d: 31 }, { y: 2026, m: 3, d: 1 }), { months: 1, days: 1 });
  assert.deepEqual(monthsAndDays({ y: 2026, m: 1, d: 15 }, { y: 2026, m: 3, d: 14 }), { months: 1, days: 27 });
});

test('normal: add days and 100-day anniversary', () => {
  const r = addDays({ base: '2026-10-09', days: '100' });
  assert.equal(r.ok, true);
  assert.equal(r.iso, '2027-01-17');
  assert.equal(r.weekday, '일요일');
  const a = addDays({ base: '2026-10-09', days: '100', countBaseAsDay1: true });
  assert.equal(a.iso, '2027-01-16');
  assert.equal(a.label, '2027년 1월 16일 토요일');
});

test('boundary: negative days across leap day, day-1 counting backwards', () => {
  assert.equal(addDays({ base: '2024-03-01', days: '-1' }).iso, '2024-02-29');
  assert.equal(addDays({ base: '2024-03-01', days: '-1', countBaseAsDay1: true }).iso, '2024-03-01');
  assert.equal(addDays({ base: '2026-10-09', days: '0' }).iso, '2026-10-09');
  assert.equal(addDays({ base: '2026-10-09', days: '1,000' }).iso, '2029-07-05');
});

test('invalid: empty, nonexistent dates, bad day counts, out of range', () => {
  assert.equal(parseDate('2026-02-30'), null);
  assert.equal(parseDate('2025-02-29'), null);
  assert.deepEqual(parseDate('2024-02-29'), { y: 2024, m: 2, d: 29 });
  assert.match(diffDates({ start: '', end: '2026-01-01' }).error, /시작일을 입력/);
  assert.match(diffDates({ start: '2026-01-01', end: '2026-13-01' }).error, /종료일이 올바른 날짜가 아닙니다/);
  assert.match(addDays({ base: '2026-10-09', days: '' }).error, /일수를 입력/);
  assert.match(addDays({ base: '2026-10-09', days: '1.5' }).error, /정수/);
  assert.match(addDays({ base: '2026-10-09', days: 'abc' }).error, /정수/);
  assert.match(addDays({ base: '2026-10-09', days: '100001' }).error, /사이로/);
  assert.match(addDays({ base: '2026-10-09', days: '0', countBaseAsDay1: true }).error, /0일을 쓸 수 없습니다/);
  assert.match(addDays({ base: '9999-12-31', days: '1' }).error, /범위/);
});
