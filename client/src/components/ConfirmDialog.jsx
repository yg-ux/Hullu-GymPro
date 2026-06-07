import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmDialog({ isOpen, title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, variant = 'danger', loading = false }) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      btn: 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-400',
      btn: 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800'
    }
  };

  const s = variantStyles[variant] || variantStyles.danger;
  const Icon = s.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-start gap-4 mb-6">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${s.iconBg}`}>
            <Icon className={`w-6 h-6 ${s.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            <p className="text-gray-400 text-sm">{message}</p>
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 ${s.btn}`}
          >
            {loading && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
