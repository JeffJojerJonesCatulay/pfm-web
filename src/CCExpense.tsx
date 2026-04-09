import { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as ChartTooltip,
  Legend
} from 'recharts';
import { API_URLS } from './url';
import { ensureFreshToken, containsProhibitedChars } from './utils/securityUtils';
import './css/App.css';

interface CCExpenseItem {
  ccExpId?: number;
  ccRecId: number;
  date: string;
  expenseDescription: string;
  expenseValue: number;
  addedBy: string;
  dateAdded?: string;
  updateDate?: string;
  updatedBy?: string;
  remarks?: string;
}

interface BillingCycleItem {
  ccRecId: number;
  ccId: number;
  dateFrom: string;
  dateTo: string;
  status: string;
}

interface CCDetail {
  ccId: number;
  ccName: string;
  ccAcronym: string;
  ccLastDigit?: string;
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

interface CCExpenseProps {
  onBack: () => void;
  onNavigateToBillingCycle: () => void;
}

const WalletIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
  </svg>
);

export default function CCExpense({ onBack, onNavigateToBillingCycle }: CCExpenseProps) {
  const [items, setItems] = useState<CCExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form States
  const [allActiveCycles, setAllActiveCycles] = useState<BillingCycleItem[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [newExpense, setNewExpense] = useState({
    ccRecId: 0,
    date: new Date().toISOString().split('T')[0],
    expenseDescription: '',
    expenseValue: 0,
    remarks: ''
  });

  const [ccDetailsMap, setCcDetailsMap] = useState<Record<number, CCDetail>>({});
  const [cycleMap, setCycleMap] = useState<Record<number, string>>({});
  const [resultDialog, setResultDialog] = useState<{status: 'success' | 'failed', message: string} | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<CCExpenseItem | null>(null);
  const [editExpense, setEditExpense] = useState<CCExpenseItem | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{type: 'update' | 'delete', message: string} | null>(null);

  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLastPage, setIsLastPage] = useState(true);

  const [searchFilters, setSearchFilters] = useState({ expenseDescription: '' });
  const [tempFilters, setTempFilters] = useState({ expenseDescription: '' });

  const [cycleSummary, setCycleSummary] = useState({ total: 0, payment: 0, remaining: 0 });

  const fetchData = async (pageNumber = 0, ccRecId = selectedCycleId, filters = searchFilters) => {
    if (!ccRecId) return;
    setLoading(true);
    if (pageNumber === 0) {
      setItems([]); 
      fetchSummaryData(ccRecId);
    }
    const token = await ensureFreshToken();
    if (!token) {
      setResultDialog({ status: 'failed', message: 'Your session has expired. Please login again to continue.' });
      setLoading(false);
      return;
    }

    try {
      let url = `${API_URLS.CC_EXPENSE.BASE(ccRecId)}?page=${pageNumber}&size=20&sortBy=ccExpId`;
      if (filters.expenseDescription) {
        url += `&expenseDescription=${filters.expenseDescription.replace(/ /g, '+')}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const payload = json.data || json;
        const content = payload.content || [];
        setItems(content);
        setTotalElements(payload.totalElements || 0);
        setTotalPages(payload.totalPages || 1);
        setIsLastPage(payload.last !== undefined ? payload.last : true);
        setPage(pageNumber);
      }
    } catch (e) {
      console.error('Error fetching expenses:', e);
      setResultDialog({ status: 'failed', message: 'Something went wrong while fetching expenses. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryData = async (ccRecId: number) => {
    setCycleSummary({ total: 0, payment: 0, remaining: 0 });
    const token = await ensureFreshToken();
    if (!token) return;
    try {
      // Fetch a larger set to ensure full cycle summary or use a dedicated summary endpoint if available
      // Here we use 500 as a reasonable ceiling for a single billing cycle's transactions
      const res = await fetch(`${API_URLS.CC_EXPENSE.BASE(ccRecId)}?page=0&size=500&sortBy=ccExpId`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const content = (json.data?.content || json.content || []) as CCExpenseItem[];
        
        let total = 0;
        let payment = 0;
        
        content.forEach(item => {
          const val = Number(item.expenseValue || 0);
          const desc = (item.expenseDescription || '').trim();
          
          if (desc === 'Payment') {
            payment += val;
          } else {
            total += val;
          }
        });

        setCycleSummary({
          total,
          payment,
          remaining: total - payment
        });
      }
    } catch (e) {
      console.error('Error fetching summary:', e);
      setResultDialog({ status: 'failed', message: 'Something went wrong while calculating the cycle summary.' });
    }
  };

  const promptUpdate = () => {
    setConfirmDialog({ type: 'update', message: 'Are you sure you want to update this record?' });
  };

  const promptDelete = () => {
    setConfirmDialog({ type: 'delete', message: 'This record will be permanently deleted. Continue?' });
  };

  const executeDelete = async () => {
    setConfirmDialog(null);
    if (!selectedExpense?.ccExpId) return;
    const token = await ensureFreshToken();
    if (!token) return;
    try {
      const res = await fetch(API_URLS.CC_EXPENSE.DELETE(selectedExpense.ccExpId), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Record deleted.' });
        setIsDetailModalOpen(false);
        fetchSummaryData(selectedCycleId!);
        fetchData(page);
      } else { setResultDialog({ status: 'failed', message: 'Failed to delete.' }); }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Network error.' }); }
  };

  const executeUpdate = async () => {
    setConfirmDialog(null);
    if (!editExpense?.ccExpId) return;
    const token = await ensureFreshToken();
    if (!token) return;

    if (!editExpense || !editExpense.expenseDescription || !editExpense.expenseValue || !editExpense.date) {
      setResultDialog({ status: 'failed', message: 'Description, Amount, and Date are mandatory.' });
      return;
    }

    if (containsProhibitedChars(editExpense.expenseDescription || '') || containsProhibitedChars(editExpense.remarks || '')) {
      setResultDialog({ status: 'failed', message: 'Input contains prohibited characters. Please remove them before updating.' });
      return;
    }

    try {
      const username = localStorage.getItem('pfm_username') || 'jeff';
      const { addedBy, ...cleanPayload } = editExpense;
      const payload = { 
        ...cleanPayload, 
        updatedBy: username 
      };

      const res = await fetch(API_URLS.CC_EXPENSE.UPDATE(editExpense.ccExpId), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Record updated!' });
        setIsEditing(false);
        fetchSummaryData(selectedCycleId!);
        fetchExpenseDetail(editExpense.ccExpId);
        fetchData(page);
      } else { setResultDialog({ status: 'failed', message: 'Update failed.' }); }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Network error.' }); }
  };

  const fetchCcOptions = async () => {
    const token = await ensureFreshToken();
    if (!token) return {};
    try {
      const res = await fetch(`${API_URLS.CC_DETAILS.BASE}?page=0&size=100&sortBy=ccId`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.data?.content || json.content || [];
        const map: Record<number, CCDetail> = {};
        content.forEach((c: CCDetail) => { map[c.ccId] = c; });
        setCcDetailsMap(map);
        return map;
      }
    } catch (e) { console.error('Error fetching cc options:', e); }
    return {};
  };

  const fetchGlobalActiveCycles = async (namesMap: Record<number, CCDetail>) => {
    const token = await ensureFreshToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URLS.CC_RECORD_TRACKER.BASE}?page=0&size=100&sortBy=ccRecId`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const content = json.data?.content || json.content || [];
        const activeOnly = content.filter((cy: BillingCycleItem) => cy.status === 'Active');
        setAllActiveCycles(activeOnly);
        
        const newCycleMap: Record<number, string> = {};
        activeOnly.forEach((cy: BillingCycleItem) => {
          const card = namesMap && namesMap[cy.ccId] ? namesMap[cy.ccId] : null;
          const cardName = card ? card.ccName : 'Card';
          newCycleMap[cy.ccRecId] = `${cardName} | ${cy.dateFrom} - ${cy.dateTo}`;
        });
        setCycleMap(newCycleMap);
      }
    } catch (e) { console.error('Error fetching global cycles:', e); }
  };

  useEffect(() => {
    const init = async () => {
      const names = await fetchCcOptions();
      await fetchGlobalActiveCycles(names);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      fetchData(0, selectedCycleId, searchFilters);
    }
  }, [selectedCycleId, searchFilters]);

  const handleCreate = async () => {
    if (!newExpense.ccRecId || !newExpense.expenseDescription || !newExpense.expenseValue || !newExpense.date) {
      setResultDialog({ status: 'failed', message: 'Please fill in all mandatory fields: Cycle, Description, Amount, and Date.' });
      return;
    }

    if (containsProhibitedChars(newExpense.expenseDescription) || containsProhibitedChars(newExpense.remarks || '')) {
      setResultDialog({ status: 'failed', message: 'Input contains prohibited characters. Please remove them before saving.' });
      return;
    }
    setIsCreating(true);
    const token = await ensureFreshToken();
    if (!token) { setIsCreating(false); return; }
    try {
      const username = localStorage.getItem('pfm_username') || 'jeff';
      const res = await fetch(API_URLS.CC_EXPENSE.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...newExpense, addedBy: username })
      });
      if (res.ok) {
        setResultDialog({ status: 'success', message: 'Expense recorded successfully!' });
        setIsCreateModalOpen(false);
        setNewExpense({
          ccRecId: selectedCycleId || 0,
          date: new Date().toISOString().split('T')[0],
          expenseDescription: '',
          expenseValue: 0,
          remarks: ''
        });
        fetchData(0, selectedCycleId);
      } else { setResultDialog({ status: 'failed', message: 'Failed to record expense.' }); }
    } catch (e) { setResultDialog({ status: 'failed', message: 'Network error occurred.' }); }
    finally { setIsCreating(false); }
  };

  const getInitial = (name?: string) => name ? name.charAt(0).toUpperCase() : '?';

  const fetchExpenseDetail = async (id: number) => {
    const token = await ensureFreshToken();
    if (!token) return;
    setFetchingDetail(true);
    setIsDetailModalOpen(true);
    try {
      const res = await fetch(API_URLS.CC_EXPENSE.GET_BY_ID(id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const normalized = Array.isArray(data) ? data[0] : data;
        setSelectedExpense(normalized);
        setEditExpense(normalized);
      }
    } catch (e) {
      console.error('Error fetching detail:', e);
    } finally {
      setFetchingDetail(false);
    }
  };

  const chartColors = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#84cc16', '#3b82f6', '#f97316'
  ];

  const pieData = useMemo(() => {
    // Group by description and summarize values
    const grouped: Record<string, { value: number, id?: number }> = {};
    items.forEach(it => {
      const desc = it.expenseDescription || 'Other';
      if (desc === 'Payment') return; // EXCLUDE PAYMENT
      if (!grouped[desc]) grouped[desc] = { value: 0, id: it.ccExpId };
      grouped[desc].value += (it.expenseValue || 0);
    });
    
    return Object.entries(grouped)
      .map(([name, data]) => ({
        name,
        value: data.value,
        id: data.id
      }))
      .filter(it => it.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [items]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip shadow-soft" style={{ background: 'rgba(255, 255, 255, 0.98)', border: 'none', padding: '12px', borderRadius: '12px' }}>
          <p className="tooltip-label" style={{ margin: 0, fontWeight: 800, color: '#111827' }}>{data.name}</p>
          <p className="tooltip-value" style={{ margin: '4px 0 0', color: '#6366f1', fontWeight: 700, fontSize: '15px' }}>
            ₱{data.value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

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
            <h1 className="allocations-title">CC Expense</h1>
            <div className="status-pill-container">
              <p className="allocations-subtitle status-pill">
                {selectedCycleId ? `${cycleMap[selectedCycleId] || 'Cycle'} (${totalElements} Records)` : 'No Cycle Selected'}
              </p>
            </div>
          </div>
          
          <div className="header-right" style={{ gap: '10px' }}>
            {selectedCycleId && (
              <>
                <button 
                  className="premium-action-pill" 
                  onClick={() => setIsInitialModalOpen(true)}
                  title="Switch Period"
                >
                  <div className="pill-icon"><WalletIcon /></div>
                  <span className="hide-mobile">Period</span>
                </button>
                <button 
                  className="premium-action-pill" 
                  onClick={onNavigateToBillingCycle}
                  title="Billing Cycles"
                >
                  <div className="pill-icon"><WalletIcon /></div>
                  <span className="hide-mobile">Cycles</span>
                </button>
              </>
            )}
            <button className="icon-btn search-trigger" onClick={() => setIsSearchModalOpen(true)} aria-label="Search">
              <SearchIcon />
            </button>
          </div>
        </div>
      </section>

      <main className="allocations-main">
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
        {!selectedCycleId ? (
          <div className="empty-state-container" style={{ marginTop: '40px' }}>
            <div className="empty-state-icon-box" onClick={() => setIsInitialModalOpen(true)} style={{ cursor: 'pointer' }}>
               <div style={{ fontSize: '64px' }}>📅</div>
            </div>
            <h3 className="empty-state-title">Select Billing Cycle</h3>
            <p className="empty-state-text">Please select a billing cycle to view recorded expenses.</p>
            <button className="primary-btn margin-top-md" onClick={() => setIsInitialModalOpen(true)}>Choose Cycle</button>
          </div>
        ) : (
          <>
            {selectedCycleId && pieData.length > 0 && (
              <div className="chart-container slide-in-top" style={{ marginTop: '0', marginBottom: '24px', height: 'auto', background: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #f3f4f6' }}>
                <div className="chart-header" style={{ marginBottom: '20px', padding: 0 }}>
                  <span className="chart-title" style={{ fontSize: '15px' }}>Spending Distribution</span>
                  <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{pieData.length} CATEGORIES</span>
                </div>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1500}
                        onClick={(state: any) => state && state.payload && state.payload.id && fetchExpenseDetail(state.payload.id)}
                        style={{ cursor: 'pointer', outline: 'none' }}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<CustomPieTooltip />} />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 600 }}
                        formatter={(value) => <span style={{ color: '#4b5563' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {/* Billing Cycle Summary Card */}
            <div className="summary-card-container">
              <div className="summary-card">
                <div className="summary-item">
                  <span className="summary-label">Total Expense</span>
                  <div className="summary-value" style={{ color: '#6366f1' }}>
                    <span style={{ fontSize: '14px' }}>₱</span>
                    {cycleSummary.total.toLocaleString()}
                  </div>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Payment</span>
                  <div className="summary-value" style={{ color: '#10b981' }}>
                    <span style={{ fontSize: '14px' }}>₱</span>
                    {cycleSummary.payment.toLocaleString()}
                  </div>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label" style={{ color: '#f59e0b' }}>Remaining</span>
                  <div className="summary-value" style={{ color: '#f59e0b' }}>
                    <span style={{ fontSize: '14px' }}>₱</span>
                    {cycleSummary.remaining.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Indicators */}
            {Object.values(searchFilters).some(v => v !== '') && (
              <div style={{ display: 'flex', gap: '8px', maxWidth: '600px', margin: '0 auto 16px', flexWrap: 'wrap', padding: '0 16px' }}>
                {Object.entries(searchFilters).map(([k, v]) => v && (
                  <div key={k} style={{ background: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontWeight: 600, color: '#6b7280', fontSize: '11px', textTransform: 'uppercase' }}>{k === 'expenseDescription' ? 'Merchant' : k}:</span>
                    <span style={{ color: '#111827', fontWeight: 500 }}>{v as string}</span>
                    <button 
                      onClick={() => {
                        setSearchFilters({ ...searchFilters, [k]: '' });
                        setTempFilters({ ...tempFilters, [k]: '' });
                      }} 
                      style={{ border: 'none', background: '#f3f4f6', cursor: 'pointer', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#6b7280', transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#e5e7eb'}
                      onMouseOut={e => e.currentTarget.style.background = '#f3f4f6'}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {loading && items.length === 0 ? (
              <p style={{ textAlign: 'center', margin: '40px', color: '#6b7280' }}>Fetching expenses...</p>
            ) : items.length > 0 ? (
              <div className="allocations-list" style={{ paddingBottom: '20px' }}>
              {items.map((it, i) => (
                <div key={it.ccExpId || i} className="allocation-card clickable-card" onClick={() => it.ccExpId && fetchExpenseDetail(it.ccExpId)}>
                  <div className="alloc-avatar" style={{ backgroundColor: '#10b981' }}>
                    {getInitial(it.expenseDescription)}
                  </div>
                  <div className="alloc-info">
                    <h3 className="alloc-name">{it.expenseDescription}</h3>
                    <p className="alloc-meta">
                      {cycleMap[it.ccRecId] || `Cycle #${it.ccRecId}`}
                    </p>
                  </div>
                  <div className="card-value-display">
                    <div className="card-amount-wrapper">
                      <span className="currency-symbol">₱</span>
                      <span className="value-amount" style={{ color: it.expenseDescription === 'Payment' ? '#10b981' : 'inherit' }}>
                        {it.expenseValue?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
    
              <div className="pagination-container">
                <button className="pagination-btn" onClick={() => fetchData(page - 1)} disabled={page === 0 || loading}>Prev</button>
                <div className="pagination-numbers">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const showPage = totalPages <= 5 || (idx === 0 || idx === totalPages - 1 || Math.abs(page - idx) <= 1);
                    if (!showPage && idx === 1) return <span key={idx}>...</span>;
                    if (!showPage && idx === totalPages - 2) return <span key={idx}>...</span>;
                    if (!showPage) return null;
                    return (
                      <button key={idx} className={`pagination-number ${page === idx ? 'active' : ''}`} onClick={() => fetchData(idx)} disabled={loading}>{idx + 1}</button>
                    );
                  })}
                </div>
                <button className="pagination-btn" onClick={() => fetchData(page + 1)} disabled={isLastPage || loading}>Next</button>
              </div>
              </div>
            ) : (
              <div className="empty-state-container">
                <div className="empty-state-icon-box">
                  <div style={{ fontSize: '64px', opacity: 0.2 }}>💳</div>
                </div>
                <h3 className="empty-state-title">No Expenses Found</h3>
                <p className="empty-state-text">
                  {Object.values(searchFilters).some(v => v !== '') ? 'No records match your search criteria.' : "You haven't added any credit card expenses yet."}
                </p>
              </div>
            )}
          </>
        )}
        </div>
      </main>

      <button className="fab-btn" onClick={() => { 
        if (!selectedCycleId) {
          setIsInitialModalOpen(true);
        } else {
          setNewExpense(prev => ({ ...prev, ccRecId: selectedCycleId }));
          setIsCreateModalOpen(true); 
        }
      }}>
        <PlusIcon />
      </button>

      {/* Initial Cycle Selection Modal */}
      {isInitialModalOpen && (
        <div className="modal-overlay" onClick={() => selectedCycleId && setIsInitialModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h2 className="form-title" style={{ textAlign: 'center' }}>{selectedCycleId ? 'Switch Billing Period' : 'Select Billing Period'}</h2>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '24px' }}>
              {selectedCycleId ? 'Select a different period to view its records.' : 'Choose a cycle to view and record expenses.'}
            </p>
            <div className="login-form">
              <div className="input-group">
                <label>Active Billing Cycles</label>
                <select 
                  className="dropdown-select" 
                  value={selectedCycleId || ''} 
                  onChange={e => {
                    const id = Number(e.target.value);
                    if (id) {
                      setSelectedCycleId(id);
                      setIsInitialModalOpen(false);
                    }
                  }}
                >
                  <option value="">{selectedCycleId ? 'Keep current selection...' : 'Choose a period...'}</option>
                  {allActiveCycles.map(cy => (
                    <option key={cy.ccRecId} value={cy.ccRecId}>
                      {ccDetailsMap[cy.ccId]?.ccName || 'Card'} | {cy.dateFrom} - {cy.dateTo}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCycleId ? (
                <button 
                  className="secondary-btn margin-top-md" 
                  style={{ width: '100%' }} 
                  onClick={() => setIsInitialModalOpen(false)}
                >
                  Close
                </button>
              ) : (
                <button 
                  className="secondary-btn margin-top-md" 
                  style={{ width: '100%', borderColor: '#6b7280', color: '#6b7280' }} 
                  onClick={onBack}
                >
                  Back to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !isCreating && setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 className="form-title">Record CC Expense</h2>
            <div className="login-form">
              
              <div className="input-group">
                <label>Billing Cycle</label>
                <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '14px', fontWeight: 600 }}>
                  {cycleMap[newExpense.ccRecId] || 'Cycle Selector'}
                </div>
              </div>

              <div className="input-group">
                <label>Date</label>
                <input 
                  type="date" 
                  value={newExpense.date} 
                  onChange={e => setNewExpense({...newExpense, date: e.target.value})} 
                />
              </div>

              <div className="input-group">
                <label>Merchant / Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Amazon Purchase" 
                    value={newExpense.expenseDescription}
                    onChange={e => setNewExpense({...newExpense, expenseDescription: e.target.value})}
                    list="merchant-suggestions"
                  />
              </div>

              <div className="input-group">
                <label>Amount (₱)</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={newExpense.expenseValue}
                  onChange={e => setNewExpense({...newExpense, expenseValue: Number(e.target.value)})}
                />
              </div>
              <div className="input-group">
                <label>Remarks</label>
                <textarea 
                  placeholder="Additional notes..." 
                  value={newExpense.remarks} 
                  onChange={e => setNewExpense({...newExpense, remarks: e.target.value})}
                  style={{ minHeight: '80px', borderRadius: '12px', padding: '12px' }}
                />
              </div>

              <button 
                type="button" 
                className="primary-btn margin-top-lg" 
                onClick={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? 'Recording...' : 'Record Expense'}
              </button>
              <button 
                type="button" 
                className="secondary-btn margin-top-sm" 
                style={{ width: '100%', borderColor: 'transparent' }} 
                onClick={() => setIsCreateModalOpen(false)}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Datalist */}
      <datalist id="merchant-suggestions">
        {Array.from(new Set(items.map(it => it.expenseDescription))).map((desc, i) => (
          <option key={i} value={desc} />
        ))}
      </datalist>

      {/* Result Dialog */}
      {resultDialog && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div className="success-icon" style={{ backgroundColor: resultDialog.status === 'success' ? '#2ecc71' : '#ef4444', margin: '0 auto 20px' }}>
              {resultDialog.status === 'success' ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              )}
            </div>
            <h2 className="form-title" style={{ marginBottom: '8px' }}>{resultDialog.status === 'success' ? 'Recorded!' : 'Error!'}</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>{resultDialog.message}</p>
            <button className="primary-btn" style={{ width: '100%' }} onClick={() => setResultDialog(null)}>Okay</button>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {isSearchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsSearchModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 className="form-title">Search Merchant</h2>
            <div className="login-form">
              <div className="input-group">
                <label>Merchant / Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Amazon" 
                  value={tempFilters.expenseDescription}
                  onChange={e => setTempFilters({ expenseDescription: e.target.value })}
                  list="merchant-suggestions"
                />
              </div>
              <button 
                className="primary-btn margin-top-lg" 
                onClick={() => {
                  setSearchFilters({ ...tempFilters });
                  setIsSearchModalOpen(false);
                }}
              >
                Apply Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && (
        <div className="modal-overlay" onClick={() => !isEditing && setIsDetailModalOpen(false)}>
          <div className="modal-content alloc-detail-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            {fetchingDetail ? (
              <p style={{ textAlign: 'center', padding: '40px' }}>Loading detail...</p>
            ) : selectedExpense ? (
              <div className="alloc-detail-content">
                {isEditing ? (
                  <div className="login-form">
                    <h2 className="form-title">Edit Expense</h2>
                    
                    <div className="input-group">
                      <label>Merchant / Description</label>
                      <input 
                        type="text" 
                        value={editExpense?.expenseDescription || ''} 
                        onChange={e => setEditExpense(prev => prev ? ({ ...prev, expenseDescription: e.target.value }) : null)}
                        list="merchant-suggestions"
                      />
                    </div>

                    <div className="input-group">
                      <label>Amount (₱)</label>
                      <input 
                        type="number" 
                        value={editExpense?.expenseValue || 0} 
                        onChange={e => setEditExpense(prev => prev ? ({ ...prev, expenseValue: Number(e.target.value) }) : null)}
                      />
                    </div>

                    <div className="input-group">
                      <label>Date</label>
                      <input 
                        type="date" 
                        value={editExpense?.date || ''} 
                        onChange={e => setEditExpense(prev => prev ? ({ ...prev, date: e.target.value }) : null)}
                      />
                    </div>

                    <div className="input-group">
                      <label>Billing Period</label>
                      <select 
                        className="dropdown-select" 
                        value={editExpense?.ccRecId || ''} 
                        onChange={e => setEditExpense(prev => prev ? ({ ...prev, ccRecId: Number(e.target.value) }) : null)}
                      >
                        {allActiveCycles.map(cy => (
                          <option key={cy.ccRecId} value={cy.ccRecId}>
                            {ccDetailsMap[cy.ccId]?.ccName || 'Card'} | {cy.dateFrom} - {cy.dateTo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Remarks</label>
                      <textarea 
                        value={editExpense?.remarks || ''} 
                        onChange={e => setEditExpense(prev => prev ? ({ ...prev, remarks: e.target.value }) : null)}
                        style={{ minHeight: '80px', borderRadius: '12px', padding: '12px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button className="primary-btn" style={{ flex: 1 }} onClick={promptUpdate}>Save</button>
                      <button className="secondary-btn" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }} onClick={promptDelete}>Delete</button>
                    </div>
                    <button className="secondary-btn margin-top-sm" style={{ width: '100%', borderColor: 'transparent' }} onClick={() => setIsEditing(false)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div className="alloc-detail-header">
                      <div className="alloc-avatar large" style={{ backgroundColor: '#10b981' }}>
                        {getInitial(selectedExpense.expenseDescription)}
                      </div>
                      <h2>{selectedExpense.expenseDescription}</h2>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>Expense Details</p>
                    </div>

                    <div className="detail-grid">
                      <div className="detail-group">
                        <label>Amount Paid</label>
                        <p style={{ color: '#10b981', fontWeight: '700', fontSize: '1.2rem' }}>
                          ₱ {selectedExpense.expenseValue?.toLocaleString()}
                        </p>
                      </div>
                      <div className="detail-group">
                        <label>Transaction Date</label>
                        <p>{selectedExpense.date}</p>
                      </div>
                      <div className="detail-group">
                        <label>Billing Period</label>
                        <p>{cycleMap[selectedExpense.ccRecId] || 'Unknown Cycle'}</p>
                      </div>
                      {selectedExpense.remarks && (
                        <div className="detail-group" style={{ gridColumn: '1 / -1' }}>
                          <label>Remarks</label>
                          <p style={{ fontStyle: 'italic', color: '#4b5563' }}>{selectedExpense.remarks}</p>
                        </div>
                      )}
                      
                      {/* Credit Card Details Info */}
                      {(allActiveCycles.find(c => c.ccRecId === selectedExpense.ccRecId)) && (
                        <div style={{ gridColumn: '1 / -1', marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                          <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>Card Details</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span>{ccDetailsMap[allActiveCycles.find(c => c.ccRecId === selectedExpense.ccRecId)!.ccId]?.ccName || 'Card Name'}</span>
                            <span style={{ color: '#6366f1', fontWeight: 600 }}>**** {ccDetailsMap[allActiveCycles.find(c => c.ccRecId === selectedExpense.ccRecId)!.ccId]?.ccLastDigit}</span>
                          </div>
                        </div>
                      )}
                      <div className="detail-group">
                        <label>Date Added</label>
                        <p>{selectedExpense.dateAdded ? selectedExpense.dateAdded.split(' ')[0] : '—'}</p>
                      </div>
                      <div className="detail-group">
                        <label>Last Updated</label>
                        <p>{selectedExpense.updateDate || '—'}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button className="primary-btn" style={{ flex: 1 }} onClick={() => { setEditExpense(selectedExpense); setIsEditing(true); }}>Edit Record</button>
                      <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setIsDetailModalOpen(false)}>Close</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p style={{ textAlign: 'center', padding: '40px' }}>Detail not found.</p>
            )}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h2 className="form-title">Confirm Action</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="primary-btn" 
                style={{ flex: 1, backgroundColor: confirmDialog.type === 'delete' ? '#ef4444' : '#10b981' }} 
                onClick={() => confirmDialog.type === 'update' ? executeUpdate() : executeDelete()}
              >
                Proceed
              </button>
              <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setConfirmDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
