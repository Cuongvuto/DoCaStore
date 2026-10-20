import test from 'node:test';
import assert from 'node:assert/strict';
import { auditLegacyOrders } from '../src/services/legacyOrderAudit.js';

const old = { _id: { $oid: '507f1f77bcf86cd799439011' }, status: 'pending', paymentMethod: 'VietQR', paymentStatus: 'pending', totalPrice: { $numberDouble: '85000.4' }, payosOrderCode: { $numberInt: '12345678' } };

test('legacy audit reports unknown stock and missing QR without guessing or changing data', () => {
  const snapshot = structuredClone(old);
  const report = auditLegacyOrders([old]);
  assert.equal(report.blockers, 2);
  assert.equal(report.warnings, 1);
  assert.deepEqual(report.findings.map(item => item.code), ['INVENTORY_UNKNOWN', 'LEGACY_PAYMENT_LINK', 'FRACTIONAL_VND']);
  assert.deepEqual(old, snapshot);
});

test('completed legacy orders keep missing historical dates explicit and omit personal data', () => {
  const report = auditLegacyOrders([{ ...old, status: 'completed', paymentStatus: 'paid', totalPrice: 85000, shippingAddress: { phone: 'private-phone' }, userId: 'private-user' }]);
  assert.equal(report.blockers, 0);
  assert.deepEqual(report.findings.map(item => item.code), ['COMPLETION_DATE_UNKNOWN', 'PAYMENT_DATE_UNKNOWN']);
  assert.doesNotMatch(JSON.stringify(report), /private-phone|private-user/);
});

test('audit rejects duplicate/missing IDs and reports malformed amounts and unresolved coupons', () => {
  assert.throws(() => auditLegacyOrders([old, old]));
  assert.throws(() => auditLegacyOrders([{}]));
  const report = auditLegacyOrders([{ ...old, paymentMethod: 'COD', totalPrice: -1, stockReserved: true, couponCode: 'OLD' }]);
  assert.deepEqual(report.findings.map(item => item.code), ['COUPON_UNKNOWN', 'INVALID_TOTAL']);
});

test('new order evidence and an explicitly empty export have no legacy findings', () => {
  const report = auditLegacyOrders([{ ...old, totalPrice: 85000, stockReserved: true, paymentLink: { qrCode: 'test-qr' } }]);
  assert.equal(report.blockers, 0);
  assert.equal(report.warnings, 0);
  assert.equal(auditLegacyOrders([]).scannedOrders, 0);
});
