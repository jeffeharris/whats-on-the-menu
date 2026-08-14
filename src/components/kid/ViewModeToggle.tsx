import { LayoutGrid, GalleryHorizontal } from 'lucide-react';

export type MenuViewMode = 'grid' | 'single';

interface ViewModeToggleProps {
  value: MenuViewMode;
  onChange: (mode: MenuViewMode) => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  return (
    <div className="kid-view-toggle" role="radiogroup" aria-label="Food layout">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'grid'}
        aria-label="Grid layout"
        data-active={value === 'grid'}
        className="kid-view-toggle-option"
        onClick={() => onChange('grid')}
      >
        <LayoutGrid className="h-5 w-5" strokeWidth={2.4} />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'single'}
        aria-label="One at a time layout"
        data-active={value === 'single'}
        className="kid-view-toggle-option"
        onClick={() => onChange('single')}
      >
        <GalleryHorizontal className="h-5 w-5" strokeWidth={2.4} />
      </button>
    </div>
  );
}
