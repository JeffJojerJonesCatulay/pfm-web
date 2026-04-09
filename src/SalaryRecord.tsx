import { useState, useEffect } from 'react';
import deskIllustrationUrl from './assets/desk_illustration.png';
import { API_URLS } from './url';
import { ensureFreshToken, containsProhibitedChars } from './utils/securityUtils';
import './css/App.css';

interface SalaryRecordItem {
  salaryId?: number;
  salary?: number;
  status?: string;
  date?: string;
  dateAdded?: string;
  addedBy?: string;
  updateDate?: string;
  updateBy?: string;
}

interface SalaryRecordProps {
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
  <svg width="24" height="24" viewBox="0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

export default function SalaryRecord({ onBack }: SalaryRecordProps) {
  const [items, setItems] = useState<SalaryRecordItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLastPage, setIsLastPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SalaryRecordItem | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    salary: '0',
    status: 'Active',
    date: new Date().toISOString().split('T')[0]
  });
  const [isCreating, setIsCreating] = useState(false);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<any>({});
  const [tempFilters, setTempFilters] = useState<any>({ status: '' });

  const [confirmDialog, setConfirmDialog] = useState<{type: 'update' | 'delete', message: string} | null>(null);
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<SalaryRecordItem>>({});

  useEffect(() => {
    fetchData(0, false, searchFilters);
  }, [searchFilters]);

  const fetchData = async (pageNumber: number = 0, append: boolean = false, filtersOverride?: typeof searchFilters) => {
    setLoading(true);
    try {
      const token = await ensureFreshToken();
      if (!token) return;

      const currentFilters = filtersOverride !== undefined ? filtersOverride : searchFilters;
      let apiUrl = `${API_URLS.SALARY_TRACKER.BASE}?page=${pageNumber}&size=10&sortBy=salaryId`;
      
      if (Object.keys(currentFilters).length > 0) {
        apiUrl = `${API_URLS.SALARY_TRACKER.SEARCH}?page=${pageNumber}&size=10&sortBy=salaryId`;
        const params = new URLSearchParams();
        Object.entries(currentFilters).forEach(([k, v]) => { if (v) params.append(k, v as string); });
        apiUrl += `&${params.toString()}`;
      }

      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        const content = payload.content || [];
        setItems(append ? [...items, ...content] : content);
        setTotalElements(payload.totalElements || 0);
        setTotalPages(payload.totalPages || 1);
        setIsLastPage(payload.last !== undefined ? payload.last : true);
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
      const res = await fetch(API_URLS.SALARY_TRACKER.GET_BY_ID(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const detail = Array.isArray(json.data) ? json.data[0] : (json.data || json);
        setSelectedItem(detail);
        setEditItem(detail);
      }
    } catch (e) { console.error(e); } finally { setIsFetchingDetails(false); }
  };

  const handleCreate = async () => {
    if (!newItem.salary || newItem.salary === '0' || !newItem.date) {
      setResultDialog({ status: 'failed', message: 'Please provide both the Salary Amount and Date.' });
      return;
    }
    const token = await ensureFreshToken();
    if (!token) return;
    setIsCreating(true);
    try {
      const username = localStorage.getItem('pfm_username') || 'system';
      const body = { salary: Number(newItem.salary), date: newItem.date, status: newItem.status, addedBy: username };
      const res = await fetch(API_URLS.SALARY_TRACKER.CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Salary record created successfully.' });
        fetchData();
        setIsCreateModalOpen(false);
      } else { setResultDialog({ status: 'failed', message: `Failed to create record.` }); }
    } catch (e) { setResultDialog({ status: 'failed', message: 'An error occurred.' }); } finally { setIsCreating(false); }
  };

  const executeUpdate = async () => {
    setConfirmDialog(null);
    const token = await ensureFreshToken();
    if (!selectedItem || !selectedItem.salaryId || !token) return;
    const updatedFields: any = {};
    if (editItem.salary !== selectedItem.salary) {
      if (!editItem.salary) {
        setResultDialog({ status: 'failed', message: 'Salary amount is mandatory.' });
        return;
      }
      updatedFields.salary = Number(editItem.salary);
    }
    if (editItem.date !== selectedItem.date) {
      if (!editItem.date) {
        setResultDialog({ status: 'failed', message: 'Date is mandatory.' });
        return;
      }
      updatedFields.date = editItem.date;
    }
    if (editItem.status !== selectedItem.status) updatedFields.status = editItem.status;
    if (Object.keys(updatedFields).length === 0) return;
    updatedFields.updateBy = localStorage.getItem('pfm_username') || 'Unknown';
    try {
      const res = await fetch(API_URLS.SALARY_TRACKER.UPDATE(selectedItem.salaryId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Salary record updated successfully.' });
        fetchData();
        setIsModalOpen(false);
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Update failed.' }); }
  };

  const executeDelete = async () => {
    setConfirmDialog(null);
    const token = await ensureFreshToken();
    if (!selectedItem || !selectedItem.salaryId || !token) return;
    try {
      const res = await fetch(API_URLS.SALARY_TRACKER.DELETE(selectedItem.salaryId), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Salary record deleted.' });
        fetchData();
        setIsModalOpen(false);
      }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Delete failed.' }); }
  };

  return (
    <div className="app-container allocations-page">
      <section className="header-section allocations-header">
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        <div className="header-inner allocations-header-inner">
          <button className="icon-btn" onClick={onBack}><BackIcon /></button>
          <div className="header-titles">
            <h1 className="allocations-title">Salary Records</h1>
            <p className="allocations-subtitle">{totalElements} LOGS</p>
          </div>
          <button className="icon-btn" onClick={() => setIsSearchModalOpen(true)}><SearchIcon /></button>
        </div>
      </section>

      <main className="allocations-main">
        {Object.keys(searchFilters).length > 0 && (
          <div style={{ display: 'flex', gap: '8px', maxWidth: '600px', margin: '0 auto 16px', flexWrap: 'wrap' }}>
            {Object.entries(searchFilters).map(([k, v]) => (
              <div key={k} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600 }}>{k}:</span> {v as string}
                <button onClick={() => { const nf = {...searchFilters}; delete nf[k]; setSearchFilters(nf); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
            {items.map((it, i) => (
              <div key={it.salaryId || i} className="allocation-card clickable-card" onClick={() => handleCardClick(it.salaryId)}>
                <div className="alloc-avatar" style={{ backgroundColor: '#2ecc71' }}>₱</div>
                <div className="alloc-info">
                  <h3 className="alloc-name">₱{(it.salary || 0).toLocaleString()}</h3>
                  <p className="alloc-meta">{it.status}</p>
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
            <h3 className="empty-state-title">No Salary Records</h3>
            <p className="empty-state-text">{loading ? 'Searching your database...' : 'You haven\'t tracked any salary records yet. Start by adding a new payout log!'}</p>
          </div>
        )}
      </main>

      <button className="fab-btn" onClick={() => setIsCreateModalOpen(true)}><PenIcon /></button>

      {/* SEARCH MODAL */}
      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Search Records</h2>
            <div className="login-form">
              <div className="input-group">
                <label>Status</label>
                <select className="dropdown-select" value={tempFilters.status} onChange={e => setTempFilters({...tempFilters, status: e.target.value})}>
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <button className="primary-btn margin-top-lg" onClick={() => {
                const final = {};
                if (tempFilters.status) (final as any).status = tempFilters.status;
                setSearchFilters(final);
                setIsSearchModalOpen(false);
              }}>Apply Search</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !isCreating && setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Add Salary Record</h2>
            <form className="login-form">
              <div className="input-group"><label>Salary Amount (₱)</label><input type="number" value={newItem.salary} onChange={e => setNewItem({...newItem, salary: e.target.value})} /></div>
              <div className="input-group"><label>Salary Date</label><input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} /></div>
              <div className="input-group"><label>Status</label><select className="dropdown-select" value={newItem.status} onChange={e => setNewItem({...newItem, status: e.target.value})}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
              <button type="button" className="primary-btn margin-top-lg" onClick={handleCreate} disabled={isCreating}>{isCreating ? 'Processing...' : 'Save Record'}</button>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content alloc-detail-modal" onClick={e => e.stopPropagation()}>
            {isFetchingDetails ? <p>Loading details...</p> : (selectedItem && (
              <div className="alloc-detail-content">
                {isEditing ? (
                  <div className="login-form">
                    <h2 className="form-title">Edit Record</h2>
                    <div className="input-group"><label>Salary Amount (₱)</label><input type="number" value={editItem.salary || 0} onChange={e => setEditItem({...editItem, salary: Number(e.target.value)})} /></div>
                    <div className="input-group"><label>Salary Date</label><input type="date" value={editItem.date || ''} onChange={e => setEditItem({...editItem, date: e.target.value})} /></div>
                    <div className="input-group"><label>Status</label><select value={editItem.status || ''} onChange={e => setEditItem({...editItem, status: e.target.value})} className="dropdown-select"><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button className="primary-btn" style={{ flex: 1 }} onClick={() => setConfirmDialog({type: 'update', message: 'Save changes?'})}>Update</button>
                      <button className="secondary-btn" style={{ flex: 1, borderColor: '#e53e3e', color: '#e53e3e' }} onClick={() => setConfirmDialog({type: 'delete', message: 'Delete record?'})}>Delete</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="alloc-detail-header">
                      <div className="alloc-avatar large" style={{ backgroundColor: '#2ecc71' }}>₱</div>
                      <h2>₱{(selectedItem.salary || 0).toLocaleString()}</h2>
                      <span style={{ color: '#2ecc71', fontWeight: '600' }}>{selectedItem.status}</span>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-group"><label>Salary Date</label><p>{selectedItem.date}</p></div>
                      <div className="detail-group"><label>Date Added</label><p>{selectedItem.dateAdded}</p></div>
                      <div className="detail-group"><label>Last Updated</label><p>{selectedItem.updateDate || '—'}</p></div>
                    </div>
                    <button className="secondary-btn margin-top-lg" onClick={() => setIsEditing(true)}>Edit Record</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="modal-overlay" style={{ zIndex: 150 }}>
          <div className="modal-content" style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div className="success-icon" style={{ backgroundColor: '#f59e0b', margin: '0 auto 24px' }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
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
            <div className="success-icon" style={{ backgroundColor: resultDialog.status === 'success' ? '#2ecc71' : '#e53e3e' }}>{resultDialog.status === 'success' ? (<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>) : (<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>)}</div>
            <h2 className="form-title" style={{ marginBottom: '8px' }}>{resultDialog.status === 'success' ? 'Great!' : 'Oops!'}</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>{resultDialog.message}</p>
            <button className="primary-btn" style={{ width: '100%' }} onClick={() => setResultDialog(null)}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}
