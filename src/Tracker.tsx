import { useState, useEffect } from 'react';
import deskIllustrationUrl from './assets/desk_illustration.png';
import './assets/css/App.css';

interface TrackerItem {
  id?: number;
  transaction?: string;
  category?: string;
  amount?: number;
  remarks?: string;
  status?: string;
  date?: string;
  dateAdded?: string;
  addedBy?: string;
  updateDate?: string;
  updateBy?: string;
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
  const [sessionToken, setSessionToken] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TrackerItem | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    transaction: '',
    category: 'Expense',
    amount: '0',
    remarks: '',
    status: 'Completed',
    date: new Date().toISOString().split('T')[0]
  });
  const [isCreating, setIsCreating] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{type: 'update' | 'delete', message: string} | null>(null);
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);
  
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<{transaction?: string, status?: string}>({});
  const [tempFilters, setTempFilters] = useState({ transaction: '', status: '' });

  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<TrackerItem>>({});

  const sanitizeInput = (val: string) => {
    return val.replace(/(--|\/|\\|;|%|\$|\*|!|`|~)/g, '');
  };

  const isFormValid = newItem.transaction.trim() !== '' && 
                       newItem.category.trim() !== '' && 
                       newItem.date.trim() !== '' && 
                       newItem.status.trim() !== '';

  useEffect(() => {
    fetchData(0, false, searchFilters);
  }, [searchFilters]);

  const fetchData = async (pageNumber: number, append: boolean, _filtersOverride?: typeof searchFilters) => {
    setLoading(true);
    // Simulating dummy API response
    setTimeout(() => {
      const dummyData: TrackerItem[] = [
        { id: 1, transaction: 'Grocery Shopping', category: 'Expense', amount: 1500, status: 'Completed', date: '2026-04-01', addedBy: 'jeff' },
        { id: 2, transaction: 'Salary Deposit', category: 'Income', amount: 50000, status: 'Completed', date: '2026-04-02', addedBy: 'jeff' },
        { id: 3, transaction: 'Electricity Bill', category: 'Expense', amount: 2500, status: 'Pending', date: '2026-04-05', addedBy: 'jeff' }
      ];
      
      setItems(dummyData);
      setTotalElements(dummyData.length);
      setTotalPages(1);
      setIsLastPage(true);
      setPage(pageNumber);
      setLoading(false);
    }, 800);
  };

  const handleCardClick = async (id?: number) => {
    if (!id) return;
    
    setIsEditing(false);
    setIsModalOpen(true);
    setIsFetchingDetails(true);
    
    // Simulate Detail API
    setTimeout(() => {
      const found = items.find(i => i.id === id);
      setSelectedItem(found || null);
      setIsFetchingDetails(false);
    }, 500);
  };

  const handleCreate = async () => {
    if (!isFormValid) return;
    setIsCreating(true);
    
    // Simulate Create API
    setTimeout(() => {
      setIsCreating(false);
      setIsCreateModalOpen(false);
      setResultDialog({ status: 'success', message: 'Tracker record created successfully (Dummy).' });
      fetchData(0, false);
    }, 1000);
  };

  const promptUpdate = () => {
    setConfirmDialog({ type: 'update', message: 'Are you sure you want to save these updated changes to this Tracker record?' });
  };

  const executeUpdate = async () => {
    setConfirmDialog(null);
    // Simulate Update API
    setResultDialog({ status: 'success', message: 'Tracker record updated successfully (Dummy).' });
  };

  const promptDelete = () => {
    setConfirmDialog({ type: 'delete', message: 'Are you sure you want to permanently delete this Tracker record? This action cannot be undone.' });
  };

  const executeDelete = async () => {
    setConfirmDialog(null);
    // Simulate Delete API
    setResultDialog({ status: 'success', message: 'Tracker record deleted successfully (Dummy).' });
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';
  const getColor = (category?: string) => category === 'Income' ? '#2ecc71' : '#e74c3c';

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
            <p className="allocations-subtitle">{totalElements} RECORDS</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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

      <main className="allocations-main">
        {items.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
            {items.map((it, i) => (
              <div 
                key={it.id || i} 
                className="allocation-card clickable-card"
                onClick={() => handleCardClick(it.id)}
              >
                <div className="alloc-avatar" style={{ backgroundColor: getColor(it.category) }}>
                  {getInitial(it.transaction)}
                </div>
                <div className="alloc-info">
                  <h3 className="alloc-name">{it.transaction || 'Unnamed'}</h3>
                  <p className="alloc-meta">
                    {it.category || 'Unknown'} &bull; ₱{(it.amount || 0).toLocaleString()} &bull; 
                    <span style={{ marginLeft: '4px', fontWeight: '500' }}>{it.status}</span>
                  </p>
                </div>
                <div className="alloc-date">
                  {it.date}
                </div>
              </div>
            ))}
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
                <label>Transaction Name</label>
                <input type="text" placeholder="e.g. Lunch out" value={newItem.transaction} onChange={e => setNewItem({...newItem, transaction: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Category</label>
                <select className="dropdown-select" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
              <div className="input-group">
                <label>Amount</label>
                <input type="number" value={newItem.amount} onChange={e => setNewItem({...newItem, amount: e.target.value})} />
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
                <div className="alloc-detail-header">
                  <div className="alloc-avatar large" style={{ backgroundColor: getColor(selectedItem.category) }}>{getInitial(selectedItem.transaction)}</div>
                  <h2>{selectedItem.transaction}</h2>
                  <span style={{ color: getColor(selectedItem.category), fontWeight: '600' }}>{selectedItem.category}</span>
                </div>
                <div className="detail-grid">
                  <div className="detail-group"><label>Amount</label><p>₱{(selectedItem.amount || 0).toLocaleString()}</p></div>
                  <div className="detail-group"><label>Date</label><p>{selectedItem.date}</p></div>
                  <div className="detail-group"><label>Status</label><p>{selectedItem.status}</p></div>
                  <div className="detail-group"><label>Added By</label><p>@{selectedItem.addedBy}</p></div>
                </div>
                <button className="secondary-btn margin-top-lg" onClick={() => setIsEditing(true)}>Edit Record</button>
              </div>
            )}
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
