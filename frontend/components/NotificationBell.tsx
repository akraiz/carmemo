import React, { useState } from 'react';
import { registerPushNotifications } from '../services/aiService';

const NotificationBell: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    try {
      await registerPushNotifications();
      setEnabled(true);
    } catch (e: any) {
      setError(e.message || 'Failed to enable push notifications.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={handleEnable} disabled={enabled || loading} style={{ fontSize: 20 }}>
        🔔 {enabled ? 'Enabled' : 'Enable Push Notifications'}
      </button>
      {loading && <span>Enabling...</span>}
      {error && <span style={{ color: 'red' }}>{error}</span>}
    </div>
  );
};

export default NotificationBell; 