'use strict';
const app = require('./app');
const secrets = require('./src/config/secrets');
const { startScheduler } = require('./src/jobs/scheduler');

app.listen(secrets.port, () => {
  console.log(`[server] Shreeja Finance backend running on port ${secrets.port} (${secrets.nodeEnv})`);
  startScheduler();
});
