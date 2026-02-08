import { Tag, X } from 'lucide-react';

interface BulkTagBarProps {
  selectedCount: number;
  onAddTag: () => void;
  onRemoveTag: () => void;
  onCancel: () => void;
}

export function BulkTagBar({ selectedCount, onAddTag, onRemoveTag, onCancel }: BulkTagBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]
                    px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <span className="text-sm text-gray-600 font-medium flex-shrink-0">
          {selectedCount} selected
        </span>
        <div className="flex-1 flex gap-2 justify-end">
          <button
            onClick={onAddTag}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                       bg-parent-primary text-white rounded-lg
                       hover:bg-parent-primary/90 transition-colors"
          >
            <Tag className="w-4 h-4" />
            Add Tag
          </button>
          <button
            onClick={onRemoveTag}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                       bg-gray-100 text-gray-700 rounded-lg
                       hover:bg-gray-200 transition-colors"
          >
            <Tag className="w-4 h-4" />
            Remove
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-2 text-sm
                       text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
