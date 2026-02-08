import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { FoodCard } from '../../components/kid/FoodCard';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { StepProgress } from '../../components/kid/StepProgress';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';
import type { GroupSelections } from '../../types';
import { SELECTION_PRESET_CONFIG } from '../../types';

const AUTO_ADVANCE_DELAY_MS = 1500;
const TRANSITION_DURATION = 500;
const CARD_STAGGER_DELAY_MS = 60;
const CELEBRATION_WORDS = ['Yum!', 'Great pick!', 'Tasty!', 'Nice!', 'Delicious!'];

interface MenuSelectionProps {
  kidId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function MenuSelection({ kidId, onComplete, onBack }: MenuSelectionProps) {
  const { getItem } = useFoodLibrary();
  const { getProfile } = useKidProfiles();
  const { currentMenu, addSelection, getSelectionForKid } = useMenu();

  const kid = getProfile(kidId);
  const existingSelection = getSelectionForKid(kidId);

  // Initialize selections from existing selection or empty
  const [selections, setSelections] = useState<GroupSelections>(() => {
    if (existingSelection?.selections) {
      return existingSelection.selections;
    }
    const initial: GroupSelections = {};
    currentMenu?.groups.forEach((group) => {
      initial[group.id] = [];
    });
    return initial;
  });

  // Step wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [exitingStep, setExitingStep] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [celebrateText, setCelebrateText] = useState<string | null>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sort groups by order (safe even if currentMenu is null)
  const sortedGroups = useMemo(
    () => currentMenu ? [...currentMenu.groups].sort((a, b) => a.order - b.order) : [],
    [currentMenu]
  );

  const totalSteps = sortedGroups.length;
  const currentGroup = sortedGroups[currentStep] ?? null;
  const presetConfig = currentGroup ? SELECTION_PRESET_CONFIG[currentGroup.selectionPreset] : null;
  const currentGroupSelections = currentGroup ? (selections[currentGroup.id] || []) : [];

  // Get all food IDs selected across all groups (for cross-group exclusion)
  const allSelectedFoodIds = useMemo(() => {
    const allIds = new Set<string>();
    Object.values(selections).forEach((ids) => {
      ids.forEach((id) => allIds.add(id));
    });
    return allIds;
  }, [selections]);

  // Check if current group meets minimum
  const canProceedFromStep = presetConfig
    ? currentGroupSelections.length >= presetConfig.min
    : false;

  // Check if ALL groups meet their minimum (for final submit)
  const canConfirm = sortedGroups.every((group) => {
    const config = SELECTION_PRESET_CONFIG[group.selectionPreset];
    const groupSelections = selections[group.id] || [];
    return groupSelections.length >= config.min;
  });

  // Computed previous selections for progress indicator
  const completedSelections = useMemo(
    () =>
      sortedGroups.map((group) => ({
        groupLabel: group.label,
        items: (selections[group.id] || [])
          .map((id) => getItem(id))
          .filter((item): item is NonNullable<typeof item> => item != null),
      })),
    [sortedGroups, selections, getItem]
  );

  const showCelebration = useCallback(() => {
    const word = CELEBRATION_WORDS[Math.floor(Math.random() * CELEBRATION_WORDS.length)];
    setCelebrateText(word);
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setCelebrateText(null), 1000);
  }, []);

