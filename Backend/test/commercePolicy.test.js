import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition, assertCoupon, priceOrder } from '../src/services/commercePolicy.js';
import { signatureFor, verifyWebhook } from '../src/services/paymentService.js';
import { couponInput, safeLink } from '../src/utils/contentValidation.js';
import { validateImage } from '../src/services/uploadService.js';

test('completed/cancelled orders are terminal and customers cannot cancel another order', () => {
  for (const status of ['completed', 'cancelled']) assert.throws(() => assertTransition({ status }, 'processing', { kind: 'admin' }), { status: 409 });
  assert.throws(() => assertTransition({ status: 'pending', userId: 'a' }, 'cancelled', { kind: 'customer', id: 'b' }), { status: 403 });
  assert.throws(() => assertTransition({ status: 'shipped', userId: 'a' }, 'cancelled', { kind: 'customer', id: 'a' }), { status: 409 });
});
test('unpaid QR orders cannot ship or process and cron cannot cancel paid orders', () => {
  assert.throws(() => assertTransition({ status: 'pending', paymentMethod: 'VietQR', paymentStatus: 'pending' }, 'processing', { kind: 'admin' }), { status: 409 });
  assert.throws(() => assertTransition({ status: 'pending', paymentStatus: 'paid' }, 'cancelled', { kind: 'system' }), { status: 409 });
  assert.equal(assertTransition({ status: 'pending', paymentMethod: 'COD' }, 'processing', { kind: 'admin' }), true);
});
test('pricing rounds VND and caps stacked discounts at the order value', () => {
  assert.equal(priceOrder([{ price: 10001, quantity: 1 }], true).finalPrice, 8501);
  const price = priceOrder([{ price: 10000, quantity: 2 }], true, { code: 'ALL', discountPercent: 100 });
  assert.equal(price.finalPrice, 0); assert.equal(price.totalDiscount, 20000);
  for (const quantity of [-1, 0, 0.5, Infinity]) assert.throws(() => priceOrder([{ price: 10, quantity }], false), { status: 400 });
});
test('coupon targeting, expiry and usedBy objects are consistently checked', () => {
  const base = { isActive: true, expiryDate: new Date('2030-01-01'), usedCount: 0, usageLimit: 1, usedBy: [], targetAudience: 'all' };
  const user = { _id: 'u', tier: 'normal' };
  assert.doesNotThrow(() => assertCoupon(base, user));
  assert.throws(() => assertCoupon({ ...base, usedBy: [{ userId: 'u', count: 1 }] }, user), { status: 400 });
  assert.throws(() => assertCoupon({ ...base, targetAudience: 'group', groupType: 'vip' }, user), { status: 400 });
  assert.throws(() => assertCoupon({ ...base, usedCount: 1 }, user), { status: 400 });
  assert.throws(() => assertCoupon({ ...base, expiryDate: new Date(0) }, user), { status: 400 });
});
test('webhook authentication rejects altered amount, malformed signatures and missing secret', () => {
  const data = { amount: 10000, orderCode: 123, code: '00', currency: 'VND', reference: 'r1' };
  const signature = signatureFor(data, 'test-only-key');
  assert.deepEqual(verifyWebhook({ data, signature }, 'test-only-key'), data);
  assert.throws(() => verifyWebhook({ data: { ...data, amount: 1 }, signature }, 'test-only-key'), { status: 401 });
  assert.throws(() => verifyWebhook({ data, signature: 'bad' }, 'test-only-key'), { status: 400 });
  assert.throws(() => verifyWebhook({ data, signature }, ''), { status: 503 });
});
test('content links reject scripts/protocol-relative URLs and coupon fields reject malformed input', () => {
  for (const url of ['javascript:alert(1)', '//evil.test', '/\\evil.test', 'data:text/html,hello']) assert.throws(() => safeLink(url), { status: 400 });
  assert.equal(safeLink('/products'), '/products');
  const valid = { code: 'summer', expiryDate: '2030-01-01', discountPercent: 20, usageLimit: 10 };
  assert.equal(couponInput(valid).expiryDate.toISOString(), '2030-01-01T16:59:59.999Z');
  for (const invalid of [{ discountPercent: 101 }, { usageLimit: 0 }, { code: {} }, { expiryDate: 'bad' }, { targetAudience: 'group', groupType: 'bogus' }]) assert.throws(() => couponInput({ ...valid, ...invalid }), { status: 400 });
});
test('upload rejects non-image content types', () => {
  validateImage(null, { mimetype: 'image/png' }, (error, accepted) => { assert.equal(error, null); assert.equal(accepted, true); });
  validateImage(null, { mimetype: 'text/html' }, error => assert.equal(error.status, 400));
});
