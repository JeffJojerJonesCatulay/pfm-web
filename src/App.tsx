import { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Login from './Login';
import Allocations from './Allocations';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'allocations'>('dashboard');

  useEffect(() => {
    const storedUsername = localStorage.getItem('pfm_username');
    if (storedUsername) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <>
      {isLoggedIn ? (
        currentView === 'allocations' ? (
          <Allocations onBack={() => setCurrentView('dashboard')} />
        ) : (
          <Dashboard 
            onLogout={() => setIsLoggedIn(false)} 
            onNavigateToAllocations={() => setCurrentView('allocations')}
          />
        )
      ) : (
        <Login onLogin={() => setIsLoggedIn(true)} />
      )}
    </>
  );
}

export default App;
