const axios = require('axios');
const jwt = require('jsonwebtoken');
const { supabase } = require('./src/config/database');
require('dotenv').config();

async function run() {
  const { data: profile } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single();
  const token = jwt.sign({ id: profile.id, role: 'admin' }, process.env.JWT_SECRET || 'secret');
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
