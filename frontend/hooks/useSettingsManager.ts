
import { useState, useEffect, useCallback } from 'react';
import { AppSettings, NotificationPermission } from '../types';
import { SessionService } from '../services/sessionService';

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

  // Load settings from session-specific storage on mount
  useEffect(() => {
    const sessionKey = SessionService.getSessionKey(SETTINGS_KEY);
    const storedSettings = localStorage.getItem(sessionKey);
    if (storedSettings) {
      try {
        const parsedSettings = JSON.parse(storedSettings) as AppSettings;
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Failed to parse settings from localStorage:', error);
      }
    }
  }, []);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    const sessionKey = SessionService.getSessionKey(SETTINGS_KEY);
    localStorage.setItem(sessionKey, JSON.stringify(settings));
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
