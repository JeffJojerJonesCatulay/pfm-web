import { useState, useEffect } from 'react';
import './css/App.css';

interface CCExpenseItem {
  id?: number;
  ccName?: string;
  amount?: number;
  date?: string;
  merchant?: string;
  status?: string;
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

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

interface CCExpenseProps {
  onBack: () => void;
  onNavigateToBillingCycle: () => void;
}

export default function CCExpense({ onBack, onNavigateToBillingCycle }: CCExpenseProps) {
  const [items, setItems] = useState<CCExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Dummy data
    setItems([
      { id: 1, ccName: 'Visa Gold', merchant: 'Amazon', amount: 120.50, date: '2026-04-10', status: 'Cleared' },
      { id: 2, ccName: 'Mastercard Platinum', merchant: 'Netflix', amount: 15.99, date: '2026-04-09', status: 'Pending' },
      { id: 3, ccName: 'BDO Elite', merchant: 'Steam', amount: 59.99, date: '2026-04-08', status: 'Cleared' },
    ]);
    
    setLoading(false);
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
            <h1 className="allocations-title">CC Expense</h1>
            <p className="allocations-subtitle">{items.length} TRANSACTIONS</p>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="premium-pill-btn" 
              onClick={onNavigateToBillingCycle}
            >
              <CalendarIcon />
              <span>Billing Cycle</span>
            </button>
            <button className="icon-btn search-trigger" onClick={() => setIsSearchModalOpen(true)}>
              <SearchIcon />
            </button>
          </div>
        </div>
      </section>

      <main className="allocations-main">
        {loading ? (
          <p style={{ textAlign: 'center', margin: '20px' }}>Loading dummy data...</p>
        ) : items.length > 0 ? (
          <div className="allocations-list" style={{ paddingBottom: '20px' }}>
          {items.map((it, i) => (
            <div key={it.id || i} className="allocation-card clickable-card">
              <div className="alloc-avatar" style={{ backgroundColor: '#10b981' }}>
                {getInitial(it.merchant)}
              </div>
              <div className="alloc-info">
                <h3 className="alloc-name">{it.merchant}</h3>
                <p className="alloc-meta">
                  {it.ccName} • {it.status}
                </p>
              </div>
              <div className="alloc-date" style={{ fontWeight: 'bold' }}>
                ${it.amount?.toFixed(2)}
                <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'normal' }}>{it.date}</div>
              </div>
            </div>
          ))}
          </div>
        ) : (
          <div className="empty-state-container">
            <div className="empty-state-icon-box">
              <div style={{ fontSize: '64px', opacity: 0.2 }}>💳</div>
            </div>
            <h3 className="empty-state-title">No Expenses Found</h3>
            <p className="empty-state-text">
              You haven't added any credit card expenses yet.
            </p>
          </div>
        )}
      </main>

      <button className="fab-btn" onClick={() => alert('Dummy Create Action')}>
        <PlusIcon />
      </button>

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="form-title">Search & Filters (Dummy)</h2>
            <div className="login-form">
              <div className="input-group">
                <label>Merchant</label>
                <input type="text" placeholder="e.g. Amazon" />
              </div>
              <button className="primary-btn margin-top-lg" onClick={() => setIsSearchModalOpen(false)}>Apply Search</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
