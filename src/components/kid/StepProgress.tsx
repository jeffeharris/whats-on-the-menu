import { Check } from 'lucide-react';
import type { FoodItem } from '../../types';
import { useSound } from '../../hooks/useSound';

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  completedSelections: Array<{
    groupLabel: string;
    items: FoodItem[];
  }>;
  onStepClick: (step: number) => void;
  compact?: boolean;
}

function stepLabel(idx: number, isCurrent: boolean, isCompleted: boolean, completedGroup?: { items: FoodItem[] }): string {
  if (isCompleted && completedGroup) {
    return `Step ${idx + 1}: ${completedGroup.items.map((i) => i.name).join(', ')}`;
  }
  return isCurrent ? `Step ${idx + 1}: current` : `Step ${idx + 1}`;
}

export function StepProgress({
  currentStep,
  totalSteps,
  completedSelections,
  onStepClick,
  compact = false,
}: StepProgressProps) {
  const { playPlaced } = useSound();

  if (compact) {
    // A slim dot/pill rail: the current step reads as a wide coral bar, done
    // steps as a short teal bar, everything else as a muted pending bar.
    return (
      <div className="kid-progress flex items-center gap-1.5" data-compact>
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const isCompleted = idx < completedSelections.length && completedSelections[idx]?.items.length > 0;
          const isCurrent = idx === currentStep;
          const completedGroup = completedSelections[idx];

          return (
            <button
              key={idx}
              onClick={() => { playPlaced(); onStepClick(idx); }}
              className="kid-progress-pill"
              data-state={isCurrent ? 'current' : isCompleted ? 'completed' : 'pending'}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={stepLabel(idx, isCurrent, isCompleted, completedGroup)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="kid-progress flex items-center justify-center gap-3 py-3 px-4">
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const isCompleted = idx < completedSelections.length && completedSelections[idx]?.items.length > 0;
        const isCurrent = idx === currentStep;
        const completedGroup = completedSelections[idx];

        return (
          <button
            key={idx}
            onClick={() => { playPlaced(); onStepClick(idx); }}
            className="kid-progress-step relative flex items-center justify-center rounded-full"
            data-state={isCurrent ? 'current' : isCompleted ? 'completed' : 'pending'}
            aria-current={isCurrent ? 'step' : undefined}
            aria-label={stepLabel(idx, isCurrent, isCompleted, completedGroup)}
          >
            {isCompleted && completedGroup?.items[0]?.imageUrl ? (
              <img
                src={completedGroup.items[0].imageUrl}
                alt={completedGroup.items[0].name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : isCompleted ? (
              <Check className="w-5 h-5 text-kid-secondary-deep" strokeWidth={3} />
            ) : isCurrent ? (
              <span className="text-white text-lg font-bold">{idx + 1}</span>
            ) : (
              <span className="text-gray-400 text-sm font-semibold">{idx + 1}</span>
            )}

            {/* Multiple selection badge */}
            {isCompleted && completedGroup && completedGroup.items.length > 1 && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-kid-secondary-deep text-white text-xs font-bold rounded-full flex items-center justify-center">
                {completedGroup.items.length}
              </span>
            )}
          </button>
        );
      })}

    </div>
  );
}
