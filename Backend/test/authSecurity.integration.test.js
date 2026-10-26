import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import User from '../src/models/userModel.js';
import AuthRateLimit from '../src/models/authRateLimitModel.js';
import userRoutes from '../src/routes/userRoutes.js';
import { authenticateSession } from '../src/services/sessionService.js';
import { consumeLimit, ipIdentity } from '../src/middlewares/authRateLimit.js';
import { configureProxy } from '../src/config/proxy.js';
import socketUtil from '../src/utils/socket.js';
import { googleLogin } from '../src/controller/userController.js';

// Reuse the application's existing Socket.IO client; no new package is needed.
const { io: clientIO } = createRequire(new URL('../../frontend/package.json', import.meta.url))('socket.io-client');
let replica, server, io, base, password;
let handledPackets = 0;
const clients = new Set();
const originalSecret = process.env.JWT_SECRET;
const originalExpiry = process.env.JWT_EXPIRES_IN;
before(async () => {
  process.env.JWT_SECRET = 'isolated-auth-security-test-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '7.0.14' } });
  await mongoose.connect(replica.getUri(), { dbName: 'doca_auth_security_test' });
  await Promise.all([User.init(), AuthRateLimit.init()]);
  password = await bcrypt.hash('Old-password-123', 4);
  const app = express();
  configureProxy(app, '0');
  app.use(express.json());
  app.use('/api/user', userRoutes);
  server = createServer(app);
  io = socketUtil.init(server, { sessionCheckIntervalMs: 100 });
  io.on('connection', socket => {
    if (['superadmin', 'admin', 'support_admin'].includes(socket.user.role)) socket.join('admin_room');
    socket.on('protected_action', (_data, ack) => { handledPackets++; ack({ success: true }); });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 180_000 });
after(async () => {
  for (const client of clients) client.disconnect();
  if (io) await new Promise(resolve => io.close(resolve));
  await mongoose.disconnect();
  if (replica) await replica.stop();
  if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
  if (originalExpiry === undefined) delete process.env.JWT_EXPIRES_IN; else process.env.JWT_EXPIRES_IN = originalExpiry;
});
beforeEach(async () => {
  for (const client of clients) client.disconnect();
  clients.clear();
  io.disconnectSockets(true);
  handledPackets = 0;
  await Promise.all([User.deleteMany({}), AuthRateLimit.deleteMany({})]);
});
const fixture = (extra = {}) => User.create({ name: 'Test', email: 'owner@test.local', password, isVerified: true, ...extra });
const tokenFor = (user, extra = {}) => jwt.sign({ id: String(user._id), role: user.role, tokenVersion: user.tokenVersion ?? 0, ...extra }, process.env.JWT_SECRET, { expiresIn: '1h' });
async function request(path, body, { token, method = 'POST', headers = {} } = {}) {
  const res = await fetch(`${base}/api/user${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: res.status, body: await res.json(), retryAfter: res.headers.get('retry-after') };
}
function socketFor(token) {
  const client = clientIO(base, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
  clients.add(client);
  return client;
}
const waitFor = (socket, event) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(event, handler); reject(new Error(`Timed out waiting for ${event}`)); }, 5000);
  const handler = (...args) => { clearTimeout(timer); resolve(args); };
  socket.once(event, handler);
});

test('login limits normalize email and return Retry-After; another account remains usable', async () => {
  const user = await fixture();
  for (let i = 0; i < 10; i++) {
    const email = i % 2 ? ' OWNER@TEST.LOCAL ' : user.email;
    assert.equal((await request('/login', { email, password: 'wrong' })).status, 400);
  }
  const limited = await request('/login', { email: user.email, password: 'Old-password-123' });
  assert.equal(limited.status, 429);
  assert.equal(Number(limited.retryAfter), limited.body.retryAfter);
  assert.ok(limited.body.retryAfter > 0 && limited.body.retryAfter <= 900);
  const other = await fixture({ email: 'other@test.local' });
  assert.equal((await request('/login', { email: other.email, password: 'Old-password-123' })).status, 200);
});

test('IP limit cannot be bypassed with changing emails or spoofed X-Forwarded-For locally', async () => {
  for (let i = 0; i < 50; i++) {
    const res = await request('/login', { email: `missing${i}@test.local`, password: 'wrong' }, { headers: { 'X-Forwarded-For': `203.0.113.${i}` } });
    assert.equal(res.status, 400);
  }
  assert.equal((await request('/login', { email: 'fresh@test.local', password: 'wrong' })).status, 429);
});

test('OTP accepts at most five attempts and cannot be bypassed by casing', async () => {
  const user = await fixture({ isVerified: false, verifyOtp: '123456', otpExpires: new Date(Date.now() + 600_000) });
  for (let i = 0; i < 5; i++) assert.equal((await request('/verify-email', { email: user.email, otp: '000000' })).status, 400);
  assert.equal((await request('/verify-email', { email: ' OWNER@Test.local ', otp: '123456' })).status, 429);
  assert.equal((await User.findById(user._id)).isVerified, false);
});

test('register, resend and forgot share the email cooldown without sending mail', async () => {
  assert.equal((await request('/forgot-password', { email: 'missing@test.local' })).status, 404);
  for (const path of ['/resend-otp', '/register']) {
    const res = await request(path, { email: ' MISSING@test.local ' });
    assert.equal(res.status, 429);
    assert.ok(res.body.retryAfter <= 60);
  }
});

test('atomic counters allow exactly the limit under concurrency, reset after expiry and store no raw identifier', async () => {
  const now = new Date('2030-01-01T00:00:00Z');
  const entries = await Promise.all(Array.from({ length: 25 }, () => consumeLimit('parallel', 'owner@test.local', 60_000, now)));
  assert.equal(entries.filter(entry => entry.count <= 5).length, 5);
  assert.equal(await AuthRateLimit.countDocuments(), 1);
  const raw = await AuthRateLimit.findOne().lean();
  assert.ok(!JSON.stringify(raw).includes('owner@test.local'));
  assert.equal((await consumeLimit('parallel', 'owner@test.local', 60_000, new Date(now.getTime() + 60_001))).count, 1);
});

test('a second server shares persisted limits and does not depend on TTL deletion', async () => {
  const user = await fixture();
  for (let i = 0; i < 10; i++) await request('/login', { email: user.email, password: 'wrong' });
  const anotherApp = express();
  anotherApp.use(express.json());
  anotherApp.use('/api/user', userRoutes);
  const anotherServer = anotherApp.listen(0, '127.0.0.1');
  await once(anotherServer, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${anotherServer.address().port}/api/user/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, password: 'wrong' }),
    });
    assert.equal(response.status, 429);
    await response.json();
  } finally { await new Promise(resolve => anotherServer.close(resolve)); }
  await AuthRateLimit.updateMany({}, { $set: { expiresAt: new Date(0) } });
  assert.equal((await request('/login', { email: user.email, password: 'Old-password-123' })).status, 200);
});

test('resend requests use a shared 60-second cooldown and a five-request email window with mocked mail', async t => {
  let mails = 0;
  t.mock.method(nodemailer, 'createTransport', () => ({ sendMail: async () => { mails++; return {}; } }));
  t.mock.method(console, 'log', () => {});
  const user = await fixture({ isVerified: false });
  const cooldownId = createHash('sha256').update(`mail-cooldown:${user.email}`).digest('hex');
  for (let i = 0; i < 5; i++) {
    // Advance only the cooldown in this isolated test DB, not the 15-minute budget.
    await AuthRateLimit.updateOne({ _id: cooldownId }, { $set: { expiresAt: new Date(0) } });
    assert.equal((await request('/resend-otp', { email: user.email })).status, 200);
  }
  assert.equal((await request('/resend-otp', { email: user.email })).status, 429);
  assert.equal(mails, 5);
});

test('valid OTP works below the limit and Google issues the current token version', async t => {
  const user = await fixture({ isVerified: false, verifyOtp: '123456', otpExpires: new Date(Date.now() + 600_000), tokenVersion: 3 });
  assert.equal((await request('/verify-email', { email: user.email, otp: '123456' })).status, 200);
  // Invoke the controller with a mocked provider; do not replace the local HTTP transport.
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ email: user.email, email_verified: true }) }));
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await googleLogin({ body: { accessToken: 'provider-test-token' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).tokenVersion, 3);
  assert.equal((await authenticateSession(res.body.token)).tokenVersion, 3);
});

test('Google and reset endpoints reject excessive malformed requests before external work', async () => {
  for (let i = 0; i < 30; i++) assert.equal((await request('/google-login', {})).status, 400);
  assert.equal((await request('/google-login', {})).status, 429);
  for (let i = 0; i < 20; i++) assert.equal((await request('/reset-password/bad', {}, { method: 'PUT' })).status, 400);
  assert.equal((await request('/reset-password/bad', {}, { method: 'PUT' })).status, 429);
  assert.equal((await request('/login', { email: { $ne: null }, password: [] })).status, 400);
});

test('IPv6 uses a canonical /64; proxy configuration rejects trust-all', () => {
  assert.equal(ipIdentity('2001:db8::1'), ipIdentity('2001:0db8:0:0::abcd'));
  assert.notEqual(ipIdentity('2001:db8:1::1'), ipIdentity('2001:db8:2::1'));
  assert.equal(ipIdentity('::ffff:127.0.0.1'), '127.0.0.1');
  const app = express();
  assert.throws(() => configureProxy(app, 'true'));
  configureProxy(app, '1');
  assert.equal(app.get('trust proxy'), 1);
});

test('password reset revokes current and legacy JWTs and sockets; new password login works', async () => {
  const reset = 'a'.repeat(40);
  const user = await fixture({ resetPasswordToken: createHash('sha256').update(reset).digest('hex'), resetPasswordExpire: new Date(Date.now() + 60_000) });
  const token = tokenFor(user);
  const legacy = jwt.sign({ id: String(user._id), role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  assert.equal((await request('/me', undefined, { method: 'GET', token: legacy })).status, 200);
  const client = socketFor(token);
  await waitFor(client, 'connect');
  const disconnected = waitFor(client, 'disconnect');
  const result = await request(`/reset-password/${reset}`, { password: 'New-password-123' }, { method: 'PUT' });
  assert.equal(result.status, 200);
  await disconnected;
  for (const old of [token, legacy]) assert.equal((await request('/me', undefined, { method: 'GET', token: old })).status, 401);
  assert.equal((await User.findById(user._id)).tokenVersion, 1);
  assert.equal((await request('/login', { email: user.email, password: 'Old-password-123' })).status, 400);
  const login = await request('/login', { email: user.email, password: 'New-password-123' });
  assert.equal(login.status, 200);
  assert.equal(jwt.verify(login.body.token, process.env.JWT_SECRET).tokenVersion, 1);
  assert.equal((await request('/me', undefined, { method: 'GET', token: login.body.token })).status, 200);
  assert.equal((await request(`/reset-password/${reset}`, { password: 'Other-password-123' }, { method: 'PUT' })).status, 400);
  const rejected = socketFor(token);
  assert.equal((await waitFor(rejected, 'connect_error'))[0].message, 'AUTH_INVALID');
});

test('concurrent password resets consume the token once and increment the version once', async () => {
  const reset = 'b'.repeat(40);
  const user = await fixture({ resetPasswordToken: createHash('sha256').update(reset).digest('hex'), resetPasswordExpire: new Date(Date.now() + 60_000) });
  const results = await Promise.all(['Password-one', 'Password-two'].map(password => request(`/reset-password/${reset}`, { password }, { method: 'PUT' })));
  assert.equal(results.filter(res => res.status === 200).length, 1);
  assert.ok(results.every(res => [200, 400, 409].includes(res.status)));
  assert.equal((await User.findById(user._id)).tokenVersion, 1);
});

test('role change revokes all open tabs, old HTTP token and privileged rooms', async () => {
  const admin = await fixture({ email: 'admin@test.local', role: 'superadmin' });
  const staff = await fixture({ role: 'support_admin' });
  const token = tokenFor(staff);
  const tabs = [socketFor(token), socketFor(token)];
  await Promise.all(tabs.map(client => waitFor(client, 'connect')));
  assert.equal(io.of('/').adapter.rooms.get('admin_room').size, 2);
  const disconnected = tabs.map(client => waitFor(client, 'disconnect'));
  const result = await request(`/${staff._id}/role`, { role: 'customer' }, { method: 'PUT', token: tokenFor(admin) });
  assert.equal(result.status, 200);
  await Promise.all(disconnected);
  assert.equal(io.of('/').adapter.rooms.get('admin_room'), undefined);
  assert.equal((await request('/me', undefined, { method: 'GET', token })).status, 401);
  const fresh = await request('/login', { email: staff.email, password: 'Old-password-123' });
  assert.equal(fresh.body.data.role, 'customer');
  assert.equal((await request('/admin', undefined, { method: 'GET', token: fresh.body.token })).status, 403);
});

test('saving the same role does not revoke sessions; unauthorized role changes remain forbidden', async () => {
  const admin = await fixture({ email: 'admin@test.local', role: 'admin' });
  const staff = await fixture({ role: 'support_admin' });
  const token = tokenFor(staff);
  assert.equal((await request(`/${staff._id}/role`, { role: staff.role }, { method: 'PUT', token: tokenFor(admin) })).status, 200);
  assert.equal((await User.findById(staff._id)).tokenVersion, 0);
  assert.equal((await request(`/${admin._id}/role`, { role: 'superadmin' }, { method: 'PUT', token })).status, 403);
  assert.equal((await request(`/${staff._id}/role`, { role: 'superadmin' }, { method: 'PUT', token: tokenFor(admin) })).status, 403);
});

test('deleting a user disconnects their socket and rejects their token', async () => {
  const admin = await fixture({ email: 'admin@test.local', role: 'superadmin' });
  const user = await fixture();
  const token = tokenFor(user);
  const client = socketFor(token); await waitFor(client, 'connect');
  const disconnected = waitFor(client, 'disconnect');
  assert.equal((await request(`/${user._id}`, undefined, { method: 'DELETE', token: tokenFor(admin) })).status, 200);
  await disconnected;
  assert.equal((await request('/me', undefined, { method: 'GET', token })).status, 401);
});

test('each socket packet revalidates the session and never reaches a handler after revocation', async () => {
  const user = await fixture({ role: 'support_admin' });
  const client = socketFor(tokenFor(user)); await waitFor(client, 'connect');
  const result = await client.timeout(2000).emitWithAck('protected_action', {});
  assert.equal(result.success, true);
  assert.equal(handledPackets, 1);
  const disconnected = waitFor(client, 'disconnect');
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
  client.emit('protected_action', {}, () => {});
  await disconnected;
  assert.equal(handledPackets, 1);
});

test('idle sockets are disconnected after out-of-band role changes', async () => {
  const user = await fixture({ role: 'support_admin' });
  const client = socketFor(tokenFor(user)); await waitFor(client, 'connect');
  const disconnected = waitFor(client, 'disconnect');
  await User.updateOne({ _id: user._id }, { $set: { role: 'customer' } });
  await disconnected;
  assert.equal(io.of('/').adapter.rooms.get('admin_room'), undefined);
});

test('socket disconnects when JWT expires, even without incoming packets', async () => {
  const user = await fixture();
  const token = jwt.sign({ id: String(user._id), tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '2s' });
  const client = socketFor(token); await waitFor(client, 'connect');
  await waitFor(client, 'disconnect');
  await assert.rejects(authenticateSession(token));
});

test('legacy documents without tokenVersion work until reset; invalid versions and deleted users fail', async () => {
  const user = await fixture();
  await User.collection.updateOne({ _id: user._id }, { $unset: { tokenVersion: '' } });
  const legacy = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' });
  assert.equal((await authenticateSession(legacy)).tokenVersion, 0);
  await assert.rejects(authenticateSession(tokenFor(user, { tokenVersion: null })));
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
  await assert.rejects(authenticateSession(legacy));
  await User.deleteOne({ _id: user._id });
  await assert.rejects(authenticateSession(tokenFor(user, { tokenVersion: 1 })));
});

test('limiter fails closed when its store is unavailable', async t => {
  t.mock.method(AuthRateLimit, 'findOneAndUpdate', async () => { throw new Error('Unavailable'); });
  const res = await request('/login', { email: 'owner@test.local', password: 'anything' });
  assert.equal(res.status, 503);
  assert.equal(res.body.token, undefined);
});

test('change password requires authentication and the current password without changing credentials on failure', async () => {
  const user = await fixture();
  const body = { currentPassword: 'wrong', newPassword: 'New-password-123', confirmPassword: 'New-password-123' };
  assert.equal((await request('/change-password', body, { method: 'PUT' })).status, 401);
  assert.equal((await request('/change-password', body, { method: 'PUT', token: tokenFor(user) })).status, 400);
  const saved = await User.findById(user._id);
  assert.equal(saved.password, user.password);
  assert.equal(saved.tokenVersion, 0);
});

test('change password validates confirmation, minimum length, types, bcrypt byte limit and password reuse', async () => {
  const user = await fixture();
  const options = { method: 'PUT', token: tokenFor(user) };
  const changes = [
    { newPassword: 'short', confirmPassword: 'short' },
    { newPassword: 'New-password-123', confirmPassword: 'Mismatch-123' },
    { newPassword: {}, confirmPassword: {} },
    { newPassword: 'Old-password-123', confirmPassword: 'Old-password-123' },
    { newPassword: '\u00e9'.repeat(37), confirmPassword: '\u00e9'.repeat(37) },
  ];
  for (const change of changes) {
    assert.equal((await request('/change-password', { currentPassword: 'Old-password-123', ...change }, options)).status, 400);
  }
  assert.equal((await User.findById(user._id)).tokenVersion, 0);
});

test('changing own password invalidates reset links and all old sessions, ignoring another user ID in the body', async () => {
  const user = await fixture({ resetPasswordToken: 'existing-reset', resetPasswordExpire: new Date(Date.now() + 60_000) });
  const other = await fixture({ email: 'other@test.local' });
  const token = tokenFor(user);
  const client = socketFor(token); await waitFor(client, 'connect');
  const disconnected = waitFor(client, 'disconnect');
  const changed = await request('/change-password', {
    currentPassword: 'Old-password-123', newPassword: 'New-password-123', confirmPassword: 'New-password-123', userId: String(other._id),
  }, { method: 'PUT', token });
  assert.equal(changed.status, 200);
  await disconnected;
  const saved = await User.findById(user._id);
  assert.equal(saved.tokenVersion, 1);
  assert.equal(saved.resetPasswordToken, undefined);
  assert.equal(saved.resetPasswordExpire, undefined);
  assert.equal((await User.findById(other._id)).password, other.password);
  assert.equal((await request('/me', undefined, { method: 'GET', token })).status, 401);
  assert.equal((await request('/login', { email: user.email, password: 'Old-password-123' })).status, 400);
  assert.equal((await request('/login', { email: user.email, password: 'New-password-123' })).status, 200);
});

test('concurrent password changes have one winner and cannot overwrite newer credentials', async () => {
  const user = await fixture();
  const token = tokenFor(user);
  const results = await Promise.all(['First-password-123', 'Second-password-123'].map(newPassword => request('/change-password', {
    currentPassword: 'Old-password-123', newPassword, confirmPassword: newPassword,
  }, { method: 'PUT', token })));
  assert.equal(results.filter(res => res.status === 200).length, 1);
  assert.ok(results.every(res => [200, 401, 409].includes(res.status)));
  assert.equal((await User.findById(user._id)).tokenVersion, 1);
});

test('change password permits five attempts per account then blocks even a correct password', async () => {
  const user = await fixture();
  const options = { method: 'PUT', token: tokenFor(user) };
  const body = { currentPassword: 'wrong', newPassword: 'New-password-123', confirmPassword: 'New-password-123' };
  for (let i = 0; i < 5; i++) assert.equal((await request('/change-password', body, options)).status, 400);
  const limited = await request('/change-password', { ...body, currentPassword: 'Old-password-123' }, options);
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.retryAfter) > 0);
  assert.equal((await User.findById(user._id)).tokenVersion, 0);
});

test('legacy account without tokenVersion can change password using its existing session', async () => {
  const user = await fixture();
  await User.collection.updateOne({ _id: user._id }, { $unset: { tokenVersion: '' } });
  const legacy = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const result = await request('/change-password', { currentPassword: 'Old-password-123', newPassword: 'New-password-123', confirmPassword: 'New-password-123' }, { method: 'PUT', token: legacy });
  assert.equal(result.status, 200);
  assert.equal((await User.findById(user._id)).tokenVersion, 1);
});
