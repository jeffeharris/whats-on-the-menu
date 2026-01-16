import type { CompletionStatus } from '../../types';

interface CompletionStatusSelectorProps {
  value: CompletionStatus;
  onChange: (status: CompletionStatus) => void;
  foodName: string;
}

const statusOptions: { value: NonNullable<CompletionStatus>; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'bg-success text-white' },
  { value: 'some', label: 'Some', color: 'bg-warning text-white' },
  { value: 'none', label: 'None', color: 'bg-gray-400 text-white' },
];

export function CompletionStatusSelector({
  value,
  onChange,
  foodName,
}: CompletionStatusSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">How much was eaten?</span>
      <div className="flex gap-1" role="group" aria-label={`Completion status for ${foodName}`}>
        {statusOptions.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(isSelected ? null : option.value)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg
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
    </div>
  );
}
