import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareUnitPrices, MAX_ITEMS } from './logic.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('normal: kg vs g comparison picks cheaper per 100g', () => {
  const r = compareUnitPrices([
    { name: 'A', price: '5,000', amount: '1', unit: 'kg' },
    { name: 'B', price: 1200, amount: 200, unit: 'g' },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.basisLabel, '100g당');
  near(r.items[0].perUnit, 500);
  near(r.items[1].perUnit, 600);
  assert.deepEqual(r.cheapest, ['A']);
  near(r.items[1].diffPct, 20);
  assert.equal(r.items[1].rank, 2);
});

test('normal: pack multiplier and liters', () => {
  const r = compareUnitPrices([
    { name: '6입', price: 9000, amount: 500, unit: 'ml', pack: 6 },
    { name: '대용량', price: 4000, amount: 2, unit: 'L' },
  ]);
  assert.equal(r.ok, true);
  near(r.items[0].perUnit, 300);
  near(r.items[1].perUnit, 200);
  assert.deepEqual(r.cheapest, ['대용량']);
});

test('normal: count unit and ties', () => {
  const r = compareUnitPrices([
    { name: 'X', price: 1000, amount: 10, unit: 'ea' },
    { name: 'Y', price: 2000, amount: 20, unit: 'ea' },
  ]);
  assert.equal(r.basisLabel, '1개당');
  assert.deepEqual(r.cheapest, ['X', 'Y']);
});

test('boundary: blank rows ignored, unnamed rows get default label', () => {
  const r = compareUnitPrices([
    { name: '', price: '100', amount: '1', unit: 'g' },
    { name: '', price: '', amount: '', unit: 'g' },
    { name: '', price: '0.5', amount: '0.001', unit: 'kg' },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.items.length, 2);
  assert.equal(r.items[1].name, '상품 3');
  near(r.items[1].perUnit, 50);
});

test('boundary: max item count', () => {
  const rows = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({ price: i + 1, amount: 1, unit: 'g' }));
  assert.equal(compareUnitPrices(rows).ok, false);
  assert.equal(compareUnitPrices(rows.slice(0, MAX_ITEMS)).ok, true);
});

test('invalid: fewer than 2 items', () => {
  assert.equal(compareUnitPrices([{ price: 1, amount: 1, unit: 'g' }]).ok, false);
  assert.equal(compareUnitPrices([]).ok, false);
  assert.equal(compareUnitPrices(null).ok, false);
});

test('invalid: zero, negative, text, bad pack, mixed dimensions', () => {
  const base = { price: 100, amount: 1, unit: 'g' };
  assert.match(compareUnitPrices([base, { ...base, price: 0 }]).error, /가격/);
  assert.match(compareUnitPrices([base, { ...base, amount: -1 }]).error, /용량/);
  assert.match(compareUnitPrices([base, { ...base, price: 'abc' }]).error, /가격/);
  assert.match(compareUnitPrices([base, { ...base, pack: 1.5 }]).error, /묶음/);
  assert.match(compareUnitPrices([base, { ...base, unit: 'ml' }]).error, /섞어서/);
  assert.match(compareUnitPrices([base, { ...base, unit: 'oz' }]).error, /단위/);
});
