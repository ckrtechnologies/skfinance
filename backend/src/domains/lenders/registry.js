'use strict';
/**
 * registry.js — maps lender.code (from DB) to the corresponding module.
 * Adding a new lender = new folder + one line here. Never restructure existing entries.
 */

const registry = {
  'sk-finance':  require('./sk-finance/index'),
  'iti-finance': require('./iti-finance/index'),
  // Future lenders added here when their module is built:
  // 'bajaj-finserv':    require('./bajaj-finserv/index'),
  // 'mahindra-finance': require('./mahindra-finance/index'),
  // 'tata-capital':     require('./tata-capital/index'),
  // 'indusind-bank':    require('./indusind-bank/index'),
};

/**
 * getModule(code) — returns the lender module for the given code.
 * Throws if the code has no registered module (inactive lender or misconfigured seed).
 */
function getModule(code) {
  const mod = registry[code];
  if (!mod) {
    throw new Error(`[lenders/registry] No module registered for lender code '${code}'. ` +
      `Ensure the module exists under domains/lenders/${code}/ and is added to registry.js.`);
  }
  return mod;
}

module.exports = { getModule, registry };
