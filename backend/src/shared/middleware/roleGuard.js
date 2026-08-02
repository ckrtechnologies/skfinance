'use strict';
const { fail } = require('../utils/response');

/**
 * roleGuard(allowedRoles) — returns Express middleware that checks req.user.profile.role.
 * Must be used after authenticate().
 *
 * @param {string[]} allowedRoles - e.g. ['admin'] or ['staff', 'admin']
 */
function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.profile?.role;
    if (!role || !allowedRoles.includes(role)) {
      return fail(res, 'FORBIDDEN', 'You do not have permission to perform this action', 403);
    }
    next();
  };
}

module.exports = { roleGuard };
