import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;

  const { page, pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const left = Math.max(1, page - delta);
    const right = Math.min(pages, page + delta);

    if (left > 1) { range.push(1); if (left > 2) range.push('...'); }
    for (let i = left; i <= right; i++) range.push(i);
    if (right < pages) { if (right < pages - 1) range.push('...'); range.push(pages); }
    return range;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
      <p className="text-sm text-gray-400">
        Showing <span className="font-medium text-white">{from}–{to}</span> of <span className="font-medium text-white">{total}</span> members
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((num, i) =>
          num === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1 text-gray-500 text-sm">…</span>
          ) : (
            <button
              key={num}
              onClick={() => onPageChange(num)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                num === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {num}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
