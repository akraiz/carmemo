import React from 'react';
import { SessionService } from '../services/sessionService';

interface SessionInfoProps {
  className?: string;
}

export const SessionInfo: React.FC<SessionInfoProps> = ({ className = '' }) => {
  const sessionId = SessionService.getSessionId();
  const shortSessionId = sessionId.substring(0, 8) + '...';

  const handleClearSession = () => {
    if (window.confirm('Are you sure you want to clear your session? This will reset your data for this session.')) {
      SessionService.clearSession();
      window.location.reload();
    }
  };

  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      <div className="flex items-center gap-2">
        <span>Session: {shortSessionId}</span>
        <button
          onClick={handleClearSession}
          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          title="Clear session (for testing)"
        >
          Clear
        </button>
      </div>
    </div>
  );
}; 