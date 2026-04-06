import avatarUrl from './assets/avatar.png';
import deskIllustrationUrl from './assets/desk_illustration.png';
import './App.css';

// Custom Minimal SVG Icons
const PieChartIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
    <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
  </svg>
);

const LineChartIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18"></path>
    <path d="m19 9-5 5-4-4-3 3"></path>
    <path d="M15 9h4v4"></path>
    <circle cx="16" cy="5" r="1.5" fill="currentColor"></circle>
    <circle cx="21" cy="5" r="1" fill="currentColor"></circle>
  </svg>
);

const CartPlusIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    <path d="M10 11h4"></path>
    <path d="M12 9v4"></path>
  </svg>
);

const BillIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2"></rect>
    <circle cx="12" cy="12" r="2"></circle>
    <path d="M6 12h.01M18 12h.01"></path>
  </svg>
);

const CreditCardIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
);

const StarIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const InfoIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill="none"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const transactions = [
  { name: 'Allocation', icon: <PieChartIcon /> },
  { name: 'Investments', icon: <LineChartIcon /> },
  { name: 'Want Lists', icon: <CartPlusIcon /> },
  { name: 'Tracker', icon: <BillIcon /> },
  { name: 'CC Expense', icon: <CreditCardIcon /> },
  { name: 'CC Details', icon: <CreditCardIcon /> },
  { name: 'Net Worth', icon: <StarIcon /> },
  { name: 'About', icon: <InfoIcon /> },
];

function App() {
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
                <h2 className="user-name">Jeff Jojer Jones E. Catulay</h2>
                <p className="instruction-text">Please select your transaction</p>
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
    </div>
  );
}

export default App;
