const fs = require('fs');
const file = '/Users/chandanmallik/projects/skfinance/backend/src/api/dealer-app/routes.js';
let content = fs.readFileSync(file, 'utf8');

const bannerRoute = `
// GET /dealer/banners
router.get('/banners', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('dealer_banners').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    sendSuccess(res, data || []);
  } catch (err) { next(err); }
});
`;

if (!content.includes('/dealer/banners')) {
  content = content.replace('router.get(\'/profile\',', bannerRoute + '\nrouter.get(\'/profile\',');
  fs.writeFileSync(file, content);
}
