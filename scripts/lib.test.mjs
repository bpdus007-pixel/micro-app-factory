import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextAppId, parseArgs } from './lib.mjs';
import { parseNumber } from '../apps/_shared/num.js';

test('nextAppId pads and increments', () => {
  assert.equal(nextAppId([]), 'A0001');
  assert.equal(nextAppId([{ id: 'A0009' }, { id: 'A0002' }]), 'A0010');
});

test('parseArgs handles values and flags', () => {
  assert.deepEqual(parseArgs(['--live', '--only', 'x', 'pos']), { _: ['pos'], live: true, only: 'x' });
});

test('parseNumber accepts commas and rejects junk', () => {
  assert.equal(parseNumber('1,234.5'), 1234.5);
  assert.equal(parseNumber(' -3 '), -3);
  assert.equal(parseNumber('.5'), 0.5);
  assert.ok(Number.isNaN(parseNumber('')));
  assert.ok(Number.isNaN(parseNumber('12abc')));
  assert.ok(Number.isNaN(parseNumber(null)));
  assert.ok(Number.isNaN(parseNumber(Infinity)));
});
