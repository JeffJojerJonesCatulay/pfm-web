import { useState } from 'react';
import Dashboard from './Dashboard';
import Login from './Login';
import Allocations from './Allocations';
import WantList from './WantList';
import Tracker from './Tracker';
import SalaryRecord from './SalaryRecord';
import './assets/css/App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'allocations' | 'wantlist' | 'tracker' | 'salaryRecord'>('dashboard');

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
        ) : (
          <Dashboard 
            onLogout={() => setIsLoggedIn(false)} 
            onNavigateToAllocations={() => setCurrentView('allocations')}
            onNavigateToWantList={() => setCurrentView('wantlist')}
            onNavigateToTracker={() => setCurrentView('tracker')}
          />
        )
      ) : (
        <Login onLogin={() => setIsLoggedIn(true)} />
      )}
    </>
  );
}

export default App;
