import { useState, useEffect, useRef } from 'react';
import { Bell, CreditCard, UserCheck, AlertTriangle, X } from 'lucide-react';
import { api } from '../utils/api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnread(data.count || 0);
    } catch { /* silent fail */ }
    finally { setLoading(false); }
  }

  const iconForType = (type) => {
    if (type === 'payment') return <CreditCard className="w-4 h-4 text-green-400" />;
    if (type === 'checkin') return <UserCheck className="w-4 h-4 text-blue-400" />;
    if (type === 'expiring') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <Bell className="w-4 h-4 text-gray-400" />;
  };

  const bgForType = (type) => {
    if (type === 'payment') return 'bg-green-500/10';
    if (type === 'checkin') return 'bg-blue-500/10';
    if (type === 'expiring') return 'bg-amber-500/10';
    return 'bg-gray-500/10';
  };

  const labelForType = (n) => {
    if (n.type === 'payment') return `${n.member_name} paid ETB ${(n.amount || 0).toLocaleString()}`;
    if (n.type === 'checkin') return `${n.member_name} checked in`;
    if (n.type === 'expiring') return `${n.member_name}'s membership expires soon`;
    return n.member_name;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); setUnread(0); }}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-dark-200 rounded-xl transition-all"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-dark-100 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="space-y-2 p-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-dark-200 rounded-xl animate-pulse" />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map((n, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${bgForType(n.type)} hover:bg-dark-200 transition-colors`}>
                    <div className="flex-shrink-0 mt-0.5">{iconForType(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white leading-tight">{labelForType(n)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-700 text-center">
            <button onClick={loadNotifications} className="text-xs text-gym-400 hover:text-gym-300 transition-colors">
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
