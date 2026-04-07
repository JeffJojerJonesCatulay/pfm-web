import { useState, useEffect } from 'react';
import './css/App.css';

interface CCDetailItem {
  ccId?: number;
  ccName?: string;
  ccAcronym?: string;
  ccLastDigit?: string;
  addedBy?: string;
  dateAdded?: string;
  updateBy?: string;
  updateDate?: string;
}

const BackIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const SearchIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
    <path d="M22 10h-6a2 2 0 0 0 0 4h6"></path>
  </svg>
);

interface CCDetailsProps {
  onBack: () => void;
  onNavigateToConnectedApps: () => void;
}


export default function CCDetails({ onBack, onNavigateToConnectedApps }: CCDetailsProps) {
  const [items, setItems] = useState<CCDetailItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isLastPage, setIsLastPage] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CCDetailItem | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<CCDetailItem>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ id: number; show: boolean }>({ id: 0, show: false });
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerms, setSearchTerms] = useState({ ccName: '', ccLastDigit: '', ccAcronym: '' });
  const [tempSearchTerms, setTempSearchTerms] = useState({ ccName: '', ccLastDigit: '', ccAcronym: '' });
  
  const [newItem, setNewItem] = useState<CCDetailItem>({
    ccName: '',
    ccAcronym: '',
    ccLastDigit: ''
  });

  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);
  const username = localStorage.getItem('pfm_username') || 'jeff';

  const removeFilter = (key: string) => {
    const fresh = { ...searchTerms, [key]: '' };
    setSearchTerms(fresh);
    setTempSearchTerms(fresh);
    if (!fresh.ccName && !fresh.ccAcronym && !fresh.ccLastDigit) {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchData(0, false);
  }, [searchTerms, isSearching]);

  const sanitizeInput = (val: string) => {
    return val.replace(/[\\/;\%\$\*\!\`\~]|--/g, '');
  };

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

  const fetchData = async (pageNumber: number, append: boolean) => {
    setLoading(true);
    if (!append) setItems([]); // Clear immediate feedback

    try {
      const token = await ensureFreshToken();
      if (!token) return;

      let url = `${import.meta.env.PFM_BASE_URL}get/cc.details?page=${pageNumber}&size=20&sortBy=ccId`;
      
      if (isSearching) {
        url = `${import.meta.env.PFM_BASE_URL}search/cc.details?page=${pageNumber}&size=20&sortBy=ccId`;
        if (searchTerms.ccName) url += `&ccName=${searchTerms.ccName.replace(/ /g, '+')}`;
        if (searchTerms.ccLastDigit) url += `&ccLastDigit=${searchTerms.ccLastDigit.replace(/ /g, '+')}`;
        if (searchTerms.ccAcronym) url += `&ccAcronym=${searchTerms.ccAcronym.replace(/ /g, '+')}`;
      }

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        const content = payload.content || [];
        setItems(append ? [...items, ...content] : content);
        setIsLastPage(payload.last !== undefined ? payload.last : true);
        setTotalElements(payload.totalElements || 0);
        setTotalPages(payload.totalPages || 1);
        setPage(pageNumber);
      }
    } catch (e) {
      console.error('Error fetching CC details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchTerms(tempSearchTerms);
    setIsSearching(true);
    setIsSearchModalOpen(false);
  };

  const clearSearch = () => {
    setIsSearching(false);
    const empty = { ccName: '', ccLastDigit: '', ccAcronym: '' };
    setSearchTerms(empty);
    setTempSearchTerms(empty);
  };

  const handleCreate = async () => {
    const token = await ensureFreshToken();
    if (!token) return;

    const payload = {
      ccName: sanitizeInput(newItem.ccName || ''),
      ccAcronym: sanitizeInput(newItem.ccAcronym || ''),
      ccLastDigit: sanitizeInput(newItem.ccLastDigit || ''),
      addedBy: username
    };

    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}cc.details/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Credit card added successfully!' });
        setIsCreateModalOpen(false);
        setNewItem({ ccName: '', ccAcronym: '', ccLastDigit: '' });
        fetchData(0, false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to add card. Please check inputs.' });
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Network error occurred.' }); }
  };

  const handleUpdate = async () => {
    if (!editItem.ccId) return;
    const token = await ensureFreshToken();
    if (!token) return;

    const payload = {
      ccId: editItem.ccId,
      ccName: sanitizeInput(editItem.ccName || ''),
      ccAcronym: sanitizeInput(editItem.ccAcronym || ''),
      ccLastDigit: sanitizeInput(editItem.ccLastDigit || ''),
      updateBy: username
    };

    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}cc.details/update/${editItem.ccId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'The credit card details have been updated.' });
        setIsEditing(false);
        setSelectedItem({ ...selectedItem, ...payload } as any);
        fetchData(page, false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to update record. Please check backend logs.' });
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Network error occurred.' }); }
  };

  const handleDelete = async (id: number) => {
    const token = await ensureFreshToken();
    if (!token) return;

    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}cc.details/delete/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Credit card record has been removed.' });
        setIsModalOpen(false);
        setShowConfirm({ id: 0, show: false });
        fetchData(0, false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to remove record.' });
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Network error occurred.' }); }
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="app-container allocations-page">
      <section className="header-section allocations-header" style={{ height: '160px' }}>
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        
        <div className="header-inner allocations-header-inner">
          <button className="icon-btn" onClick={onBack}>
            <BackIcon />
          </button>
          
          <div className="header-titles">
            <h1 className="allocations-title">CC Details</h1>
            <p className="allocations-subtitle">{totalElements} CARDS REGISTERED</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="premium-pill-btn" 
              onClick={onNavigateToConnectedApps}
            >
              <WalletIcon />
              <span>Connected Apps</span>
            </button>
            <button className="icon-btn search-trigger" onClick={() => setIsSearchModalOpen(true)}>
              <SearchIcon />
            </button>
          </div>
        </div>
      </section>

      <main className="allocations-main">
        {isSearching && (
          <div style={{ display: 'flex', gap: '8px', maxWidth: '600px', margin: '0 auto 16px', flexWrap: 'wrap' }}>
            {Object.entries(searchTerms).map(([k, v]) => v ? (
              <div key={k} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontWeight: 600, color: '#6366f1' }}>{k === 'ccName' ? 'Name' : k === 'ccAcronym' ? 'Acronym' : 'Digits'}:</span> {v}
                <button onClick={() => removeFilter(k)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ) : null)}
          </div>
        )}

        {items.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
          {items.map((it, i) => (
            <div key={it.ccId || i} className="allocation-card clickable-card" onClick={() => { setSelectedItem(it); setIsModalOpen(true); }}>
              <div className="alloc-avatar" style={{ backgroundColor: '#6366f1' }}>
                {getInitial(it.ccAcronym)}
              </div>
              <div className="alloc-info">
                <h3 className="alloc-name">{it.ccName} ({it.ccAcronym})</h3>
                <p className="alloc-meta">
                  Last Digits: {it.ccLastDigit || '—'}
                </p>
              </div>
              <div className="alloc-date">
                {it.dateAdded}
              </div>
            </div>
          ))}

          <div className="pagination-container">
            <button className="pagination-btn" onClick={() => fetchData(page - 1, false)} disabled={page === 0 || loading}>Prev</button>
            <div className="pagination-numbers">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const showPage = totalPages <= 5 || (idx === 0 || idx === totalPages - 1 || Math.abs(page - idx) <= 1);
                if (!showPage && idx === 1) return <span key={idx}>...</span>;
                if (!showPage && idx === totalPages - 2) return <span key={idx}>...</span>;
                if (!showPage) return null;
                return (
                  <button key={idx} className={`pagination-number ${page === idx ? 'active' : ''}`} onClick={() => fetchData(idx, false)} disabled={loading}>{idx + 1}</button>
                );
              })}
            </div>
            <button className="pagination-btn" onClick={() => fetchData(page + 1, false)} disabled={isLastPage || loading}>Next</button>
          </div>
        </div>
        ) : (
          <div className="empty-state-container">
            <div className="empty-state-icon-box">
              <div style={{ fontSize: '64px', opacity: 0.2 }}>💳</div>
            </div>
            <h3 className="empty-state-title">{isSearching ? 'No Cards Found' : 'No Cards Registered'}</h3>
            <p className="empty-state-text">
              {isSearching 
                ? 'We couldn\'t find any cards matching your filters. Try adjusting your search criteria.' 
                : 'You haven\'t added any credit cards to your registry yet. Click the plus button to start!'}
            </p>
            {isSearching && <button className="secondary-btn" style={{ marginTop: '20px' }} onClick={clearSearch}>Clear All Filters</button>}
          </div>
        )}
      </main>

      <button className="fab-btn" onClick={() => setIsCreateModalOpen(true)}>
        <PlusIcon />
      </button>

      {/* Detail Modal */}
      {isModalOpen && selectedItem && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content alloc-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="alloc-detail-content">
              <div className="alloc-detail-header">
                <div className="alloc-avatar large" style={{ backgroundColor: '#6366f1' }}>{getInitial(selectedItem.ccAcronym)}</div>
                <h2>{selectedItem.ccName}</h2>
                <p>{selectedItem.ccAcronym}</p>
              </div>
              
              <div className="detail-grid">
                <div className="detail-group"><label>Last Digits</label><p>{selectedItem.ccLastDigit}</p></div>
                <div className="detail-group"><label>Date Added</label><p>{selectedItem.dateAdded}</p></div>
                <div className="detail-group"><label>Added By</label><p>@{selectedItem.addedBy}</p></div>
                <div className="detail-group"><label>Last Update</label><p>{selectedItem.updateDate || '—'} {selectedItem.updateBy ? `(@${selectedItem.updateBy})` : ''}</p></div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                <button className="primary-btn" style={{ flex: 1 }} onClick={() => {
                  setEditItem(selectedItem);
                  setIsEditing(true);
                  setIsModalOpen(false);
                }}>Edit Card</button>
                <button className="secondary-btn" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }} onClick={() => setShowConfirm({ id: selectedItem.ccId!, show: true })}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Add New Credit Card</h2>
            <form className="login-form">
              <div className="input-group">
                <label>Credit Card Name</label>
                <input type="text" placeholder="e.g. Visa Gold" value={newItem.ccName} onChange={e => setNewItem({...newItem, ccName: e.target.value})} />
              </div>
              <div className="input-group">
                <label>CC Acronym</label>
                <input type="text" placeholder="e.g. BDO, BPI" value={newItem.ccAcronym} onChange={e => setNewItem({...newItem, ccAcronym: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Last 4 Digits</label>
                <input type="text" placeholder="e.g. 1234" maxLength={4} value={newItem.ccLastDigit} onChange={e => setNewItem({...newItem, ccLastDigit: e.target.value})} />
              </div>
              <button type="button" className="primary-btn margin-top-lg" onClick={handleCreate}>Save Card</button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Edit Credit Card</h2>
            <form className="login-form">
              <div className="input-group">
                <label>Credit Card Name</label>
                <input type="text" value={editItem.ccName} onChange={e => setEditItem({...editItem, ccName: e.target.value})} />
              </div>
              <div className="input-group">
                <label>CC Acronym</label>
                <input type="text" value={editItem.ccAcronym} onChange={e => setEditItem({...editItem, ccAcronym: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Last 4 Digits</label>
                <input type="text" maxLength={4} value={editItem.ccLastDigit} onChange={e => setEditItem({...editItem, ccLastDigit: e.target.value})} />
              </div>
              <button type="button" className="primary-btn margin-top-lg" onClick={handleUpdate}>Update Card</button>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Dialog */}
      {resultDialog && (
        <div className="modal-overlay" onClick={() => setResultDialog(null)}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px 20px' }}>
            <div className="success-icon" style={{ backgroundColor: resultDialog.status === 'success' ? '#2ecc71' : '#e53e3e', margin: '0 auto 20px' }}>
              {resultDialog.status === 'success' ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              )}
            </div>
            <h2 className="form-title" style={{ marginBottom: '8px' }}>{resultDialog.status === 'success' ? 'Great!' : 'Oops!'}</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>{resultDialog.message}</p>
            <button className="primary-btn" style={{ width: '100%' }} onClick={() => setResultDialog(null)}>Continue</button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirm.show && (
        <div className="modal-overlay" onClick={() => setShowConfirm({ id: 0, show: false })}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px 20px' }}>
            <div className="success-icon" style={{ backgroundColor: '#f39c12', margin: '0 auto 20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2 className="form-title" style={{ marginBottom: '8px' }}>Confirm Action</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>Are you sure you want to remove this credit card record? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="primary-btn" style={{ flex: 1, background: '#ef4444' }} onClick={() => handleDelete(showConfirm.id)}>Delete</button>
              <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setShowConfirm({ id: 0, show: false })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Search & Filters</h2>
            <div className="login-form">
              <div className="input-group">
                <label>Credit Card Name</label>
                <input type="text" placeholder="e.g. Visa Gold" value={tempSearchTerms.ccName} onChange={e => setTempSearchTerms({...tempSearchTerms, ccName: sanitizeInput(e.target.value)})} />
              </div>
              <div className="input-group">
                <label>CC Acronym</label>
                <input type="text" placeholder="e.g. BDO, BPI" value={tempSearchTerms.ccAcronym} onChange={e => setTempSearchTerms({...tempSearchTerms, ccAcronym: sanitizeInput(e.target.value)})} />
              </div>
              <div className="input-group">
                <label>Last 4 Digits</label>
                <input type="text" placeholder="e.g. 1234" maxLength={4} value={tempSearchTerms.ccLastDigit} onChange={e => setTempSearchTerms({...tempSearchTerms, ccLastDigit: sanitizeInput(e.target.value)})} />
              </div>
              <button className="primary-btn margin-top-lg" onClick={handleSearch}>Apply Search</button>
              {isSearching && <button className="secondary-btn" style={{ width: '100%', marginTop: '10px' }} onClick={clearSearch}>Clear Filter</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
