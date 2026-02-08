import type { FoodItem } from '../../types';

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
  return (
    <div className="flex items-center justify-center gap-3 py-3 px-4">
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const isCompleted = idx < completedSelections.length && completedSelections[idx]?.items.length > 0;
        const isCurrent = idx === currentStep;
        const completedGroup = completedSelections[idx];

        return (
          <button
            key={idx}
            onClick={() => onStepClick(idx)}
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
              <svg className="w-5 h-5 text-kid-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
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

      {/* Final review step indicator */}
      <div className="w-px h-6 bg-gray-200 mx-1" />
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${currentStep >= totalSteps ? 'bg-kid-accent shadow-md' : 'bg-white/60 ring-2 ring-gray-200'}
        `}
      >
        <svg
          className={`w-5 h-5 ${currentStep >= totalSteps ? 'text-gray-800' : 'text-gray-300'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </div>
    </div>
  );
}
