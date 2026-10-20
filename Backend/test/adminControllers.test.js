import test from 'node:test';
import assert from 'node:assert/strict';
import Product from '../src/models/productsModel.js';
import Category from '../src/models/categoryModel.js';
import Order from '../src/models/oderModel.js';
import User from '../src/models/userModel.js';
import { updateProduct } from '../src/controller/productController.js';
import { getAllOrders } from '../src/controller/orderController.js';
import { getAllUsers } from '../src/controller/userController.js';
import { updateCategory, deleteCategory } from '../src/controller/categoryController.js';

const id = '507f1f77bcf86cd799439011';
const other = '507f1f77bcf86cd799439012';
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('product editor retains selected old images and appends uploaded images', async t => {
  t.mock.method(Product, 'findById', async () => ({ images: ['old-a', 'old-b'] }));
  const update = t.mock.method(Product, 'findOneAndUpdate', async (_filter, fields) => fields.$set);
  const res = response();
  await updateProduct({ params: { id }, body: { existingImages: '["old-b"]', stock: '0', expectedStock: '10', sold: 999 }, files: [{ path: 'new-c' }] }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(update.mock.calls[0].arguments[1].$set, { stock: 0, images: ['old-b', 'new-c'], imageUrl: 'old-b' });
  assert.deepEqual(update.mock.calls[0].arguments[0], { _id: id, stock: 10 });
});

test('removing every product image also clears the cover image', async t => {
  t.mock.method(Product, 'findById', async () => ({ images: ['old-a'] }));
  const update = t.mock.method(Product, 'findOneAndUpdate', async (_filter, fields) => fields.$set);
  const res = response();
  await updateProduct({ params: { id }, body: { existingImages: '[]' }, files: [] }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(update.mock.calls[0].arguments[1].$set, { images: [], imageUrl: '' });
});

test('product editor cannot inject unrelated image URLs', async t => {
  t.mock.method(Product, 'findById', async () => ({ images: ['old-a'] }));
  const update = t.mock.method(Product, 'findOneAndUpdate', async () => ({}));
  const res = response();
  await updateProduct({ params: { id }, body: { existingImages: '["other-product"]' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(update.mock.callCount(), 0);
});

test('invalid product amounts are rejected before any write', async t => {
  const update = t.mock.method(Product, 'findOneAndUpdate', async () => ({}));
  const res = response();
  await updateProduct({ params: { id }, body: { price: '-100' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(update.mock.callCount(), 0);
});

test('invalid order filter is rejected without querying orders', async t => {
  const find = t.mock.method(Order, 'find', () => { throw new Error('Should not query'); });
  const res = response();
  await getAllOrders({ query: { status: 'invalid' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(find.mock.callCount(), 0);
});

test('order filtering applies payment status and business-date boundaries before pagination', async t => {
  const chain = { populate() { return this; }, sort() { return this; }, skip(value) { this.offset = value; return this; }, limit(value) { this.size = value; return this; }, async lean() { return []; } };
  const find = t.mock.method(Order, 'find', () => chain);
  const count = t.mock.method(Order, 'countDocuments', async () => 11);
  const res = response();
  await getAllOrders({ query: { paymentStatus: 'paid', from: '2026-09-21', to: '2026-09-21', page: '2' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(chain.offset, 10);
  assert.equal(chain.size, 10);
  assert.deepEqual(find.mock.calls[0].arguments[0], count.mock.calls[0].arguments[0]);
  assert.equal(find.mock.calls[0].arguments[0].createdAt.$gte.toISOString(), '2026-09-20T17:00:00.000Z');
  assert.equal(find.mock.calls[0].arguments[0].paymentStatus, 'paid');
  assert.equal(res.body.totalPages, 2);
});

test('user list uses an inclusive public-field projection and role filter', async t => {
  const chain = { select(value) { this.fields = value; return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, async lean() { return []; } };
  const find = t.mock.method(User, 'find', () => chain);
  t.mock.method(User, 'countDocuments', async () => 0);
  const res = response();
  await getAllUsers({ query: { role: 'customer', verified: 'false', search: 'a+b@example.com' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(find.mock.calls[0].arguments[0].role, 'customer');
  assert.equal(find.mock.calls[0].arguments[0].isVerified, false);
  assert.ok(chain.fields.includes('email'));
  assert.doesNotMatch(chain.fields, /password|verifyOtp|otpExpires|resetPassword/i);
  assert.equal(chain.fields.startsWith('-'), false);
});

test('category editor prevents descendant-to-parent cycles', async t => {
  t.mock.method(Category, 'findById', () => ({ async select() { return { parentId: id }; } }));
  const update = t.mock.method(Category, 'findByIdAndUpdate', async () => ({}));
  const res = response();
  await updateCategory({ params: { id }, body: { name: 'Category', parentId: other } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(update.mock.callCount(), 0);
});

test('categories with products cannot be deleted', async t => {
  t.mock.method(Category, 'findOne', async () => null);
  t.mock.method(Product, 'exists', async () => ({ _id: other }));
  const remove = t.mock.method(Category, 'findByIdAndDelete', async () => ({}));
  const res = response();
  await deleteCategory({ params: { id } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(remove.mock.callCount(), 0);
});
