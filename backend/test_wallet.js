const { listAllWithdrawals } = require('./src/domains/wallet/service');
async function run() {
  const wrs = await listAllWithdrawals({ status: 'requested' });
  console.log("Count:", wrs.length);
  if (wrs.length > 0) console.log("Status of first:", wrs[0].status);
}
run();
