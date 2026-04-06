import { useState, useEffect } from 'react';
import deskIllustrationUrl from './assets/desk_illustration.png';
import './App.css';

interface WantListItem {
  id?: number;
  item?: string;
  afford?: string;
  dateWanted?: string;
  estimatedPrice?: number;
  remarks?: string;
  status?: string;
  dateAdded?: string;
  addedBy?: string;
  updateDate?: string;
  updateBy?: string;
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

export default function WantList({ onBack }: AllocationsProps) {
  const [items, setItems] = useState<WantListItem[]>([]);
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sessionToken, setSessionToken] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WantListItem | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    item: '',
    afford: 'Save monthly',
    dateWanted: '',
    estimatedPrice: '0',
    remarks: '',
    status: 'Planned'
  });
  const [isCreating, setIsCreating] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{type: 'update' | 'delete', message: string} | null>(null);
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<{item?: string, afford?: string, remarks?: string, status?: string}>({});
  const [tempFilters, setTempFilters] = useState({ item: '', afford: '', remarks: '', status: '' });

  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<WantListItem>>({});

  const sanitizeInput = (val: string) => {
    return val.replace(/(--|\/|\\|;|%|\$|\*|!|`|~)/g, '');
  };

  const isFormValid = newItem.item.trim() !== '' && 
                       newItem.afford.trim() !== '' && 
                       newItem.dateWanted.trim() !== '' && 
                       newItem.status.trim() !== '';

  useEffect(() => {
    fetchData(0, false, searchFilters);
  }, [searchFilters]);

  const fetchData = async (pageNumber: number, append: boolean, filtersOverride?: typeof searchFilters) => {
    setLoading(true);
    try {
      const username = localStorage.getItem('pfm_username');
      const password = localStorage.getItem('pfm_password');
      if (!username || !password) {
        console.error('No credentials found in local storage.');
        return;
      }

      let token = localStorage.getItem('pfm_token') || '';
      const tokenTime = Number(localStorage.getItem('pfm_token_time') || 0);
      const isExpired = Date.now() - tokenTime > 1000 * 60 * 10; // 10 mins

      if (!token || isExpired) {
        const authRes = await fetch(`${import.meta.env.PFM_BASE_URL}authenticate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (!authRes.ok) throw new Error('Authentication failed');
        
        const authText = await authRes.text();
        try {
          const parsed = JSON.parse(authText);
          token = parsed.data?.token || parsed.token || parsed.accessToken || parsed.jwt || authText;
        } catch (e) {
          token = authText;
        }
        
        localStorage.setItem('pfm_token', token);
        localStorage.setItem('pfm_token_time', Date.now().toString());
      }
      
      setSessionToken(token);

      const currentFilters = filtersOverride !== undefined ? filtersOverride : searchFilters;
      let apiUrl = `${import.meta.env.PFM_BASE_URL}get/wantlist?page=${pageNumber}&size=10&sortBy=id`;
      
      if (Object.keys(currentFilters).length > 0) {
        apiUrl = `${import.meta.env.PFM_BASE_URL}search/wantlist?page=${pageNumber}&size=10&sortBy=id`;
        
        const stringParams: string[] = [];
        Object.entries(currentFilters).forEach(([key, val]) => {
          let strVal = val as string;
          // Apply explicit space handling to '+' format across ALL filters
          const encodedVal = encodeURIComponent(strVal).replace(/%20/g, '+');
          stringParams.push(`${encodeURIComponent(key)}=${encodedVal}`);
        });
        
        apiUrl += `&${stringParams.join('&')}`;
      }

      const wantRes = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (wantRes.ok) {
        const responseJson = await wantRes.json();
        const payload = responseJson.data !== undefined ? responseJson.data : responseJson;
        
        const content = payload.content || (Array.isArray(payload) ? payload : []);
        const last = payload.last !== undefined ? payload.last : true;
        
        if (payload.totalElements !== undefined) {
          setTotalElements(payload.totalElements);
        } else {
          setTotalElements(prev => append ? prev + content.length : content.length);
        }

        const tPages = payload.totalPages !== undefined ? payload.totalPages : Math.max(1, Math.ceil((payload.totalElements || content.length) / 5));
        setTotalPages(tPages);

        if (append) {
          setItems(prev => [...prev, ...content]);
        } else {
          setItems(content);
        }
        
        setIsLastPage(last);
        setPage(pageNumber);
      }
    } catch (e) {
      console.error('Error fetching items:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (id?: number) => {
    if (!id) return;
    
    setIsEditing(false);
    setIsModalOpen(true);
    setIsFetchingDetails(true);
    
    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}get/wantlist/id/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (res.ok) {
        const responseJson = await res.json();
        const payload = responseJson.data !== undefined ? responseJson.data : responseJson;
        
        // Extract from array since the backend wraps the item in data: [...]
        const detailedItem = Array.isArray(payload) && payload.length > 0 ? payload[0] : payload;
        setSelectedItem(detailedItem);
      }
    } catch (e) {
      console.error('Error fetching details:', e);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleCreate = async () => {
    if (!isFormValid || !sessionToken) return;
    setIsCreating(true);

    const username = localStorage.getItem('pfm_username') || 'Unknown User';

    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}wantlist/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          ...newItem,
          estimatedPrice: Number(newItem.estimatedPrice) || 0,
          addedBy: username
        })
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setNewItem({
          item: '',
          afford: 'Save monthly',
          dateWanted: '',
          estimatedPrice: '0',
          remarks: '',
          status: 'Planned'
        });
        setResultDialog({ status: 'success', message: 'Want List created successfully.' });
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to create Want List.' });
      }
    } catch (e) {
      console.error('Error creating:', e);
      setResultDialog({ status: 'failed', message: 'Something went wrong.' });
    } finally {
      setIsCreating(false);
    }
  };

  const promptUpdate = () => {
    if (!selectedItem || !selectedItem.id || !sessionToken) return;

    const updatedFields: any = {};
    if (editItem.item !== selectedItem.item) updatedFields.item = editItem.item;
    if (editItem.afford !== selectedItem.afford) updatedFields.afford = editItem.afford;
    if (editItem.dateWanted !== selectedItem.dateWanted) updatedFields.dateWanted = editItem.dateWanted;
    if (editItem.estimatedPrice !== selectedItem.estimatedPrice) updatedFields.estimatedPrice = Number(editItem.estimatedPrice) || 0;
    if (editItem.remarks !== selectedItem.remarks) updatedFields.remarks = editItem.remarks;
    if (editItem.status !== selectedItem.status) updatedFields.status = editItem.status;

    if (Object.keys(updatedFields).length === 0) {
      setIsEditing(false);
      return;
    }

    setConfirmDialog({ type: 'update', message: 'Are you sure you want to save these updated changes to this Want List?' });
  };

  const executeUpdate = async () => {
    setConfirmDialog(null);
    if (!selectedItem || !selectedItem.id || !sessionToken) return;

    const updatedFields: any = {};
    if (editItem.item !== selectedItem.item) updatedFields.item = editItem.item;
    if (editItem.afford !== selectedItem.afford) updatedFields.afford = editItem.afford;
    if (editItem.dateWanted !== selectedItem.dateWanted) updatedFields.dateWanted = editItem.dateWanted;
    if (editItem.estimatedPrice !== selectedItem.estimatedPrice) updatedFields.estimatedPrice = Number(editItem.estimatedPrice) || 0;
    if (editItem.remarks !== selectedItem.remarks) updatedFields.remarks = editItem.remarks;
    if (editItem.status !== selectedItem.status) updatedFields.status = editItem.status;

    updatedFields.updateBy = localStorage.getItem('pfm_username') || 'Unknown User';

    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}wantlist/update/${selectedItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(updatedFields)
      });

      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Want List updated successfully.' });
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to update Want List.' });
      }
    } catch (e) {
      console.error('Update error:', e);
      setResultDialog({ status: 'failed', message: 'An error occurred during update.' });
    }
  };

  const promptDelete = () => {
    if (!selectedItem || !selectedItem.id || !sessionToken) return;
    setConfirmDialog({ type: 'delete', message: 'Are you sure you want to permanently delete this Want List? This action cannot be undone.' });
  };

  const executeDelete = async () => {
    setConfirmDialog(null);
    if (!selectedItem || !selectedItem.id || !sessionToken) return;
    
    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}wantlist/delete/${selectedItem.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Want List deleted successfully.' });
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to delete Want List.' });
      }
    } catch (e) {
      console.error('Delete error:', e);
      setResultDialog({ status: 'failed', message: 'An error occurred during deletion.' });
    }
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';
  const getColor = (status?: string) => {
    switch(status) {
      case 'Planned': return '#3498db';
      case 'Achieved': return '#2ecc71';
      case 'Cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  return (
    <div className="app-container allocations-page">
      <section className="header-section allocations-header">
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        
        <div className="header-inner allocations-header-inner">
          <button className="icon-btn" onClick={onBack}>
            <BackIcon />
          </button>
          
          <div className="header-titles">
            <h1 className="allocations-title">Want Lists</h1>
            <p className="allocations-subtitle">{totalElements} WANT LISTS</p>
          </div>
          <button className="icon-btn" onClick={() => {
            setTempFilters({
              item: searchFilters.item || '',
              afford: searchFilters.afford || '',
              remarks: searchFilters.remarks || '',
              status: searchFilters.status || ''
            });
            setIsSearchModalOpen(true);
          }}>
            <SearchIcon />
          </button>
        </div>
      </section>

      <main className="allocations-main">
        {Object.keys(searchFilters).length > 0 && (
          <div style={{ display: 'flex', gap: '8px', maxWidth: '600px', margin: '0 auto 16px', padding: '0', flexWrap: 'wrap' }}>
            {Object.entries(searchFilters).map(([key, value]) => (
              <div key={key} style={{ background: 'white', border: '1px solid #e5e7eb', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-light)' }}>{key}:</span> 
                <span style={{ fontWeight: 500 }}>{value as string}</span>
                <button 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0', marginLeft: '4px', color: 'var(--text-light)', lineHeight: 1 }} 
                  onClick={() => {
                    const newFilters = { ...searchFilters };
                    delete (newFilters as any)[key];
                    setSearchFilters(newFilters);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
            {items.map((it, i) => (
              <div 
                key={it.id || i} 
                className="allocation-card clickable-card"
                onClick={() => handleCardClick(it.id)}
              >
                <div className="alloc-avatar" style={{ backgroundColor: getColor(it.status) }}>
                  {getInitial(it.item)}
                </div>
                <div className="alloc-info">
                  <h3 className="alloc-name">{it.item || 'Unnamed'}</h3>
                  <p className="alloc-meta">
                    {it.afford || 'Unknown'} &bull; 
                    <span 
                      style={{ color: getColor(it.status), marginLeft: '4px', fontWeight: '500' }}
                    >
                      {it.status || 'Planned'}
                    </span>
                  </p>
                </div>
                <div className="alloc-date">
                  {it.addedBy ? `@${it.addedBy}` : ''}
                </div>
              </div>
            ))}
            
            <div className="pagination-container">
              <button 
                className="pagination-btn"
                onClick={() => fetchData(page - 1, false)}
                disabled={page === 0 || loading}
              >
                Prev
              </button>
              
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  // Only show a limited number of pages if too many, but for now show all easily
                  const showPage = totalPages <= 7 || (idx === 0 || idx === totalPages - 1 || Math.abs(page - idx) <= 1);
                  if (!showPage && idx === 1) return <span key={idx}>...</span>;
                  if (!showPage && idx === totalPages - 2) return <span key={idx}>...</span>;
                  if (!showPage) return null;
                  
                  return (
                    <button
                      key={idx}
                      className={`pagination-number ${page === idx ? 'active' : ''}`}
                      onClick={() => fetchData(idx, false)}
                      disabled={loading}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <button 
                className="pagination-btn"
                onClick={() => fetchData(page + 1, false)}
                disabled={isLastPage || loading}
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state-container">
            <div className="illustration-container">
              <img 
                src={deskIllustrationUrl} 
                alt="No allocations" 
                className="desk-illustration empty-state-img"
              />
            </div>
            <h3 className="empty-state-title">No Want Lists yet</h3>
            <p className="empty-state-text">
              {loading ? 'Loading Want Lists...' : 'Create your first Want List.'}
            </p>
          </div>
        )}
      </main>

      <button className="fab-btn" onClick={() => setIsCreateModalOpen(true)}>
        <PenIcon />
      </button>

      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !isCreating && setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" disabled={isCreating} onClick={() => setIsCreateModalOpen(false)}>×</button>
            <h2 className="form-title">Create Want List</h2>
            <form className="login-form" style={{ marginTop: '20px' }}>
              <div className="input-group">
                <label>Want List Item</label>
                <input 
                  type="text" 
                  placeholder="What do you want?" 
                  value={newItem.item} 
                  onChange={e => setNewItem({...newItem, item: e.target.value})} 
                  disabled={isCreating}
                />
              </div>

              <div className="input-group">
                <label>Affordability</label>
                <select 
                  value={newItem.afford} 
                  onChange={e => setNewItem({...newItem, afford: e.target.value})} 
                  className="dropdown-select"
                  disabled={isCreating}
                >
                  <option value="Save monthly">Save monthly</option>
                  <option value="One-time payment">One-time payment</option>
                  <option value="Installment">Installment</option>
                  <option value="Not Afford">Not Afford</option>
                </select>
              </div>

              <div className="input-group">
                <label>Estimated Price</label>
                <input 
                  type="number" 
                  placeholder="How much?" 
                  value={newItem.estimatedPrice} 
                  onChange={e => setNewItem({...newItem, estimatedPrice: e.target.value})} 
                  disabled={isCreating}
                />
              </div>

              <div className="input-group">
                <label>Date Wanted</label>
                <input 
                  type="date" 
                  value={newItem.dateWanted} 
                  onChange={e => setNewItem({...newItem, dateWanted: e.target.value})} 
                  disabled={isCreating}
                />
              </div>

              <div className="input-group">
                <label>Remarks</label>
                <input 
                  type="text" 
                  placeholder="Extra notes..." 
                  value={newItem.remarks} 
                  onChange={e => setNewItem({...newItem, remarks: e.target.value})} 
                  disabled={isCreating}
                />
              </div>

              <div className="input-group">
                <label>Status</label>
                <select 
                  value={newItem.status} 
                  onChange={e => setNewItem({...newItem, status: e.target.value})} 
                  className="dropdown-select"
                  disabled={isCreating}
                >
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Achieved">Achieved</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <button 
                type="button" 
                onClick={handleCreate} 
                disabled={!isFormValid || isCreating} 
                className="primary-btn margin-top-lg" 
                style={{ opacity: (!isFormValid || isCreating) ? 0.5 : 1 }}
              >
                {isCreating ? 'Creating...' : 'Create Want List'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content alloc-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            {isFetchingDetails ? (
              <div className="flex-center" style={{ height: '200px' }}>
                <p>Loading details...</p>
              </div>
            ) : selectedItem ? (
              <div className="alloc-detail-content">
                {isEditing ? (
                  <div className="login-form">
                    <h2 className="form-title" style={{ fontSize: '22px', textAlign: 'left', marginBottom: '16px' }}>Edit Want List</h2>
                    <div className="input-group">
                      <label>Item Name</label>
                      <input 
                        type="text" 
                        value={editItem.item || ''} 
                        onChange={e => setEditItem({...editItem, item: e.target.value})} 
                      />
                    </div>
                    
                    <div className="input-group">
                      <label>Affordability</label>
                      <select 
                        value={editItem.afford || ''} 
                        onChange={e => setEditItem({...editItem, afford: e.target.value})} 
                        className="dropdown-select"
                      >
                        <option value="Save monthly">Save monthly</option>
                        <option value="One-time payment">One-time payment</option>
                        <option value="Installment">Installment</option>
                        <option value="Not Afford">Not Afford</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label>Estimated Price</label>
                      <input 
                        type="number" 
                        value={editItem.estimatedPrice || 0} 
                        onChange={e => setEditItem({...editItem, estimatedPrice: Number(e.target.value)})} 
                      />
                    </div>

                    <div className="input-group">
                      <label>Date Wanted</label>
                      <input 
                        type="date" 
                        value={editItem.dateWanted || ''} 
                        onChange={e => setEditItem({...editItem, dateWanted: e.target.value})} 
                      />
                    </div>

                    <div className="input-group">
                      <label>Remarks</label>
                      <input 
                        type="text" 
                        value={editItem.remarks || ''} 
                        onChange={e => setEditItem({...editItem, remarks: e.target.value})} 
                      />
                    </div>

                    <div className="input-group">
                      <label>Status</label>
                      <select 
                        value={editItem.status || ''} 
                        onChange={e => setEditItem({...editItem, status: e.target.value})} 
                        className="dropdown-select"
                      >
                        <option value="Planned">Planned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Achieved">Achieved</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                      <button className="primary-btn" style={{ flex: 1, margin: 0 }} onClick={promptUpdate}>Update</button>
                      <button className="secondary-btn" style={{ flex: 1, margin: 0, borderColor: '#e53e3e', color: '#e53e3e' }} onClick={promptDelete}>Delete</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="alloc-detail-header">
                      <div className="alloc-avatar large" style={{ backgroundColor: getColor(selectedItem.status), margin: '0 auto 16px', width: '64px', height: '64px', fontSize: '28px' }}>
                        {getInitial(selectedItem.item)}
                      </div>
                      <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-dark)' }}>{selectedItem.item}</h2>
                      <span className="alloc-meta" style={{ display: 'inline-block', marginBottom: '24px' }}>
                        <span style={{ color: getColor(selectedItem.status), fontWeight: '600' }}>
                          {selectedItem.status || 'Unknown'}
                        </span>
                      </span>
                    </div>
                    
                    <div className="detail-grid">
                      <div className="detail-group">
                        <label>Affordability</label>
                        <p>{selectedItem.afford || '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Estimated Price</label>
                        <p>{selectedItem.estimatedPrice !== undefined ? `₱${selectedItem.estimatedPrice.toLocaleString()}` : '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Date Wanted</label>
                        <p>{selectedItem.dateWanted || '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Remarks</label>
                        <p>{selectedItem.remarks || '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Added By</label>
                        <p>{selectedItem.addedBy ? `@${selectedItem.addedBy}` : '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Date Added</label>
                        <p>{selectedItem.dateAdded || '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Updated By</label>
                        <p>{selectedItem.updateBy ? `@${selectedItem.updateBy}` : '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Update Date</label>
                        <p>{selectedItem.updateDate || '—'}</p>
                      </div>
                    </div>

                    <button 
                      className="secondary-btn margin-top-lg" 
                      onClick={() => {
                        setEditItem({
                          item: selectedItem.item,
                          afford: selectedItem.afford,
                          estimatedPrice: selectedItem.estimatedPrice,
                          dateWanted: selectedItem.dateWanted,
                          remarks: selectedItem.remarks,
                          status: selectedItem.status
                        });
                        setIsEditing(true);
                      }}
                    >
                      Edit Want List
                    </button>
                  </>
                )}
              </div>
            ) : (
               <div className="flex-center" style={{ height: '200px' }}>
                 <p>Failed to load data.</p>
               </div>
            )}
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="modal-overlay" style={{ zIndex: 150 }}>
          <div className="modal-content" style={{ padding: '32px', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-dark)' }}>Confirm Action</h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '24px', lineHeight: '1.5' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                className="primary-btn" 
                style={{ flex: 1, backgroundColor: confirmDialog.type === 'delete' ? '#e53e3e' : 'var(--primary-green)', margin: 0 }} 
                onClick={() => confirmDialog.type === 'update' ? executeUpdate() : executeDelete()}
              >
                Proceed
              </button>
              <button 
                className="secondary-btn" 
                style={{ flex: 1, margin: 0, borderColor: '#d1d5db', color: 'var(--text-dark)' }} 
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {resultDialog && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="modal-content" style={{ textAlign: 'center', padding: '40px', maxWidth: '360px' }}>
            <div style={{ fontSize: '56px', color: resultDialog.status === 'success' ? 'var(--primary-green)' : '#e53e3e', marginBottom: '16px', fontWeight: 'bold' }}>
              {resultDialog.status === 'success' ? '✓' : '✕'}
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-dark)' }}>
              {resultDialog.status === 'success' ? 'Success!' : 'Error'}
            </h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '32px' }}>{resultDialog.message}</p>
            <button 
              className="primary-btn" 
              style={{ backgroundColor: resultDialog.status === 'success' ? 'var(--primary-green)' : '#e53e3e' }}
              onClick={() => {
                setResultDialog(null);
                if (resultDialog.status === 'success') {
                  setIsEditing(false);
                  setIsModalOpen(false);
                  fetchData(0, false);
                }
              }}
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {isSearchModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 120 }} onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsSearchModalOpen(false)}>×</button>
            <h2 className="form-title" style={{ fontSize: '24px', textAlign: 'left', marginBottom: '24px' }}>Search Want Lists</h2>
            
            <div className="login-form">
              <div className="input-group">
                <label>Item Name</label>
                <input 
                  type="text" 
                  placeholder="Enter item keywords..."
                  value={tempFilters.item}
                  onChange={(e) => setTempFilters({...tempFilters, item: sanitizeInput(e.target.value)})}
                />
              </div>

              <div className="input-group">
                <label>Affordability Filter</label>
                <select 
                  value={tempFilters.afford}
                  onChange={(e) => setTempFilters({...tempFilters, afford: e.target.value})}
                  className="dropdown-select"
                >
                  <option value="">Any Type</option>
                  <option value="Save monthly">Save monthly</option>
                  <option value="One-time payment">One-time payment</option>
                  <option value="Installment">Installment</option>
                  <option value="Not Afford">Not Afford</option>
                </select>
              </div>

              <div className="input-group">
                <label>Remarks Filter</label>
                <input 
                  type="text" 
                  placeholder="Notes keywords..."
                  value={tempFilters.remarks}
                  onChange={(e) => setTempFilters({...tempFilters, remarks: sanitizeInput(e.target.value)})}
                />
              </div>

              <div className="input-group">
                <label>Status Filter</label>
                <select 
                  value={tempFilters.status}
                  onChange={(e) => setTempFilters({...tempFilters, status: e.target.value})}
                  className="dropdown-select"
                >
                  <option value="">Any Status</option>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Achieved">Achieved</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <button 
                className="primary-btn margin-top-lg"
                onClick={() => {
                  const activeFilters: any = {};
                  if (tempFilters.item.trim() !== '') activeFilters.item = tempFilters.item.trim();
                  if (tempFilters.afford !== '') activeFilters.afford = tempFilters.afford;
                  if (tempFilters.remarks.trim() !== '') activeFilters.remarks = tempFilters.remarks.trim();
                  if (tempFilters.status !== '') activeFilters.status = tempFilters.status;
                  
                  setSearchFilters(activeFilters);
                  setIsSearchModalOpen(false);
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
