import { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as ChartTooltip,
  Legend
} from 'recharts';
import deskIllustrationUrl from './assets/desk_illustration.png';
import { API_URLS } from './url';
import { ensureFreshToken } from './utils/securityUtils';
import './css/App.css';

interface NetWorthProps {
  onBack: () => void;
  isPrivacyMode: boolean;
}

import { maskAmount, maskText } from './utils/privacyUtils';

const BackIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 10 }, (_, i) => 2026 + i);

export default function NetWorth({ onBack, isPrivacyMode }: NetWorthProps) {
  const [monthlyGrowthData, setMonthlyGrowthData] = useState<any[]>([]);
  const [allocationOptions, setAllocationOptions] = useState<any[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>(MONTHS[new Date().getMonth()]);
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  useEffect(() => {
    const init = async () => {
      await fetchAllocationOptions();
      await fetchMonthlyGrowth();
    };
    init();
  }, []);

  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 3000);
  };

  const fetchAllocationOptions = async () => {
    const token = await ensureFreshToken();
    if (!token) return;
    try {
      const allocRes = await fetch(`${API_URLS.ALLOCATIONS.BASE}?page=0&size=100&sortBy=allocId`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (allocRes.ok) {
        const json = await allocRes.json();
        const content = json.data?.content || json.content || [];
        setAllocationOptions(content);
      }
    } catch (e) { console.error('Error fetching allocations:', e); }
  };

  const fetchMonthlyGrowth = async () => {
    setLoading(true);
    const token = await ensureFreshToken();
    if (!token) { setLoading(false); return; }
    try {
      const growthRes = await fetch(`${API_URLS.MONTHLY_GROWTH.BASE}?page=0&size=100&sortBy=id`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (growthRes.ok) {
        const json = await growthRes.json();
        setMonthlyGrowthData(json.data?.content || json.content || []);
      }
    } catch (e) {
      console.error('Error fetching monthly growth:', e);
    } finally {
      setLoading(false);
    }
  };

  const getAllocDetail = (id: any) => allocationOptions.find(a => a.allocId === id || a.id === id || a.allocation === id);

  const filteredContributions = monthlyGrowthData.filter(item => {
    const monthMatch = item.month === monthFilter;
    const yearMatch = item.year.toString() === yearFilter;
    return monthMatch && yearMatch;
  });

  const grandTotal = filteredContributions.reduce((acc, curr) => acc + (curr.currentValue || 0), 0);

  useEffect(() => {
    if (!loading && filteredContributions.length > 0 && grandTotal > 0) {
      syncNetWorthToDB();
    }
  }, [monthFilter, yearFilter, monthlyGrowthData.length, loading, grandTotal]);

  const syncNetWorthToDB = async () => {
    const token = await ensureFreshToken();
    if (!token) return;
    const username = localStorage.getItem('pfm_username');
    if (!username) return;

    try {
      const checkRes = await fetch(`${API_URLS.NET_WORTH.GET_BY_MONTH_YEAR}?month=${monthFilter}&year=${yearFilter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (checkRes.ok) {
        const checkJson = await checkRes.json();
        const existingData = checkJson.data || [];
        
        const payload = {
          month: monthFilter,
          year: parseInt(yearFilter),
          value: grandTotal
        };

        if (existingData.length > 0) {
          const existingId = existingData[0].id;
          const body = { id: existingId, ...payload, updateBy: username, updateDate: new Date().toISOString().split('T')[0] };
          
          const res = await fetch(API_URLS.NET_WORTH.UPDATE(existingId), {
            method: 'PUT',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          });
          if (res.ok) showToast('Net Worth synchronized successfully.');
        } else {
          const body = { ...payload, addedBy: username, dateAdded: new Date().toISOString().split('T')[0] };
          const res = await fetch(API_URLS.NET_WORTH.CREATE, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          });
          if (res.ok) showToast('New monthly standing initialized.');
        }
      }
    } catch (e) {
      console.error('Error syncing net worth:', e);
    }
  };

  const chartColors = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#84cc16', '#3b82f6', '#f97316'
  ];

  const pieData = useMemo(() => {
    return filteredContributions.map(c => ({
      name: maskText(getAllocDetail(c.allocId || c.id || c.allocation)?.allocation || c.allocation || `Account #${c.id}`, isPrivacyMode),
      value: c.currentValue || 0
    })).filter(it => it.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredContributions, allocationOptions, isPrivacyMode]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip shadow-soft" style={{ background: 'rgba(255, 255, 255, 0.98)', border: 'none', padding: '12px', borderRadius: '12px' }}>
          <p className="tooltip-label" style={{ margin: 0, fontWeight: 800, color: '#111827' }}>{data.name}</p>
          <p className="tooltip-value" style={{ margin: '4px 0 0', color: '#6366f1', fontWeight: 700, fontSize: '15px' }}>
            ₱{isPrivacyMode ? '***' : data.value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app-container allocations-page">
      <section className="header-section allocations-header">
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        <div className="header-inner allocations-header-inner">
          <div className="header-left">
            <button className="icon-btn" onClick={onBack} aria-label="Back"><BackIcon /></button>
          </div>
          
          <div className="header-titles centered-titles">
            <h1 className="allocations-title">Net Worth</h1>
            <div className="status-pill-container">
              <p className="allocations-subtitle status-pill">MONTHLY PERFORMANCE SNAPSHOT</p>
            </div>
          </div>
          
          <div className="header-right">
            {/* Action placeholder */}
          </div>
        </div>
      </section>

      <main className="allocations-main">
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
        <div className="growth-filter-grid">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter Month</label>
            <select 
              className="dropdown-select" 
              value={monthFilter} 
              onChange={e => setMonthFilter(e.target.value)}
            >
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter Year</label>
            <select 
              className="dropdown-select" 
              value={yearFilter} 
              onChange={e => setYearFilter(e.target.value)}
            >
              {YEARS.map(y => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <p style={{ color: '#6b7280', fontWeight: '500' }}>Synchronizing analytical data...</p>
          </div>
        ) : (
          <>
            {pieData.length > 0 && (
              <div className="chart-container slide-in-top" style={{ marginTop: '0', marginBottom: '24px', height: 'auto', background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #f3f4f6' }}>
                <div className="chart-header" style={{ marginBottom: '20px', padding: 0 }}>
                  <span className="chart-title" style={{ fontSize: '15px' }}>Portfolio Distribution</span>
                  <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{pieData.length} ACCOUNTS</span>
                </div>
                <div style={{ height: '300px', width: '100%', minHeight: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        isAnimationActive={true}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<CustomPieTooltip />} />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 600 }}
                        formatter={(value) => <span style={{ color: '#4b5563' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div className="entry-card slide-in-top" style={{ 
              background: 'white', 
              padding: '28px 24px', 
              borderRadius: '24px', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.08)', 
              border: '1px solid #f3f4f6',
              position: 'relative',
              zIndex: 10
            }}>
              <h4 style={{ 
                fontSize: '11px', 
                color: '#6b7280', 
                textTransform: 'uppercase', 
                letterSpacing: '1.5px', 
                fontWeight: '900', 
                marginBottom: '24px', 
                textAlign: 'center', 
                borderBottom: '2px solid #f3f4f6', 
                paddingBottom: '16px' 
              }}>
                Performance Breakdown
              </h4>
              
              {filteredContributions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {['Savings', 'Investments'].map(mainType => {
                    const itemsInType = filteredContributions.filter(c => {
                      const alloc = getAllocDetail(c.allocId || c.id || c.allocation);
                      const type = (alloc?.type || '').toLowerCase();
                      return mainType === 'Savings' 
                        ? (type.includes('saving') || type.includes('asset'))
                        : (type.includes('invest') || type.includes('liabilit'));
                    });

                    if (itemsInType.length === 0) return null;

                    return (
                      <div key={mainType}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                           <div style={{ width: '4px', height: '18px', background: mainType === 'Savings' ? '#10b981' : '#3b82f6', borderRadius: '4px' }}></div>
                           <h5 style={{ fontSize: '13px', margin: 0, fontWeight: '900', color: '#111827', letterSpacing: '0.5px' }}>{mainType.toUpperCase()}</h5>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '14px' }}>
                          {(() => {
                            const subGroups = {
                              'Accessible': itemsInType.filter(c => {
                                 const alloc = getAllocDetail(c.allocId || c.id || c.allocation);
                                 const d = (alloc?.description || '').toLowerCase();
                                 return d.includes('accessible') && !d.includes('not accessible');
                              }),
                              'Not Accessible': itemsInType.filter(c => {
                                 const alloc = getAllocDetail(c.allocId || c.id || c.allocation);
                                 const d = (alloc?.description || '').toLowerCase();
                                 return d.includes('not accessible');
                              }),
                              'Uncategorized': itemsInType.filter(c => {
                                 const alloc = getAllocDetail(c.allocId || c.id || c.allocation);
                                 const d = (alloc?.description || '').toLowerCase();
                                 return !d.includes('accessible');
                              })
                            };

                            return Object.entries(subGroups).map(([label, subItems]) => {
                              if (subItems.length === 0) return null;
                              
                              const isAcc = label === 'Accessible';
                              const isNotAcc = label === 'Not Accessible';
                              const labelColor = isAcc ? '#059669' : (isNotAcc ? '#DC2626' : '#6b7280');

                              return (
                                <div key={label}>
                                  <p style={{ fontSize: '10px', fontWeight: '800', color: labelColor, textTransform: 'uppercase', margin: '0 0 8px' }}>
                                    {label}
                                  </p>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {subItems.map((c, i) => (
                                      <div key={i} style={{ 
                                        padding: '8px 14px', 
                                        borderRadius: '10px', 
                                        background: '#f9fafb',
                                        border: '1px solid #f3f4f6',
                                        fontSize: '12px'
                                      }}>
                                        <span style={{ fontWeight: '700', color: '#374151' }}>{maskText(getAllocDetail(c.allocId || c.id || c.allocation)?.allocation || c.allocation || `Account #${c.id}`, isPrivacyMode)}:</span>
                                        <span style={{ fontWeight: '900', color: '#6366f1', marginLeft: '6px' }}>₱{isPrivacyMode ? '***' : (c.currentValue || 0).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ marginTop: '16px', paddingTop: '20px', borderTop: '2px solid #f3f4f6' }}>
                    <h6 style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '800', marginBottom: '12px' }}>Market Totals</h6>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                      {['Savings', 'Investments'].map(main => {
                        return ['Accessible', 'Not Accessible', 'General'].map(sub => {
                          const total = filteredContributions.filter(c => {
                            const alloc = getAllocDetail(c.allocId || c.id || c.allocation);
                            const t = (alloc?.type || '').toLowerCase();
                            const d = (alloc?.description || '').toLowerCase();

                            const typeMatch = main === 'Savings' ? (t.includes('saving') || t.includes('asset')) : (t.includes('invest') || t.includes('liabilit'));
                            let subMatch = false;
                            if (sub === 'Accessible') subMatch = d.includes('accessible') && !d.includes('not accessible');
                            else if (sub === 'Not Accessible') subMatch = d.includes('not accessible');
                            else subMatch = !d.includes('accessible');

                            return typeMatch && subMatch;
                          }).reduce((acc, curr) => acc + (curr.currentValue || 0), 0);

                          if (total === 0) return null;

                          return (
                            <div key={`${main}-${sub}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '10px 14px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                               <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#4b5563' }}>{main} {sub === 'General' ? '' : sub}:</span>
                               <span style={{ fontSize: '14px', fontWeight: '900', color: '#6366f1' }}>₱{isPrivacyMode ? '***' : total.toLocaleString()}</span>
                            </div>
                          );
                        });
                      })}
                    </div>
                  </div>

                  <div style={{ 
                    marginTop: '16px', 
                    paddingTop: '20px', 
                    borderTop: '2px solid #f3f4f6', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    paddingLeft: '4px' 
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#111827', letterSpacing: '1px' }}>OVERALL TOTAL</span>
                    <span style={{ fontSize: '24px', fontWeight: '900', color: '#6366f1' }}>
                      ₱{isPrivacyMode ? '***' : grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="empty-state-container" style={{ padding: '0', boxShadow: 'none', background: 'transparent' }}>
                  <div className="empty-state-icon-box" style={{ width: '120px', height: '120px' }}>
                    <img src={deskIllustrationUrl} alt="Empty" className="empty-state-illustration" />
                  </div>
                  <h3 className="empty-state-title" style={{ fontSize: '16px' }}>No Data Found</h3>
                  <p className="empty-state-text" style={{ fontSize: '13px' }}>
                    There are no analytical records for the selected month and year.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </main>

      {/* TOAST SYSTEM */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#111827',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '30px',
          fontSize: '13px',
          fontWeight: '600',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'toastIn 0.3s ease-out'
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
