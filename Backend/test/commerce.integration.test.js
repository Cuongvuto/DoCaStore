import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../src/models/userModel.js';
import Cart from '../src/models/cartModel.js';
import Product from '../src/models/productsModel.js';
import Order from '../src/models/oderModel.js';
import Coupon from '../src/models/couponModel.js';
import Conversation from '../src/models/conversationModel.js';
import Message from '../src/models/messageModel.js';
import Notification from '../src/models/notificationModel.js';
import { placeOrder, transitionOrder, recordPayment } from '../src/services/orderService.js';
import { abortPaymentSetup } from '../src/services/paymentService.js';
import { claimConversation, openConversation } from '../src/services/supportService.js';
import { deliverNotification } from '../src/services/notificationService.js';
import { cancelOrder } from '../src/controller/orderController.js';
import { getConversations, messagePage } from '../src/controller/messageController.js';
import { getActivityChartData } from '../src/controller/dashboardController.js';
import { markAsRead } from '../src/controller/notificationController.js';
import { updateProduct } from '../src/controller/productController.js';
import { expireOrders, startCronJobs } from '../src/utils/cronjob.js';
import { mountOrderRoutes } from '../src/routes/orderRoutes.js';
import { signatureFor } from '../src/services/paymentService.js';

let replica;
before(async () => {
  // Never uses .env or an existing database. A disposable local replica set is required.
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
  await mongoose.connect(replica.getUri(), { dbName: 'doca_commerce_test' });
  await Promise.all([User, Cart, Product, Order, Coupon, Conversation, Message, Notification].map(model => model.init()));
}, { timeout: 180000 });
after(async () => { await mongoose.disconnect(); if (replica) await replica.stop(); });
beforeEach(async () => {
  await Promise.all([User, Cart, Product, Order, Coupon, Conversation, Message, Notification].map(model => model.deleteMany({})));
});
const input = { paymentMethod: 'COD', shippingAddress: { receiverName: 'Test', phone: '0900000000', street: '1', ward: 'Ward', district: 'District', city: 'City' } };
const actor = { kind: 'admin', role: 'order_admin' };
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
async function customer(email, product, quantity = 1) {
  const user = await User.create({ name: 'Test', email, password: 'test-only', isVerified: true });
  await Cart.create({ user_id: user._id, items: [{ product_id: product._id, quantity }] });
  return user;
}
const product = (stock = 10) => Product.create({ name: 'Rod', price: 100000, stock, category_id: new mongoose.Types.ObjectId() });
const coupon = () => Coupon.create({ code: 'TEST', discountPercent: 10, usageLimit: 1, expiryDate: new Date(Date.now() + 86400000) });

test('stale admin stock cannot overwrite a checkout; metadata-only edits preserve live stock', async () => {
  const p = await product(10); const u = await customer('stock@test.local', p, 2);
  await placeOrder(u._id, input);
  const stale = response();
  await updateProduct({ params: { id: String(p._id) }, body: { name: 'Stale', stock: '12', expectedStock: '10' } }, stale);
  assert.equal(stale.statusCode, 409);
  assert.equal((await Product.findById(p._id)).stock, 8);
  assert.equal((await Product.findById(p._id)).name, 'Rod');
  const metadata = response();
  await updateProduct({ params: { id: String(p._id) }, body: { name: 'Fresh description' } }, metadata);
  assert.equal(metadata.statusCode, 200);
  assert.equal((await Product.findById(p._id)).stock, 8);
  const fresh = response();
  await updateProduct({ params: { id: String(p._id) }, body: { stock: '12', expectedStock: '8' } }, fresh);
  assert.equal(fresh.statusCode, 200);
  assert.equal((await Product.findById(p._id)).stock, 12);
});

