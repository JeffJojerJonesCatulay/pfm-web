import { useState, useEffect } from 'react';
import { API_URLS } from './url';
import deskIllustrationUrl from './assets/desk_illustration.png';
import './css/App.css';

interface YearlyGrowthRecord {
  id: number;
  allocId: number;
  year: number;
  averageContribution: number;
  averageCurrentValue: number;
  averageGrowthRate: number;
  totalContribution: number;
  addedBy?: string;
  dateAdded?: string;
  updateBy?: string;
  updateDate?: string;
}

interface InvestmentYearlyGrowthProps {
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

const YEARS = Array.from({ length: 10 }, (_, i) => 2026 + i);

export default function InvestmentYearlyGrowth({ onBack }: InvestmentYearlyGrowthProps) {
  const [items, setItems] = useState<YearlyGrowthRecord[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [selectedAllocId, setSelectedAllocId] = useState<number | null>(null);
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(false);
  const [allocationMap, setAllocationMap] = useState<Record<number, string>>({});
  const [allocationOptions, setAllocationOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLastPage, setIsLastPage] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState<YearlyGrowthRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  useEffect(() => {
    const init = async () => {
      await fetchAllocationOptions();
      await fetchData(0, null);
    };
    init();
  }, []);

  const ensureFreshToken = async (): Promise<string | null> => {
    const username = localStorage.getItem('pfm_username');
    const password = localStorage.getItem('pfm_password');
    if (!username || !password) return null;

    let token = localStorage.getItem('pfm_token') || '';
    const tokenTime = Number(localStorage.getItem('pfm_token_time') || 0);
    const isExpired = Date.now() - tokenTime > 1000 * 60 * 10; 

    if (!token || isExpired) {
      try {
        const authRes = await fetch(API_URLS.AUTH.AUTHENTICATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (authRes.ok) {
          const authText = await authRes.text();
          try {
            const parsed = JSON.parse(authText);
            token = parsed.data?.token || parsed.token || authText;
          } catch (e) { token = authText; }
          localStorage.setItem('pfm_token', token);
          localStorage.setItem('pfm_token_time', Date.now().toString());
        } else { return null; }
      } catch (e) { return null; }
    }
    return token;
  };

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
    const token = await ensureFreshToken();
    if (!token) { setLoading(false); return; }

    try {
      const baseUrl = allocId 
        ? API_URLS.YEARLY_GROWTH.SEARCH_BY_ALLOC(allocId)
        : API_URLS.YEARLY_GROWTH.BASE;
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
      }
    } catch (e) {
      console.error('Error fetching yearly growth data:', e);
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
      const res = await fetch(API_URLS.YEARLY_GROWTH.GET_BY_ID(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setSelectedItem(Array.isArray(data) ? data[0] : data);
      }
    } catch (e) {
      console.error('Error fetching yearly growth detail:', e);
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';

  const filteredItems = items.filter(item => {
    return yearFilter === 'All' || item.year.toString() === yearFilter;
  });

  return (
    <div className="app-container allocations-page">
      <section className="header-section allocations-header">
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        <div className="header-inner allocations-header-inner" style={{ maxWidth: '600px' }}>
          <button className="icon-btn" onClick={onBack}><BackIcon /></button>
          <div className="header-titles">
            <h1 className="allocations-title">Yearly Growth</h1>
            <p className="allocations-subtitle">
              {selectedAllocId ? (
                `${allocationMap[selectedAllocId] || '...'} • ANNUAL TRENDS`
              ) : `ALL PORTFOLIOS • ${items.length} RECORDS`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="premium-pill-btn" 
              onClick={() => setIsInitialModalOpen(true)}
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <PenIcon />
              <span>{selectedAllocId ? 'Switch Fund' : 'Select Account'}</span>
            </button>
          </div>
        </div>
      </section>

      <main className="allocations-main">
        <div className="filter-bar" style={{ 
          display: 'flex', 
          justifyContent: 'center',
          maxWidth: '600px', 
          margin: '20px auto 28px', 
          padding: '0 16px' 
        }}>
          <div className="input-group" style={{ flex: 1, maxWidth: '300px', marginBottom: 0 }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563', marginBottom: '8px', display: 'block', textAlign: 'center' }}>FILTER YEAR</label>
            <select 
              className="dropdown-select" 
              value={yearFilter} 
              onChange={e => setYearFilter(e.target.value)}
              style={{ background: 'white', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', boxSizing: 'border-box', width: '100%' }}
            >
              <option value="All">All Years</option>
              {YEARS.map(y => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <p style={{ textAlign: 'center', margin: '40px', color: '#6b7280' }}>Aggregating annual performance...</p>
        ) : filteredItems.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
            {filteredItems.map((item, i) => (
              <div key={item.id || i} className="allocation-card clickable-card" style={{ padding: '20px' }} onClick={() => handleCardClick(item.id)}>
                <div className="alloc-avatar" style={{ 
                  backgroundColor: '#34d399',
                  borderRadius: '16px',
                  width: '56px',
                  height: '56px'
                }}>
                  {item.year}
                </div>
                <div className="alloc-info" style={{ gap: '2px' }}>
                  <h3 className="alloc-name" style={{ fontSize: '18px' }}>{allocationMap[item.allocId] || `Account #${item.allocId}`}</h3>
                  <p className="alloc-meta" style={{ fontWeight: '500', color: '#111827' }}>
                    Annual Statistics Audit
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                    Avg. Contribution: ₱ {item.averageContribution?.toLocaleString()}
                  </p>
                </div>
                <div className="alloc-date" style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800', color: '#10b981', fontSize: '1.1rem' }}>
                    +{item.averageGrowthRate}%
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginTop: '4px' }}>
                    ₱ {item.averageCurrentValue?.toLocaleString()}
                  </div>
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
            <h3 className="empty-state-title">No Annual Data</h3>
            <p className="empty-state-text">Yearly growth analysis will be generated once full period records are processed.</p>
            <button className="primary-btn margin-top-md" onClick={() => setIsInitialModalOpen(true)}>Choose Filter Account</button>
          </div>
        )}
      </main>

      {/* CHOOSE ACCOUNT OVERLAY */}
      {isInitialModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setIsInitialModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 className="form-title" style={{ margin: 0 }}>Filter Yearly View</h2>
                {selectedAllocId && (
                  <button 
                  onClick={() => { setSelectedAllocId(null); setIsInitialModalOpen(false); fetchData(0, null); }}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Clear Filter
                  </button>
                )}
            </div>
            <p className="signup-prompt" style={{ marginBottom: '24px' }}>Choose a master account to view its historical annual performance trends.</p>
            
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
                    <p className="alloc-meta">Unfiltered Yearly Trends</p>
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
              <button className="secondary-btn" style={{ flex: 1, color: '#6b7280', border: '1px solid #e5e7eb' }} onClick={onBack}>Return to Dashboard</button>
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
                   <p style={{ color: '#6b7280' }}>Analyzing annual breakdown...</p>
                </div>
              ) : selectedItem ? (
                <>
                  <div className="alloc-detail-header">
                    <div className="alloc-avatar large" style={{ backgroundColor: '#34d399' }}>
                      {selectedItem.year}
                    </div>
                    <h2>Annual Record {selectedItem.year}</h2>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>{allocationMap[selectedItem.allocId] || `Account #${selectedItem.allocId}`}</p>
                  </div>

                  <div className="detail-grid">
                    <div className="detail-group">
                      <label>Avg. Valuation</label>
                      <p style={{ color: '#10b981', fontWeight: '800', fontSize: '1.2rem' }}>
                        ₱ {selectedItem.averageCurrentValue?.toLocaleString()}
                      </p>
                    </div>
                    <div className="detail-group">
                      <label>Avg. Growth Rate</label>
                      <p style={{ color: '#10b981', fontWeight: '700' }}>
                        +{selectedItem.averageGrowthRate}%
                      </p>
                    </div>
                    <div className="detail-group">
                      <label>Avg. Contribution</label>
                      <p style={{ color: '#3b82f6', fontWeight: '600' }}>₱ {selectedItem.averageContribution?.toLocaleString()}</p>
                    </div>
                    <div className="detail-group">
                      <label>Total Contribution</label>
                      <p style={{ fontWeight: '600' }}>₱ {selectedItem.totalContribution?.toLocaleString()}</p>
                    </div>
                    <div className="detail-group">
                      <label>Audit Source</label>
                      <p>@{selectedItem.addedBy}</p>
                    </div>
                    <div className="detail-group">
                      <label>Last Updated</label>
                      <p style={{ fontSize: '12px' }}>{selectedItem.updateDate || selectedItem.dateAdded}</p>
                    </div>
                  </div>

                  <button className="secondary-btn margin-top-lg" style={{ width: '100%', marginTop: '24px' }} onClick={() => setIsModalOpen(false)}>Close Analysis</button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p>Failed to load yearly analysis.</p>
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
