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
}

export function StepProgress({
  currentStep,
  totalSteps,
  completedSelections,
  onStepClick,
}: StepProgressProps) {
  const { playPlaced } = useSound();
  return (
    <div className="flex items-center justify-center gap-3 py-3 px-4">
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const isCompleted = idx < completedSelections.length && completedSelections[idx]?.items.length > 0;
        const isCurrent = idx === currentStep;
        const completedGroup = completedSelections[idx];

        return (
          <button
            key={idx}
            onClick={() => { playPlaced(); onStepClick(idx); }}
            className={`
              relative flex items-center justify-center rounded-full transition-all duration-300
              ${isCurrent
                ? 'w-14 h-14 bg-kid-primary shadow-lg ring-4 ring-kid-primary/30'
                : isCompleted
                  ? 'w-12 h-12 bg-white shadow-md ring-2 ring-kid-secondary hover:scale-110'
                  : 'w-10 h-10 bg-white/60 shadow-sm ring-2 ring-gray-200'
              }
            `}
            aria-label={
              isCompleted && completedGroup
                ? `Step ${idx + 1}: ${completedGroup.items.map(i => i.name).join(', ')}`
                : isCurrent
                  ? `Step ${idx + 1}: current`
                  : `Step ${idx + 1}`
            }
          >
            {isCompleted && completedGroup?.items[0]?.imageUrl ? (
              <img
                src={completedGroup.items[0].imageUrl}
                alt={completedGroup.items[0].name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : isCompleted ? (
              <Check className="w-5 h-5 text-kid-secondary" strokeWidth={3} />
            ) : isCurrent ? (
              <span className="text-white text-lg font-bold">{idx + 1}</span>
            ) : (
              <span className="text-gray-400 text-sm font-semibold">{idx + 1}</span>
            )}

            {/* Multiple selection badge */}
            {isCompleted && completedGroup && completedGroup.items.length > 1 && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-kid-secondary text-white text-xs font-bold rounded-full flex items-center justify-center">
                {completedGroup.items.length}
              </span>
            )}
          </button>
        );
      })}

    </div>
  );
}
