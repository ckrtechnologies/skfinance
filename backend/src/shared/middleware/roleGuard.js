'use strict';
const { sendError } = require('../utils/response');

/**
 * roleGuard(allowedRoles) — factory that returns middleware
 * allowing only the specified roles. Must run after authenticate().
 *
 * Usage: router.get('/path', authenticate, roleGuard(['admin']), controller)
 */
function roleGuard(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 403, 'FORBIDDEN', `Role '${req.user.role}' is not permitted to access this resource`);
    }
    next();
  };
}

module.exports = { roleGuard };
