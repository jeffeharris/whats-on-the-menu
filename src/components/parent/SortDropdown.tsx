import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, Check } from 'lucide-react';

export type SortOption = 'a-z' | 'z-a' | 'newest' | 'oldest';

interface SortDropdownProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'a-z', label: 'A \u2013 Z' },
  { value: 'z-a', label: 'Z \u2013 A' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600
                   bg-white border border-gray-300 rounded-lg
                   hover:bg-gray-50 transition-colors"
        aria-label={`Sort by ${SORT_OPTIONS.find(o => o.value === value)?.label}`}
      >
        <ArrowUpDown className="w-4 h-4" />
        <span className="hidden sm:inline">
          {SORT_OPTIONS.find(o => o.value === value)?.label}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg
                        border border-gray-200 shadow-lg z-20 py-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between
                         hover:bg-parent-primary/10 transition-colors
                         ${value === option.value ? 'text-parent-primary font-medium' : 'text-gray-700'}`}
            >
              {option.label}
              {value === option.value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
