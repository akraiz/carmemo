
import { useState, useEffect, useCallback } from 'react';
import { AppSettings, NotificationPermission } from '../types';

const SETTINGS_KEY = 'appSettings';

const defaultSettings: AppSettings = {
  notificationOptIn: false,
  notificationPermissionStatus: 'default',
};

export const useSettingsManager = () => {
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings) as AppSettings;
        // Ensure notificationPermissionStatus is correctly initialized if it was not 'default'
        // but no actual browser permission was granted/denied yet (e.g. after clearing site data)
        // For simplicity, we trust the stored value on load, but actual permission is checked.
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        console.error("Failed to parse settings from localStorage", e);
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Update notificationPermissionStatus based on actual browser permission
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission !== settings.notificationPermissionStatus) {
      setSettingsState(prev => ({ ...prev, notificationPermissionStatus: Notification.permission as NotificationPermission }));
    }
  }, [settings.notificationPermissionStatus]);

  const setNotificationOptIn = useCallback((optIn: boolean) => {
    setSettingsState(prev => ({ ...prev, notificationOptIn: optIn }));
    if (optIn && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setSettingsState(s => ({ ...s, notificationPermissionStatus: permission as NotificationPermission }));
      });
    }
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setSettingsState(prev => ({ ...prev, notificationPermissionStatus: permission as NotificationPermission }));
      });
    } else if (typeof Notification !== 'undefined') {
        // If already granted or denied, just reflect current state
        setSettingsState(prev => ({ ...prev, notificationPermissionStatus: Notification.permission as NotificationPermission }));
    }
  }, []);
  
  return {
    settings,
    setNotificationOptIn,
    requestNotificationPermission,
  };
};

export default useSettingsManager;
