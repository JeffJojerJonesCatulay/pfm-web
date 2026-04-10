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
import InvestmentMonthlyGrowth from './InvestmentMonthlyGrowth';
import InvestmentYearlyGrowth from './InvestmentYearlyGrowth';
import NetWorth from './NetWorth';
import './css/App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'allocations' | 'wantlist' | 'tracker' | 'salaryRecord' | 'ccdetails' | 'connectedApps' | 'ccexpense' | 'billingCycle' | 'investment' | 'investmentMonthlyGrowth' | 'investmentYearlyGrowth' | 'netWorth'>('dashboard');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  return (
    <>
      {isLoggedIn ? (
        currentView === 'allocations' ? (
          <Allocations onBack={() => setCurrentView('dashboard')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'wantlist' ? (
          <WantList onBack={() => setCurrentView('dashboard')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'tracker' ? (
          <Tracker onBack={() => setCurrentView('dashboard')} onNavigateToSalaryRecord={() => setCurrentView('salaryRecord')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'salaryRecord' ? (
          <SalaryRecord onBack={() => setCurrentView('tracker')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'ccdetails' ? (
          <CCDetails onBack={() => setCurrentView('dashboard')} onNavigateToConnectedApps={() => setCurrentView('connectedApps')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'connectedApps' ? (
          <ConnectedApps onBack={() => setCurrentView('ccdetails')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'ccexpense' ? (
          <CCExpense onBack={() => setCurrentView('dashboard')} onNavigateToBillingCycle={() => setCurrentView('billingCycle')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'billingCycle' ? (
          <BillingCycle onBack={() => setCurrentView('ccexpense')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'investment' ? (
          <Investment onBack={() => setCurrentView('dashboard')} onNavigateToMonthlyGrowth={() => setCurrentView('investmentMonthlyGrowth')} onNavigateToYearlyGrowth={() => setCurrentView('investmentYearlyGrowth')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'investmentMonthlyGrowth' ? (
          <InvestmentMonthlyGrowth onBack={() => setCurrentView('investment')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'investmentYearlyGrowth' ? (
          <InvestmentYearlyGrowth onBack={() => setCurrentView('investment')} isPrivacyMode={isPrivacyMode} />
        ) : currentView === 'netWorth' ? (
          <NetWorth onBack={() => setCurrentView('dashboard')} isPrivacyMode={isPrivacyMode} />
        ) : (
          <Dashboard 
            onLogout={() => setIsLoggedIn(false)} 
            onNavigateToAllocations={() => setCurrentView('allocations')}
            onNavigateToWantList={() => setCurrentView('wantlist')}
            onNavigateToTracker={() => setCurrentView('tracker')}
            onNavigateToCCDetails={() => setCurrentView('ccdetails')}
            onNavigateToCCExpense={() => setCurrentView('ccexpense')}
            onNavigateToConnectedApps={() => setCurrentView('connectedApps')}
            onNavigateToInvestment={() => setCurrentView('investment')}
            onNavigateToNetWorth={() => setCurrentView('netWorth')}
            isPrivacyMode={isPrivacyMode}
            setIsPrivacyMode={setIsPrivacyMode}
          />
        )
      ) : (
        <Login onLogin={() => setIsLoggedIn(true)} />
      )}
    </>
  );
}

export default App;