test('stock updates require a valid snapshot and concurrent editors cannot overwrite each other', async () => {
  const p = await product(10);
  for (const body of [{ stock: 20 }, { stock: 20, expectedStock: {} }, { stock: 20, expectedStock: '' }, { stock: 20, expectedStock: -1 }]) {
    const res = response();
    await updateProduct({ params: { id: String(p._id) }, body }, res);
    assert.ok([400, 409].includes(res.statusCode));
    assert.equal((await Product.findById(p._id)).stock, 10);
  }
  const responses = await Promise.all([11, 12].map(async stock => {
    const res = response();
    await updateProduct({ params: { id: String(p._id) }, body: { stock, expectedStock: 10 } }, res);
    return res;
  }));
  assert.deepEqual(responses.map(res => res.statusCode).sort(), [200, 409]);
});

async function legacyOrder(status = 'pending') {
  const p = await product(); const u = await customer('legacy@test.local', p);
  const order = await Order.create({ userId: u._id, products: [{ productId: p._id, quantity: 1, priceAtPurchase: p.price }],
    shippingAddress: input.shippingAddress, totalPrice: 85000.4, paymentMethod: 'VietQR', payosOrderCode: 12345678,
    status, createdAt: new Date(Date.now() - 3600000) });
  return { order, p, u };
}

test('legacy cancellation and fulfillment require inventory evidence without changing stock', async () => {
  const { order, p } = await legacyOrder();
  await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'paid' } });
  for (const status of ['cancelled', 'processing']) {
    await assert.rejects(transitionOrder(order._id, status, actor, 'Legacy check'), error => error.status === 409);
  }
  assert.equal((await Product.findById(p._id)).stock, 10);
  assert.equal((await Order.findById(order._id)).status, 'pending');
});

test('legacy rounded payment is recorded once and flagged for inventory review, never auto-fulfilled', async () => {
  const { order, p } = await legacyOrder();
  const data = { orderCode: order.payosOrderCode, amount: 85000, currency: 'VND', reference: 'LEGACY-PAY' };
  await recordPayment(data);
  await recordPayment(data);
  const saved = await Order.findById(order._id);
  assert.equal(saved.paymentStatus, 'paid');
  assert.equal(saved.status, 'pending');
  assert.equal(saved.paymentReview, 'inventory_unconfirmed');
  assert.equal(saved.paymentEvents.length, 1);
  assert.equal((await Product.findById(p._id)).stock, 10);
});

test('legacy coupon evidence is required before cancellation can release stock or coupon usage', async () => {
  const { order, p } = await legacyOrder();
  await Order.updateOne({ _id: order._id }, { $set: { stockReserved: true, couponCode: 'OLD' } });
  await assert.rejects(transitionOrder(order._id, 'cancelled', actor, 'Review'), error => error.status === 409);
  assert.equal((await Product.findById(p._id)).stock, 10);
  assert.equal((await Order.findById(order._id)).status, 'pending');
});

test('cron leaves pending and cancelled legacy links untouched, but expires eligible new orders', async t => {
  const { order: old, p, u } = await legacyOrder();
  const { order: current } = await placeOrder(u._id, { ...input, paymentMethod: 'VietQR' });
  // createdAt is immutable through Mongoose; seed the old timestamp explicitly.
  await Order.collection.updateOne({ _id: current._id }, { $set: { paymentLinkState: 'ready', createdAt: new Date(Date.now() - 3600000) } });
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, method: options.method || 'GET' });
    assert.ok(url.includes(String(current.payosOrderCode)), 'No provider call may concern an unreconciled legacy order');
    return { ok: true, json: async () => ({ code: '00', data: { status: 'CANCELLED', amountPaid: 0 } }) };
  });
  await expireOrders();
  assert.equal((await Order.findById(old._id)).status, 'pending');
  assert.equal((await Order.findById(current._id)).status, 'cancelled');
  assert.equal((await Product.findById(p._id)).stock, 10);
  await Order.updateOne({ _id: old._id }, { $set: { status: 'cancelled' } });
  requests.length = 0;
  await expireOrders();
  assert.equal(requests.length, 0);
});

