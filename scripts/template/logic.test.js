import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute } from './logic.js';

// Minimum: normal cases, boundary cases, invalid inputs. Check exact expected numbers.
test('normal', () => {
  assert.deepEqual(compute({ x: '3' }), { ok: true, value: 3 });
});

test('boundary', () => {
  assert.equal(compute({ x: '0' }).ok, true);
});

test('invalid', () => {
  assert.equal(compute({ x: '' }).ok, false);
  assert.equal(compute({ x: 'abc' }).ok, false);
});
