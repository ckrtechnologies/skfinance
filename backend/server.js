'use strict';
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`[shreeja-backend] Server running on port ${PORT}`);
  // Start cron jobs after server is up
  require('./src/jobs/scheduler');
  
  // Start WhatsApp campaign polling worker
  require('./src/domains/whatsapp/worker').startWorker();
});
