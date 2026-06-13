import { useState } from 'react';
import { Info, X, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * PageHint — collapsible per-page help banner for new users.
 * Remembers collapsed state in localStorage using the `id` prop.
 *
 * Usage:
 *   <PageHint id="expenses">
 *     Track your gym's operating costs here...
 *   </PageHint>
 */
export default function PageHint({ id, children }) {
  const storageKey = `hint_v1_${id}`;
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(storageKey) === 'collapsed'
  );
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(storageKey) === 'dismissed'
  );

  if (dismissed) return null;

  const collapse = () => {
    localStorage.setItem(storageKey, 'collapsed');
    setCollapsed(true);
  };
  const expand = () => {
    localStorage.removeItem(storageKey);
    setCollapsed(false);
  };
  const dismiss = () => {
    localStorage.setItem(storageKey, 'dismissed');
    setDismissed(true);
  };

  if (collapsed) {
    return (
      <button
        onClick={expand}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gym-400 transition-colors mb-1"
      >
        <Info className="w-3.5 h-3.5" />
        Show page guide
        <ChevronDown className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="flex items-start gap-3 bg-gym-500/8 border border-gym-500/20 rounded-2xl px-5 py-4 mb-2">
      <Info className="w-4 h-4 text-gym-400 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-gray-300 leading-relaxed">{children}</p>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={collapse}
          title="Collapse"
          className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/5"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={dismiss}
          title="Don't show again"
          className="p-1 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
