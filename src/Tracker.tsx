import { useState, useEffect } from 'react';
import deskIllustrationUrl from './assets/desk_illustration.png';
import { API_URLS } from './url';
import { ensureFreshToken, containsProhibitedChars } from './utils/securityUtils';
import './css/App.css';

interface TrackerItem {
  id?: number;
  salaryId?: number;
  expenseDescription?: string;
  expenseType?: string;
  expenseValue?: number;
  status?: string;
  date?: string;
  dateAdded?: string;
  addedBy?: string;
  updateDate?: string;
  updateBy?: string;
  remarks?: string;
}

interface AllocationsProps {
  onBack: () => void;
  onNavigateToSalaryRecord: () => void;
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

const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
  </svg>
);

export default function Tracker({ onBack, onNavigateToSalaryRecord }: AllocationsProps) {
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [page, setPage] = useState(0);
  const [isLastPage, setIsLastPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrackerItem | null>(null);
  const [salaryInfo, setSalaryInfo] = useState<any>(null);
  const [isSalaryInfoLoading, setIsSalaryInfoLoading] = useState(false);
  const [showSalaryOverlay, setShowSalaryOverlay] = useState(false);
  const [allSalaries, setAllSalaries] = useState<any[]>([]);
  const [activeSalaryOptions, setActiveSalaryOptions] = useState<any[]>([]);
  const [selectedSalaryId, setSelectedSalaryId] = useState<number | null>(null);
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    expenseDescription: '',
    expenseType: 'Fund Transfer',
    expenseValue: '0',
    remarks: '',
    status: 'Completed',
    date: new Date().toISOString().split('T')[0],
    salaryId: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{type: 'update' | 'delete', message: string} | null>(null);
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<{expenseDescription?: string, expenseType?: string}>({});
  const [tempFilters, setTempFilters] = useState({ expenseDescription: '', expenseType: '' });

  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<TrackerItem>>({});

  const isFormValid = newItem.expenseDescription.trim() !== '' && 
                       newItem.expenseType.trim() !== '' && 
                       newItem.date.trim() !== '' && 
                       newItem.salaryId.trim() !== '';

  useEffect(() => {
    fetchAllSalaryPeriods();
  }, []);

  useEffect(() => {
    fetchData(0, false, searchFilters);
    if (selectedSalaryId) {
      fetchSalaryDetailsForSummary(selectedSalaryId);
    } else {
      setSalaryInfo(null);
    }
  }, [selectedSalaryId, searchFilters]);

  const fetchSalaryDetailsForSummary = async (id: number) => {
    const token = await ensureFreshToken();
    if (!token) return;
    try {
      const res = await fetch(API_URLS.SALARY_TRACKER.GET_BY_ID(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data[0] : (json.data || json);
        setSalaryInfo(data);
      }
    } catch (e) { console.error('Error fetching salary details for summary:', e); }
  };

  useEffect(() => {
    if (isCreateModalOpen || isEditing) {
      fetchActiveSalaryOptions();
    }
  }, [isCreateModalOpen, isEditing]);

  const fetchAllSalaryPeriods = async () => {
    const token = await ensureFreshToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URLS.SALARY_TRACKER.SEARCH}?page=0&size=100&sortBy=salaryId`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.data?.content || json.content || [];
        setAllSalaries(content);
      }
    } catch (e) { console.error('Error fetching all salary periods:', e); }
  };

  const fetchActiveSalaryOptions = async () => {
    const token = await ensureFreshToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URLS.SALARY_TRACKER.SEARCH}?page=0&size=100&sortBy=salaryId&status=Active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.data?.content || json.content || [];
        setActiveSalaryOptions(content);
        if (content.length > 0 && !newItem.salaryId) {
          setNewItem(prev => ({ ...prev, salaryId: content[0].salaryId.toString() }));
        }
      }
    } catch (e) { console.error('Error fetching active salary options:', e); }
  };

  const handleSelectInitialSalary = (id: number) => {
    setSelectedSalaryId(id);
    setIsInitialModalOpen(false);
    // When creation happens later, use this by default.
    setNewItem(prev => ({ ...prev, salaryId: id.toString() }));
  };

  const fetchData = async (pageNumber: number, append: boolean, filtersOverride?: typeof searchFilters) => {
    if (!append) {
      setItems([]);
      setTotalElements(0);
      setTotalPages(1);
    }
    setLoading(true);
    try {
      const token = await ensureFreshToken();
      if (!token) return;

      const currentFilters = filtersOverride !== undefined ? filtersOverride : searchFilters;
      const hasFilters = Object.values(currentFilters).some(v => v !== '');

      let baseUrl = selectedSalaryId 
        ? API_URLS.SALARY_EXPENSE.BASE_BY_SALARY(selectedSalaryId)
        : (hasFilters ? API_URLS.SALARY_EXPENSE.SEARCH : API_URLS.SALARY_EXPENSE.BASE_GLOBAL);

      let apiUrl = `${baseUrl}?page=${pageNumber}&size=20&sortBy=id`;
      
      const params = new URLSearchParams();
      Object.entries(currentFilters).forEach(([k, v]) => { if (v) params.append(k, v as string); });
      let queryStr = params.toString();
      queryStr = queryStr.replace(/%20/g, '+');
      if (queryStr) apiUrl += `&${queryStr}`;

      const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        const content = payload.content || [];
        setItems(append ? [...items, ...content] : content);
        setIsLastPage(payload.last !== undefined ? payload.last : true);
        setTotalElements(payload.totalElements || 0);
        setTotalPages(payload.totalPages || 1);
        setPage(pageNumber);
      } else {
        if (!append) setItems([]);
      }
    } catch (e) {
      console.error('Error fetching tracker data:', e);
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
      const res = await fetch(API_URLS.SALARY_EXPENSE.GET_BY_ID(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const detail = Array.isArray(json.data) ? json.data[0] : (json.data || json);
        setSelectedItem(detail);
        setEditItem(detail);
      }
    } catch (e) {
      console.error('Error fetching tracker detail:', e);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleCreate = async () => {
    if (!isFormValid) return;
    
    if (containsProhibitedChars(newItem.expenseDescription) || containsProhibitedChars(newItem.remarks)) {
      setResultDialog({ 
        status: 'failed', 
        message: 'Input contains prohibited characters (--, /, \\, ;, %, $, *, !, `, ~). Please remove them before saving.' 
      });
      return;
    }

    const token = await ensureFreshToken();
    if (!token) return;
    setIsCreating(true);
    
    const username = localStorage.getItem('pfm_username') || 'system';
    const payload = {
      salaryId: Number(newItem.salaryId),
      expenseDescription: newItem.expenseDescription,
      expenseType: newItem.expenseType,
      expenseValue: Number(newItem.expenseValue),
      remarks: newItem.remarks,
      status: newItem.status,
      date: newItem.date,
      addedBy: username
    };

    try {
      const res = await fetch(API_URLS.SALARY_EXPENSE.CREATE, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        setResultDialog({ status: 'success', message: 'Tracker record created successfully.' });
        fetchData(0, false);
        setNewItem({
          expenseDescription: '',
          expenseType: 'Fund Transfer',
          expenseValue: '0',
          remarks: '',
          status: 'Completed',
          date: new Date().toISOString().split('T')[0],
          salaryId: selectedSalaryId ? selectedSalaryId.toString() : ''
        });
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to create tracker record.' });
      }
    } catch (e) {
      setResultDialog({ status: 'failed', message: 'An error occurred during creation.' });
    } finally {
      setIsCreating(false);
    }
  };

  const promptUpdate = () => {
    setConfirmDialog({ type: 'update', message: 'Are you sure you want to save these updated changes to this Tracker record?' });
  };

  const executeUpdate = async () => {
    setConfirmDialog(null);
    const token = await ensureFreshToken();
    if (!selectedItem || !selectedItem.id || !token) return;

    if (containsProhibitedChars(editItem.expenseDescription || '') || containsProhibitedChars(editItem.remarks || '')) {
      setResultDialog({ 
        status: 'failed', 
        message: 'Input contains prohibited characters. Please remove them before updating.' 
      });
      return;
    }

    const payload = {
      ...selectedItem,
      ...editItem,
      id: selectedItem.id,
      salaryId: Number(editItem.salaryId || selectedItem.salaryId),
      expenseDescription: editItem.expenseDescription || selectedItem.expenseDescription || '',
      expenseValue: Number(editItem.expenseValue || selectedItem.expenseValue || 0),
      remarks: editItem.remarks || selectedItem.remarks || '',
      updateBy: localStorage.getItem('pfm_username') || 'system'
    };

    try {
      const res = await fetch(API_URLS.SALARY_EXPENSE.UPDATE(selectedItem.id!), {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Tracker record updated successfully.' });
        fetchData(page, false);
        setIsModalOpen(false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to update tracker record.' });
      }
    } catch (e) {
      setResultDialog({ status: 'failed', message: 'An error occurred during update.' });
    }
  };

  const promptDelete = () => {
    setConfirmDialog({ type: 'delete', message: 'Are you sure you want to permanently delete this Tracker record? This action cannot be undone.' });
  };

  const executeDelete = async () => {
    setConfirmDialog(null);
    const token = await ensureFreshToken();
    if (!selectedItem || !selectedItem.id || !token) return;

    try {
      const res = await fetch(API_URLS.SALARY_EXPENSE.DELETE(selectedItem.id), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Tracker record deleted successfully.' });
        fetchData(page, false);
        setIsModalOpen(false);
      } else {
        setResultDialog({ status: 'failed', message: 'Failed to delete tracker record.' });
      }
    } catch (e) {
      setResultDialog({ status: 'failed', message: 'An error occurred during deletion.' });
    }
  };

  const handleViewSalaryInfo = async (id: number) => {
    const token = await ensureFreshToken();
    if (!token) return;
    setIsSalaryInfoLoading(true);
    setShowSalaryOverlay(true);
    try {
      const res = await fetch(API_URLS.SALARY_TRACKER.GET_BY_ID(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data[0] : (json.data || json);
        setSalaryInfo(data);
      }
    } catch (e) {
      console.error('Error fetching salary info:', e);
    } finally {
      setIsSalaryInfoLoading(false);
    }
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';
  const getColor = (type?: string) => type === 'Income' ? '#2ecc71' : '#e74c3c';

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
            <h1 className="allocations-title">Tracker</h1>
            <p className="allocations-subtitle">
              {selectedSalaryId ? (
                `SALARY DATE: ${allSalaries.find(s => s.salaryId === selectedSalaryId)?.date || '...'} • ${totalElements} RECORDS`
              ) : `${totalElements} RECORDS`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {selectedSalaryId && (
              <button 
                className="premium-pill-btn" 
                onClick={() => setIsInitialModalOpen(true)}
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                <PenIcon />
                <span>Switch Salary</span>
              </button>
            )}
            {!selectedSalaryId && (
              <button 
                className="premium-pill-btn" 
                onClick={() => setIsInitialModalOpen(true)}
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                <WalletIcon />
                <span>Select Salary</span>
              </button>
            )}
            <button 
              className="premium-pill-btn" 
              onClick={onNavigateToSalaryRecord}
            >
              <WalletIcon />
              <span>Salary History</span>
            </button>
            <button className="icon-btn search-trigger" onClick={() => setIsSearchModalOpen(true)}>
              <SearchIcon />
            </button>
          </div>
        </div>
      </section>

      {/* Suggestions Datalist */}
      <datalist id="tracker-suggestions">
        {Array.from(new Set(items.map(it => it.expenseDescription))).filter(Boolean).map((desc, i) => (
          <option key={i} value={desc} />
        ))}
      </datalist>

      <main className="allocations-main">
        {selectedSalaryId && salaryInfo && items.length > 0 && (
          <section className="summary-banner" style={{ maxWidth: '600px', margin: '0 auto 24px', background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #f3f4f6' }}>
            <div className="summary-item">
              <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Salary Amount</span>
              <h3 style={{ fontSize: '20px', margin: '4px 0 0', fontWeight: '700', color: '#111827' }}>₱{(salaryInfo.salary || 0).toLocaleString()}</h3>
            </div>
            <div className="summary-divider" style={{ width: '1px', height: '40px', background: '#e5e7eb' }}></div>
            <div className="summary-item">
              <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Expenses</span>
              <h3 style={{ fontSize: '20px', margin: '4px 0 0', fontWeight: '700', color: '#ef4444' }}>₱{items.reduce((acc, it) => acc + (it.expenseValue || 0), 0).toLocaleString()}</h3>
            </div>
            <div className="summary-divider" style={{ width: '1px', height: '40px', background: '#e5e7eb' }}></div>
            <div className="summary-item" style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Remaining</span>
              <h3 style={{ 
                fontSize: '20px', 
                margin: '4px 0 0', 
                fontWeight: '700', 
                color: (salaryInfo.salary - items.reduce((acc, it) => acc + (it.expenseValue || 0), 0)) >= 0 ? '#10b981' : '#ef4444' 
              }}>
                ₱{(salaryInfo.salary - items.reduce((acc, it) => acc + (it.expenseValue || 0), 0)).toLocaleString()}
              </h3>
            </div>
          </section>
        )}

        {Object.keys(searchFilters).length > 0 && (
          <div style={{ display: 'flex', gap: '8px', maxWidth: '600px', margin: '0 auto 16px', flexWrap: 'wrap' }}>
            {Object.entries(searchFilters).map(([k, v]) => (
              <div key={k} style={{ background: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600 }}>{k}:</span> {v as string}
                <button onClick={() => { const nf = {...searchFilters}; delete (nf as any)[k]; setSearchFilters(nf); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
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
                <div className="alloc-avatar" style={{ backgroundColor: getColor(it.expenseType) }}>
                  {getInitial(it.expenseDescription)}
                </div>
                <div className="alloc-info">
                  <h3 className="alloc-name">{it.expenseDescription || 'Unnamed'}</h3>
                  <p className="alloc-meta">
                    {it.expenseType || 'Unknown'} &bull; ₱{(it.expenseValue || 0).toLocaleString()} &bull; 
                    <span style={{ marginLeft: '4px', fontWeight: '500' }}>{it.status}</span>
                  </p>
                </div>
                <div className="alloc-date">
                  {it.date}
                </div>
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
            <h3 className="empty-state-title">No Tracker Records</h3>
            <p className="empty-state-text">{loading ? 'Searching...' : 'Create your first tracker record to start managing your daily financial flow.'}</p>
          </div>
        )}
      </main>

      <button className="fab-btn" onClick={() => setIsCreateModalOpen(true)}>
        <PenIcon />
      </button>

      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !isCreating && setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Add Tracker Record</h2>
            <form className="login-form">
               <div className="input-group">
                <label>Description</label>
                <input type="text" placeholder="e.g. Lunch out" value={newItem.expenseDescription} onChange={e => setNewItem({...newItem, expenseDescription: e.target.value})} list="tracker-suggestions" />
              </div>
               <div className="input-group">
                 <label>Type</label>
                 <select className="dropdown-select" value={newItem.expenseType} onChange={e => setNewItem({...newItem, expenseType: e.target.value})}>
                   <option value="Fund Transfer">Fund Transfer</option>
                   <option value="ATM Withdrawal">ATM Withdrawal</option>
                 </select>
               </div>
              <div className="input-group">
                <label>Value (₱)</label>
                <input type="number" value={newItem.expenseValue} onChange={e => setNewItem({...newItem, expenseValue: e.target.value})} />
              </div>
              <div className="input-group">
                 <label>Salary Date</label>
                 <select 
                   className="dropdown-select" 
                   value={newItem.salaryId} 
                   onChange={e => setNewItem({...newItem, salaryId: e.target.value})}
                 >
                   <option value="">Select Salary Date</option>
                   {activeSalaryOptions.map(s => (
                     <option key={s.salaryId} value={s.salaryId.toString()}>{s.date}</option>
                   ))}
                 </select>
               </div>
              <div className="input-group">
                <label>Date</label>
                <input type="date" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} />
              </div>
              <button type="button" className="primary-btn margin-top-lg" onClick={handleCreate}>{isCreating ? 'Adding...' : 'Add Record'}</button>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content alloc-detail-modal" onClick={e => e.stopPropagation()}>
            {isFetchingDetails ? <p>Loading details...</p> : selectedItem && (
              <div className="alloc-detail-content">
                {isEditing ? (
                   <div className="login-form">
                    <h2 className="form-title">Edit Record</h2>
                    <div className="input-group">
                      <label>Description</label>
                      <input type="text" value={editItem.expenseDescription || ''} onChange={e => setEditItem({...editItem, expenseDescription: e.target.value})} list="tracker-suggestions" />
                    </div>
                    <div className="input-group">
                      <label>Type</label>
                      <select className="dropdown-select" value={editItem.expenseType || 'Fund Transfer'} onChange={e => setEditItem({...editItem, expenseType: e.target.value})}>
                        <option value="Fund Transfer">Fund Transfer</option>
                        <option value="ATM Withdrawal">ATM Withdrawal</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Value (₱)</label>
                      <input type="number" value={editItem.expenseValue || 0} onChange={e => setEditItem({...editItem, expenseValue: Number(e.target.value)})} />
                    </div>
                    <div className="input-group">
                      <label>Salary Record</label>
                      <select 
                        className="dropdown-select" 
                        value={editItem.salaryId || ''} 
                        onChange={e => setEditItem({...editItem, salaryId: Number(e.target.value)})}
                      >
                        <option value="">Select Salary Date</option>
                        {activeSalaryOptions.map(s => (
                          <option key={s.salaryId} value={s.salaryId}>{s.date}</option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Date</label>
                      <input type="date" value={editItem.date || ''} onChange={e => setEditItem({...editItem, date: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button className="primary-btn" style={{ flex: 1 }} onClick={promptUpdate}>Update</button>
                      <button className="secondary-btn" style={{ flex: 1, borderColor: '#e53e3e', color: '#e53e3e' }} onClick={promptDelete}>Delete</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="alloc-detail-header">
                      <div className="alloc-avatar large" style={{ backgroundColor: getColor(selectedItem.expenseType) }}>{getInitial(selectedItem.expenseDescription)}</div>
                      <h2>{selectedItem.expenseDescription}</h2>
                      <span style={{ color: getColor(selectedItem.expenseType), fontWeight: '600' }}>{selectedItem.expenseType}</span>
                    </div>
                    <div className="detail-grid">
                      <div className="detail-group"><label>Amount</label><p>₱{(selectedItem.expenseValue || 0).toLocaleString()}</p></div>
                      <div className="detail-group"><label>Expense Type</label><p>{selectedItem.expenseType}</p></div>
                      <div className="detail-group">
                        <label>Salary Record</label>
                        {selectedItem.salaryId ? (
                          <button 
                            className="premium-pill-btn" 
                            onClick={() => handleViewSalaryInfo(selectedItem.salaryId!)} 
                            style={{ 
                              fontSize: '12px', 
                              padding: '8px 16px', 
                              height: 'auto', 
                              marginTop: '8px',
                              background: '#10b981',
                              color: 'white',
                              fontWeight: '600',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            View Salary Info
                          </button>
                        ) : <p>—</p>}
                      </div>
                      <div className="detail-group"><label>Transaction Date</label><p>{selectedItem.date}</p></div>
                      <div className="detail-group"><label>Date Added</label><p>{selectedItem.dateAdded}</p></div>
                      <div className="detail-group"><label>Last Update</label><p>{selectedItem.updateDate || '—'}</p></div>
                    </div>
                    <button className="secondary-btn margin-top-lg" onClick={() => setIsEditing(true)}>Edit Record</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHOOSE SALARY OVERLAY */}
      {isInitialModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setIsInitialModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 className="form-title" style={{ margin: 0 }}>Tracker Filter</h2>
                {selectedSalaryId && (
                  <button 
                  onClick={() => { setSelectedSalaryId(null); setIsInitialModalOpen(false); }}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                    Clear Filter
                  </button>
                )}
            </div>
            <p className="signup-prompt" style={{ marginBottom: '24px' }}>Choose a salary payout date to view specific transactions or clear and see all records.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
               <button 
                  className={`allocation-card clickable-card ${selectedSalaryId === null ? 'active-selection' : ''}`}
                  style={{ width: '100%', border: selectedSalaryId === null ? '2px solid #10b981' : '1px solid #e5e7eb', padding: '16px', display: 'flex', alignItems: 'center' }}
                  onClick={() => {
                    setSelectedSalaryId(null);
                    setIsInitialModalOpen(false);
                  }}
                >
                  <div className="alloc-avatar" style={{ backgroundColor: '#10b981' }}>★</div>
                  <div className="alloc-info" style={{ textAlign: 'left' }}>
                    <h3 className="alloc-name">Global Master View</h3>
                    <p className="alloc-meta">All Transactions Combined</p>
                  </div>
                </button>

              {allSalaries.map(s => (
                <button 
                  key={s.salaryId} 
                  className={`allocation-card clickable-card ${selectedSalaryId === s.salaryId ? 'active-selection' : ''}`}
                  style={{ width: '100%', border: selectedSalaryId === s.salaryId ? '2px solid #10b981' : '1px solid #e5e7eb', padding: '16px', display: 'flex', alignItems: 'center' }}
                  onClick={() => handleSelectInitialSalary(s.salaryId)}
                >
                  <div className="alloc-avatar" style={{ backgroundColor: '#3b82f6' }}>📅</div>
                  <div className="alloc-info" style={{ textAlign: 'left' }}>
                    <h3 className="alloc-name">{s.date}</h3>
                    <p className="alloc-meta">Salary Period: {s.status}</p>
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

      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Search & Filters</h2>
            <div className="login-form">
              <div className="input-group">
                <label>Expense Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Rice"
                    value={tempFilters.expenseDescription} 
                    onChange={e => setTempFilters({...tempFilters, expenseDescription: e.target.value})} 
                    list="tracker-suggestions"
                  />
              </div>
              <div className="input-group">
                <label>Expense Type</label>
                <select className="dropdown-select" value={tempFilters.expenseType} onChange={e => setTempFilters({...tempFilters, expenseType: e.target.value})}>
                  <option value="">All Types</option>
                  <option value="Fund Transfer">Fund Transfer</option>
                  <option value="ATM Withdrawal">ATM Withdrawal</option>
                </select>
              </div>
              <button className="primary-btn margin-top-lg" onClick={() => {
                const final: any = {};
                if (tempFilters.expenseDescription.trim()) final.expenseDescription = tempFilters.expenseDescription.trim();
                if (tempFilters.expenseType) final.expenseType = tempFilters.expenseType;
                setSearchFilters(final);
                setIsSearchModalOpen(false);
              }}>Apply Search</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="modal-overlay" style={{ zIndex: 150 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h2>Confirm</h2>
            <p>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
              <button className="primary-btn" onClick={() => confirmDialog.type === 'update' ? executeUpdate() : executeDelete()}>Proceed</button>
              <button className="secondary-btn" onClick={() => setConfirmDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showSalaryOverlay && (
        <div className="modal-overlay" onClick={() => setShowSalaryOverlay(false)} style={{ zIndex: 160 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 className="form-title">Salary Information</h2>
            {isSalaryInfoLoading ? <p>Fetching salary details...</p> : salaryInfo ? (
              <div className="detail-grid" style={{ marginTop: '20px' }}>
                <div className="detail-group"><label>Salary Amount</label><p>₱{(salaryInfo.salary || 0).toLocaleString()}</p></div>
                <div className="detail-group"><label>Salary Date</label><p>{salaryInfo.date}</p></div>
                <div className="detail-group"><label>Status</label><p>{salaryInfo.status}</p></div>
                <div className="detail-group"><label>Date Added</label><p>{salaryInfo.dateAdded}</p></div>
                <div className="detail-group"><label>Last Updated</label><p>{salaryInfo.updateDate || '—'}</p></div>
              </div>
            ) : <p>No salary record found for this transaction.</p>}
            <button className="primary-btn margin-top-lg" style={{ width: '100%' }} onClick={() => setShowSalaryOverlay(false)}>Close View</button>
          </div>
        </div>
      )}

      {resultDialog && (
        <div className="modal-overlay" style={{ zIndex: 200 }}>
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <h2>{resultDialog.status === 'success' ? '✓ Success' : '✕ Error'}</h2>
            <p>{resultDialog.message}</p>
            <button className="primary-btn" onClick={() => {setResultDialog(null); setIsModalOpen(false);}}>Okay</button>
          </div>
        </div>
      )}
    </div>
  );
}
