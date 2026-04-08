import { useState } from 'react';
import Dashboard from './Dashboard';
import Login from './Login';
import Allocations from './Allocations';
import WantList from './WantList';
import Tracker from './Tracker';
import SalaryRecord from './SalaryRecord';
import CCDetails from './CCDetails';
import ConnectedApps from './ConnectedApps';
import CCExpense from './CCExpense';
import BillingCycle from './BillingCycle';
import Investment from './Investment';
import InvestmentGrowth from './InvestmentGrowth';
import InvestmentYearlyGrowth from './InvestmentYearlyGrowth';
import './css/App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'allocations' | 'wantlist' | 'tracker' | 'salaryRecord' | 'ccdetails' | 'connectedApps' | 'ccexpense' | 'billingCycle' | 'investment' | 'investmentGrowth' | 'investmentYearlyGrowth'>('dashboard');

  return (
    <>
      {isLoggedIn ? (
        currentView === 'allocations' ? (
          <Allocations onBack={() => setCurrentView('dashboard')} />
        ) : currentView === 'wantlist' ? (
          <WantList onBack={() => setCurrentView('dashboard')} />
        ) : currentView === 'tracker' ? (
          <Tracker onBack={() => setCurrentView('dashboard')} onNavigateToSalaryRecord={() => setCurrentView('salaryRecord')} />
        ) : currentView === 'salaryRecord' ? (
          <SalaryRecord onBack={() => setCurrentView('tracker')} />
        ) : currentView === 'ccdetails' ? (
          <CCDetails onBack={() => setCurrentView('dashboard')} onNavigateToConnectedApps={() => setCurrentView('connectedApps')} />
        ) : currentView === 'connectedApps' ? (
          <ConnectedApps onBack={() => setCurrentView('ccdetails')} />
        ) : currentView === 'ccexpense' ? (
          <CCExpense onBack={() => setCurrentView('dashboard')} onNavigateToBillingCycle={() => setCurrentView('billingCycle')} />
        ) : currentView === 'billingCycle' ? (
          <BillingCycle onBack={() => setCurrentView('ccexpense')} />
        ) : currentView === 'investment' ? (
          <Investment onBack={() => setCurrentView('dashboard')} onNavigateToGrowth={() => setCurrentView('investmentGrowth')} onNavigateToYearlyGrowth={() => setCurrentView('investmentYearlyGrowth')} />
        ) : currentView === 'investmentGrowth' ? (
          <InvestmentGrowth onBack={() => setCurrentView('investment')} />
        ) : currentView === 'investmentYearlyGrowth' ? (
          <InvestmentYearlyGrowth onBack={() => setCurrentView('investment')} />
        ) : (
          <Dashboard 
            onLogout={() => setIsLoggedIn(false)} 
            onNavigateToAllocations={() => setCurrentView('allocations')}
            onNavigateToWantList={() => setCurrentView('wantlist')}
            onNavigateToTracker={() => setCurrentView('tracker')}
            onNavigateToCCDetails={() => setCurrentView('ccdetails')}
            onNavigateToCCExpense={() => setCurrentView('ccexpense')}
            onNavigateToInvestment={() => setCurrentView('investment')}
          />
        )
      ) : (
        <Login onLogin={() => setIsLoggedIn(true)} />
      )}
    </>
  );
}

export default App;
