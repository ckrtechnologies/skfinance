'use strict';
/**
 * rbac.js — role constants and convenience helpers.
 * Used by roleGuard middleware and domain services for inline checks.
 */

const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  DEALER:   'dealer',
  STAFF:    'staff',
  ADMIN:    'admin',
});

/** Returns true if the profile role is admin */
const isAdmin   = profile => profile?.role === ROLES.ADMIN;
const isStaff   = profile => profile?.role === ROLES.STAFF;
const isDealer  = profile => profile?.role === ROLES.DEALER;
const isCustomer = profile => profile?.role === ROLES.CUSTOMER;

module.exports = { ROLES, isAdmin, isStaff, isDealer, isCustomer };
