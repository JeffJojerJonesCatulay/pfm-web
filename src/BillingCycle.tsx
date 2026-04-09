import { useState, useEffect } from 'react';
import { API_URLS } from './url';
import { ensureFreshToken, containsProhibitedChars } from './utils/securityUtils';
import './css/App.css';

interface BillingCycleItem {
  ccRecId?: number;
  ccId?: number;
  dateFrom?: string;
  dateTo?: string;
  dueDate?: string;
  status?: string;
  addedBy?: string;
  dateAdded?: string;
  updateDate?: string;
  updatedBy?: string;
  remarks?: string;
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

interface BillingCycleProps {
  onBack: () => void;
}

export default function BillingCycle({ onBack }: BillingCycleProps) {
  const [items, setItems] = useState<BillingCycleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLastPage, setIsLastPage] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BillingCycleItem | null>(null);
  const [ccDetailsMap, setCcDetailsMap] = useState<Record<number, any>>({});
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});
  const [tempFilters, setTempFilters] = useState({ ccId: '', status: '' });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [ccOptions, setCcOptions] = useState<any[]>([]);
  const [newItem, setNewItem] = useState<Partial<BillingCycleItem>>({
    status: 'Active'
  });
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<BillingCycleItem>>({});
  const [confirmDialog, setConfirmDialog] = useState<{type: 'update' | 'delete', message: string} | null>(null);

  useEffect(() => {
    const init = async () => {
      await fetchCcDetailsAsMap();
      fetchData(0, false);
    };
    init();
  }, []);

  const fetchCcDetailsAsMap = async () => {
    const token = await ensureFreshToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URLS.CC_DETAILS.BASE}?page=0&size=100&sortBy=ccId`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.data?.content || json.content || [];
        setCcOptions(content);
        
        const map: Record<number, any> = {};
        content.forEach((cc: any) => {
          map[cc.ccId] = cc;
        });
        setCcDetailsMap(map);
      }
    } catch (e) {
      console.error('Error fetching CC details for map:', e);
    }
  };

  const fetchCcOptions = async () => {
    const token = await ensureFreshToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URLS.CC_DETAILS.BASE}?page=0&size=100&sortBy=ccId`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.data?.content || json.content || [];
        setCcOptions(content);
        if (content.length > 0 && !newItem.ccId) {
          setNewItem(prev => ({ ...prev, ccId: content[0].ccId }));
        }
      }
    } catch (e) {
      console.error('Error fetching cc options:', e);
    }
  };

  const handleCreate = async () => {
    if (!newItem.ccId || newItem.ccId === 0 || !newItem.dateFrom || !newItem.dateTo || !newItem.dueDate) {
      setResultDialog({ status: 'failed', message: 'Please select a credit card and fill in all dates.' });
      return;
    }

    if (containsProhibitedChars(newItem.remarks || '')) {
      setResultDialog({ status: 'failed', message: 'Input contains prohibited characters. Please remove them before saving.' });
      return;
    }

    setIsCreating(true);
    const token = await ensureFreshToken();
    if (!token) {
      setResultDialog({ status: 'failed', message: 'Your session has expired. Please login again to continue.' });
      setIsCreating(false);
      return;
    }

    try {
      const username = localStorage.getItem('pfm_username') || 'jeff';
      const payload = {
        ccId: Number(newItem.ccId),
        dateFrom: newItem.dateFrom,
        dateTo: newItem.dateTo,
        dueDate: newItem.dueDate,
        status: newItem.status,
        remarks: newItem.remarks,
        addedBy: username
      };

      const res = await fetch(API_URLS.BILLING_CYCLE.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Billing cycle created successfully!' });
        setIsCreateModalOpen(false);
        setNewItem({
          status: 'Active'
        });
        fetchData(0, false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to create record.' });
      }
    } catch (e) {
      setResultDialog({ status: 'failed', message: 'Network error during creation.' });
    } finally {
      setIsCreating(false);
    }
  };

  const promptUpdate = () => {
    setConfirmDialog({ type: 'update', message: 'Are you sure you want to update this billing cycle record?' });
  };

  const executeUpdate = async () => {
    setConfirmDialog(null);
    if (!editItem || !editItem.ccRecId) return;

    const token = await ensureFreshToken();
    if (!token) return;

    if (containsProhibitedChars(editItem.remarks || '')) {
      setResultDialog({ status: 'failed', message: 'Input contains prohibited characters. Please remove them before updating.' });
      return;
    }

    try {
      const username = localStorage.getItem('pfm_username') || 'jeff';
      const payload = {
        ccId: editItem.ccId,
        dateFrom: editItem.dateFrom,
        dateTo: editItem.dateTo,
        dueDate: editItem.dueDate,
        status: editItem.status,
        remarks: editItem.remarks,
        updatedBy: username
      };

      const res = await fetch(API_URLS.BILLING_CYCLE.UPDATE(editItem.ccRecId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Billing cycle updated successfully!' });
        fetchData(page, false);
        setIsModalOpen(false);
        setIsEditing(false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to update record.' });
      }
    } catch (e) {
      setResultDialog({ status: 'failed', message: 'Network error during update.' });
    }
  };

  const promptDelete = () => {
    setConfirmDialog({ type: 'delete', message: 'Are you sure you want to permanently delete this billing cycle record? This action cannot be undone.' });
  };

  const executeDelete = async () => {
    setConfirmDialog(null);
    if (!selectedItem || !selectedItem.ccRecId) return;

    const token = await ensureFreshToken();
    if (!token) return;

    try {
      const res = await fetch(API_URLS.BILLING_CYCLE.DELETE(selectedItem.ccRecId), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Record deleted successfully!' });
        fetchData(page, false);
        setIsModalOpen(false);
        setIsEditing(false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to delete record.' });
      }
    } catch (e) {
      setResultDialog({ status: 'failed', message: 'Network error during deletion.' });
    }
  };

  const fetchData = async (pageNumber: number, append: boolean, ccIdFilter = searchFilters['ccId'] || '', statusFilter = searchFilters['status'] || '') => {
    setLoading(true);
    try {
      const token = await ensureFreshToken();
      if (!token) return;

      const sStatus = statusFilter ? statusFilter : '';
      let url = `${API_URLS.BILLING_CYCLE.BASE}?page=${pageNumber}&size=20&sortBy=ccRecId`;
      
      if (ccIdFilter && sStatus) {
        url = `${API_URLS.BILLING_CYCLE.SEARCH_BY_CC(ccIdFilter)}?page=${pageNumber}&size=20&sortBy=ccRecId&status=${sStatus}`;
      } else if (ccIdFilter) {
        url = `${API_URLS.BILLING_CYCLE.SEARCH_BY_CC(ccIdFilter)}?page=${pageNumber}&size=20&sortBy=ccRecId`;
      } else if (sStatus) {
        url = `${API_URLS.BILLING_CYCLE.SEARCH_GLOBAL}?page=${pageNumber}&size=20&sortBy=ccRecId&status=${sStatus}`;
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
      console.error('Error fetching billing cycles:', e);
      setResultDialog({ status: 'failed', message: 'Something went wrong while fetching the billing cycle records.' });
    } finally {
      setLoading(false);
    }
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';
  const getColor = (status?: string) => status === 'Active' ? '#10b981' : '#f59e0b';

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
            <h1 className="allocations-title">Billing Cycles</h1>
            <div className="status-pill-container">
              <p className="allocations-subtitle status-pill">{totalElements} RECORDS</p>
            </div>
          </div>
          
          <div className="header-right">
            <button className="icon-btn search-trigger" onClick={() => { setIsSearchModalOpen(true); if (ccOptions.length === 0) fetchCcOptions(); }} aria-label="Search">
              <SearchIcon />
            </button>
          </div>
        </div>
      </section>

      <main className="allocations-main">
        <div className="allocations-list">
          
          {/* Active Search Filters (Standard Style) */}
          {Object.keys(searchFilters).length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {Object.entries(searchFilters).map(([k, v]) => (
                <div key={k} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontWeight: 600, color: '#3CAE5A' }}>{k === 'ccId' ? 'card' : k}:</span> 
                  {k === 'ccId' ? (ccDetailsMap[Number(v)]?.ccName || v) : v}
                  <button onClick={() => { 
                    const nf = {...searchFilters};
                    delete nf[k];
                    setSearchFilters(nf); 
                    fetchData(0, false, nf['ccId'] || '', nf['status'] || ''); 
                  }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {loading && items.length === 0 ? (
            <p style={{ textAlign: 'center', margin: '20px' }}>Fetching records...</p>
          ) : items.length > 0 ? (
            <>
              {items.map((it, i) => (
                <div 
                  key={`${it.ccRecId}-${i}`} 
                  className="allocation-card clickable-card entry-card slide-in-top" 
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => { setSelectedItem({...it}); setIsEditing(false); setIsModalOpen(true); }}
                >
                  <div className="card-main-content">
                    <div className="alloc-avatar tracker-avatar" style={{ backgroundColor: getColor(it.status) }}>
                      {ccDetailsMap[it.ccId || 0] ? getInitial(ccDetailsMap[it.ccId!].ccName) : getInitial(it.status)}
                    </div>
                    <div className="alloc-info">
                      <h3 className="alloc-name">
                        {ccDetailsMap[it.ccId || 0]?.ccName || `Reference #${it.ccRecId}`}
                      </h3>
                      <p className="alloc-meta">
                        Cutoff: {it.dateTo} &bull; Due: {it.dueDate}
                      </p>
                    </div>
                  </div>
                  
                  <div className="card-value-display">
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '12px', 
                      backgroundColor: getColor(it.status) + '15',
                      color: getColor(it.status), 
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      border: `1px solid ${getColor(it.status)}30`
                    }}>
                      {it.status}
                    </span>
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
            </>
          ) : (
            <div className="empty-state-container">
              <div className="empty-state-icon-box">
                <div style={{ fontSize: '64px', opacity: 0.2 }}>📅</div>
              </div>
              <h3 className="empty-state-title">No Billing Cycles</h3>
              <p className="empty-state-text">
                We couldn't track any active or past credit card billing cycles.
              </p>
            </div>
          )}
        </div>
      </main>

      <button className="fab-btn" onClick={() => { setIsCreateModalOpen(true); fetchCcOptions(); }}>
        <PlusIcon />
      </button>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !isCreating && setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Add Billing Cycle Tracking</h2>
            <form className="login-form">
              <div className="input-group">
                <label>Credit Card</label>
                <select 
                  className="dropdown-select" 
                  value={newItem.ccId || ''} 
                  onChange={e => setNewItem({...newItem, ccId: Number(e.target.value)})}
                >
                  <option value="">Select a credit card...</option>
                  {ccOptions.map(cc => (
                    <option key={cc.ccId} value={cc.ccId}>{cc.ccName}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Cycle Start Date</label>
                <input type="date" value={newItem.dateFrom} onChange={e => setNewItem({...newItem, dateFrom: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Cycle End Date</label>
                <input type="date" value={newItem.dateTo} onChange={e => setNewItem({...newItem, dateTo: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Due Date</label>
                <input type="date" value={newItem.dueDate} onChange={e => setNewItem({...newItem, dueDate: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Status</label>
                <select className="dropdown-select" value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value})}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="input-group">
                <label>Remarks</label>
                <textarea 
                  placeholder="Additional notes..." 
                  value={newItem.remarks} 
                  onChange={e => setNewItem({...newItem, remarks: e.target.value})}
                  style={{ minHeight: '80px', borderRadius: '12px', padding: '12px' }}
                />
              </div>
              
              <button type="button" className="primary-btn margin-top-lg" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Track Billing Cycle'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Dialog */}
      {resultDialog && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '400px' }}>
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
            <h2 className="form-title" style={{ marginBottom: '8px' }}>{resultDialog.status === 'success' ? 'Great!' : 'Failed!'}</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>{resultDialog.message}</p>
            <button className="primary-btn margin-top-md" style={{ width: '100%' }} onClick={() => setResultDialog(null)}>Okay</button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isModalOpen && selectedItem && (
        <div className="modal-overlay" onClick={() => !confirmDialog && setIsModalOpen(false)}>
          <div className="modal-content alloc-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="alloc-detail-content">
              
              {isEditing ? (
                 <div className="login-form">
                    <h2 className="form-title">Edit Record</h2>
                    
                    <div className="input-group">
                      <label>Credit Card Details</label>
                      <select 
                        className="dropdown-select" 
                        value={editItem.ccId || ''} 
                        onChange={e => setEditItem({...editItem, ccId: Number(e.target.value)})}
                      >
                        <option value="">Select a credit card...</option>
                        {ccOptions.map(cc => (
                          <option key={cc.ccId} value={cc.ccId}>{cc.ccName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="input-group">
                      <label>Cycle Start Date</label>
                      <input type="date" value={editItem.dateFrom || ''} onChange={e => setEditItem({...editItem, dateFrom: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Cycle End Date</label>
                      <input type="date" value={editItem.dateTo || ''} onChange={e => setEditItem({...editItem, dateTo: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Due Date</label>
                      <input type="date" value={editItem.dueDate || ''} onChange={e => setEditItem({...editItem, dueDate: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Status</label>
                      <select className="dropdown-select" value={editItem.status || 'Active'} onChange={e => setEditItem({...editItem, status: e.target.value})}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Remarks</label>
                      <textarea 
                        value={editItem.remarks || ''} 
                        onChange={e => setEditItem({...editItem, remarks: e.target.value})}
                        style={{ minHeight: '80px', borderRadius: '12px', padding: '12px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                      <button className="primary-btn" style={{ flex: 1 }} onClick={promptUpdate}>Save Update</button>
                      <button className="secondary-btn" style={{ flex: 1, borderColor: '#e53e3e', color: '#e53e3e' }} onClick={promptDelete}>Delete</button>
                    </div>
                    <button className="secondary-btn margin-top-md" style={{ width: '100%', borderColor: '#d1d5db', color: '#4b5563' }} onClick={() => setIsEditing(false)}>Cancel Edit</button>
                 </div>
              ) : (
                <>
                  <div className="alloc-detail-header">
                    <div className="alloc-avatar large" style={{ backgroundColor: getColor(selectedItem.status) }}>
                      {ccDetailsMap[selectedItem.ccId || 0] ? getInitial(ccDetailsMap[selectedItem.ccId!].ccName) : getInitial(selectedItem.status)}
                    </div>
                    <h2>{ccDetailsMap[selectedItem.ccId || 0]?.ccName || `Billing Reference: ${selectedItem.ccRecId}`}</h2>
                    <span style={{ color: getColor(selectedItem.status), fontWeight: '600' }}>{selectedItem.status}</span>
                  </div>
                  
                  <div className="detail-grid">
                    <div className="detail-group"><label>Tracker Status</label><p>{selectedItem.status}</p></div>
                    <div className="detail-group"><label>Cycle Start</label><p>{selectedItem.dateFrom}</p></div>
                    <div className="detail-group"><label>Cutoff Date</label><p>{selectedItem.dateTo}</p></div>
                    <div className="detail-group"><label>Due Date</label><p>{selectedItem.dueDate}</p></div>
                    <div className="detail-group"><label>Date Added</label><p>{selectedItem.dateAdded || '—'}</p></div>
                    <div className="detail-group"><label>Last Update</label><p>{selectedItem.updateDate || '—'}</p></div>
                    {selectedItem.remarks && (
                      <div className="detail-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Remarks</label>
                        <p style={{ fontStyle: 'italic', color: '#4b5563' }}>{selectedItem.remarks}</p>
                      </div>
                    )}
                  </div>

                  {ccDetailsMap[selectedItem.ccId || 0] && (
                    <div style={{ marginTop: '24px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '12px', backgroundColor: '#f9fafb' }}>
                      <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#374151', fontWeight: 'bold' }}>Credit Card Details</h3>
                      <div className="detail-grid" style={{ gap: '12px' }}>
                        <div className="detail-group"><label>Card Name</label><p>{ccDetailsMap[selectedItem.ccId!].ccName}</p></div>
                        <div className="detail-group"><label>Acronym</label><p>{ccDetailsMap[selectedItem.ccId!].ccAcronym}</p></div>
                        <div className="detail-group"><label>Last 4 Digits</label><p>**** {ccDetailsMap[selectedItem.ccId!].ccLastDigit}</p></div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '30px', flexDirection: 'column' }}>
                    <button className="secondary-btn" onClick={() => { setEditItem(selectedItem); setIsEditing(true); if (ccOptions.length === 0) fetchCcOptions(); }}>Edit Record</button>
                    <button className="primary-btn" onClick={() => setIsModalOpen(false)}>Close View</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h2 className="form-title" style={{ color: confirmDialog.type === 'delete' ? '#ef4444' : '#111827' }}>
              Confirm {confirmDialog.type === 'delete' ? 'Deletion' : 'Update'}
            </h2>
            <p style={{ margin: '16px 0', color: '#6b7280' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                className="primary-btn" 
                style={{ flex: 1, backgroundColor: confirmDialog.type === 'delete' ? '#ef4444' : undefined }} 
                onClick={() => confirmDialog.type === 'update' ? executeUpdate() : executeDelete()}
              >
                Proceed
              </button>
              <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setConfirmDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 className="form-title">Filter Records</h2>
            <div className="login-form">
              <div className="input-group">
                <label>Credit Card</label>
                <select 
                  className="dropdown-select" 
                  value={tempFilters.ccId} 
                  onChange={e => setTempFilters({...tempFilters, ccId: e.target.value})}
                >
                  <option value="">All Credit Cards</option>
                  {ccOptions.map(cc => (
                    <option key={cc.ccId} value={cc.ccId}>{cc.ccName}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Status</label>
                <select 
                  className="dropdown-select" 
                  value={tempFilters.status} 
                  onChange={e => setTempFilters({...tempFilters, status: e.target.value})}
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  className="primary-btn" 
                  style={{ flex: 1 }} 
                  onClick={() => {
                    const final: Record<string, string> = {};
                    if (tempFilters.ccId) final.ccId = tempFilters.ccId;
                    if (tempFilters.status) final.status = tempFilters.status;
                    setSearchFilters(final);
                    setIsSearchModalOpen(false);
                    fetchData(0, false, tempFilters.ccId, tempFilters.status);
                  }}
                >
                  Apply Filters
                </button>
                <button 
                  className="secondary-btn" 
                  style={{ flex: 1 }} 
                  onClick={() => {
                    setTempFilters({ ccId: '', status: '' });
                    setSearchFilters({});
                    setIsSearchModalOpen(false);
                    fetchData(0, false, '', '');
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
