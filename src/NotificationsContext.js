import React, { createContext, useContext, useState, useCallback } from 'react';
import { getUnreadNotificationCount } from './api';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadNotificationCount();
      setUnreadCount(data.count || 0);
    } catch (_) {
      // Silent — the badge is a nice-to-have, not worth surfacing a network error for.
    }
  }, []);

  return (
    <NotificationsContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
