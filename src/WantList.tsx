import { useState, useEffect } from 'react';
import deskIllustrationUrl from './assets/desk_illustration.png';
import { API_URLS } from './url';
import './css/App.css';

interface WantListItem {
  id?: number;
  item?: string;
  estimatedPrice?: number;
  dateWanted?: string;
  afford?: string;
  remarks?: string;
  status?: string;
  dateAdded?: string;
  addedBy?: string;
  updateDate?: string;
  updateBy?: string;
}

interface WantListProps {
  onBack: () => void;
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

const PenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

export default function WantList({ onBack }: WantListProps) {
  const [items, setItems] = useState<WantListItem[]>([]);
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WantListItem | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    item: '',
    estimatedPrice: '0',
    dateWanted: new Date().toISOString().split('T')[0],
    afford: 'Save monthly',
    remarks: '',
    status: 'Planned'
  });
  const [isCreating, setIsCreating] = useState(false);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<any>({});
  const [tempFilters, setTempFilters] = useState<any>({ item: '', afford: '', remarks: '', status: '' });

  const [confirmDialog, setConfirmDialog] = useState<{type: 'update' | 'delete', message: string} | null>(null);
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<WantListItem>>({});

  const sanitizeInput = (val: string) => {
    return val.replace(/[\\/\-;$%*!~]/g, '');
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
        const authRes = await fetch(API_URLS.AUTH.AUTHENTICATE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (authRes.ok) {
          const authText = await authRes.text();
          try {
            const parsed = JSON.parse(authText);
            token = parsed.data?.token || parsed.token || parsed.accessToken || parsed.jwt || authText;
          } catch (e) { token = authText; }
          localStorage.setItem('pfm_token', token);
          localStorage.setItem('pfm_token_time', Date.now().toString());
        } else {
          return null;
        }
      } catch (e) {
        return null;
      }
    }
    return token;
  };

  useEffect(() => {
    fetchData(0, false, searchFilters);
  }, [searchFilters]);

  const fetchData = async (pageNumber: number, append: boolean, filtersOverride?: typeof searchFilters) => {
    setLoading(true);
    try {
      const token = await ensureFreshToken();
      if (!token) return;

      const currentFilters = filtersOverride !== undefined ? filtersOverride : searchFilters;
      let apiUrl = `${API_URLS.WANT_LIST.BASE}?page=${pageNumber}&size=10&sortBy=id`;
      
      if (Object.keys(currentFilters).length > 0) {
        apiUrl = `${API_URLS.WANT_LIST.SEARCH}?page=${pageNumber}&size=10&sortBy=id`;
        const stringParams: string[] = [];
        Object.entries(currentFilters).forEach(([key, val]) => {
          let strVal = val as string;
          const encodedVal = encodeURIComponent(strVal).replace(/%20/g, '+');
          stringParams.push(`${encodeURIComponent(key)}=${encodedVal}`);
        });
        apiUrl += `&${stringParams.join('&')}`;
      }

      const wantRes = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (wantRes.ok) {
        const responseJson = await wantRes.json();
        const payload = responseJson.data !== undefined ? responseJson.data : responseJson;
        const content = payload.content || [];
        setItems(append ? [...items, ...content] : content);
        setIsLastPage(payload.last !== undefined ? payload.last : true);
        setTotalElements(payload.totalElements || 0);
        setTotalPages(payload.totalPages || 1);
        setPage(pageNumber);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (id?: number) => {
    const token = await ensureFreshToken();
    if (!id || !token) return;
    setIsEditing(false);
    setIsModalOpen(true);
    setIsFetchingDetails(true);

    try {
      const res = await fetch(API_URLS.WANT_LIST.GET_BY_ID(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const detail = Array.isArray(json.data) ? json.data[0] : (json.data || json);
        setSelectedItem(detail);
        setEditItem(detail);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleCreate = async () => {
    const token = await ensureFreshToken();
    if (!token) return;
    setIsCreating(true);
    try {
      const username = localStorage.getItem('pfm_username') || 'system';
      const res = await fetch(API_URLS.WANT_LIST.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          item: sanitizeInput(newItem.item),
          estimatedPrice: Number(newItem.estimatedPrice),
          dateWanted: newItem.dateWanted,
          afford: newItem.afford,
          remarks: sanitizeInput(newItem.remarks),
          status: newItem.status,
          addedBy: username
        })
      });

      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Item added successfully.' });
        fetchData(0, false);
        setIsCreateModalOpen(false);
        setNewItem({ item: '', estimatedPrice: '0', dateWanted: new Date().toISOString().split('T')[0], afford: 'Save monthly', remarks: '', status: 'Planned' });
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to add item.' });
      }
    } catch (e) {
      setResultDialog({ status: 'failed', message: 'Error occurred.' });
    } finally {
      setIsCreating(false);
    }
  };

  const executeUpdate = async () => {
    setConfirmDialog(null);
    const token = await ensureFreshToken();
    if (!selectedItem || !selectedItem.id || !token) return;

    const updatedFields: any = {};
    if (editItem.item !== selectedItem.item) updatedFields.item = sanitizeInput(editItem.item || '');
    if (Number(editItem.estimatedPrice) !== selectedItem.estimatedPrice) updatedFields.estimatedPrice = Number(editItem.estimatedPrice);
    if (editItem.dateWanted !== selectedItem.dateWanted) updatedFields.dateWanted = editItem.dateWanted;
    if (editItem.afford !== selectedItem.afford) updatedFields.afford = editItem.afford;
    if (editItem.remarks !== selectedItem.remarks) updatedFields.remarks = sanitizeInput(editItem.remarks || '');
    if (editItem.status !== selectedItem.status) updatedFields.status = editItem.status;
    
    if (Object.keys(updatedFields).length === 0) return;
    updatedFields.updateBy = localStorage.getItem('pfm_username') || 'Unknown';

    try {
      const res = await fetch(API_URLS.WANT_LIST.UPDATE(selectedItem.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Update successful.' });
        fetchData(page, false);
        setIsModalOpen(false);
      }
    } catch (e) {
      setResultDialog({ status: 'failed', message: 'Update failed.' });
    }
  };

  const executeDelete = async () => {
    setConfirmDialog(null);
    const token = await ensureFreshToken();
    if (!selectedItem || !selectedItem.id || !token) return;

    try {
      const res = await fetch(API_URLS.WANT_LIST.DELETE(selectedItem.id), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Delete successful.' });
        fetchData(page, false);
        setIsModalOpen(false);
      }
    } catch (e) {
      setResultDialog({ status: 'failed', message: 'Delete failed.' });
    }
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';
  const getColor = (status?: string) => {
    switch (status) {
      case 'Bought': return '#3CAE5A';
      case 'Planned': return '#3B82F6';
      case 'Saving': return '#F59E0B';
      default: return '#94A3B8';
    }
  };

  return (
    <div className="app-container allocations-page">
      <section className="header-section allocations-header">
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        <div className="header-inner allocations-header-inner">
          <button className="icon-btn" onClick={onBack}><BackIcon /></button>
          <div className="header-titles">
            <h1 className="allocations-title">Want List</h1>
            <p className="allocations-subtitle">{totalElements} ITEMS</p>
          </div>
          <button className="icon-btn" onClick={() => setIsSearchModalOpen(true)}><SearchIcon /></button>
        </div>
      </section>

      {/* Suggestions Datalist */}
      <datalist id="wantlist-suggestions">
        {Array.from(new Set(items.map(it => it.item))).filter(Boolean).map((name, i) => (
          <option key={i} value={name} />
        ))}
      </datalist>

      <main className="allocations-main">
        {Object.keys(searchFilters).length > 0 && (
          <div style={{ display: 'flex', gap: '8px', maxWidth: '600px', margin: '0 auto 16px', overflowX: 'auto', paddingBottom: '8px' }}>
            {Object.entries(searchFilters).map(([k, v]) => (
              <div key={k} style={{ background: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 600 }}>{k}:</span> {v as string}
                <button onClick={() => {
                  const nf = {...searchFilters};
                  delete nf[k];
                  setSearchFilters(nf);
                }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
            {items.map((it, i) => (
              <div key={it.id || i} className="allocation-card clickable-card" onClick={() => handleCardClick(it.id)}>
                <div className="alloc-avatar" style={{ backgroundColor: getColor(it.status) }}>{getInitial(it.item)}</div>
                <div className="alloc-info">
                  <h3 className="alloc-name">{it.item || 'Unnamed'}</h3>
                  <p className="alloc-meta">
                    {it.afford || 'Unknown'} &bull; 
                    <span style={{ color: getColor(it.status), marginLeft: '4px', fontWeight: '500' }}>{it.status || 'Planned'}</span>
                  </p>
                </div>
                <div className="alloc-date">{it.dateAdded || ''}</div>
              </div>
            ))}
            
            <div className="pagination-container">
              <button className="pagination-btn" onClick={() => fetchData(page - 1, false)} disabled={page === 0 || loading}>Prev</button>
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const showPage = totalPages <= 7 || (idx === 0 || idx === totalPages - 1 || Math.abs(page - idx) <= 1);
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
              <img src={deskIllustrationUrl} alt="Empty" className="empty-state-illustration" />
            </div>
            <h3 className="empty-state-title">No Items in Want List</h3>
            <p className="empty-state-text">{loading ? 'Searching your data...' : 'Add items you want to buy later and track your savings progress!'}</p>
          </div>
        )}
      </main>

      <button className="fab-btn" onClick={() => setIsCreateModalOpen(true)}><PenIcon /></button>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !isCreating && setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Add Item</h2>
            <form className="login-form">
              <div className="input-group">
                <label>Item Name</label>
                <input type="text" value={newItem.item} onChange={e => setNewItem({...newItem, item: e.target.value})} list="wantlist-suggestions" />
              </div>
              <div className="input-group">
                <label>Estimated Price (₱)</label>
                <input type="number" value={newItem.estimatedPrice} onChange={e => setNewItem({...newItem, estimatedPrice: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Target Date</label>
                <input type="date" value={newItem.dateWanted} onChange={e => setNewItem({...newItem, dateWanted: e.target.value})} />
              </div>
              <div className="input-group">
                <label>How to Afford</label>
                <select className="dropdown-select" value={newItem.afford} onChange={e => setNewItem({...newItem, afford: e.target.value})}>
                  <option value="Save monthly">Save monthly</option>
                  <option value="One-time payment">One-time payment</option>
                  <option value="Bonus">Bonus</option>
                  <option value="Not Afford">Not Afford</option>
                </select>
              </div>
              <div className="input-group">
                <label>Status</label>
                <select className="dropdown-select" value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value})}>
                  <option value="Planned">Planned</option>
                  <option value="Saving">Saving</option>
                  <option value="Bought">Bought</option>
                </select>
              </div>
              <div className="input-group">
                <label>Remarks</label>
                <textarea className="form-textarea" value={newItem.remarks} onChange={e => setNewItem({...newItem, remarks: e.target.value})} style={{ minHeight: '80px' }} />
              </div>
              <button type="button" className="primary-btn margin-top-lg" onClick={handleCreate} disabled={isCreating}>{isCreating ? 'Processing...' : 'Save Item'}</button>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL/EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content alloc-detail-modal" onClick={e => e.stopPropagation()}>
            {isFetchingDetails ? <p>Loading details...</p> : (selectedItem && (
              <div className="alloc-detail-content">
                {isEditing ? (
                  <div className="login-form">
                    <h2 className="form-title">Edit Item</h2>
                    <div className="input-group">
                      <label>Item Name</label>
                      <input type="text" value={editItem.item || ''} onChange={e => setEditItem({...editItem, item: e.target.value})} list="wantlist-suggestions" />
                    </div>
                    <div className="input-group">
                      <label>Estimated Price (₱)</label>
                      <input type="number" value={editItem.estimatedPrice || 0} onChange={e => setEditItem({...editItem, estimatedPrice: Number(e.target.value)})} />
                    </div>
                    <div className="input-group">
                      <label>Target Date</label>
                      <input type="date" value={editItem.dateWanted || ''} onChange={e => setEditItem({...editItem, dateWanted: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>How to Afford</label>
                      <select className="dropdown-select" value={editItem.afford || ''} onChange={e => setEditItem({...editItem, afford: e.target.value})}>
                        <option value="Save monthly">Save monthly</option>
                        <option value="One-time payment">One-time payment</option>
                        <option value="Bonus">Bonus</option>
                        <option value="Not Afford">Not Afford</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Status</label>
                      <select className="dropdown-select" value={editItem.status || ''} onChange={e => setEditItem({...editItem, status: e.target.value})}>
                        <option value="Planned">Planned</option>
                        <option value="Saving">Saving</option>
                        <option value="Bought">Bought</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Remarks</label>
                      <textarea className="form-textarea" value={editItem.remarks || ''} onChange={e => setEditItem({...editItem, remarks: e.target.value})} style={{ minHeight: '80px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button className="primary-btn" style={{ flex: 1 }} onClick={() => setConfirmDialog({type: 'update', message: 'Update item?'})}>Update</button>
                      <button className="secondary-btn" style={{ flex: 1, borderColor: '#e53e3e', color: '#e53e3e' }} onClick={() => setConfirmDialog({type: 'delete', message: 'Delete item?'})}>Delete</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="alloc-detail-header">
                      <div className="alloc-avatar large" style={{ backgroundColor: getColor(selectedItem.status) }}>{getInitial(selectedItem.item)}</div>
                      <h2>{selectedItem.item}</h2>
                      <span style={{ color: getColor(selectedItem.status), fontWeight: '600' }}>{selectedItem.status}</span>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-group"><label>Estimated Price</label><p>₱{(selectedItem.estimatedPrice || 0).toLocaleString()}</p></div>
                      <div className="detail-group"><label>Target Date</label><p>{selectedItem.dateWanted}</p></div>
                      <div className="detail-group"><label>Date Added</label><p>{selectedItem.dateAdded}</p></div>
                      <div className="detail-group"><label>Affordability</label><p>{selectedItem.afford}</p></div>
                      <div className="detail-group"><label>Remarks</label><p>{selectedItem.remarks || 'No remarks'}</p></div>
                      <div className="detail-group"><label>Last Update</label><p>{selectedItem.updateDate || '—'}</p></div>
                    </div>
                    <button className="secondary-btn margin-top-lg" onClick={() => setIsEditing(true)}>Edit Item</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH MODAL */}
      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Search & Filters</h2>
            <div className="login-form">
              <div className="input-group">
                <label>Item Name</label>
                <input type="text" value={tempFilters.item} onChange={e => setTempFilters({...tempFilters, item: e.target.value})} list="wantlist-suggestions" />
              </div>
              <div className="input-group">
                <label>Affordability</label>
                <select className="dropdown-select" value={tempFilters.afford} onChange={e => setTempFilters({...tempFilters, afford: e.target.value})}>
                  <option value="">All</option>
                  <option value="Save monthly">Save monthly</option>
                  <option value="One-time payment">One-time payment</option>
                  <option value="Bonus">Bonus</option>
                  <option value="Not Afford">Not Afford</option>
                </select>
              </div>
              <div className="input-group">
                <label>Remarks</label>
                <input type="text" value={tempFilters.remarks} onChange={e => setTempFilters({...tempFilters, remarks: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Status</label>
                <select className="dropdown-select" value={tempFilters.status} onChange={e => setTempFilters({...tempFilters, status: e.target.value})}>
                  <option value="">All</option>
                  <option value="Planned">Planned</option>
                  <option value="Saving">Saving</option>
                  <option value="Bought">Bought</option>
                </select>
              </div>
              <button className="primary-btn margin-top-lg" onClick={() => {
                const final = {};
                Object.entries(tempFilters).forEach(([k, v]) => {
                  if (v) (final as any)[k] = v;
                });
                setSearchFilters(final);
                setIsSearchModalOpen(false);
              }}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="modal-overlay" style={{ zIndex: 150 }}>
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div className="success-icon" style={{ backgroundColor: '#f59e0b', margin: '0 auto 24px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2 className="form-title" style={{ marginBottom: '8px' }}>Confirm Action</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="primary-btn" style={{ flex: 1 }} onClick={() => confirmDialog.type === 'update' ? executeUpdate() : executeDelete()}>Yes, Confirm</button>
              <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setConfirmDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {resultDialog && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="modal-content success-popup" style={{ maxWidth: '380px' }}>
            <div className="success-icon" style={{ backgroundColor: resultDialog.status === 'success' ? '#2ecc71' : '#e53e3e' }}>
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
    </div>
  );
}
