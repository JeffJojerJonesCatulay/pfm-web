import { useState } from 'react';
import deskIllustrationUrl from './assets/desk_illustration.png';
import { API_URLS } from './url';
import './css/App.css';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const isValidInput = (val: string) => {
    const invalidChars = ['--', '/', '\\', ';', '%', '$', '*', '!', '`', '~'];
    return !invalidChars.some(char => val.includes(char));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URLS.AUTH.AUTHENTICATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword
        })
      });
      
      if (response.ok) {
        const text = await response.text();
        let token = '';
        try {
          const parsed = JSON.parse(text);
          token = parsed.data?.token || parsed.token || parsed.accessToken || parsed.jwt || text;
        } catch (e) {
          token = text;
        }
        
        localStorage.setItem('pfm_username', loginUsername);
        localStorage.setItem('pfm_password', loginPassword);
        localStorage.setItem('pfm_token', token);
        localStorage.setItem('pfm_token_time', Date.now().toString());
        onLogin();
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Error connecting to the server.');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URLS.AUTH.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: signupUsername,
          password: signupPassword
        })
      });
      
      if (response.status === 200) {
        setIsSignupModalOpen(false);
        setSignupUsername('');
        setSignupPassword('');
        setShowSuccessPopup(true);
      } else {
        alert('Failed to create account. Please try again.');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Error connecting to the server.');
    }
  };

  return (
    <div className="app-container">
      <section className="header-section">
        <div className="header-pattern"></div>
        <div className="header-pattern-mask"></div>
        
        <div className="header-inner">
          <div className="header-content login-header">
            <h1 className="greeting-title">
              Personal Finance Manager
            </h1>
            <p className="instruction-text">Please log in to continue</p>
          </div>

          <div className="illustration-container login-illustration">
            <img 
              src={deskIllustrationUrl} 
              alt="Desk illustration" 
              className="desk-illustration"
            />
          </div>
        </div>
      </section>

      <main className="main-content login-main">
        <div className="main-inner flex-center">
          <div className="login-card">
            <form className="login-form" onSubmit={handleLogin}>
              <h2 className="form-title">Welcome Back</h2>
              <div className="input-group">
                <label>Username</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Enter username" 
                  value={loginUsername}
                  onChange={(e) => isValidInput(e.target.value) && setLoginUsername(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="Enter password" 
                  value={loginPassword}
                  onChange={(e) => isValidInput(e.target.value) && setLoginPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="primary-btn">Login</button>
              
              <div className="divider"></div>
              <p className="signup-prompt">Don't have an account?</p>
              <button type="button" className="secondary-btn" onClick={() => setIsSignupModalOpen(true)}>Sign Up</button>
            </form>
          </div>
        </div>
      </main>

      {isSignupModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setIsSignupModalOpen(false)}>×</button>
            <h2 className="form-title">Sign Up</h2>
            <form onSubmit={handleSignup}>
              <div className="input-group">
                <label>Username</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Choose a username" 
                  value={signupUsername}
                  onChange={(e) => isValidInput(e.target.value) && setSignupUsername(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="Choose a password" 
                  value={signupPassword}
                  onChange={(e) => isValidInput(e.target.value) && setSignupPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="primary-btn margin-top-lg">Create</button>
            </form>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="modal-overlay">
          <div className="modal-content success-popup">
            <div className="icon-wrapper success-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            </div>
            <h2 className="form-title">Success!</h2>
            <p className="instruction-text text-center">User successfully created.</p>
            <button className="primary-btn margin-top-lg" onClick={() => setShowSuccessPopup(false)}>Continue to Login</button>
          </div>
        </div>
      )}
    </div>
  );
}
