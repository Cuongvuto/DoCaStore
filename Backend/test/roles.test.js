import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_ROLES,
  STAFF_ROLES,
  canGrantRole,
  canManageAccount
} from '../src/config/roles.js';

test('customer is the only non-staff role', () => {
  assert.deepEqual(STAFF_ROLES, ALL_ROLES.filter((role) => role !== 'customer'));
});

test('admin can grant scoped staff roles but not superadmin', () => {
  assert.equal(canGrantRole('admin', 'product_admin'), true);
  assert.equal(canGrantRole('admin', 'superadmin'), false);
});

test('only superadmin can grant or manage a superadmin account', () => {
  assert.equal(canGrantRole('superadmin', 'superadmin'), true);
  assert.equal(canManageAccount('admin', 'superadmin'), false);
  assert.equal(canManageAccount('superadmin', 'superadmin'), true);
});

test('unknown and customer actors cannot grant roles', () => {
  assert.equal(canGrantRole('customer', 'admin'), false);
  assert.equal(canGrantRole('admin', 'unknown'), false);
});
