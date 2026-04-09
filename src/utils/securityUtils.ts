
import { API_URLS } from '../url';

/**
 * Global list of prohibited characters for the Block-and-Verify strategy.
 */
export const PROHIBITED_CHARS = /[\\/;\%\$\*\!\`\~]|--/;

/**
 * Checks if a string contains any prohibited characters.
 */
export const containsProhibitedChars = (val: string): boolean => {
  return PROHIBITED_CHARS.test(val);
};

/**
 * Sanitizes input by rejecting prohibited characters (to be used in onChange events).
 */
export const isValidInput = (val: string): boolean => {
  return !containsProhibitedChars(val);
};

/**
 * Ensures a valid JWT is available. 
 * If the token is missing or expired, it attempts a silent refresh 
 * by calling the authentication endpoint with stored credentials.
 */
export const ensureFreshToken = async (): Promise<string | null> => {
  const token = localStorage.getItem('pfm_token');
  const tokenTime = Number(localStorage.getItem('pfm_token_time') || 0);
  const username = localStorage.getItem('pfm_username');
  const password = localStorage.getItem('pfm_password');
  
  if (!token) return null;

  // Token validity duration (10 minutes)
  const isExpired = Date.now() - tokenTime > 1000 * 60 * 10; 

  if (isExpired && username && password) {
    try {
      // Attempt silent refresh
      const response = await fetch(API_URLS.AUTH.AUTHENTICATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const text = await response.text();
        let newToken = '';
        try {
          const parsed = JSON.parse(text);
          newToken = parsed.data?.token || parsed.token || parsed.accessToken || parsed.jwt || text;
        } catch {
          newToken = text;
        }
        
        localStorage.setItem('pfm_token', newToken);
        localStorage.setItem('pfm_token_time', Date.now().toString());
        return newToken;
      }
    } catch (e) {
      console.error('Silent refresh failed:', e);
    }

    // Refresh failed or no credentials
    localStorage.removeItem('pfm_token');
    localStorage.removeItem('pfm_token_time');
    return null;
  }

  return token;
};
