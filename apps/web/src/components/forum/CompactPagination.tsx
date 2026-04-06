import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CompactPaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function CompactPagination({ page, totalPages, onChange }: CompactPaginationProps) {
  if (totalPages <= 1) return null;

  const generatePages = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (page > 3) pages.push('...');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);

    // 去重并保留 ellipsis
    const result: (number | string)[] = [];
    for (const p of pages) {
      if (typeof p === 'number' && result.includes(p)) continue;
      result.push(p);
    }
    return result;
  };

  const pages = generatePages();

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-2 py-1 rounded border border-coc-border text-coc-parchment hover:border-coc-gold disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, idx) =>
        typeof p === 'string' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-coc-text-muted">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`min-w-[2rem] px-2 py-1 rounded border text-sm transition-colors ${
              p === page
                ? 'bg-coc-gold text-coc-abyss border-coc-gold'
                : 'border-coc-border text-coc-parchment hover:border-coc-gold'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="px-2 py-1 rounded border border-coc-border text-coc-parchment hover:border-coc-gold disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
