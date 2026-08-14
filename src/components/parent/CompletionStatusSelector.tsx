import { COMPLETION_STEPS } from '../../utils/completionUtils';
import type { CompletionStatus } from '../../types';

interface CompletionStatusSelectorProps {
  value: CompletionStatus;
  onChange: (status: CompletionStatus) => void;
  foodName: string;
}

/** Small ring-and-dot icon whose inner dot scales with `fill` (0-1), echoing a completion level. */
function CompletionDotIcon({ fill }: { fill: number }) {
  const radius = (7 * Math.sqrt(fill)).toFixed(2);
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r={radius} fill="currentColor" />
    </svg>
  );
}

export function CompletionStatusSelector({
  value,
  onChange,
  foodName,
}: CompletionStatusSelectorProps) {
  return (
    <div
      className="grid grid-cols-4 gap-1"
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
            <CompletionDotIcon fill={step.fill} />
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
