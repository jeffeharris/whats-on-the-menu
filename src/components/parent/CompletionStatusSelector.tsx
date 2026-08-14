import { RingDotIcon } from '../common/RingDotIcon';
import { COMPLETION_STEPS } from '../../utils/completionUtils';
import type { CompletionStatus } from '../../types';

interface CompletionStatusSelectorProps {
  value: CompletionStatus;
  onChange: (status: CompletionStatus) => void;
  foodName: string;
}

export function CompletionStatusSelector({
  value,
  onChange,
  foodName,
}: CompletionStatusSelectorProps) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${COMPLETION_STEPS.length}, minmax(0, 1fr))` }}
      role="group"
      aria-label={`Completion status for ${foodName}`}
    >
      {COMPLETION_STEPS.map((step) => {
        const isSelected = value === step.value;
        return (
          <button
            key={step.value}
            onClick={() => onChange(isSelected ? null : step.value)}
            className={`
              min-h-11 flex flex-col items-center justify-center gap-0.5 px-0.5 py-1
              rounded-[10px] border transition-all duration-150
              ${isSelected
                ? `${step.solidClass} text-white border-transparent`
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}
            `}
            aria-pressed={isSelected}
            aria-label={step.label}
          >
            <RingDotIcon size={16} dotRadius={7 * Math.sqrt(step.fill)} />
            <span
              className={`text-[10px] leading-tight text-center font-heading ${isSelected ? 'font-bold' : 'font-medium'}`}
            >
              {step.shortLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
