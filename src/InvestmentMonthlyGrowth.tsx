import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts';
import deskIllustrationUrl from './assets/desk_illustration.png';
import { API_URLS } from './url';
import { ensureFreshToken } from './utils/securityUtils';
import './css/App.css';

interface GrowthRecord {
  id: number;
  allocId: number;
  month: string;
  year: number;
  contribution: number;
  previousContrib: number;
  totalContribution: number;
  currentValue: number;
  growthRate: number;
  addedBy?: string;
  dateAdded?: string;
  updateBy?: string;
  updateDate?: string;
}

interface InvestmentMonthlyGrowthProps {
  onBack: () => void;
}

const BackIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const PenIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
);

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 10 }, (_, i) => 2026 + i);

export default function InvestmentMonthlyGrowth({ onBack }: InvestmentMonthlyGrowthProps) {
  const [items, setItems] = useState<GrowthRecord[]>([]);
  const [monthFilter, setMonthFilter] = useState<string>(MONTHS[new Date().getMonth()]);
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [selectedAllocId, setSelectedAllocId] = useState<number | null>(null);
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(false);
  const [allocationMap, setAllocationMap] = useState<Record<number, string>>({});
  const [allocationOptions, setAllocationOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLastPage, setIsLastPage] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState<GrowthRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  useEffect(() => {
    const init = async () => {
      await fetchAllocationOptions();
      await fetchData(0, null);
    };
    init();
  }, []);

  const fetchAllocationOptions = async () => {
    const token = await ensureFreshToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URLS.ALLOCATIONS.BASE}?page=0&size=100&sortBy=allocId`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.data?.content || json.content || [];
        setAllocationOptions(content.filter((a: any) => a.status === 'Active'));

        const map: Record<number, string> = {};
        content.forEach((a: any) => { map[a.allocId] = a.allocation; });
        setAllocationMap(map);
      }
    } catch (e) { console.error('Error fetching allocations:', e); }
  };

  const fetchData = async (pageNumber = 0, allocId = selectedAllocId) => {
    setLoading(true);
    setItems([]); // Clear current list immediately for visual feedback
    const token = await ensureFreshToken();
    if (!token) { setLoading(false); return; }

    try {
      const baseUrl = allocId 
        ? API_URLS.MONTHLY_GROWTH.SEARCH_BY_ALLOC(allocId)
        : API_URLS.MONTHLY_GROWTH.BASE;
      const res = await fetch(`${baseUrl}?page=${pageNumber}&size=20&sortBy=id`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        const content = payload.content || [];
        setItems(content);
        setTotalPages(payload.totalPages || 1);
        setIsLastPage(payload.last !== undefined ? payload.last : true);
        setPage(pageNumber);
      } else {
        setItems([]);
        setTotalPages(1);
        setIsLastPage(true);
      }
    } catch (e) {
      console.error('Error fetching growth data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (id: number) => {
    setIsModalOpen(true);
    setIsFetchingDetail(true);
    const token = await ensureFreshToken();
    if (!token) { setIsFetchingDetail(false); return; }

    try {
      const res = await fetch(API_URLS.MONTHLY_GROWTH.GET_BY_ID(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setSelectedItem(Array.isArray(data) ? data[0] : data);
      }
    } catch (e) {
      console.error('Error fetching growth detail:', e);
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const monthMap: Record<string, number> = {
    "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5,
    "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11
  };
  const filteredItems = items.filter(item => {
    const monthMatch = monthFilter === 'All' || item.month === monthFilter;
    const yearMatch = yearFilter === 'All' || item.year.toString() === yearFilter;
    return monthMatch && yearMatch;
  });



  const chartData = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const yearDiff = a.year - b.year;
      if (yearDiff !== 0) return yearDiff;
      return monthMap[a.month] - monthMap[b.month];
    }).map(it => ({
      name: it.month.substring(0, 3) + ' ' + (it.year % 100),
      label: it.month.substring(0, 3) + ' ' + (it.year % 100), // X-axis label
      allocation: allocationMap[it.allocId] || `Account #${it.allocId}`,
      valuation: it.currentValue,
      growth: it.growthRate,
      allocId: it.allocId,
      id: it.id
    }));
  }, [filteredItems, allocationMap]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label" style={{ color: '#111827', fontWeight: 900 }}>{data.allocation}</p>
          <p className="tooltip-label">{data.name}</p>
          <p className="tooltip-value">₱{data.valuation.toLocaleString()}</p>
          <p style={{ fontSize: '10px', color: data.growth >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
            {data.growth > 0 ? '+' : ''}{data.growth}% Growth
          </p>
        </div>
      );
    }
    return null;
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';


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
            <h1 className="allocations-title">Monthly Growth</h1>
            <div className="status-pill-container">
              <p className="allocations-subtitle status-pill">
                {selectedAllocId ? (
                  `${allocationMap[selectedAllocId] || '...'} • ANALYTICS`
                ) : `ALL PORTFOLIOS • ${items.length} RECORDS`}
              </p>
            </div>
          </div>
          
          <div className="header-right">
            <button 
              className="premium-action-pill" 
              onClick={() => setIsInitialModalOpen(true)}
              title="Select Account"
            >
              <div className="pill-icon"><PenIcon /></div>
              <span className="hide-mobile">{selectedAllocId ? 'Switch Fund' : 'Select Account'}</span>
            </button>
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
              <option value="All">All Months</option>
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
              <option value="All">All Years</option>
              {YEARS.map(y => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedAllocId === null && filteredItems.length > 0 && (
          <div className="chart-container slide-in-top" style={{ marginTop: '24px', height: 'auto', minHeight: '400px', overflow: 'hidden', padding: '0' }}>
            <div className="chart-header" style={{ padding: '24px 24px 0' }}>
              <span className="chart-title">Allocation Performance</span>
              <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 600 }}>PAST {filteredItems.length} ENTRIES</span>
            </div>
            <div className="chart-scroll-container" style={{ padding: '0 24px 24px' }}>
              <div style={{ minWidth: filteredItems.length > 5 ? `${filteredItems.length * 80}px` : '400px', height: '320px', margin: '0 auto' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 50, bottom: 50, right: 30, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="id" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 600 }}
                      dy={10}
                      tickFormatter={(id) => {
                        const item = chartData.find(d => d.id === id);
                        return item ? item.name : '';
                      }}
                    />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                    <Bar 
                      dataKey="growth" 
                      radius={[6, 6, 6, 6]}
                      maxBarSize={60}
                      animationDuration={1500}
                      onClick={(state: any) => state && state.id && handleCardClick(Number(state.id))}
                      style={{ cursor: 'pointer' }}
                    >
                      <LabelList 
                        dataKey="allocation" 
                        position="top" 
                        offset={25}
                        style={{ fontSize: '9px', fontWeight: '800', fill: '#111827', textTransform: 'uppercase' }}
                      />
                      <LabelList 
                        dataKey="growth" 
                        position="top" 
                        offset={10}
                        formatter={(val: any) => `${Number(val) > 0 ? '+' : ''}${val}%`}
                        style={{ fontSize: '10px', fontWeight: 'bold', fill: '#6b7280' }}
                      />
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.growth >= 0 ? '#10b981' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {loading && items.length === 0 ? (
          <p style={{ textAlign: 'center', margin: '40px', color: '#6b7280' }}>Analyzing portfolio performance...</p>
        ) : filteredItems.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
            {filteredItems.map((item, i) => (
              <div 
                key={item.id || i} 
                className="allocation-card clickable-card entry-card slide-in-top" 
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => handleCardClick(item.id)}
              >
                <div className="card-main-content">
                  <div className="alloc-avatar tracker-avatar" style={{ 
                    backgroundColor: item.growthRate >= 0 ? '#10b981' : '#ef4444',
                    borderRadius: '16px'
                  }}>
                    {getInitial(allocationMap[item.allocId])}
                  </div>
                  <div className="alloc-info" style={{ gap: '2px' }}>
                    <h3 className="alloc-name" style={{ fontSize: '17px' }}>{allocationMap[item.allocId] || `Account #${item.allocId}`}</h3>
                    <p className="alloc-meta">
                      {item.month} {item.year} &bull; ₱{item.contribution?.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="card-value-display">
                  <div className="card-amount-wrapper">
                    <span className="currency-symbol" style={{ color: item.growthRate >= 0 ? '#059669' : '#dc2626' }}>{item.growthRate >= 0 ? '+' : ''}</span>
                    <span className="value-amount" style={{ color: item.growthRate >= 0 ? '#10b981' : '#ef4444' }}>{item.growthRate}%</span>
                  </div>
                  <div className="card-date-label">Valuation: ₱ {item.currentValue?.toLocaleString()}</div>
                </div>
              </div>
            ))}

            <div className="pagination-container">
              <button className="pagination-btn" onClick={() => fetchData(page - 1)} disabled={page === 0 || loading}>Prev</button>
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const showPage = totalPages <= 5 || (idx === 0 || idx === totalPages - 1 || Math.abs(page - idx) <= 1);
                  if (!showPage && idx === 1) return <span key={idx}>...</span>;
                  if (!showPage && idx === totalPages - 2) return <span key={idx}>...</span>;
                  if (!showPage) return null;
                  return (
                    <button key={idx} className={`pagination-number ${page === idx ? 'active' : ''}`} onClick={() => fetchData(idx)} disabled={loading}>{idx + 1}</button>
                  );
                })}
              </div>
              <button className="pagination-btn" onClick={() => fetchData(page + 1)} disabled={isLastPage || loading}>Next</button>
            </div>
          </div>
        ) : (
          <div className="empty-state-container">
            <div className="empty-state-icon-box">
              <img src={deskIllustrationUrl} alt="Empty" className="empty-state-illustration" />
            </div>
            <h3 className="empty-state-title">No Performance Records</h3>
            <p className="empty-state-text">Select an account to filter records or add new portfolio entries to generate analytics.</p>
            <button className="primary-btn margin-top-md" onClick={() => setIsInitialModalOpen(true)}>Choose Filter Account</button>
          </div>
        )}
        </div>
      </main>

      {/* CHOOSE ACCOUNT OVERLAY */}
      {isInitialModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setIsInitialModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 className="form-title" style={{ margin: 0 }}>Filter Analysis</h2>
                {selectedAllocId && (
                  <button 
                  onClick={() => { setSelectedAllocId(null); setIsInitialModalOpen(false); fetchData(0, null); }}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Clear Filter
                  </button>
                )}
            </div>
            <p className="signup-prompt" style={{ marginBottom: '24px' }}>Choose an account to view specific historical performance or clear and see everything.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
               <button 
                  className={`allocation-card clickable-card ${selectedAllocId === null ? 'active-selection' : ''}`}
                  style={{ width: '100%', border: selectedAllocId === null ? '2px solid #10b981' : '1px solid #e5e7eb', padding: '16px', display: 'flex', alignItems: 'center' }}
                  onClick={() => {
                    setSelectedAllocId(null);
                    setIsInitialModalOpen(false);
                    fetchData(0, null);
                  }}
                >
                  <div className="alloc-avatar" style={{ backgroundColor: '#6b7280' }}>★</div>
                  <div className="alloc-info" style={{ textAlign: 'left' }}>
                    <h3 className="alloc-name">All Master Accounts</h3>
                    <p className="alloc-meta">Unfiltered Portfolio View</p>
                  </div>
                </button>

              {allocationOptions.map(opt => (
                <button 
                  key={opt.allocId} 
                  className={`allocation-card clickable-card ${selectedAllocId === opt.allocId ? 'active-selection' : ''}`}
                  style={{ width: '100%', border: selectedAllocId === opt.allocId ? '2px solid #10b981' : '1px solid #e5e7eb', padding: '16px', display: 'flex', alignItems: 'center' }}
                  onClick={() => {
                    setSelectedAllocId(opt.allocId);
                    setIsInitialModalOpen(false);
                    fetchData(0, opt.allocId);
                  }}
                >
                  <div className="alloc-avatar" style={{ backgroundColor: '#10b981' }}>{getInitial(opt.allocation)}</div>
                  <div className="alloc-info" style={{ textAlign: 'left' }}>
                    <h3 className="alloc-name">{opt.allocation}</h3>
                    <p className="alloc-meta">{opt.type}</p>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setIsInitialModalOpen(false)}>Close</button>
              <button className="secondary-btn" style={{ flex: 1, color: '#6b7280', border: '1px solid #e5e7eb' }} onClick={onBack}>Return to Module</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content alloc-detail-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="alloc-detail-content">
              {isFetchingDetail ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                   <p style={{ color: '#6b7280' }}>Fetching record details...</p>
                </div>
              ) : selectedItem ? (
                <>
                  <div className="alloc-detail-header">
                    <div className="alloc-avatar large" style={{ backgroundColor: selectedItem.growthRate >= 0 ? '#10b981' : '#ef4444' }}>
                      {getInitial(allocationMap[selectedItem.allocId])}
                    </div>
                    <h2>{selectedItem.month} {selectedItem.year}</h2>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>{allocationMap[selectedItem.allocId] || `Account #${selectedItem.allocId}`}</p>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-group">
                      <label>Period Valuation</label>
                      <p style={{ color: selectedItem.growthRate >= 0 ? '#10b981' : '#ef4444', fontWeight: '800', fontSize: '1.2rem' }}>
                        ₱ {selectedItem.currentValue?.toLocaleString()}
                      </p>
                    </div>
                    <div className="detail-group">
                      <label>Growth Rate</label>
                      <p style={{ color: selectedItem.growthRate >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                        {selectedItem.growthRate >= 0 ? '+' : ''}{selectedItem.growthRate}%
                      </p>
                    </div>
                    <div className="detail-group">
                      <label>New Contribution</label>
                      <p style={{ color: '#3b82f6', fontWeight: '600' }}>₱ {selectedItem.contribution?.toLocaleString()}</p>
                    </div>
                    <div className="detail-group">
                      <label>Total Invested</label>
                      <p style={{ fontWeight: '600' }}>₱ {selectedItem.totalContribution?.toLocaleString()}</p>
                    </div>
                    <div className="detail-group">
                      <label>Date Added</label>
                      <p>{selectedItem.dateAdded || '—'}</p>
                    </div>
                    <div className="detail-group">
                      <label>Last Updated</label>
                      <p>{selectedItem.updateDate || '—'}</p>
                    </div>
                  </div>

                  <button className="secondary-btn margin-top-lg" style={{ width: '100%', marginTop: '24px' }} onClick={() => setIsModalOpen(false)}>Close View</button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>Failed to load details.</p>
                  <button className="secondary-btn" onClick={() => setIsModalOpen(false)}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
