import { createPortal } from 'react-dom';
import { Rocket, UtensilsCrossed, Users, PartyPopper } from 'lucide-react';
import { useTargetPosition } from './useTargetPosition';
import type { CoachMarkStep } from './steps';

const ICON_MAP: Record<string, React.ElementType> = {
  Rocket,
  UtensilsCrossed,
  Users,
  PartyPopper,
};

const PADDING = 8;

function TooltipCard({ icon: Icon, step, isLast, stepIndex, totalSteps, onNext, onSkip }: {
  icon: React.ElementType;
  step: CoachMarkStep;
  isLast: boolean;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 max-w-[300px] w-[300px] fade-up-in">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 bg-parent-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-parent-primary" />
        </div>
        <div>
          <h3
            className="font-semibold text-gray-800 text-sm"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {step.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${
                i === stepIndex ? 'bg-parent-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {!isLast && (
            <button
              onClick={onSkip}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >
              Skip tour
            </button>
          )}
          <button
            onClick={onNext}
            className="text-xs font-semibold text-white bg-parent-primary hover:bg-parent-primary/90 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isLast ? 'Got it!' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CoachMarksOverlayProps {
  step: CoachMarkStep | null;
  onNext: () => void;
  onSkip: () => void;
  stepIndex: number;
  totalSteps: number;
}

export function CoachMarksOverlay({ step, onNext, onSkip, stepIndex, totalSteps }: CoachMarksOverlayProps) {
  const targetRect = useTargetPosition(step?.selector ?? '');

  if (!step) return null;

  const Icon = ICON_MAP[step.icon] ?? Rocket;
  const isLast = stepIndex === totalSteps - 1;
  const isCentered = !step.selector;

  // Tooltip positioning (centered steps use flex wrapper instead of transform,
  // since fade-up-in animation would override the centering transform)
  let tooltipStyle: React.CSSProperties;
  if (isCentered || !targetRect) {
    tooltipStyle = {};
  } else if (step.placement === 'bottom') {
    tooltipStyle = {
      position: 'fixed',
      top: targetRect.bottom + 12,
      left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 150, window.innerWidth - 316)),
      width: 300,
    };
  } else {
    tooltipStyle = {
      position: 'fixed',
      bottom: window.innerHeight - targetRect.top + 12,
      left: Math.max(16, Math.min(targetRect.left + targetRect.width / 2 - 150, window.innerWidth - 316)),
      width: 300,
    };
  }

  // Highlight ring for targeted steps
  const highlightStyle: React.CSSProperties | null =
    targetRect && !isCentered
      ? {
          position: 'fixed',
          top: targetRect.top - PADDING,
          left: targetRect.left - PADDING,
          width: targetRect.width + PADDING * 2,
          height: targetRect.height + PADDING * 2,
          borderRadius: 16,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
          pointerEvents: 'none' as const,
          zIndex: 9998,
        }
      : null;

  return createPortal(
    <div className="coach-marks-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9997 }}>
      {/* Backdrop — only shown for centered (no-target) steps */}
      {isCentered && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9997 }}
        />
      )}

      {/* Highlight ring */}
      {highlightStyle && <div style={highlightStyle} />}

      {/* Tooltip card — centered steps use a flex wrapper for positioning */}
      {isCentered ? (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <TooltipCard
            icon={Icon}
            step={step}
            isLast={isLast}
            stepIndex={stepIndex}
            totalSteps={totalSteps}
            onNext={onNext}
            onSkip={onSkip}
          />
        </div>
      ) : (
        <div style={{ ...tooltipStyle, zIndex: 9999 }}>
          <TooltipCard
            icon={Icon}
            step={step}
            isLast={isLast}
            stepIndex={stepIndex}
            totalSteps={totalSteps}
            onNext={onNext}
            onSkip={onSkip}
          />
        </div>
      )}
    </div>,
    document.body
  );
}