  // Navigation
  const goToStep = useCallback(
    (targetStep: number) => {
      if (targetStep === currentStep || targetStep < 0 || targetStep > totalSteps - 1 || isTransitioning) return;
      const direction = targetStep > currentStep ? 'right' : 'left';
      setExitingStep(currentStep);
      setSlideDirection(direction);
      setIsTransitioning(true);
      setCurrentStep(targetStep);
      if (contentRef.current) {
        const scrollContainer = contentRef.current.querySelector('.overflow-y-auto') as HTMLElement | null;
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
      }
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => {
        setExitingStep(null);
        setSlideDirection(null);
        setIsTransitioning(false);
      }, TRANSITION_DURATION);
    },
    [currentStep, totalSteps, isTransitioning]
  );

  const goToNextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, goToStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }, [currentStep, goToStep]);

  // Auto-advance for pick-1 groups
  useEffect(() => {
    if (!presetConfig || !currentGroup) return;

    const isPickOne = presetConfig.max === 1;
    const hasSelection = currentGroupSelections.length === 1;
    const isLast = currentStep >= totalSteps - 1;

    if (isPickOne && hasSelection && !isLast) {
      autoAdvanceTimer.current = setTimeout(() => {
        goToNextStep();
      }, AUTO_ADVANCE_DELAY_MS);

      return () => {
        if (autoAdvanceTimer.current) {
          clearTimeout(autoAdvanceTimer.current);
        }
      };
    }
  }, [currentGroupSelections, currentStep, presetConfig, currentGroup, totalSteps, goToNextStep]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    };
  }, []);

  // Early return AFTER all hooks
  if (!currentMenu || !kid) {
    return null;
  }

  // Handle food selection within a group
  const handleFoodSelect = (groupId: string, foodId: string) => {
    const group = currentMenu.groups.find((g) => g.id === groupId);
    if (!group) return;

    const groupPreset = SELECTION_PRESET_CONFIG[group.selectionPreset];

    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }

    const isDeselecting = (selections[groupId] || []).includes(foodId);

    setSelections((prev) => {
      const newSelections = { ...prev };
      const prevGroupSels = prev[groupId] || [];

      if (prevGroupSels.includes(foodId)) {
        newSelections[groupId] = prevGroupSels.filter((id) => id !== foodId);
        return newSelections;
      }

      for (const [gId, gSelections] of Object.entries(newSelections)) {
        if (gId !== groupId && gSelections.includes(foodId)) {
          newSelections[gId] = gSelections.filter((id) => id !== foodId);
        }
      }

      if (prevGroupSels.length >= groupPreset.max) {
        if (groupPreset.max === 1) {
          newSelections[groupId] = [foodId];
        } else {
          newSelections[groupId] = [...prevGroupSels.slice(1), foodId];
        }
      } else {
        newSelections[groupId] = [...prevGroupSels, foodId];
      }

      return newSelections;
    });

    if (!isDeselecting) {
      showCelebration();
    }
  };

  const handleConfirm = async () => {
    await addSelection(kidId, selections);
    onComplete();
  };

  const isLastStep = currentStep === totalSteps - 1;

  const getRequirementsMessage = () => {
    for (const group of sortedGroups) {
      const config = SELECTION_PRESET_CONFIG[group.selectionPreset];
      const groupSels = selections[group.id] || [];
      if (groupSels.length < config.min) {
        const needed = config.min - groupSels.length;
        return `Pick ${needed} more ${group.label}!`;
      }
    }
    return "All done!";
  };

  const getStepTitle = (stepIndex: number) => {
    const group = sortedGroups[stepIndex];
    if (!group) return '';
    const config = SELECTION_PRESET_CONFIG[group.selectionPreset];
    if (config.max === 1) {
      return `Pick 1 ${group.label.replace(/s$/i, '')}!`;
    }
    if (config.min === config.max) {
      return `Pick ${config.max} ${group.label}!`;
    }
    return `Pick ${config.min}-${config.max} ${group.label}!`;
  };

  const renderStepContent = (stepIndex: number, animClass: string) => {
    const group = sortedGroups[stepIndex];
    if (!group) return null;
    const config = SELECTION_PRESET_CONFIG[group.selectionPreset];
    const groupSels = selections[group.id] || [];
    const items = group.foodIds.map((id) => getItem(id)).filter(Boolean);

    return (
      <div
        key={`step-${stepIndex}`}
        className={`${animClass ? 'absolute inset-0' : 'relative h-full'} p-4 md:p-6 overflow-y-auto ${animClass}`}
      >
        <div className="text-center mb-6 relative">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 tracking-tight font-heading">
            {getStepTitle(stepIndex)}
          </h2>
          <p className="text-lg text-gray-500 mt-1">{config.label}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-6 justify-items-center max-w-lg mx-auto px-2">
          {items.map((item, idx) => {
            if (!item) return null;

            const isSelected = groupSels.includes(item.id);
            const isSelectedElsewhere = !isSelected && allSelectedFoodIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`w-full ${stepIndex === currentStep && slideDirection ? 'card-pop-in' : ''}`}
                style={stepIndex === currentStep && slideDirection ? { animationDelay: `${idx * CARD_STAGGER_DELAY_MS}ms` } : undefined}
              >
                <FoodCard
                  name={item.name}
                  imageUrl={item.imageUrl}
                  selected={isSelected}
                  disabled={isSelectedElsewhere}
                  onClick={stepIndex === currentStep ? () => handleFoodSelect(group.id, item.id) : undefined}
                  responsive
                  className={`w-full min-w-[140px] h-auto aspect-[10/13] ${isSelected ? 'selection-celebrate' : ''}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-kid-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 pt-4 pb-2 max-w-3xl mx-auto w-full">
        <button
          onClick={currentStep > 0 ? goToPreviousStep : onBack}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          aria-label={currentStep > 0 ? 'Previous step' : 'Go back'}
        >
          <ChevronLeft className="w-8 h-8 text-gray-600" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <KidAvatar name={kid.name} color={kid.avatarColor} avatarAnimal={kid.avatarAnimal} size="md" />
          <div>
            <p className="text-gray-500 text-sm">Picking for</p>
            <h1 className="text-xl font-bold text-gray-800">{kid.name}</h1>
          </div>
        </div>
      </header>

      {/* Step Progress */}
      <StepProgress
        currentStep={currentStep}
        totalSteps={totalSteps}
        completedSelections={completedSelections}
        onStepClick={goToStep}
      />

      {/* Step Content - Animated */}
      <main
        ref={contentRef}
        className="flex-1 overflow-hidden relative"
      >
        {exitingStep !== null && slideDirection && renderStepContent(
          exitingStep,
          slideDirection === 'right' ? 'step-exit-left' : 'step-exit-right'
        )}

        {renderStepContent(
          currentStep,
          slideDirection === 'right' ? 'step-enter-right' : slideDirection === 'left' ? 'step-enter-left' : ''
        )}

        <div role="status" aria-live="polite" className="sr-only">
          Step {currentStep + 1} of {totalSteps}: {getStepTitle(currentStep)}
        </div>
      </main>

      {/* Celebration text overlay */}
      {celebrateText && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <span className="celebrate-text text-5xl font-extrabold text-kid-primary drop-shadow-lg">
            {celebrateText}
          </span>
        </div>
      )}

      {/* Footer */}
      <footer className="flex-shrink-0 p-4 md:p-6 bg-kid-bg border-t border-kid-primary/10">
        <div className="max-w-xl mx-auto">
          {isLastStep ? (
            <Button
              mode="kid"
              variant="primary"
              size="touch"
              fullWidth
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              {canConfirm ? "All done!" : getRequirementsMessage()}
            </Button>
          ) : (
            <Button
              mode="kid"
              variant="primary"
              size="touch"
              fullWidth
              onClick={goToNextStep}
              disabled={!canProceedFromStep}
            >
              {canProceedFromStep
                ? (presetConfig?.max === 1 ? 'Next...' : 'Next')
                : `Pick ${presetConfig ? presetConfig.min - currentGroupSelections.length : 0} more!`
              }
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
