const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function run() {
  const token = jwt.sign({ id: 'some-admin', role: 'admin' }, process.env.JWT_SECRET || 'secret');
  try {
    const res = await axios.get('http://localhost:4000/admin/withdrawal-requests?status=requested', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Status:", res.status);
    console.log("Data count:", res.data.data.length);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
run();
