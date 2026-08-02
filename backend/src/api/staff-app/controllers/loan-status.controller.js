'use strict';
// Staff loan-status controller reuses dealer's loan-status controller
// Both have the same operations; role is checked at the route guard level
const dealerLoanCtrl = require('../../dealer-app/controllers/loan-status.controller');
module.exports = dealerLoanCtrl;
