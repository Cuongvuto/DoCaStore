import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../src/models/userModel.js';
import { googleLogin, createUser, verifyEmail, resetPassword } from '../src/controller/userController.js';

const id = '507f1f77bcf86cd799439011';
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const google = t => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ email: 'Owner@Test.local', email_verified: true, name: 'Owner' }) }));
  t.mock.method(jwt, 'sign', () => 'test-jwt');
};

test('Google verification discards the password and reset credentials of a pre-registered account', async t => {
  google(t);
  const attackerPassword = 'attacker-chosen-password';
  const pending = { _id: id, email: 'owner@test.local', isVerified: false, role: 'customer', password: await bcrypt.hash(attackerPassword, 4) };
  t.mock.method(User, 'findOne', async () => pending);
  const update = t.mock.method(User, 'findOneAndUpdate', async (_filter, change) => ({ ...pending, ...change.$set }));
  const res = response();
  await googleLogin({ body: { accessToken: 'mock-token' } }, res);
  assert.equal(res.statusCode, 200);
  const [filter, change] = update.mock.calls[0].arguments;
  assert.deepEqual(filter, { _id: id, isVerified: false });
  assert.equal(await bcrypt.compare(attackerPassword, change.$set.password), false);
  assert.equal(change.$set.isVerified, true);
  assert.equal(change.$set.role, 'customer');
  assert.deepEqual(change.$unset, { verifyOtp: 1, otpExpires: 1, resetPasswordToken: 1, resetPasswordExpire: 1 });
  assert.equal(res.body.data.password, undefined);
});

test('Google login preserves a previously verified account password and staff role', async t => {
  google(t);
  t.mock.method(User, 'findOne', async () => ({ _id: id, email: 'owner@test.local', isVerified: true, role: 'admin' }));
  const update = t.mock.method(User, 'findOneAndUpdate', () => { throw new Error('Must not change verified credentials'); });
  const res = response();
  await googleLogin({ body: { accessToken: 'mock-token' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.role, 'admin');
  assert.equal(update.mock.callCount(), 0);
});

test('Google verification race reloads the winning account instead of overwriting it', async t => {
  google(t);
  t.mock.method(User, 'findOne', async () => ({ _id: id, isVerified: false }));
  t.mock.method(User, 'findOneAndUpdate', async () => null);
  t.mock.method(User, 'findById', async () => ({ _id: id, isVerified: true, role: 'customer', name: 'Winner' }));
  const res = response();
  await googleLogin({ body: { accessToken: 'mock-token' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.name, 'Winner');
});

test('registration cannot replace credentials after Google verifies the account', async t => {
  t.mock.method(User, 'findOne', async () => ({ _id: id, isVerified: false }));
  const update = t.mock.method(User, 'findOneAndUpdate', async () => null);
  const res = response();
  await createUser({ body: { email: 'owner@test.local', name: 'Attacker', password: 'attacker-password' } }, res);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(update.mock.calls[0].arguments[0], { _id: id, isVerified: false });
});

test('OTP verification refuses a stale OTP after a concurrent registration changes it', async t => {
  t.mock.method(User, 'findOne', async () => ({ _id: id, isVerified: false, verifyOtp: '123456', otpExpires: Date.now() + 60000 }));
  const update = t.mock.method(User, 'findOneAndUpdate', async () => null);
  const res = response();
  await verifyEmail({ body: { email: 'owner@test.local', otp: '123456' } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(update.mock.calls[0].arguments[0].verifyOtp, '123456');
  assert.ok(update.mock.calls[0].arguments[0].otpExpires.$gt instanceof Date);
});

test('Google rejects non-boolean verification and malformed access tokens', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ email: 'owner@test.local', email_verified: 'false' }) }));
  const query = t.mock.method(User, 'findOne', () => { throw new Error('Must not query'); });
  for (const accessToken of [{ $ne: null }, 'mock-token']) {
    const res = response();
    await googleLogin({ body: { accessToken } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(query.mock.callCount(), 0);
});

test('password reset cannot reuse a token consumed or replaced during hashing', async t => {
  t.mock.method(User, 'findOne', async () => ({ _id: id }));
  const update = t.mock.method(User, 'findOneAndUpdate', async () => null);
  const res = response();
  await resetPassword({ params: { token: 'a'.repeat(40) }, body: { password: 'new-password' } }, res);
  assert.equal(res.statusCode, 409);
  const [filter, change] = update.mock.calls[0].arguments;
  assert.equal(filter.isVerified, true);
  assert.match(filter.resetPasswordToken, /^[a-f\d]{64}$/);
  assert.ok(filter.resetPasswordExpire.$gt instanceof Date);
  assert.equal(await bcrypt.compare('new-password', change.$set.password), true);
  assert.deepEqual(change.$unset, { resetPasswordToken: 1, resetPasswordExpire: 1 });
});

test('password reset rejects short passwords and malformed tokens before any database query', async t => {
  const query = t.mock.method(User, 'findOne', () => { throw new Error('Must not query'); });
  for (const input of [{ token: 'invalid', password: 'password-123' }, { token: 'a'.repeat(40), password: 'short' }, { token: 'a'.repeat(40), password: {} }]) {
    const res = response();
    await resetPassword({ params: { token: input.token }, body: { password: input.password } }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(query.mock.callCount(), 0);
});
