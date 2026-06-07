import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration ?? 6000),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }) {
  const CONFIGS = {
    success: { icon: CheckCircle, bg: 'bg-green-900/90 border-green-700', text: 'text-green-300' },
    error: { icon: AlertCircle, bg: 'bg-red-900/90 border-red-700', text: 'text-red-300' },
    warning: { icon: AlertTriangle, bg: 'bg-yellow-900/90 border-yellow-700', text: 'text-yellow-300' },
    info: { icon: AlertCircle, bg: 'bg-gray-800/90 border-gray-600', text: 'text-gray-300' },
  };
  const config = CONFIGS[toast.type] || CONFIGS.info;

  const Icon = config.icon;

  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm min-w-[280px] max-w-sm animate-slide-up ${config.bg}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${config.text}`} />
      <span className="text-white text-sm flex-1">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
