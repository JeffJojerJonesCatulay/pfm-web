import { useState, useEffect } from 'react';
import deskIllustrationUrl from './assets/desk_illustration.png';
import './css/App.css';

interface AllocationItem {
  allocId?: number;
  allocation?: string;
  type?: string;
  status?: string;
  dateAdded?: string;
  addedBy?: string;
  updateDate?: string;
  updateBy?: string;
  description?: string;
}

interface AllocationsProps {
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

export default function Allocations({ onBack }: AllocationsProps) {
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationItem | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAllocation, setNewAllocation] = useState({ 
    allocation: '', 
    type: 'Savings', 
    status: 'Active',
    description: '' 
  });
  const [isCreating, setIsCreating] = useState(false);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<any>({});
  const [tempFilters, setTempFilters] = useState<any>({ allocation: '', type: '', status: '' });

  const [confirmDialog, setConfirmDialog] = useState<{type: 'update' | 'delete', message: string} | null>(null);
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<AllocationItem>>({});

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
        const authRes = await fetch(`${import.meta.env.PFM_BASE_URL}authenticate`, {
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
        } else { return null; }
      } catch (e) { return null; }
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
      let apiUrl = `${import.meta.env.PFM_BASE_URL}get/allocation.mapping?page=${pageNumber}&size=10&sortBy=allocId`;
      
      if (Object.keys(currentFilters).length > 0) {
        apiUrl = `${import.meta.env.PFM_BASE_URL}search/allocation.mapping?page=${pageNumber}&size=10&sortBy=allocId`;
        const stringParams: string[] = [];
        Object.entries(currentFilters).forEach(([k, v]) => {
          stringParams.push(`${encodeURIComponent(k)}=${encodeURIComponent(v as string).replace(/%20/g, '+')}`);
        });
        apiUrl += `&${stringParams.join('&')}`;
      }

