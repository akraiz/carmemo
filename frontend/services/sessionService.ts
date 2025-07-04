// Simple session management for user differentiation
// This generates a unique session ID for each user without requiring registration

const SESSION_ID_KEY = 'carMemoSessionId';

export class SessionService {
  /**
   * Get or create a unique session ID for the current user
   */
  static getSessionId(): string {
    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    
    if (!sessionId) {
      // Generate a new session ID if none exists
      sessionId = this.generateSessionId();
      localStorage.setItem(SESSION_ID_KEY, sessionId);
      console.log('[SESSION] Created new session ID:', sessionId);
    }
    
    return sessionId;
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    // Use crypto.randomUUID if available, otherwise fallback to timestamp + random
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback: timestamp + random string
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }

  /**
   * Clear the current session (useful for testing or resetting)
   */
  static clearSession(): void {
    localStorage.removeItem(SESSION_ID_KEY);
    console.log('[SESSION] Session cleared');
  }

  /**
   * Get session-specific storage key
   */
  static getSessionKey(baseKey: string): string {
    const sessionId = this.getSessionId();
    return `${baseKey}_${sessionId}`;
  }

  /**
   * Check if session exists
   */
  static hasSession(): boolean {
    return localStorage.getItem(SESSION_ID_KEY) !== null;
  }
} 