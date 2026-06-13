import { useState, useEffect } from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

/**
 * Pings /api/health on mount.
 * If the server hasn't responded within 2 seconds, shows a banner explaining
 * the server is waking up (common on free hosting tiers like Render).
 * Banner auto-dismisses once the server replies.
 */
export default function ServerWakeBanner() {
  const [state, setState] = useState('idle'); // idle | waking | online | offline

  useEffect(() => {
    let timer;
    let cancelled = false;

    const ping = async () => {
      // After 2s with no response, show the "waking up" banner
      timer = setTimeout(() => {
        if (!cancelled) setState('waking');
      }, 2000);

      try {
        await fetch(`${API_BASE}/health`, { cache: 'no-store' });
        if (!cancelled) setState('online');
      } catch {
        if (!cancelled) setState('offline');
      } finally {
        clearTimeout(timer);
      }
    };

    ping();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (state === 'idle' || state === 'online') return null;

  if (state === 'waking') {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500/95 backdrop-blur-sm text-black px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex-shrink-0 w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
          <p className="text-sm font-medium truncate">
            Server is starting up — this takes about 30 seconds on first load. Please wait…
          </p>
        </div>
      </div>
    );
  }

  if (state === 'offline') {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-500/95 backdrop-blur-sm text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-medium truncate">
            Cannot reach the server. Check your internet connection or try refreshing.
          </p>
        </div>
        <button
          onClick={() => setState('idle')}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return null;
}
