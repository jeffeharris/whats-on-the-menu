import type { CompletionStatus } from '../../types';

interface CompletionStatusSelectorProps {
  value: CompletionStatus;
  onChange: (status: CompletionStatus) => void;
  foodName: string;
}

const statusOptions: { value: NonNullable<CompletionStatus>; label: string; color: string }[] = [
  { value: 'none', label: 'None', color: 'bg-gray-400 text-white' },
  { value: 'some', label: 'Some', color: 'bg-warning text-white' },
  { value: 'all', label: 'All', color: 'bg-success text-white' },
];

export function CompletionStatusSelector({
  value,
  onChange,
  foodName,
}: CompletionStatusSelectorProps) {
  return (
    <div className="flex gap-1 flex-shrink-0" role="group" aria-label={`Completion status for ${foodName}`}>
      {statusOptions.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(isSelected ? null : option.value)}
            className={`
              px-2 py-1 text-xs font-medium rounded-lg
              transition-all duration-150
              ${isSelected ? option.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            `}
            aria-pressed={isSelected}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
