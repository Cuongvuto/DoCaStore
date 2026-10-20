import test from 'node:test';
import assert from 'node:assert/strict';
import Order from '../src/models/oderModel.js';
import Product from '../src/models/productsModel.js';
import Conversation from '../src/models/conversationModel.js';
import { getDashboardOverview, getActivityChartData } from '../src/controller/dashboardController.js';

const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('support dashboard never queries or returns order revenue or customer orders', async t => {
  const orderQuery = t.mock.method(Order, 'aggregate', () => { throw new Error('Financial query should not execute'); });
  t.mock.method(Conversation, 'countDocuments', async filter => filter.status === 'pending' ? 2 : 3);
  const res = response();
  await getDashboardOverview({ user: { role: 'support_admin' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(orderQuery.mock.callCount(), 0);
  assert.deepEqual(res.body.data.stats, { waitingTickets: 2, activeTickets: 3 });
  assert.deepEqual(res.body.data.recentOrders, []);
  assert.equal(res.body.data.permissions.orders, false);
});

test('product dashboard exposes stock metrics without order or user data', async t => {
  t.mock.method(Product, 'countDocuments', async () => 0);
  t.mock.method(Product, 'find', () => ({ sort() { return this; }, limit() { return this; }, select() { return this; }, async lean() { return []; } }));
  const orderQuery = t.mock.method(Order, 'aggregate', () => { throw new Error('Forbidden financial query'); });
  const res = response();
  await getDashboardOverview({ user: { role: 'product_admin' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(orderQuery.mock.callCount(), 0);
  assert.deepEqual(res.body.data.stats, { totalProducts: 0, outOfStock: 0, lowStockCount: 0 });
  assert.equal(res.body.data.permissions.users, false);
});

test('empty chart returns zero-filled data rather than sample revenue', async t => {
  t.mock.method(Order, 'aggregate', async () => []);
  const res = response();
  await getActivityChartData({ query: { period: 'daily' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.length, 7);
  assert.ok(res.body.data.every(row => row.value === 0));
});

test('invalid chart period is rejected before database access', async t => {
  const query = t.mock.method(Order, 'aggregate', async () => []);
  const res = response();
  await getActivityChartData({ query: { period: 'other' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(query.mock.callCount(), 0);
});
