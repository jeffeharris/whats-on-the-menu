import { Plus } from 'lucide-react';

interface QuickAddCardProps {
  searchQuery: string;
  onAdd: (name: string) => void;
}

export function QuickAddCard({ searchQuery, onAdd }: QuickAddCardProps) {
  const trimmed = searchQuery.trim();
  if (!trimmed) return null;

  return (
    <button
      onClick={() => onAdd(trimmed)}
      className="w-full flex items-center gap-3 p-4 rounded-2xl
                 bg-parent-primary/10 border-2 border-dashed border-parent-primary/30
                 hover:bg-parent-primary/15 hover:border-parent-primary/50
                 transition-all duration-150 text-left group fade-up-in"
    >
      <div className="w-10 h-10 bg-parent-primary/20 rounded-xl flex items-center justify-center
                      group-hover:bg-parent-primary/30 transition-colors flex-shrink-0">
        <Plus className="w-5 h-5 text-parent-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-parent-primary text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
          Add &ldquo;{trimmed}&rdquo;
        </p>
        <p className="text-xs text-parent-primary/60 mt-0.5">
          Add this food to your library
        </p>
      </div>
    </button>
  );
}
