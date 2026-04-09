import { useState, useEffect } from 'react';
import avatarUrl from './assets/avatar.png';
import deskIllustrationUrl from './assets/desk_illustration.png';
import './css/App.css';
import { PFM_VERSION, PFM_RELEASE_DATE, PFM_UPDATE_DATE } from './config';

// Custom Minimal SVG Icons
const PieChartIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
    <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
  </svg>
);

const LineChartIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"></path>
    <path d="m19 9-5 5-4-4-3 3"></path>
    <path d="M15 9h4v4"></path>
    <circle cx="16" cy="5" r="1.5" fill="currentColor"></circle>
    <circle cx="21" cy="5" r="1" fill="currentColor"></circle>
  </svg>
);

const CartPlusIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    <path d="M10 11h4"></path>
    <path d="M12 9v4"></path>
  </svg>
);

const BillIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"></rect>
    <circle cx="12" cy="12" r="2"></circle>
    <path d="M6 12h.01M18 12h.01"></path>
  </svg>
);

const CreditCardIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
);

const StarIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const InfoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill="none"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const transactions = [
  { name: 'Allocation', icon: <PieChartIcon /> },
  { name: 'Investment', icon: <LineChartIcon /> },
  { name: 'Want Lists', icon: <CartPlusIcon /> },
  { name: 'Tracker', icon: <BillIcon /> },
  { name: 'CC Expense', icon: <CreditCardIcon /> },
  { name: 'CC Details', icon: <CreditCardIcon /> },
  { name: 'Net Worth', icon: <StarIcon /> },
  { name: 'About', icon: <InfoIcon /> },
];

interface DashboardProps {
  onLogout: () => void;
  onNavigateToAllocations: () => void;
  onNavigateToWantList: () => void;
  onNavigateToTracker: () => void;
  onNavigateToCCDetails: () => void;
  onNavigateToCCExpense?: () => void;
  onNavigateToConnectedApps?: () => void;
  onNavigateToInvestment?: () => void;
  onNavigateToNetWorth?: () => void;
}

export default function Dashboard({ 
  onLogout, 
  onNavigateToAllocations, 
  onNavigateToWantList, 
  onNavigateToTracker,
  onNavigateToCCDetails, 
  onNavigateToCCExpense,
  onNavigateToConnectedApps,
  onNavigateToInvestment,
  onNavigateToNetWorth
}: DashboardProps) {
  const [username, setUsername] = useState('User');
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem('pfm_username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }).toUpperCase();
  };
  return (
    <div className="app-container">
      {/* Header section with gradient and user info */}
      <section className="header-section">
        {/* Subtle dot background */}
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        
        <div className="header-inner">
          <div className="header-content">
            <h1 className="greeting-title">
              Welcome to your Personal Finance Manager
            </h1>
            
            <div className="user-profile">
              <div className="avatar-container">
                <img 
                  src={avatarUrl} 
                  alt="User avatar" 
                  className="avatar-img"
                />
              </div>
              <div className="user-info">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                  <h2 className="user-name" style={{ margin: 0 }}>@{username}</h2>
                   <button 
                    onClick={() => {
                      localStorage.removeItem('pfm_username');
                      localStorage.removeItem('pfm_password');
                      localStorage.removeItem('pfm_token');
                      localStorage.removeItem('pfm_token_time');
                      onLogout();
                    }}
                    className="secondary-btn logout-btn-mobile"
                    style={{ padding: '10px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', background: 'rgba(255, 255, 255, 0.15)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '12px' }}
                  >
                    <LogoutIcon />
                    Logout
                  </button>
                </div>
                <p className="instruction-text" style={{ marginTop: '8px' }}>Please select your transaction</p>
              </div>
            </div>
          </div>

          {/* Desk top illustration */}
          <div className="illustration-container">
            <img 
              src={deskIllustrationUrl} 
              alt="Desk illustration" 
              className="desk-illustration"
            />
          </div>
        </div>
      </section>

      {/* Main content grid */}
      <main className="main-content">
        <div className="main-inner">
          <div className="button-grid">
            {transactions.map((t, index) => (
              <button 
                key={index} 
                className="action-card"
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={
                  t.name === 'Allocation' ? onNavigateToAllocations : 
                  t.name === 'Investment' ? onNavigateToInvestment :
                  t.name === 'Want Lists' ? onNavigateToWantList : 
                  t.name === 'Tracker' ? onNavigateToTracker :                   t.name === 'CC Details' ? onNavigateToCCDetails :
                  t.name === 'CC Expense' ? onNavigateToCCExpense :
                  t.name === 'Connected Apps' ? onNavigateToConnectedApps :
                  t.name === 'Net Worth' ? onNavigateToNetWorth :
                  t.name === 'About' ? () => setShowAbout(true) : undefined
                }
              >
                <div className="icon-wrapper">
                  {t.icon}
                </div>
                <span>{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '40px 20px' }}>
            <h2 className="form-title">About PFM</h2>
            <div style={{ margin: '24px 0' }}>
              <div className="avatar-container" style={{ margin: '0 auto 16px', width: '80px', height: '80px', border: '3px solid #6366f1' }}>
                <img src={avatarUrl} alt="Logo" className="avatar-img" />
              </div>
              <p style={{ color: '#111827', fontWeight: '700', fontSize: '18px' }}>Personal Finance Manager</p>
              <p style={{ background: '#f3f4f6', display: 'inline-block', padding: '4px 12px', borderRadius: '12px', color: '#6366f1', fontWeight: '600', marginTop: '8px' }}>
                {PFM_VERSION}
              </p>
              <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginTop: '8px', letterSpacing: '0.5px' }}>
                RELEASED: {formatDate(PFM_RELEASE_DATE)}
              </p>
              <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginTop: '4px', letterSpacing: '0.5px' }}>
                LAST UPDATED ON: {formatDate(PFM_UPDATE_DATE)}
              </p>
            </div>
            <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
              A centralized personal finance management platform designed as a multi-repository system to track salary, expenses, credit card usage, subscriptions, net worth, and financial goals in one unified ecosystem.
            </p>
            <button className="primary-btn margin-top-lg" style={{ width: '100%' }} onClick={() => setShowAbout(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// exported inline
