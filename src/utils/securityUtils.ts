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
 * If the token is missing or expired, it returns null,
 * signaling that the user needs to re-authenticate.
 */
export const ensureFreshToken = async (): Promise<string | null> => {
  const token = localStorage.getItem('pfm_token');
  const tokenTime = Number(localStorage.getItem('pfm_token_time') || 0);
  
  if (!token) return null;

  // Token validity duration (10 minutes)
  const isExpired = Date.now() - tokenTime > 1000 * 60 * 10; 

  if (isExpired) {
    // SECURITY: We no longer store the password in localStorage,
    // so we cannot perform a silent refresh. The user must re-log.
    localStorage.removeItem('pfm_token');
    localStorage.removeItem('pfm_token_time');
    return null;
  }

  return token;
};
