import { useState, useEffect } from 'react';
import deskIllustrationUrl from './assets/desk_illustration.png';
import './App.css';

interface AllocationItem {
  allocId?: number;
  allocation?: string;
  type?: string;
  description?: string;
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

export default function Allocations({ onBack }: AllocationsProps) {
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sessionToken, setSessionToken] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationItem | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAlloc, setNewAlloc] = useState({
    allocation: '',
    type: 'Savings',
    description: '',
    status: 'Active'
  });
  const [isCreating, setIsCreating] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{type: 'update' | 'delete', message: string} | null>(null);
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<{allocation?: string, type?: string, status?: string}>({});
  const [tempFilters, setTempFilters] = useState({ allocation: '', type: '', status: '' });

  const [isEditing, setIsEditing] = useState(false);
  const [editAlloc, setEditAlloc] = useState<Partial<AllocationItem>>({});

  const sanitizeInput = (val: string) => {
    return val.replace(/(--|\/|\\|;|%|\$|\*|!|`|~)/g, '');
  };

  const isFormValid = newAlloc.allocation.trim() !== '' && 
                      newAlloc.type.trim() !== '' && 
                      newAlloc.description.trim() !== '' && 
                      newAlloc.status.trim() !== '';

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

      const authRes = await fetch(`${import.meta.env.PFM_BASE_URL}authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!authRes.ok) throw new Error('Authentication failed');
      
      const authText = await authRes.text();
      let token = sessionToken;
      if (!token) {
        const parsed = JSON.parse(authText);
        token = parsed.data?.token || parsed.token || parsed.accessToken || parsed.jwt || authText;
        setSessionToken(token);
      }

      const currentFilters = filtersOverride !== undefined ? filtersOverride : searchFilters;
      let apiUrl = `${import.meta.env.PFM_BASE_URL}get/allocation.mapping?page=${pageNumber}&size=10&sortBy=allocId`;
      
      if (Object.keys(currentFilters).length > 0) {
        apiUrl = `${import.meta.env.PFM_BASE_URL}search/allocation.mapping?page=${pageNumber}&size=10&sortBy=allocId`;
        
        const stringParams: string[] = [];
        Object.entries(currentFilters).forEach(([key, val]) => {
          let strVal = val as string;
          // Apply explicit space handling to '+' format across ALL filters
          const encodedVal = encodeURIComponent(strVal).replace(/%20/g, '+');
          stringParams.push(`${encodeURIComponent(key)}=${encodedVal}`);
        });
        
        apiUrl += `&${stringParams.join('&')}`;
      }

      const allocRes = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (allocRes.ok) {
        const responseJson = await allocRes.json();
        const payload = responseJson.data !== undefined ? responseJson.data : responseJson;
        
        const content = payload.content || (Array.isArray(payload) ? payload : []);
        const last = payload.last !== undefined ? payload.last : true;
        
        if (payload.totalElements !== undefined) {
          setTotalElements(payload.totalElements);
        } else {
          setTotalElements(prev => append ? prev + content.length : content.length);
        }

        const tPages = payload.totalPages !== undefined ? payload.totalPages : Math.max(1, Math.ceil((payload.totalElements || content.length) / 10));
        setTotalPages(tPages);

        if (append) {
          setAllocations(prev => [...prev, ...content]);
        } else {
          setAllocations(content);
        }
        
        setIsLastPage(last);
        setPage(pageNumber);
      }
    } catch (e) {
      console.error('Error fetching allocations:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (allocId?: number) => {
    if (!allocId) return;
    
    setIsEditing(false);
    setIsModalOpen(true);
    setIsFetchingDetails(true);
    
    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}get/allocation.mapping/allocId/${allocId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (res.ok) {
        const responseJson = await res.json();
        const payload = responseJson.data !== undefined ? responseJson.data : responseJson;
        
        // Extract from array since the backend wraps the item in data: [...]
        const detailedAllocation = Array.isArray(payload) && payload.length > 0 ? payload[0] : payload;
        setSelectedAllocation(detailedAllocation);
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
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}allocation.mapping/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          ...newAlloc,
          addedBy: username
        })
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setNewAlloc({ allocation: '', type: 'Savings', description: '', status: 'Active' });
        setResultDialog({ status: 'success', message: 'Allocation created successfully.' });
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to create allocation.' });
      }
    } catch (e) {
      console.error('Error creating:', e);
      setResultDialog({ status: 'failed', message: 'Something went wrong.' });
    } finally {
      setIsCreating(false);
    }
  };

  const promptUpdate = () => {
    if (!selectedAllocation || !selectedAllocation.allocId || !sessionToken) return;

    const updatedFields: any = {};
    if (editAlloc.allocation !== selectedAllocation.allocation) updatedFields.allocation = editAlloc.allocation;
    if (editAlloc.type !== selectedAllocation.type) updatedFields.type = editAlloc.type;
    if (editAlloc.description !== selectedAllocation.description) updatedFields.description = editAlloc.description;
    if (editAlloc.status !== selectedAllocation.status) updatedFields.status = editAlloc.status;

    if (Object.keys(updatedFields).length === 0) {
      setIsEditing(false);
      return;
    }

    setConfirmDialog({ type: 'update', message: 'Are you sure you want to save these updated changes to this allocation?' });
  };

  const executeUpdate = async () => {
    setConfirmDialog(null);
    if (!selectedAllocation || !selectedAllocation.allocId || !sessionToken) return;

    const updatedFields: any = {};
    if (editAlloc.allocation !== selectedAllocation.allocation) updatedFields.allocation = editAlloc.allocation;
    if (editAlloc.type !== selectedAllocation.type) updatedFields.type = editAlloc.type;
    if (editAlloc.description !== selectedAllocation.description) updatedFields.description = editAlloc.description;
    if (editAlloc.status !== selectedAllocation.status) updatedFields.status = editAlloc.status;

    updatedFields.updateBy = localStorage.getItem('pfm_username') || 'Unknown User';

    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}allocation.mapping/update/${selectedAllocation.allocId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(updatedFields)
      });

      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Allocation updated successfully.' });
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to update allocation.' });
      }
    } catch (e) {
      console.error('Update error:', e);
      setResultDialog({ status: 'failed', message: 'An error occurred during update.' });
    }
  };

  const promptDelete = () => {
    if (!selectedAllocation || !selectedAllocation.allocId || !sessionToken) return;
    setConfirmDialog({ type: 'delete', message: 'Are you sure you want to permanently delete this allocation? This action cannot be undone.' });
  };

  const executeDelete = async () => {
    setConfirmDialog(null);
    if (!selectedAllocation || !selectedAllocation.allocId || !sessionToken) return;
    
    try {
      const res = await fetch(`${import.meta.env.PFM_BASE_URL}allocation.mapping/delete/${selectedAllocation.allocId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Allocation deleted successfully.' });
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to delete allocation.' });
      }
    } catch (e) {
      console.error('Delete error:', e);
      setResultDialog({ status: 'failed', message: 'An error occurred during deletion.' });
    }
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';
  const getColor = (type?: string) => type === 'Savings' ? '#3CAE5A' : '#4CAF50';

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
            <h1 className="allocations-title">Allocations</h1>
            <p className="allocations-subtitle">{totalElements} ALLOCATIONS</p>
          </div>
          <button className="icon-btn" onClick={() => {
            setTempFilters({
              allocation: searchFilters.allocation || '',
              type: searchFilters.type || '',
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

        {allocations.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
            {allocations.map((alloc, i) => (
              <div 
                key={alloc.allocId || i} 
                className="allocation-card clickable-card"
                onClick={() => handleCardClick(alloc.allocId)}
              >
                <div className="alloc-avatar" style={{ backgroundColor: getColor(alloc.type) }}>
                  {getInitial(alloc.allocation)}
                </div>
                <div className="alloc-info">
                  <h3 className="alloc-name">{alloc.allocation || 'Unnamed'}</h3>
                  <p className="alloc-meta">
                    {alloc.type || 'Unknown'} &bull; 
                    <span 
                      className={alloc.status === 'Active' ? '' : 'alloc-status-inactive'} 
                      style={{ color: alloc.status === 'Active' ? '#3CAE5A' : undefined, marginLeft: '4px' }}
                    >
                      {alloc.status || 'Not Active'}
                    </span>
                  </p>
                </div>
                <div className="alloc-date">
                  {alloc.addedBy ? `@${alloc.addedBy}` : ''}
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
            <h3 className="empty-state-title">No allocations yet</h3>
            <p className="empty-state-text">
              {loading ? 'Loading allocations...' : 'Create your first allocation to start tracking your investments.'}
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
            <h2 className="form-title">Create Allocation</h2>
            <form className="login-form" style={{ marginTop: '20px' }}>
              <div className="input-group">
                <label>Allocation Name</label>
                <input 
                  type="text" 
                  placeholder="Enter custom allocation" 
                  value={newAlloc.allocation} 
                  onChange={e => setNewAlloc({...newAlloc, allocation: e.target.value})} 
                  disabled={isCreating}
                />
              </div>

              <div className="input-group">
                <label>Type</label>
                <select 
                  value={newAlloc.type} 
                  onChange={e => setNewAlloc({...newAlloc, type: e.target.value})} 
                  className="dropdown-select"
                  disabled={isCreating}
                >
                  <option value="Savings">Savings</option>
                  <option value="Investments">Investments</option>
                </select>
              </div>

              <div className="input-group">
                <label>Description</label>
                <input 
                  type="text" 
                  placeholder="Detailed description" 
                  value={newAlloc.description} 
                  onChange={e => setNewAlloc({...newAlloc, description: e.target.value})} 
                  disabled={isCreating}
                />
              </div>

              <div className="input-group">
                <label>Status</label>
                <select 
                  value={newAlloc.status} 
                  onChange={e => setNewAlloc({...newAlloc, status: e.target.value})} 
                  className="dropdown-select"
                  disabled={isCreating}
                >
                  <option value="Active">Active</option>
                  <option value="Not Active">Not Active</option>
                </select>
              </div>

              <button 
                type="button" 
                onClick={handleCreate} 
                disabled={!isFormValid || isCreating} 
                className="primary-btn margin-top-lg" 
                style={{ opacity: (!isFormValid || isCreating) ? 0.5 : 1 }}
              >
                {isCreating ? 'Creating...' : 'Create Allocation'}
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
            ) : selectedAllocation ? (
              <div className="alloc-detail-content">
                {isEditing ? (
                  <div className="login-form">
                    <h2 className="form-title" style={{ fontSize: '22px', textAlign: 'left', marginBottom: '16px' }}>Edit Allocation</h2>
                    <div className="input-group">
                      <label>Allocation Name</label>
                      <input 
                        type="text" 
                        value={editAlloc.allocation || ''} 
                        onChange={e => setEditAlloc({...editAlloc, allocation: e.target.value})} 
                      />
                    </div>
                    
                    <div className="input-group">
                      <label>Type</label>
                      <select 
                        value={editAlloc.type || ''} 
                        onChange={e => setEditAlloc({...editAlloc, type: e.target.value})} 
                        className="dropdown-select"
                      >
                        <option value="Savings">Savings</option>
                        <option value="Investments">Investments</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label>Description</label>
                      <input 
                        type="text" 
                        value={editAlloc.description || ''} 
                        onChange={e => setEditAlloc({...editAlloc, description: e.target.value})} 
                      />
                    </div>

                    <div className="input-group">
                      <label>Status</label>
                      <select 
                        value={editAlloc.status || ''} 
                        onChange={e => setEditAlloc({...editAlloc, status: e.target.value})} 
                        className="dropdown-select"
                      >
                        <option value="Active">Active</option>
                        <option value="Not Active">Not Active</option>
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
                      <div className="alloc-avatar large" style={{ backgroundColor: getColor(selectedAllocation.type), margin: '0 auto 16px', width: '64px', height: '64px', fontSize: '28px' }}>
                        {getInitial(selectedAllocation.allocation)}
                      </div>
                      <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-dark)' }}>{selectedAllocation.allocation}</h2>
                      <span className="alloc-meta" style={{ display: 'inline-block', marginBottom: '24px' }}>
                        <span className={selectedAllocation.status === 'Active' ? '' : 'alloc-status-inactive'} style={{ color: selectedAllocation.status === 'Active' ? '#3CAE5A' : undefined, fontWeight: '600' }}>
                          {selectedAllocation.status || 'Unknown'}
                        </span>
                      </span>
                    </div>
                    
                    <div className="detail-grid">
                      <div className="detail-group">
                        <label>Type</label>
                        <p>{selectedAllocation.type || '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Description</label>
                        <p>{selectedAllocation.description || '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Added By</label>
                        <p>{selectedAllocation.addedBy ? `@${selectedAllocation.addedBy}` : '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Date Added</label>
                        <p>{selectedAllocation.dateAdded || '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Updated By</label>
                        <p>{selectedAllocation.updateBy ? `@${selectedAllocation.updateBy}` : '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Update Date</label>
                        <p>{selectedAllocation.updateDate || '—'}</p>
                      </div>
                    </div>

                    <button 
                      className="secondary-btn margin-top-lg" 
                      onClick={() => {
                        setEditAlloc({
                          allocation: selectedAllocation.allocation,
                          type: selectedAllocation.type,
                          description: selectedAllocation.description,
                          status: selectedAllocation.status
                        });
                        setIsEditing(true);
                      }}
                    >
                      Edit Allocation
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
            <h2 className="form-title" style={{ fontSize: '24px', textAlign: 'left', marginBottom: '24px' }}>Search Allocations</h2>
            
            <div className="login-form">
              <div className="input-group">
                <label>Allocation Name</label>
                <input 
                  type="text" 
                  placeholder="Enter specific keywords..."
                  value={tempFilters.allocation}
                  onChange={(e) => setTempFilters({...tempFilters, allocation: sanitizeInput(e.target.value)})}
                />
              </div>

              <div className="input-group">
                <label>Type Filter</label>
                <select 
                  value={tempFilters.type}
                  onChange={(e) => setTempFilters({...tempFilters, type: e.target.value})}
                  className="dropdown-select"
                >
                  <option value="">Any Type</option>
                  <option value="Savings">Savings</option>
                  <option value="Investments">Investments</option>
                </select>
              </div>

              <div className="input-group">
                <label>Status Filter</label>
                <select 
                  value={tempFilters.status}
                  onChange={(e) => setTempFilters({...tempFilters, status: e.target.value})}
                  className="dropdown-select"
                >
                  <option value="">Any Status</option>
                  <option value="Active">Active</option>
                  <option value="Not Active">Not Active</option>
                </select>
              </div>

              <button 
                className="primary-btn margin-top-lg"
                onClick={() => {
                  const activeFilters: any = {};
                  if (tempFilters.allocation.trim() !== '') activeFilters.allocation = tempFilters.allocation.trim();
                  if (tempFilters.type !== '') activeFilters.type = tempFilters.type;
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
