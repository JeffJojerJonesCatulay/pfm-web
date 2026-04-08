import { useState, useEffect } from 'react';
import deskIllustrationUrl from './assets/desk_illustration.png';
import './css/App.css';

interface InvestmentItem {
  id?: number;
  allocId: number;
  date: string;
  valueAdded: number;
  marketValue: number;
  addedBy?: string;
}

interface InvestmentProps {
  onBack: () => void;
  onNavigateToGrowth: () => void;
  onNavigateToYearlyGrowth: () => void;
}

const BackIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const PenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

export default function Investment({ onBack, onNavigateToGrowth, onNavigateToYearlyGrowth }: InvestmentProps) {
  const [items, setItems] = useState<InvestmentItem[]>([]);
  const [selectedAllocId, setSelectedAllocId] = useState<number | null>(null);
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLastPage, setIsLastPage] = useState(true);
  const [totalElements, setTotalElements] = useState(0);
  const [allocationOptions, setAllocationOptions] = useState<any[]>([]);
  const [allocationMap, setAllocationMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  const [selectedItem, setSelectedItem] = useState<InvestmentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAllocDetail, setSelectedAllocDetail] = useState<any>(null);
  const [isFetchingAlloc, setIsFetchingAlloc] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ 
    allocId: 0, 
    date: new Date().toISOString().split('T')[0], 
    valueAdded: 0, 
    marketValue: 0 
  });
  const [isCreating, setIsCreating] = useState(false);
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);

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
        const authRes = await fetch(`${import.meta.env.PFM_BASE_URL}authenticate`, {
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
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}get/allocation.mapping?page=0&size=100&sortBy=allocId`, {
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
      const endpoint = allocId 
        ? `search/investmentsandsavingsday/allocId/${allocId}?page=${pageNumber}&size=20&sortBy=id`
        : `get/investmentsandsavingsday?page=${pageNumber}&size=20&sortBy=id`;

      const res = await fetch(`${import.meta.env.PFM_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        const content = payload.content || [];
        setItems(content);
        setTotalElements(payload.totalElements || 0);
        setTotalPages(payload.totalPages || 1);
        setIsLastPage(payload.last !== undefined ? payload.last : true);
        setPage(pageNumber);
      }
    } catch (e) {
      console.error('Error fetching investments:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocDetail = async (allocId: number) => {
    setIsFetchingAlloc(true);
    const token = await ensureFreshToken();
    if (!token) { setIsFetchingAlloc(false); return; }
    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}get/allocation.mapping/allocId/${allocId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const detail = json.data || json;
        setSelectedAllocDetail(Array.isArray(detail) ? detail[0] : detail);
      }
    } catch (e) { console.error('Error fetching allocation detail:', e); } finally { setIsFetchingAlloc(false); }
  };

  const handleCreate = async () => {
    if (newItem.allocId === 0) return;
    setIsCreating(true);
    const token = await ensureFreshToken();
    if (!token) { setIsCreating(false); return; }

    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}investmentsandsavingsday/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...newItem, addedBy: localStorage.getItem('pfm_username') || 'jeff' })
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        setResultDialog({ status: 'success', message: 'Portfolio entry recorded successfully!' });
        fetchData(0);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to record entry. Please try again.' });
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'An error occurred.' }); } finally { setIsCreating(false); }
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="app-container allocations-page">
      <section className="header-section allocations-header">
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        <div className="header-inner allocations-header-inner">
          <button className="icon-btn" onClick={onBack}><BackIcon /></button>
          <div className="header-titles">
            <h1 className="allocations-title">Investments</h1>
            <p className="allocations-subtitle">
              {selectedAllocId ? (
                `${allocationMap[selectedAllocId] || '...'} • ${totalElements} RECORDS`
              ) : `ALL PORTFOLIOS • ${totalElements} RECORDS`}
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
        {loading && items.length === 0 ? (
          <p style={{ textAlign: 'center', margin: '40px', color: '#6b7280' }}>Fetching portfolio history...</p>
        ) : items.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
            {items.map((item, i) => (
              <div key={item.id || i} className="allocation-card clickable-card" onClick={() => { 
                setSelectedItem(item); 
                setIsModalOpen(true); 
                fetchAllocDetail(item.allocId);
              }}>
                <div className="alloc-avatar" style={{ backgroundColor: '#10b981' }}>{getInitial(allocationMap[item.allocId])}</div>
                <div className="alloc-info">
                  <h3 className="alloc-name">{allocationMap[item.allocId] || `Account #${item.allocId}`}</h3>
                  <p className="alloc-meta">{item.date}</p>
                </div>
                <div className="alloc-date" style={{ fontWeight: 'bold', color: '#111827' }}>
                  ₱ {item.marketValue?.toLocaleString()}
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
            <h3 className="empty-state-title">No Entries Recorded</h3>
            <p className="empty-state-text">Start tracking your portfolio by adding your first entry for any account.</p>
          </div>
        )}
      </main>

      {/* CHOOSE ACCOUNT OVERLAY */}
      {isInitialModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setIsInitialModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 className="form-title" style={{ margin: 0 }}>Portfolio Filter</h2>
                {selectedAllocId && (
                  <button 
                  onClick={() => { setSelectedAllocId(null); setIsInitialModalOpen(false); fetchData(0, null); }}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Clear Filter
                  </button>
                )}
            </div>
            <p className="signup-prompt" style={{ marginBottom: '24px' }}>Select an account to view and record portfolio entries or view everything.</p>
            
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
                    <h3 className="alloc-name">Global View</h3>
                    <p className="alloc-meta">All Investment Accounts</p>
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
                    setNewItem(prev => ({ ...prev, allocId: opt.allocId }));
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              <button className="primary-btn" style={{ width: '100%', background: '#3b82f6' }} onClick={onNavigateToGrowth}>Monthly Growth Analytics</button>
              <button className="primary-btn" style={{ width: '100%', background: '#10b981' }} onClick={onNavigateToYearlyGrowth}>Yearly Growth Analytics</button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setIsInitialModalOpen(false)}>Close</button>
                <button className="secondary-btn" style={{ flex: 1, color: '#6b7280', border: '1px solid #e5e7eb' }} onClick={onBack}>Return to Dashboard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button className="fab-btn" onClick={() => setIsCreateModalOpen(true)}><PlusIcon /></button>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !isCreating && setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '95%' }}>
            <h2 className="form-title">Record Portfolio Entry</h2>
            <form className="login-form">
              <div className="input-group">
                <label>Account / Asset</label>
                <select 
                  className="dropdown-select" 
                  value={newItem.allocId} 
                  onChange={e => setNewItem({...newItem, allocId: Number(e.target.value)})}
                >
                  <option value="0">Select Account...</option>
                  {allocationOptions.map(opt => (
                    <option key={opt.allocId} value={opt.allocId}>{opt.allocation}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Period Date</label>
                <input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px', width: '100%' }}>
                <div className="input-group" style={{ marginBottom: 0, width: '100%' }}>
                  <label>Value Added (₱)</label>
                  <input 
                    type="number" 
                    value={newItem.valueAdded} 
                    onChange={e => setNewItem({...newItem, valueAdded: Number(e.target.value)})} 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0, width: '100%' }}>
                  <label>Market Value (₱)</label>
                  <input 
                    type="number" 
                    value={newItem.marketValue} 
                    onChange={e => setNewItem({...newItem, marketValue: Number(e.target.value)})} 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <button type="button" className="primary-btn margin-top-lg" onClick={handleCreate} disabled={isCreating} style={{ width: '100%', marginTop: '24px' }}>
                {isCreating ? 'Synching Portfolio...' : 'Save Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isModalOpen && selectedItem && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content alloc-detail-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="alloc-detail-content">
              <div className="alloc-detail-header">
                <div className="alloc-avatar large" style={{ backgroundColor: '#10b981' }}>
                  {getInitial(allocationMap[selectedItem.allocId])}
                </div>
                <h2>{allocationMap[selectedItem.allocId] || `Account #${selectedItem.allocId}`}</h2>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Recorded on {selectedItem.date}</p>
              </div>

              <div className="detail-grid">
                <div className="detail-group">
                  <label>Market Valuation</label>
                  <p style={{ color: '#10b981', fontWeight: '700', fontSize: '1.2rem' }}>
                    ₱ {selectedItem.marketValue?.toLocaleString()}
                  </p>
                </div>
                <div className="detail-group">
                  <label>Value Added</label>
                  <p style={{ color: '#3b82f6', fontWeight: '600' }}>₱ {selectedItem.valueAdded?.toLocaleString()}</p>
                </div>
                <div className="detail-group">
                  <label>Added By</label>
                  <p>@{selectedItem.addedBy}</p>
                </div>
                <div className="detail-group">
                  <label>Record ID</label>
                  <p>#{selectedItem.id}</p>
                </div>
              </div>

              {selectedAllocDetail && (
                <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Allocation Details</h4>
                  <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="detail-group">
                        <label style={{ fontSize: '10px' }}>Name</label>
                        <p style={{ fontSize: '13px', margin: 0, fontWeight: '600' }}>{selectedAllocDetail.allocation}</p>
                      </div>
                      <div className="detail-group">
                        <label style={{ fontSize: '10px' }}>Type</label>
                        <p style={{ fontSize: '13px', margin: 0, fontWeight: '600' }}>{selectedAllocDetail.type}</p>
                      </div>
                    </div>
                    <div className="detail-group">
                      <label style={{ fontSize: '10px' }}>Description</label>
                      <p style={{ fontSize: '13px', margin: 0, fontWeight: '500', color: '#4b5563' }}>{selectedAllocDetail.description || 'No description provided.'}</p>
                    </div>
                    <div className="detail-group">
                      <label style={{ fontSize: '10px' }}>Status</label>
                      <p style={{ fontSize: '13px', margin: 0, fontWeight: '600', color: selectedAllocDetail.status === 'Active' ? '#10b981' : '#ef4444' }}>{selectedAllocDetail.status}</p>
                    </div>
                  </div>
                </div>
              )}

              {isFetchingAlloc && <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '12px' }}>Loading account info...</p>}

              <button className="secondary-btn margin-top-lg" style={{ width: '100%' }} onClick={() => { setIsModalOpen(false); setSelectedAllocDetail(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT DIALOG */}
      {resultDialog && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '380px' }}>
            <div className="success-icon" style={{ backgroundColor: resultDialog.status === 'success' ? '#2ecc71' : '#ef4444', margin: '0 auto 20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 className="form-title">Portfolio Updated</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>{resultDialog.message}</p>
            <button className="primary-btn" style={{ width: '100%' }} onClick={() => setResultDialog(null)}>Great</button>
          </div>
        </div>
      )}
    </div>
  );
}
