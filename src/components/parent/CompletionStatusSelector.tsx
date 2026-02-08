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

/** Get the card background color for a given completion status */
export function getCompletionCardColor(status: CompletionStatus): string {
  switch (status) {
    case 'all': return 'bg-success/10 border border-success/20';
    case 'some': return 'bg-warning/10 border border-warning/20';
    case 'none': return 'bg-gray-100 border border-gray-200';
    default: return 'bg-gray-50 border border-transparent';
  }
}

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
              px-2.5 py-1.5 text-xs font-medium rounded-lg
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