test('maintenance is disabled unless explicitly enabled', t => {
  const previous = process.env.ENABLE_MAINTENANCE_JOBS;
  t.after(() => { if (previous === undefined) delete process.env.ENABLE_MAINTENANCE_JOBS; else process.env.ENABLE_MAINTENANCE_JOBS = previous; });
  delete process.env.ENABLE_MAINTENANCE_JOBS;
  assert.equal(startCronJobs(), null);
  process.env.ENABLE_MAINTENANCE_JOBS = 'false';
  assert.equal(startCronJobs(), null);
});

test('old and new HTTP order paths enforce authentication and accept signed webhook setup', async t => {
  const previous = process.env.PAYOS_CHECKSUM_KEY;
  process.env.PAYOS_CHECKSUM_KEY = 'local-test-checksum';
  t.after(() => { if (previous === undefined) delete process.env.PAYOS_CHECKSUM_KEY; else process.env.PAYOS_CHECKSUM_KEY = previous; });
  const app = express();
  app.use(express.json());
  mountOrderRoutes(app);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const data = { code: '00', orderCode: 999999, amount: 2000, currency: 'VND', reference: 'setup' };
  for (const path of ['/api/order', '/api/orders']) {
    const list = await fetch(base + path);
    assert.equal(list.status, 401);
    const webhook = await fetch(base + path + '/payos-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, signature: signatureFor(data, 'local-test-checksum') }) });
    assert.equal(webhook.status, 200);
    assert.equal((await webhook.json()).error, 0);
    const invalid = await fetch(base + path + '/payos-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, signature: '0'.repeat(64) }) });
    assert.equal(invalid.status, 401);
  }
});

test('simultaneous checkouts cannot oversell the last unit', async () => {
  const p = await product(1);
  const a = await customer('a@test.local', p); const b = await customer('b@test.local', p);
  const results = await Promise.allSettled([placeOrder(a._id, input), placeOrder(b._id, input)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await Order.countDocuments(), 1);
  assert.equal((await Product.findById(p._id)).stock, 0);
  assert.equal(await Cart.countDocuments({ 'items.0': { $exists: true } }), 1);
});
test('simultaneous checkout retries create one order and reserve once', async () => {
  const p = await product(); const u = await customer('a@test.local', p);
  const key = 'test-checkout-key-12345';
  const results = await Promise.all([placeOrder(u._id, input, key), placeOrder(u._id, input, key)]);
  assert.equal(String(results[0].order._id), String(results[1].order._id));
  assert.equal(await Order.countDocuments(), 1); assert.equal((await Product.findById(p._id)).stock, 9);
});
test('last coupon use is reserved by one buyer; loser stock/cart are preserved', async () => {
  const p = await product(); await coupon();
  const a = await customer('a@test.local', p); const b = await customer('b@test.local', p);
  const results = await Promise.allSettled([placeOrder(a._id, { ...input, couponCode: 'TEST' }), placeOrder(b._id, { ...input, couponCode: 'TEST' })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await Coupon.findOne()).usedCount, 1); assert.equal((await Product.findById(p._id)).stock, 9);
  assert.equal(await Cart.countDocuments({ 'items.0': { $exists: true } }), 1);
});
test('failure after reservations rolls back inventory, coupon, cart and order', async t => {
  const p = await product(); const u = await customer('a@test.local', p); await coupon();
  t.mock.method(Order, 'create', async () => { throw new Error('simulated write failure'); });
  await assert.rejects(placeOrder(u._id, { ...input, couponCode: 'TEST' }), /simulated/);
  assert.equal((await Product.findById(p._id)).stock, 10); assert.equal((await Coupon.findOne()).usedCount, 0);
  assert.equal((await Cart.findOne()).items.length, 1); assert.equal(await Order.countDocuments(), 0);
});
test('concurrent admin/customer/cron cancellation restores stock and coupon exactly once', async () => {
  const p = await product(); const u = await customer('a@test.local', p); await coupon();
  const { order } = await placeOrder(u._id, { ...input, couponCode: 'TEST', paymentMethod: 'VietQR' });
  const results = await Promise.all([actor, { kind: 'customer', id: u._id }, { kind: 'system' }].map(a => transitionOrder(order._id, 'cancelled', a, 'Test cancellation')));
  assert.equal(results.filter(r => r.changed).length, 1);
  assert.equal((await Product.findById(p._id)).stock, 10);
  const c = await Coupon.findOne(); assert.equal(c.usedCount, 0); assert.equal(c.usedBy.length, 0);
  assert.equal((await Order.findById(order._id)).statusHistory.length, 2);
});
test('payment setup failure restores the cart without losing additions', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ code: '00', data: {} }) }));
  const p = await product(); const u = await customer('a@test.local', p);
  const { order } = await placeOrder(u._id, { ...input, paymentMethod: 'VietQR' });
  await Cart.updateOne({ user_id: u._id }, { $push: { items: { product_id: p._id, quantity: 2 } } });
  await abortPaymentSetup(order);
  assert.equal((await Cart.findOne()).items[0].quantity, 3);
  assert.equal((await Product.findById(p._id)).stock, 10);
  assert.equal((await Order.findById(order._id)).status, 'cancelled');
});
test('duplicate payment webhooks do not duplicate history or reserve stock again', async () => {
  const p = await product(); const u = await customer('a@test.local', p);
  const { order } = await placeOrder(u._id, { ...input, paymentMethod: 'VietQR' });
  const data = { orderCode: order.payosOrderCode, amount: order.totalPrice, currency: 'VND', reference: 'R1' };
  const results = await Promise.all([recordPayment(data), recordPayment(data)]);
  assert.equal(results.filter(r => r.changed).length, 1);
  const saved = await Order.findById(order._id);
  assert.equal(saved.status, 'processing'); assert.equal(saved.paymentEvents.length, 1); assert.equal(saved.statusHistory.length, 2);
  assert.equal((await Product.findById(p._id)).stock, 9);
});
test('late payment never revives cancelled order and flags refund', async () => {
  const p = await product(); const u = await customer('a@test.local', p);
  const { order } = await placeOrder(u._id, { ...input, paymentMethod: 'VietQR' });
  await transitionOrder(order._id, 'cancelled', actor, 'Test');
  await recordPayment({ orderCode: order.payosOrderCode, amount: order.totalPrice, currency: 'VND', reference: 'LATE' });
  const saved = await Order.findById(order._id);
  assert.equal(saved.status, 'cancelled'); assert.equal(saved.paymentStatus, 'paid'); assert.equal(saved.paymentReview, 'refund_required');
  assert.equal((await Product.findById(p._id)).stock, 10);
});
test('amount mismatch stays unpaid and is available for reconciliation', async () => {
  const p = await product(); const u = await customer('a@test.local', p);
  const { order } = await placeOrder(u._id, { ...input, paymentMethod: 'VietQR' });
  await recordPayment({ orderCode: order.payosOrderCode, amount: 1, currency: 'VND', reference: 'WRONG' });
  const saved = await Order.findById(order._id);
  assert.equal(saved.status, 'pending'); assert.equal(saved.paymentStatus, 'pending'); assert.equal(saved.paymentReview, 'amount_mismatch');
});
test('completion records COD collection and customer/product metrics once', async () => {
  const p = await product(); const u = await customer('a@test.local', p);
  const { order } = await placeOrder(u._id, input);
  await transitionOrder(order._id, 'processing', actor); await transitionOrder(order._id, 'shipped', actor);
  await Promise.all([transitionOrder(order._id, 'completed', actor), transitionOrder(order._id, 'completed', actor)]);
  const saved = await Order.findById(order._id);
  assert.equal(saved.paymentStatus, 'paid'); assert.ok(saved.completedAt); assert.ok(saved.paidAt);
  assert.equal((await Product.findById(p._id)).sold, 1); assert.equal((await User.findById(u._id)).totalOrders, 1);
  const res = response(); await getActivityChartData({ query: { basis: 'completedAt', period: 'daily' } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.data.reduce((sum, row) => sum + row.value, 0), order.totalPrice);
});
test('two support agents cannot claim the same pending ticket', async () => {
  const ticket = await Conversation.create({ ticketId: 'TK-TEST', customerId: new mongoose.Types.ObjectId() });
  const results = await Promise.allSettled([claimConversation(ticket._id, new mongoose.Types.ObjectId()), claimConversation(ticket._id, new mongoose.Types.ObjectId())]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  await Conversation.updateOne({ _id: ticket._id }, { $set: { status: 'resolved' } });
  await assert.rejects(claimConversation(ticket._id, new mongoose.Types.ObjectId()), { status: 409 });
});
test('conversation summary and message cursor pagination preserve all messages', async () => {
  const user = await User.create({ name: 'Chat customer', email: 'chat@test.local', password: 'test-only' });
  const ticket = await Conversation.create({ ticketId: 'TK-TEST', customerId: user._id });
  await Message.insertMany(Array.from({ length: 55 }, (_, index) => ({ conversationId: ticket._id, customerId: user._id, sender: 'customer', text: 'message ' + index })));
  const first = await messagePage(ticket._id, {}); const second = await messagePage(ticket._id, { before: first.nextBefore });
  assert.equal(first.messages.length, 50); assert.equal(second.messages.length, 5); assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.messages, ...second.messages].map(m => String(m._id))).size, 55);
  const res = response(); await getConversations({ query: { search: 'Chat customer' } }, res);
  assert.equal(res.body.totalCount, 1); assert.equal(res.body.conversations[0].unreadCount, 55); assert.equal(res.body.conversations[0].lastMessage.text, 'message 54');
});
test('users cannot mark another customer notification as read', async () => {
  const notification = await Notification.create({ userId: new mongoose.Types.ObjectId(), title: 'Private', message: 'Private' });
  const res = response(); await markAsRead({ params: { id: notification._id }, user: { id: String(new mongoose.Types.ObjectId()) } }, res);
  assert.equal(res.statusCode, 403); assert.equal((await Notification.findById(notification._id)).isRead, false);
});

