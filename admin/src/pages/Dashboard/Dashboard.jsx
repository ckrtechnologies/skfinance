import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FileText, IndianRupee, ShieldAlert, Users, Briefcase } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import apiClient from '../../api/client';
import styles from './Dashboard.module.css';

const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard = () => {
  const navigate = useNavigate();
  const { setPageMeta } = useOutletContext();
  const dateRange = useSelector((state) => state.filters.dateRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        // We pass the global dateRange to the API if it supported it.
        // Currently backend dashboard doesn't filter by this, but we wire it here.
        const res = await apiClient.get('/dashboard', { params: { start: dateRange.startDate, end: dateRange.endDate } });
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [dateRange]);

  useEffect(() => {
    setPageMeta({ title: 'Dashboard Overview', subtitle: 'Platform performance metrics' });
  }, [setPageMeta]);

  const trendData = data?.trendData || [];
  const portfolioData = data?.portfolioData || [];

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className={styles.dashboard}>

      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.cardSuccess} ${styles.clickable}`} onClick={() => navigate('/loans')}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Total Disbursal</span>
            <div className={`${styles.iconWrapper} ${styles.iconSuccess}`}><IndianRupee size={20} /></div>
          </div>
          <div className={styles.cardValue}>{formatCurrency(data?.total_disbursed || 0)}</div>
        </div>

        <div className={`${styles.card} ${styles.cardPrimary} ${styles.clickable}`} onClick={() => navigate('/loans')}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Active Files</span>
            <div className={`${styles.iconWrapper} ${styles.iconPrimary}`}><FileText size={20} /></div>
          </div>
          <div className={styles.cardValue}>{data?.active_files || 0}</div>
        </div>

        <div className={`${styles.card} ${styles.cardWarning} ${styles.clickable}`} onClick={() => navigate('/loans')}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>90-Day Blocked</span>
            <div className={`${styles.iconWrapper} ${styles.iconWarning}`}><ShieldAlert size={20} /></div>
          </div>
          <div className={styles.cardValue}>{data?.blocked_90d || 0}</div>
        </div>

        <div className={`${styles.card} ${styles.cardPurple} ${styles.clickable}`} onClick={() => navigate('/dealers')}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Active Dealers</span>
            <div className={`${styles.iconWrapper} ${styles.iconPurple}`}><Briefcase size={20} /></div>
          </div>
          <div className={styles.cardValue}>{data?.active_dealers || 0}</div>
        </div>

        <div className={`${styles.card} ${styles.cardPink} ${styles.clickable}`} onClick={() => navigate('/staff')}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Active Staff</span>
            <div className={`${styles.iconWrapper} ${styles.iconPink}`}><Users size={20} /></div>
          </div>
          <div className={styles.cardValue}>{data?.active_staff || 0}</div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Disbursal Trends</h2>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `₹${val/100000}L`} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="disbursed" name="Disbursed" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorDisbursed)" />
                <Area type="monotone" dataKey="target" name="Target" stroke="#cbd5e1" strokeDasharray="5 5" fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Portfolio Mix</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {portfolioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
