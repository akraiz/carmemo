import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { buildApiUrl } from '../config/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  date: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  refreshNotifications: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'date'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  let hookIndex = 1;
  const hook = (desc: string) => {
    // eslint-disable-next-line no-console
    console.log(`[useNotifications] ${hookIndex++}. ${desc}`);
  };
  hook('useContext NotificationContext');
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
};

export const NotificationProvider: React.FC<{ userId: string; children: ReactNode }> = ({ userId, children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(buildApiUrl(`/notifications/${userId}`));
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount((data.notifications || []).filter((n: Notification) => !n.read).length);
      } else {
        console.warn('Failed to fetch notifications:', res.status);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.warn('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optionally, poll every X seconds
    // const interval = setInterval(fetchNotifications, 60000);
    // return () => clearInterval(interval);
  }, [userId]);

  const markAsRead = (id: string) => {
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'date'>) => {
    setNotifications(n => [
      {
        id: self.crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
        ...notification,
        read: false,
        date: new Date().toISOString(),
      },
      ...n,
    ]);
    setUnreadCount(c => c + 1);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, refreshNotifications: fetchNotifications, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}; 