test('opening support simultaneously creates one active conversation', async () => {
  const u = await User.create({ name: 'Chat', email: 'chat@test.local', password: 'test-only' });
  const results = await Promise.all([openConversation(u._id), openConversation(u._id)]);
  assert.equal(results.filter(r => r.created).length, 1);
  assert.equal(await Conversation.countDocuments(), 1);
});
test('notification retry is idempotent, changed payload conflicts, and broadcasts are throttled', async () => {
  const u = await User.create({ name: 'Admin', email: 'admin@test.local', password: 'test-only', role: 'admin' });
  const body = { title: 'Test', message: 'Test notification', targetAudience: 'all' };
  const key = 'test-notification-12345';
  const first = await deliverNotification(body, u._id, key);
  const retry = await deliverNotification(body, u._id, key);
  assert.equal(String(first._id), String(retry._id)); assert.equal(await Notification.countDocuments(), 1);
  await assert.rejects(deliverNotification({ ...body, title: 'Changed' }, u._id, key), { status: 409 });
  await assert.rejects(deliverNotification(body, u._id, 'test-notification-67890'), { status: 429 });
});
test('legacy drafts require inventory reconciliation before cancellation', async () => {
  const p = await product(); const u = await customer('legacy@test.local', p);
  const order = await Order.create({ ...input, userId: u._id, products: [{ productId: p._id, quantity: 1, priceAtPurchase: p.price }], totalPrice: p.price });
  await assert.rejects(transitionOrder(order._id, 'cancelled', actor, 'Test'), { status: 409 });
  assert.equal((await Product.findById(p._id)).stock, 10);
});
test('customer cancel endpoint accepts an empty request body', async () => {
  const p = await product(); const u = await customer('cancel@test.local', p);
  const { order } = await placeOrder(u._id, input);
  const res = response(); await cancelOrder({ params: { id: order._id }, user: { id: u._id } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.data.status, 'cancelled');
  assert.equal((await Product.findById(p._id)).stock, 10);
});
