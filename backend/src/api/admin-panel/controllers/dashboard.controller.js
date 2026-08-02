'use strict';
const supabase = require('../../../config/database');
const { ok } = require('../../../shared/utils/response');

async function dashboard(req, res, next) {
  try {
    const { start, end } = req.query;
    
    // Default to last 30 days if no range provided
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 30);
    const startDate = start ? new Date(start).toISOString() : defaultStart.toISOString();
    const endDate = end ? new Date(end).toISOString() : new Date().toISOString();

    const [active, disbursedRange, disbursedTotal, pending90D, totalDealers, totalStaff, allApps] = await Promise.all([
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).in('status', ['in_progress', 'approved']),
      supabase.from('loan_applications').select('disbursed_amount, disbursed_at').eq('status', 'disbursed').gte('disbursed_at', startDate).lte('disbursed_at', endDate),
      supabase.from('loan_applications').select('disbursed_amount').eq('status', 'disbursed'),
      supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('status', 'blocked_90d'),
      supabase.from('dealers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('staff').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('loan_applications').select('product_type')
    ]);

    const sumRange = (disbursedRange.data ?? []).reduce((s, r) => s + parseFloat(r.disbursed_amount ?? 0), 0);
    const sumTotal = (disbursedTotal.data ?? []).reduce((s, r) => s + parseFloat(r.disbursed_amount ?? 0), 0);

    // Compute portfolio
    const portfolioCounts = { 'new_car': 0, 'used_car': 0, 'commercial_vehicle': 0 };
    for (const r of allApps.data || []) {
      if (portfolioCounts[r.product_type] !== undefined) portfolioCounts[r.product_type]++;
    }
    const portfolioData = [
      { name: 'New Car', value: portfolioCounts.new_car },
      { name: 'Used Car', value: portfolioCounts.used_car },
      { name: 'Commercial', value: portfolioCounts.commercial_vehicle },
    ];

    // Compute weekly trend
    const trendData = [
      { name: 'Week 1', disbursed: 0, target: 1500000 },
      { name: 'Week 2', disbursed: 0, target: 1500000 },
      { name: 'Week 3', disbursed: 0, target: 1500000 },
      { name: 'Week 4', disbursed: 0, target: 1500000 },
    ];
    for (const r of disbursedRange.data || []) {
      if (r.disbursed_at) {
        const day = new Date(r.disbursed_at).getDate();
        const amount = parseFloat(r.disbursed_amount ?? 0);
        if (day <= 7) trendData[0].disbursed += amount;
        else if (day <= 14) trendData[1].disbursed += amount;
        else if (day <= 21) trendData[2].disbursed += amount;
        else trendData[3].disbursed += amount;
      }
    }

    return ok(res, {
      active_files: active.count ?? 0,
      total_disbursed: Math.round(sumRange * 100) / 100,
      blocked_90d: pending90D.count ?? 0,
      active_dealers: totalDealers.count ?? 0,
      active_staff: totalStaff.count ?? 0,
      trendData,
      portfolioData
    });
  } catch (err) { next(err); }
}

module.exports = { dashboard };
