export const ALL_ROLES = Object.freeze([
  'customer',
  'admin',
  'superadmin',
  'product_admin',
  'order_admin',
  'support_admin'
]);

export const STAFF_ROLES = Object.freeze(ALL_ROLES.filter((role) => role !== 'customer'));
export const USER_MANAGER_ROLES = Object.freeze(['admin', 'superadmin']);

export const canGrantRole = (actorRole, requestedRole) => (
  USER_MANAGER_ROLES.includes(actorRole)
  && ALL_ROLES.includes(requestedRole)
  && (requestedRole !== 'superadmin' || actorRole === 'superadmin')
);

export const canManageAccount = (actorRole, targetRole) => (
  USER_MANAGER_ROLES.includes(actorRole)
  && (targetRole !== 'superadmin' || actorRole === 'superadmin')
);
