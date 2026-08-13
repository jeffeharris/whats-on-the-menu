import { useLayoutEffect, useRef, useState } from 'react';
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
/** Gap between the highlighted target and the tooltip card. */
const GAP = 12;
/** Minimum distance the card keeps from every viewport edge. */
const MARGIN = 16;
const CARD_WIDTH = 300;

function TooltipCard({ cardRef, width, icon: Icon, step, isLast, stepIndex, totalSteps, onNext, onSkip }: {
  cardRef?: React.Ref<HTMLDivElement>;
  width?: number;
  icon: React.ElementType;
  step: CoachMarkStep;
  isLast: boolean;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      ref={cardRef}
      style={width ? { width } : undefined}
      className="bg-white rounded-2xl shadow-xl p-5 max-w-[300px] w-[300px] fade-up-in"
    >
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);

  // The card's height depends on how much text the step carries, so it has to
  // be measured before we can tell whether it fits above or below the target.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const measure = () => setCardHeight(el.offsetHeight);

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [step?.id]);

  if (!step) return null;

  const Icon = ICON_MAP[step.icon] ?? Rocket;
  const isLast = stepIndex === totalSteps - 1;
  const isCentered = !step.selector;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const cardWidth = Math.min(CARD_WIDTH, viewportWidth - MARGIN * 2);

  // Tooltip positioning (centered steps use flex wrapper instead of transform,
  // since fade-up-in animation would override the centering transform)
  let tooltipStyle: React.CSSProperties;
  if (isCentered || !targetRect) {
    tooltipStyle = {};
  } else {
    // Flip to the opposite side when the preferred one can't fit the card —
    // otherwise a target near an edge pushes the card off-screen and clips it.
    const spaceBelow = viewportHeight - targetRect.bottom - GAP - MARGIN;
    const spaceAbove = targetRect.top - GAP - MARGIN;

    let placement = step.placement;
    if (cardHeight > 0) {
      if (placement === 'bottom' && cardHeight > spaceBelow && spaceAbove > spaceBelow) {
        placement = 'top';
      } else if (placement === 'top' && cardHeight > spaceAbove && spaceBelow > spaceAbove) {
        placement = 'bottom';
      }
    }

    // Position both placements via `top` so a single clamp keeps the card fully
    // on screen even when neither side has room for it.
    const preferredTop = placement === 'bottom'
      ? targetRect.bottom + GAP
      : targetRect.top - GAP - cardHeight;

    tooltipStyle = {
      position: 'fixed',
      top: Math.max(MARGIN, Math.min(preferredTop, viewportHeight - cardHeight - MARGIN)),
      left: Math.max(
        MARGIN,
        Math.min(
          targetRect.left + targetRect.width / 2 - cardWidth / 2,
          viewportWidth - cardWidth - MARGIN
        )
      ),
      width: cardWidth,
      // Hide for the first paint only, until we know the real card height.
      visibility: cardHeight === 0 ? 'hidden' : undefined,
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
            cardRef={cardRef}
            width={cardWidth}
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
