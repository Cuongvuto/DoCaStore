import test from 'node:test';
import assert from 'node:assert/strict';
import { pagination, dateRange, chartWindow, queryText, enumFilter, escapeRegex, productInput } from '../src/utils/adminQuery.js';

test('pagination caps expensive limits and rejects malformed query objects', () => {
  assert.deepEqual(pagination({ page: '2', limit: '999' }), { page: 2, limit: 50, skip: 50 });
  for (const page of ['0', '-1', '1.5', '2abc', [], { $gt: 0 }]) assert.throws(() => pagination({ page }), { status: 400 });
});

test('search is literal and rejects operator objects and overlong values', () => {
  const input = 'Shimano (M+) [2026].*';
  assert.equal(new RegExp(escapeRegex(input)).test(input), true);
  assert.equal(new RegExp(escapeRegex('.*')).test('anything'), false);
  assert.throws(() => queryText({ $ne: null }), { status: 400 });
  assert.throws(() => queryText('a'.repeat(101)), { status: 400 });
  assert.throws(() => enumFilter('unknown', ['pending']), { status: 400 });
});

test('date filters include the full Vietnam business day using an exclusive upper bound', () => {
  const result = dateRange('2026-09-21', '2026-09-21');
  assert.equal(result.$gte.toISOString(), '2026-09-20T17:00:00.000Z');
  assert.equal(result.$lt.toISOString(), '2026-09-21T17:00:00.000Z');
  assert.deepEqual(dateRange(), {});
});

test('date filters reject reversed dates and impossible dates', () => {
  assert.throws(() => dateRange('2026-02-30'), { status: 400 });
  assert.throws(() => dateRange('2026-09-22', '2026-09-21'), { status: 400 });
  assert.throws(() => dateRange(['2026-09-21']), { status: 400 });
  assert.ok(dateRange('2024-02-29').$gte instanceof Date);
});

test('daily dashboard buckets use UTC+7 and contain zero values until filled', () => {
  const { buckets, start } = chartWindow('daily', new Date('2026-09-20T18:00:00Z'));
  assert.equal(buckets.length, 7);
  assert.equal(buckets.at(-1).key, '2026-09-21');
  assert.equal(start.toISOString(), '2026-09-14T17:00:00.000Z');
  assert.ok(buckets.every(row => row.value === 0));
});

test('weekly buckets start Monday and monthly buckets preserve years across New Year', () => {
  const weekly = chartWindow('weekly', new Date('2026-01-01T05:00:00Z'));
  assert.equal(weekly.buckets.length, 8);
  assert.equal(weekly.buckets.at(-1).key, '2025-12-29');
  const monthly = chartWindow('monthly', new Date('2026-01-31T05:00:00Z'));
  assert.equal(monthly.buckets.length, 12);
  assert.equal(monthly.buckets[0].key, '2025-02-01');
  assert.equal(monthly.buckets.at(-1).key, '2026-01-01');
  assert.throws(() => chartWindow('invalid'), { status: 400 });
  assert.throws(() => chartWindow(''), { status: 400 });
});

test('product updates permit only editable fields and preserve explicit zero stock', () => {
  assert.deepEqual(productInput({ name: ' Cần M+ ', stock: '0', sold: 100, ratings: 5, _id: 'other', isTrending: 'false' }, true), { name: 'Cần M+', stock: 0, isTrending: false });
  assert.deepEqual(productInput({ description: '' }, true), { description: '' });
});

test('product validation rejects negative, fractional, infinite and empty numbers', () => {
  for (const price of ['0', '-1', '1.5', 'Infinity', '', [], null]) assert.throws(() => productInput({ price }, true), { status: 400 });
  for (const stock of ['-1', '0.5', 'Infinity', '']) assert.throws(() => productInput({ stock }, true), { status: 400 });
  assert.throws(() => productInput({ category_id: 'unknown' }, true), { status: 400 });
  assert.throws(() => productInput({ isTrending: 'yes' }, true), { status: 400 });
  assert.throws(() => productInput({ name: '  ' }, true), { status: 400 });
});
