import React from 'react';
import { Icons } from '../Icon';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  date: string;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ open, onClose, notifications, onMarkRead }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md mx-auto bg-[#1c1c1c] rounded-t-2xl shadow-2xl border-t border-[#333333] p-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white font-heading">Notifications</h2>
          <button onClick={onClose} className="text-[#a0a0a0] hover:text-[#F7C843] p-1 rounded-full hover:bg-[#2a2a2a] transition-colors" aria-label="Close notifications">
            <Icons.XMark className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-[#a0a0a0] text-center py-8">No notifications</div>
          ) : notifications.map(n => (
            <div key={n.id} className={`p-3 rounded-lg border ${n.read ? 'border-[#333333] bg-[#232323]' : 'border-[#F7C843]/40 bg-[#F7C843]/10'}`}> 
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-white">{n.title}</span>
                {!n.read && <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-[#F7C843] text-[#0f0f0f]">New</span>}
              </div>
              <div className="text-xs text-[#cfcfcf] mb-1">{n.message}</div>
              <div className="flex items-center justify-between text-xs text-[#707070]">
                <span>{new Date(n.date).toLocaleString()}</span>
                {!n.read && <button onClick={() => onMarkRead(n.id)} className="text-[#F7C843] underline ml-2">Mark as read</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter; 