      const allocRes = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
      if (allocRes.ok) {
        const json = await allocRes.json();
        const payload = json.data !== undefined ? json.data : json;
        const content = payload.content || [];
        setAllocations(append ? [...allocations, ...content] : content);
        setIsLastPage(payload.last !== undefined ? payload.last : true);
        setTotalElements(payload.totalElements || 0);
        setTotalPages(payload.totalPages || 1);
        setPage(pageNumber);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleCardClick = async (id?: number) => {
    const token = await ensureFreshToken();
    if (!id || !token) return;
    setIsEditing(false);
    setIsModalOpen(true);
    setIsFetchingDetails(true);
    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}get/allocation.mapping/allocId/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const detail = Array.isArray(json.data) ? json.data[0] : (json.data || json);
        setSelectedAllocation(detail);
        setEditItem(detail);
      }
    } catch (e) { console.error(e); } finally { setIsFetchingDetails(false); }
  };

  const handleCreate = async () => {
    const token = await ensureFreshToken();
    if (!token) return;
    setIsCreating(true);
    try {
      const username = localStorage.getItem('pfm_username') || 'system';
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}allocation.mapping/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          allocation: sanitizeInput(newAllocation.allocation), 
          type: newAllocation.type, 
          status: newAllocation.status, 
          description: sanitizeInput(newAllocation.description),
          addedBy: username 
        })
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Allocation created.' });
        fetchData(0, false);
        setIsCreateModalOpen(false);
        setNewAllocation({ allocation: '', type: 'Savings', status: 'Active', description: '' });
      } else { setResultDialog({ status: 'failed', message: 'Create failed.' }); }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Error occurred.' }); } finally { setIsCreating(false); }
  };

  const executeUpdate = async () => {
    setConfirmDialog(null);
    const token = await ensureFreshToken();
    if (!selectedAllocation || !selectedAllocation.allocId || !token) return;

    const updatedFields: any = {};
    if (editItem.allocation !== selectedAllocation.allocation) updatedFields.allocation = sanitizeInput(editItem.allocation || '');
    if (editItem.type !== selectedAllocation.type) updatedFields.type = editItem.type;
    if (editItem.status !== selectedAllocation.status) updatedFields.status = editItem.status;
    if (editItem.description !== selectedAllocation.description) updatedFields.description = sanitizeInput(editItem.description || '');
    
    if (Object.keys(updatedFields).length === 0) return;
    updatedFields.updateBy = localStorage.getItem('pfm_username') || 'Unknown';

    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}allocation.mapping/update/${selectedAllocation.allocId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Update successful.' });
        fetchData(page, false);
        setIsModalOpen(false);
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Update failed.' }); }
  };

  const executeDelete = async () => {
    setConfirmDialog(null);
    const token = await ensureFreshToken();
    if (!selectedAllocation || !selectedAllocation.allocId || !token) return;
    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}allocation.mapping/delete/${selectedAllocation.allocId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Delete successful.' });
        fetchData(page, false);
        setIsModalOpen(false);
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Delete failed.' }); }
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';
  const getColor = (type?: string) => type === 'Savings' ? '#3CAE5A' : '#4CAF50';

  return (
    <div className="app-container allocations-page">
      <section className="header-section allocations-header">
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        <div className="header-inner allocations-header-inner">
          <button className="icon-btn" onClick={onBack}><BackIcon /></button>
          <div className="header-titles">
            <h1 className="allocations-title">Allocations</h1>
            <p className="allocations-subtitle">{totalElements} ALLOCATIONS</p>
          </div>
          <button className="icon-btn" onClick={() => {
            setTempFilters({ allocation: searchFilters.allocation || '', type: searchFilters.type || '', status: searchFilters.status || '' });
            setIsSearchModalOpen(true);
          }}><SearchIcon /></button>
        </div>
      </section>

      {/* Suggestions Datalist */}
      <datalist id="allocation-suggestions">
        {Array.from(new Set(allocations.map(a => a.allocation))).filter(Boolean).map((name, i) => (
          <option key={i} value={name} />
        ))}
      </datalist>

      <main className="allocations-main">
        {Object.keys(searchFilters).length > 0 && (
          <div style={{ display: 'flex', gap: '8px', maxWidth: '600px', margin: '0 auto 16px', flexWrap: 'wrap' }}>
            {Object.entries(searchFilters).map(([k, v]) => (
              <div key={k} style={{ background: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600 }}>{k}:</span> {v as string}
                <button onClick={() => { const nf = {...searchFilters}; delete nf[k]; setSearchFilters(nf); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {allocations.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
            {allocations.map((alloc, i) => (
              <div key={alloc.allocId || i} className="allocation-card clickable-card" onClick={() => handleCardClick(alloc.allocId)}>
                <div className="alloc-avatar" style={{ backgroundColor: getColor(alloc.type) }}>{getInitial(alloc.allocation)}</div>
                <div className="alloc-info">
                  <h3 className="alloc-name">{alloc.allocation || 'Unnamed'}</h3>
                  <p className="alloc-meta">{alloc.type || 'Unknown'} &bull; <span style={{ color: alloc.status === 'Active' ? '#3CAE5A' : '#9ca3af' }}>{alloc.status || 'Not Active'}</span></p>
                </div>
                <div className="alloc-date">{alloc.dateAdded || ''}</div>
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
            <h3 className="empty-state-title">No Allocations Found</h3>
            <p className="empty-state-text">{loading ? 'Searching your database...' : 'Add your first allocation to start managing your budget effectively.'}</p>
          </div>
        )}
      </main>

      <button className="fab-btn" onClick={() => setIsCreateModalOpen(true)}><PenIcon /></button>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !isCreating && setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Add Allocation</h2>
            <form className="login-form">
              <div className="input-group"><label>Allocation Name</label><input type="text" value={newAllocation.allocation} onChange={e => setNewAllocation({...newAllocation, allocation: e.target.value})} list="allocation-suggestions" /></div>
              <div className="input-group"><label>Type</label><select className="dropdown-select" value={newAllocation.type} onChange={e => setNewAllocation({...newAllocation, type: e.target.value})}><option value="Savings">Savings</option><option value="Investment">Investment</option><option value="Expense">Expense</option></select></div>
              <div className="input-group"><label>Status</label><select className="dropdown-select" value={newAllocation.status} onChange={e => setNewAllocation({...newAllocation, status: e.target.value})}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
              <div className="input-group"><label>Description</label><input type="text" value={newAllocation.description} onChange={e => setNewAllocation({...newAllocation, description: e.target.value})} /></div>
              <button type="button" className="primary-btn margin-top-lg" onClick={handleCreate} disabled={isCreating}>{isCreating ? 'Processing...' : 'Save Allocation'}</button>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content alloc-detail-modal" onClick={e => e.stopPropagation()}>
            {isFetchingDetails ? <p>Loading details...</p> : (selectedAllocation && (
              <div className="alloc-detail-content">
                {isEditing ? (
                  <div className="login-form">
                    <div className="input-group"><label>Allocation Name</label><input type="text" value={editItem.allocation || ''} onChange={e => setEditItem({...editItem, allocation: e.target.value})} list="allocation-suggestions" /></div>
                    <div className="input-group"><label>Type</label><select className="dropdown-select" value={editItem.type || ''} onChange={e => setEditItem({...editItem, type: e.target.value})}><option value="Savings">Savings</option><option value="Investment">Investment</option><option value="Expense">Expense</option></select></div>
                    <div className="input-group"><label>Status</label><select className="dropdown-select" value={editItem.status || ''} onChange={e => setEditItem({...editItem, status: e.target.value})}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
                    <div className="input-group"><label>Description</label><input type="text" value={editItem.description || ''} onChange={e => setEditItem({...editItem, description: e.target.value})} /></div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button className="primary-btn" style={{ flex: 1 }} onClick={() => setConfirmDialog({type: 'update', message: 'Update?'})}>Update</button>
                      <button className="secondary-btn" style={{ flex: 1, borderColor: '#e53e3e', color: '#e53e3e' }} onClick={() => setConfirmDialog({type: 'delete', message: 'Delete?'})}>Delete</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="alloc-detail-header">{selectedAllocation.allocation}</h2>
                    <div className="detail-grid">
                      <div className="detail-group"><label>Type</label><p>{selectedAllocation.type}</p></div>
                      <div className="detail-group"><label>Status</label><p>{selectedAllocation.status}</p></div>
                      <div className="detail-group"><label>Date Added</label><p>{selectedAllocation.dateAdded}</p></div>
                      <div className="detail-group"><label>Description</label><p>{selectedAllocation.description || '—'}</p></div>
                      <div className="detail-group"><label>Added By</label><p>@{selectedAllocation.addedBy}</p></div>
                    </div>
                    <button className="secondary-btn margin-top-lg" onClick={() => setIsEditing(true)}>Edit</button>
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
            <div className="input-form">
              <div className="input-group"><label>Allocation Name</label><input type="text" value={tempFilters.allocation} onChange={e => setTempFilters({...tempFilters, allocation: e.target.value})} list="allocation-suggestions" /></div>
              <div className="input-group"><label>Status</label><select className="dropdown-select" value={tempFilters.status} onChange={e => setTempFilters({...tempFilters, status: e.target.value})}><option value="">All</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
              <button className="primary-btn margin-top-lg" onClick={() => { setSearchFilters(tempFilters); setIsSearchModalOpen(false); }}>Search</button>
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
