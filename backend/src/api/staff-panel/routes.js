'use strict';
// Staff Panel routes — same contract as staff-app, separate mount at /v1/panel/staff
// Symlinks to same controllers in staff-app (same domain access, different surface)
const staffAppRouter = require('../staff-app/routes');
module.exports = staffAppRouter;
