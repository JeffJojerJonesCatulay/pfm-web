import { useState, useEffect } from 'react';
import { API_URLS } from './url';
import { ensureFreshToken, containsProhibitedChars } from './utils/securityUtils';
import './css/App.css';

interface ConnectedAppItem {
  id?: number;
  ccId?: number;
  amount?: number;
  autoDebit?: string;
  connectedApp?: string;
  date?: string;
  dateAdded?: string;
  remarks?: string;
  subscription?: string;
  addedBy?: string;
  updateBy?: string | null;
  updateDate?: string | null;
}

interface ConnectedAppsProps {
  onBack: () => void;
}

const BackIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const SearchIcon = ({ fill = 'none' }: { fill?: string }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const FilterIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

export default function ConnectedApps({ onBack }: ConnectedAppsProps) {
  const [items, setItems] = useState<ConnectedAppItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLastPage, setIsLastPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ConnectedAppItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<ConnectedAppItem>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCCModalOpen, setIsCCModalOpen] = useState(false);
  const [selectedCcId, setSelectedCcId] = useState<string>('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'update' | 'delete', message: string, id?: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerms, setSearchTerms] = useState({ connectedApp: '', subscription: '', autoDebit: '' });
  const [tempSearchTerms, setTempSearchTerms] = useState({ connectedApp: '', subscription: '', autoDebit: '' });
  const [ccOptions, setCcOptions] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    ccId: '',
    connectedApp: '',
    subscription: '',
    autoDebit: 'Enabled',
    amount: '',
    date: '',
    remarks: ''
  });
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);

  const username = localStorage.getItem('pfm_username') || 'jeff';

  const fetchCCOptions = async () => {
    try {
      const token = await ensureFreshToken();
      if (!token) return;
      const res = await fetch(`${API_URLS.CC_DETAILS.BASE}?page=0&size=100&sortBy=ccId`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setCcOptions(json.data?.content || []);
      }
    } catch (e) {
      console.error('Error fetching CC options:', e);
    }
  };

  useEffect(() => {
    fetchCCOptions();
  }, []);

  const fetchData = async (pageNumber: number, append: boolean) => {
    setLoading(true);
    if (!append) setItems([]);

    try {
      const token = await ensureFreshToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const hasSearchTerms = !!(searchTerms.connectedApp || searchTerms.subscription || searchTerms.autoDebit);
      
      let baseUrl = API_URLS.CONNECTED_APPS.BASE;
      if (selectedCcId) {
        baseUrl = API_URLS.CONNECTED_APPS.SEARCH_BY_CC(selectedCcId);
      } else if (isSearching && hasSearchTerms) {
        baseUrl = API_URLS.CONNECTED_APPS.SEARCH_GLOBAL;
      }

      let url = `${baseUrl}?page=${pageNumber}&size=20&sortBy=id`;
      
      if (hasSearchTerms && (isSearching || selectedCcId)) {
        if (searchTerms.connectedApp) url += `&connectedApp=${encodeURIComponent(searchTerms.connectedApp.trim())}`;
        if (searchTerms.subscription) url += `&subscription=${encodeURIComponent(searchTerms.subscription.trim())}`;
        if (searchTerms.autoDebit) url += `&autoDebit=${encodeURIComponent(searchTerms.autoDebit.trim())}`;
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
      } else if (res.status === 400 && selectedCcId) {
        // Backend returns 400 for empty list on SEARCH_BY_CC
        setItems([]);
        setTotalElements(0);
        setTotalPages(0);
      }
    } catch (e) {
      console.error('Error fetching connected apps:', e);
      setResultDialog({ status: 'failed', message: 'Something went wrong while fetching the data.' });
    } finally {
      setLoading(false);
    }
  };

  const removeFilter = (key: string) => {
    const fresh = { ...searchTerms, [key]: '' };
    setSearchTerms(fresh);
    setTempSearchTerms(fresh);
    if (!fresh.connectedApp && !fresh.subscription && !fresh.autoDebit) {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchData(0, false);
  }, [searchTerms, isSearching, selectedCcId]);

  const handleSearch = () => {
    const hasFilters = !!(tempSearchTerms.connectedApp || tempSearchTerms.subscription || tempSearchTerms.autoDebit);
    setSearchTerms(tempSearchTerms);
    setIsSearching(hasFilters);
    setIsSearchModalOpen(false);
  };

  const clearSearch = () => {
    const empty = { connectedApp: '', subscription: '', autoDebit: '' };
    setSearchTerms(empty);
    setTempSearchTerms(empty);
    setIsSearching(false);
  };

  const handleInputChange = (setter: any, field: string, value: string, currentObj?: any) => {
    if (containsProhibitedChars(value)) return;
    if (currentObj) {
      setter({ ...currentObj, [field]: value });
    } else {
      setter(value);
    }
  };

  const handleCreate = async () => {
    const isAutoDebitEnabled = newItem.autoDebit === 'Enabled';
    const isAmountMissing = newItem.amount === '' || newItem.amount === null || newItem.amount === undefined;
    
    if (!newItem.ccId || !newItem.connectedApp || (isAutoDebitEnabled && (isAmountMissing || !newItem.date || !newItem.subscription))) {
      let missingFields = 'Card and App Name';
      if (isAutoDebitEnabled) missingFields += ', Plan, Amount, and Date';
      setResultDialog({ status: 'failed', message: `Please fill in all mandatory fields: ${missingFields}.` });
      return;
    }

    if (containsProhibitedChars(newItem.connectedApp) || containsProhibitedChars(newItem.subscription) || containsProhibitedChars(newItem.remarks)) {
      setResultDialog({ status: 'failed', message: 'Input contains prohibited characters. Please remove them before saving.' });
      return;
    }

    const token = await ensureFreshToken();
    if (!token) return;

    const today = new Date().toISOString().split('T')[0];
    const payload = {
      ccId: Number(newItem.ccId),
      connectedApp: newItem.connectedApp,
      subscription: newItem.subscription || null,
      autoDebit: newItem.autoDebit,
      amount: newItem.amount ? Number(newItem.amount) : (newItem.autoDebit === 'Disabled' ? 0 : null),
      date: newItem.autoDebit === 'Disabled' ? (newItem.date || today) : (newItem.date || null),
      remarks: newItem.remarks || null,
      addedBy: username
    };

    try {
      const res = await fetch(API_URLS.CONNECTED_APPS.CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'The app has been successfully connected.' });
        setIsCreateModalOpen(false);
        setNewItem({ ccId: '', connectedApp: '', subscription: '', autoDebit: 'Enabled', amount: '', date: '', remarks: '' });
        fetchData(0, false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to create connectivity record.' });
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Network error occurred.' }); }
  };

  const executeUpdate = async () => {
    setConfirmDialog(null);
    if (!editItem.id) return;
    const isAutoDebitEnabled = editItem.autoDebit === 'Enabled';
    const isAmountMissing = editItem.amount === null || editItem.amount === undefined;

    if (!editItem.ccId || !editItem.connectedApp || (isAutoDebitEnabled && (isAmountMissing || !editItem.date || !editItem.subscription))) {
      let missingFields = 'Card and App Name';
      if (isAutoDebitEnabled) missingFields += ', Plan, Amount, and Date';
      setResultDialog({ status: 'failed', message: `Please fill in all mandatory fields: ${missingFields}.` });
      return;
    }

    if (containsProhibitedChars(editItem.connectedApp || '') || containsProhibitedChars(editItem.subscription || '') || containsProhibitedChars(editItem.remarks || '')) {
      setResultDialog({ status: 'failed', message: 'Input contains prohibited characters. Please remove them before updating.' });
      return;
    }

    const token = await ensureFreshToken();
    if (!token) return;

    const today = new Date().toISOString().split('T')[0];
    const payload = {
      id: editItem.id,
      ccId: Number(editItem.ccId),
      connectedApp: editItem.connectedApp || '',
      subscription: editItem.subscription || null,
      autoDebit: editItem.autoDebit,
      amount: editItem.amount ? Number(editItem.amount) : (editItem.autoDebit === 'Disabled' ? 0 : null),
      date: editItem.autoDebit === 'Disabled' ? (editItem.date || today) : (editItem.date || null),
      remarks: editItem.remarks || null,
      updateBy: username
    };

    try {
      const res = await fetch(API_URLS.CONNECTED_APPS.UPDATE(editItem.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'The app connection has been updated.' });
        setIsEditing(false);
        setSelectedItem({ ...selectedItem, ...payload } as any);
        fetchData(page, false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to update record.' });
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Network error occurred.' }); }
  };

  const handleUpdate = () => {
    setConfirmDialog({ 
      type: 'update', 
      message: 'Are you sure you want to save these changes to the app connection?' 
    });
  };

  const executeDelete = async (id: number) => {
    setConfirmDialog(null);
    const token = await ensureFreshToken();
    if (!token) return;

    try {
      const res = await fetch(API_URLS.CONNECTED_APPS.DELETE(id), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'The app connection has been removed.' });
        setIsModalOpen(false);
        fetchData(0, false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to remove record.' });
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Network error occurred.' }); }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({ 
      type: 'delete', 
      message: 'Are you sure you want to disconnect this app? This action cannot be undone.',
      id
    });
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="app-container allocations-page">
      <section className="header-section allocations-header" style={{ height: '160px' }}>
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        
        <div className="header-inner allocations-header-inner">
          <div className="header-left">
            <button className="icon-btn" onClick={onBack} aria-label="Back"><BackIcon /></button>
          </div>
          
          <div className="header-titles centered-titles">
            <h1 className="allocations-title">Connected Apps</h1>
            <div className="status-pill-container">
              <p className="allocations-subtitle status-pill">{totalElements} APPS CONNECTED</p>
            </div>
          </div>
          
          <div className="header-right" style={{ gap: '10px' }}>
            <button 
              className="premium-action-pill" 
              onClick={() => { fetchCCOptions(); setIsCCModalOpen(true); }}
              title="Filter by Card"
            >
              <div className="pill-icon"><FilterIcon /></div>
              <span className="hide-mobile">Filter CC</span>
            </button>
            <button className="icon-btn search-trigger" onClick={() => setIsSearchModalOpen(true)} aria-label="Search">
              <SearchIcon />
            </button>
          </div>
        </div>
      </section>

      <main className="allocations-main">
        {(isSearching || selectedCcId) && (
          <div style={{ display: 'flex', gap: '8px', maxWidth: '600px', margin: '16px auto 20px', flexWrap: 'wrap' }}>
            {selectedCcId && (
              <div style={{ background: '#d1fae5', border: '1px solid #10b981', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontWeight: 600, color: '#065f46' }}>Card:</span> {
                  ccOptions.find(c => String(c.ccId) === String(selectedCcId))?.ccName || 'Filtered Card'
                }
                <button onClick={() => { setSelectedCcId(''); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#065f46', display: 'flex', alignItems: 'center', padding: '2px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            )}
            {Object.entries(searchTerms).map(([k, v]) => v ? (
              <div key={k} style={{ background: '#d1fae5', border: '1px solid #10b981', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontWeight: 600, color: '#065f46' }}>{k === 'connectedApp' ? 'App' : k === 'subscription' ? 'Plan' : 'Debit'}:</span> {v}
                <button onClick={() => removeFilter(k)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ) : null)}
          </div>
        )}

        {items.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
          {items.map((it, i) => (
            <div 
              key={it.id || i} 
              className="allocation-card clickable-card entry-card slide-in-top" 
              style={{ animationDelay: `${i * 40}ms` }}
              onClick={() => { setSelectedItem(it); setIsModalOpen(true); }}
            >
              <div className="card-main-content">
                <div className="alloc-avatar tracker-avatar" style={{ backgroundColor: '#10b981' }}>
                  {getInitial(it.connectedApp)}
                </div>
                <div className="alloc-info">
                  <h3 className="alloc-name">
                    {it.connectedApp}
                    {it.subscription ? ` (${it.subscription})` : ''}
                  </h3>
                  <p className="alloc-meta">
                    {it.autoDebit} &bull; {ccOptions.find(c => c.ccId === it.ccId)?.ccAcronym || 'Credit Card'}
                  </p>
                </div>
              </div>
              <div className="card-value-display">
                <div className="card-amount-wrapper">
                  <span className="currency-symbol">₱</span>
                  <span className="value-amount">{(it.amount || 0).toLocaleString()}</span>
                </div>
                <div className="card-date-label">{it.dateAdded}</div>
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
              <div style={{ fontSize: '64px', opacity: 0.2 }}>📱</div>
            </div>
            <h3 className="empty-state-title">{isSearching ? 'No Apps Found' : 'No Apps Connected'}</h3>
            <p className="empty-state-text">
              {isSearching 
                ? 'Try adjusting your search criteria.' 
                : 'Manage your connected apps and subscriptions here.'}
            </p>
            {isSearching && <button className="secondary-btn" style={{ marginTop: '20px' }} onClick={clearSearch}>Clear Filter</button>}
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
                <div className="alloc-avatar large" style={{ backgroundColor: '#10b981' }}>{getInitial(selectedItem.connectedApp)}</div>
                <h2>{selectedItem.connectedApp}</h2>
                <p>{selectedItem.subscription}</p>
              </div>
              <div className="detail-grid">
                <div className="detail-group">
                  <label>Source Card</label>
                  <p>
                    {ccOptions.find(c => c.ccId === selectedItem.ccId) 
                      ? `${ccOptions.find(c => c.ccId === selectedItem.ccId).ccName} (**** ${ccOptions.find(c => c.ccId === selectedItem.ccId).ccLastDigit})`
                      : 'Not Linked'
                    }
                  </p>
                </div>
                <div className="detail-group"><label>Amount</label><p>₱{(selectedItem.amount || 0).toLocaleString()}</p></div>
                <div className="detail-group"><label>Auto Debit</label><p>{selectedItem.autoDebit}</p></div>
                {selectedItem.autoDebit === 'Enabled' && (
                  <div className="detail-group"><label>Next Billing</label><p>{selectedItem.date || '—'}</p></div>
                )}
                <div className="detail-group"><label>Remarks</label><p>{selectedItem.remarks || 'No remarks'}</p></div>
                <div className="detail-group"><label>Date Added</label><p>{selectedItem.dateAdded}</p></div>
                <div className="detail-group"><label>Last Update</label><p>{selectedItem.updateDate || '—'}</p></div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                <button className="primary-btn" style={{ flex: 1 }} onClick={() => {
                  setEditItem(selectedItem);
                  setIsEditing(true);
                  setIsModalOpen(false);
                }}>Edit Details</button>
                <button className="secondary-btn" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleDelete(selectedItem.id!)}>Disconnect</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Connect New App</h2>
            <div className="login-form">
              <div className="input-group">
                <label>Credit Card Source</label>
                <select className="dropdown-select" value={newItem.ccId} onChange={e => setNewItem({...newItem, ccId: e.target.value})}>
                  <option value="">Select a Card</option>
                  {ccOptions.map(cc => (
                    <option key={cc.ccId} value={cc.ccId}>{cc.ccName} | {cc.ccLastDigit}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>App Name</label>
                  <input type="text" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. Maya" value={newItem.connectedApp} onChange={e => handleInputChange(setNewItem, 'connectedApp', e.target.value, newItem)} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Plan</label>
                  <input type="text" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="e.g. Premium" value={newItem.subscription} onChange={e => handleInputChange(setNewItem, 'subscription', e.target.value, newItem)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '4px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Auto-Debit</label>
                  <select className="dropdown-select" value={newItem.autoDebit} onChange={e => setNewItem({...newItem, autoDebit: e.target.value})}>
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Amount (₱)</label>
                  <input type="number" style={{ width: '100%', boxSizing: 'border-box' }} placeholder="0.00" value={newItem.amount} onChange={e => setNewItem({...newItem, amount: e.target.value})} />
                </div>
              </div>
              {newItem.autoDebit === 'Enabled' && (
                <div className="input-group">
                  <label>Billing Date</label>
                  <input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} />
                </div>
              )}
              <div className="input-group">
                <label>Remarks</label>
                <input type="text" placeholder="Optional notes..." value={newItem.remarks} onChange={e => handleInputChange(setNewItem, 'remarks', e.target.value, newItem)} />
              </div>
              <button type="button" className="primary-btn margin-top-lg" onClick={handleCreate}>Connect App</button>
            </div>
          </div>
        </div>
      )}

      {/* Result Dialog */}
      {resultDialog && (
        <div className="modal-overlay" onClick={() => setResultDialog(null)}>
          <div className="modal-content success-popup" style={{ maxWidth: '380px', textAlign: 'center', padding: '40px 20px' }}>
            <div className="success-icon" style={{ backgroundColor: resultDialog.status === 'success' ? '#2ecc71' : '#e53e3e', margin: '0 auto 20px' }}>
              {resultDialog.status === 'success' ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              )}
            </div>
            <h2 className="form-title" style={{ marginBottom: '8px' }}>{resultDialog.status === 'success' ? 'Great!' : 'Oops!'}</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>{resultDialog.message}</p>
            <button className="primary-btn" style={{ width: '100%' }} onClick={() => setResultDialog(null)}>Continue</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Edit App Connection</h2>
            <div className="login-form">
              <div className="input-group">
                <label>Credit Card Source</label>
                <select className="dropdown-select" value={editItem.ccId} onChange={e => setEditItem({...editItem, ccId: Number(e.target.value)})}>
                  <option value="">Select a Card</option>
                  {ccOptions.map(cc => (
                    <option key={cc.ccId} value={cc.ccId}>{cc.ccName} | {cc.ccLastDigit}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>App Name</label>
                  <input type="text" style={{ width: '100%', boxSizing: 'border-box' }} value={editItem.connectedApp} onChange={e => handleInputChange(setEditItem, 'connectedApp', e.target.value, editItem)} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Plan</label>
                  <input type="text" style={{ width: '100%', boxSizing: 'border-box' }} value={editItem.subscription} onChange={e => handleInputChange(setEditItem, 'subscription', e.target.value, editItem)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '4px' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Auto-Debit</label>
                  <select className="dropdown-select" value={editItem.autoDebit} onChange={e => setEditItem({...editItem, autoDebit: e.target.value})}>
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Amount (₱)</label>
                  <input type="number" style={{ width: '100%', boxSizing: 'border-box' }} value={editItem.amount} onChange={e => setEditItem({...editItem, amount: Number(e.target.value)})} />
                </div>
              </div>
              {editItem.autoDebit === 'Enabled' && (
                <div className="input-group">
                  <label>Billing Date</label>
                  <input type="date" value={editItem.date} onChange={e => setEditItem({...editItem, date: e.target.value})} />
                </div>
              )}
              <div className="input-group">
                <label>Remarks</label>
                <input type="text" value={editItem.remarks} onChange={e => handleInputChange(setEditItem, 'remarks', e.target.value, editItem)} />
              </div>
              <button type="button" className="primary-btn margin-top-lg" onClick={handleUpdate}>Update Details</button>
            </div>
          </div>
        </div>
      )}
      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Search & Filters</h2>
            <div className="login-form">
              <div className="input-group">
                <label>App Name</label>
                <input type="text" placeholder="e.g. Maya" value={tempSearchTerms.connectedApp} onChange={e => handleInputChange(setTempSearchTerms, 'connectedApp', e.target.value, tempSearchTerms)} />
              </div>
              <div className="input-group">
                <label>Subscription Plan</label>
                <input type="text" placeholder="e.g. Premium" value={tempSearchTerms.subscription} onChange={e => handleInputChange(setTempSearchTerms, 'subscription', e.target.value, tempSearchTerms)} />
              </div>
              <div className="input-group">
                <label>Auto-Debit Status</label>
                <select className="dropdown-select" value={tempSearchTerms.autoDebit} onChange={e => setTempSearchTerms({...tempSearchTerms, autoDebit: e.target.value})}>
                  <option value="">Any Status</option>
                  <option value="Enabled">Enabled</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
              <button className="primary-btn margin-top-lg" onClick={handleSearch}>Apply Search</button>
              {isSearching && <button className="secondary-btn" style={{ width: '100%', marginTop: '10px' }} onClick={clearSearch}>Clear Filter</button>}
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '40px 20px' }}>
            <div className="success-icon" style={{ backgroundColor: '#f39c12', margin: '0 auto 20px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2 className="form-title" style={{ marginBottom: '8px' }}>Confirm Action</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="primary-btn" style={{ flex: 1, background: confirmDialog.type === 'delete' ? '#ef4444' : undefined }} onClick={() => {
                if (confirmDialog.type === 'update') executeUpdate();
                if (confirmDialog.type === 'delete' && confirmDialog.id) executeDelete(confirmDialog.id);
              }}>Yes, Confirm</button>
              <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setConfirmDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* CC Selection Modal */}
      {isCCModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCCModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Filter by Credit Card</h2>
            <div className="login-form">
              <div className="input-group">
                <label>Select Card Source</label>
                <select className="dropdown-select" value={selectedCcId || ''} onChange={e => setSelectedCcId(e.target.value)}>
                  <option value="">All Registered Cards</option>
                  {ccOptions.map(cc => (
                    <option key={cc.ccId} value={cc.ccId}>{cc.ccName} | {cc.ccLastDigit}</option>
                  ))}
                </select>
              </div>
              <button className="primary-btn margin-top-lg" onClick={() => { setIsCCModalOpen(false); fetchData(0, false); }}>Apply Selection</button>
              {selectedCcId && (
                <button className="secondary-btn" style={{ width: '100%', marginTop: '10px' }} onClick={() => { setSelectedCcId(''); setIsCCModalOpen(false); fetchData(0, false); }}>Reset View</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
