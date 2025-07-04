
import { useState, useEffect, useCallback } from 'react';
import { AppSettings, NotificationPermission } from '../types';

const SETTINGS_KEY = 'appSettings';

const defaultSettings: AppSettings = {
  notificationOptIn: false,
  notificationPermissionStatus: 'default',
};

export function useSettingsManager() {
  let hookIndex = 1;
  const hook = (desc: string) => {
     
    console.log(`[useSettingsManager] ${hookIndex++}. ${desc}`);
  };
  hook('useState settings');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Update notificationPermissionStatus based on actual browser permission
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission !== settings.notificationPermissionStatus) {
      setSettings(prev => ({ ...prev, notificationPermissionStatus: Notification.permission as NotificationPermission }));
    }
  }, [settings.notificationPermissionStatus]);

  const setNotificationOptIn = useCallback((optIn: boolean) => {
    setSettings(prev => ({ ...prev, notificationOptIn: optIn }));
    if (optIn && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setSettings(s => ({ ...s, notificationPermissionStatus: permission as NotificationPermission }));
      });
    }
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setSettings(prev => ({ ...prev, notificationPermissionStatus: permission as NotificationPermission }));
      });
    } else if (typeof Notification !== 'undefined') {
        // If already granted or denied, just reflect current state
        setSettings(prev => ({ ...prev, notificationPermissionStatus: Notification.permission as NotificationPermission }));
    }
  }, []);
  
  return {
    settings,
    setNotificationOptIn,
    requestNotificationPermission,
  };
};

export default useSettingsManager;
