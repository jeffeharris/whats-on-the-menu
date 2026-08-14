import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { AppShell } from '../../components/common/AppShell';
import { FoodCard } from '../../components/kid/FoodCard';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { StepProgress } from '../../components/kid/StepProgress';
import { ViewModeToggle, type MenuViewMode } from '../../components/kid/ViewModeToggle';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSound } from '../../hooks/useSound';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { GroupSelections } from '../../types';
import { SELECTION_PRESET_CONFIG } from '../../types';

const AUTO_ADVANCE_DELAY_MS = 1500;
const TRANSITION_DURATION = 500;
const CARD_STAGGER_DELAY_MS = 60;
const CELEBRATION_WORDS = ['Yum!', 'Great pick!', 'Tasty!', 'Nice!', 'Delicious!'];

function singularizeGroupLabel(label: string): string {
  if (/ies$/i.test(label)) return `${label.slice(0, -3)}y`;
  if (/(?:s|x|z|ch|sh)es$/i.test(label)) return label.slice(0, -2);
  if (/s$/i.test(label) && !/ss$/i.test(label)) return label.slice(0, -1);
  return label;
}

interface MenuSelectionProps {
  kidId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function MenuSelection({ kidId, onComplete, onBack }: MenuSelectionProps) {
  const { getItem } = useFoodLibrary();
  const { getProfile } = useKidProfiles();
  const {
    activeMenu: currentMenu,
    addSelection,
    getSelectionForKid,
    selectionRevision,
    selectionsLocked,
  } = useMenu();

  const kid = getProfile(kidId);
  const existingSelection = getSelectionForKid(kidId);
  const { playPlaced } = useSound();

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

  // Layout preference: full-bleed grid vs. one-at-a-time carousel, remembered across visits
  const [viewMode, setViewMode] = useLocalStorage<MenuViewMode>('kid-selection-view-mode', 'grid');

  // Carousel browses one food at a time within a step; start over whenever the step or layout changes
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselResetKey, setCarouselResetKey] = useState('');

  // Step wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const nextCarouselResetKey = `${currentStep}:${viewMode}`;
  if (nextCarouselResetKey !== carouselResetKey) {
    setCarouselResetKey(nextCarouselResetKey);
    setCarouselIndex(0);
  }
  const [exitingStep, setExitingStep] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [celebrateText, setCelebrateText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundRef = useRef<{ menuId: string; selectionRevision: number } | null>(
    currentMenu ? { menuId: currentMenu.id, selectionRevision } : null
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const carouselScrollFrame = useRef<number | null>(null);

  // Tracks which item is centered as the carousel is dragged/scrolled, so the
  // dots, select button and peek styling stay in sync with the real motion.
  const handleCarouselScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const track = e.currentTarget;
    if (carouselScrollFrame.current !== null) cancelAnimationFrame(carouselScrollFrame.current);
    carouselScrollFrame.current = requestAnimationFrame(() => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let closestIdx = 0;
      let closestDist = Infinity;
      Array.from(track.children).forEach((child, idx) => {
        const el = child as HTMLElement;
        const elCenter = el.offsetLeft + el.clientWidth / 2;
        const dist = Math.abs(elCenter - center);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = idx;
        }
      });
      setCarouselIndex((prev) => (prev === closestIdx ? prev : closestIdx));
    });
  }, []);

  // Smoothly slides the track to center a given item, instead of jumping to it
  const scrollCarouselToIndex = useCallback((idx: number) => {
    const track = carouselTrackRef.current;
    const item = track?.children[idx] as HTMLElement | undefined;
    if (!track || !item) {
      setCarouselIndex(idx);
      return;
    }
    track.scrollTo({
      left: item.offsetLeft - (track.clientWidth - item.clientWidth) / 2,
      behavior: 'smooth',
    });
  }, []);

  // Sort groups by order (safe even if currentMenu is null)
  const sortedGroups = useMemo(
    () => currentMenu ? [...currentMenu.groups].sort((a, b) => a.order - b.order) : [],
    [currentMenu]
  );

  const totalSteps = sortedGroups.length;
  const currentGroup = sortedGroups[currentStep] ?? null;
  const presetConfig = currentGroup ? SELECTION_PRESET_CONFIG[currentGroup.selectionPreset] : null;
  const currentGroupSelections = useMemo(
    () => currentGroup ? (selections[currentGroup.id] || []) : [],
    [currentGroup, selections]
  );

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
      playPlaced();
      goToStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, goToStep, playPlaced]);

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
      if (carouselScrollFrame.current !== null) cancelAnimationFrame(carouselScrollFrame.current);
    };
  }, []);

  // Approval can arrive from the parent phone while this screen is open.
  // Return to the shared home, which now explains that choices are locked.
  useEffect(() => {
    if (selectionsLocked) onBack();
  }, [onBack, selectionsLocked]);

  // Keep the draft tied to the exact menu round it started from. If a parent
  // changes or clears the active menu on another device, discard this stale
  // wizard instead of allowing it to repopulate the new round.
  useEffect(() => {
    if (!roundRef.current && currentMenu) {
      roundRef.current = { menuId: currentMenu.id, selectionRevision };
      return;
    }
    const round = roundRef.current;
    if (
      round
      && (!currentMenu
        || currentMenu.id !== round.menuId
        || selectionRevision !== round.selectionRevision)
    ) {
      onBack();
    }
  }, [currentMenu, onBack, selectionRevision]);

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
          // LIFO: swap out the most recently picked item, not the oldest one.
          newSelections[groupId] = [...prevGroupSels.slice(0, -1), foodId];
        }
      } else {
        newSelections[groupId] = [...prevGroupSels, foodId];
      }

      return newSelections;
    });

    if (!isDeselecting) {
      playPlaced();
      showCelebration();
    }
  };

  const handleConfirm = async () => {
    playPlaced();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const round = roundRef.current;
      if (!round) throw new Error('The menu is still loading. Please try again.');
      await addSelection(kidId, selections, round.menuId, round.selectionRevision);
      onComplete();
    } catch (err) {
      setSubmitError((err as Error).message || 'We could not save your choices. Try again!');
      setSubmitting(false);
    }
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
    return 'All done!';
  };

  const getStepTitle = (stepIndex: number) => {
    const group = sortedGroups[stepIndex];
    if (!group) return '';
    const config = SELECTION_PRESET_CONFIG[group.selectionPreset];
    if (config.max === 1) {
      return `Pick 1 ${singularizeGroupLabel(group.label)}!`;
    }
    if (config.min === config.max) {
      return `Pick ${config.max} ${group.label}!`;
    }
    return `Pick ${config.min}-${config.max} ${group.label}!`;
  };

  // Visible title + a row of "slot" chips: one per required pick (bigger,
  // coral dashed when empty) plus one per optional bonus pick (smaller,
  // amber dotted with a "+" when empty). Filled slots show the photo.
  const renderSelectHeader = (stepIndex: number, layout: 'grid' | 'carousel') => {
    const group = sortedGroups[stepIndex];
    if (!group) return null;
    const config = SELECTION_PRESET_CONFIG[group.selectionPreset];
    const groupSels = selections[group.id] || [];

    return (
      <div className={`kid-select-header ${layout === 'carousel' ? 'kid-select-header--center' : ''}`}>
        <h2 className="kid-select-title">{getStepTitle(stepIndex)}</h2>
        <div className="kid-select-chips" aria-hidden="true">
          {Array.from({ length: config.max }).map((_, idx) => {
            const isOptional = idx >= config.min;
            const foodId = groupSels[idx];
            const item = foodId ? getItem(foodId) : null;

            return (
              <div key={idx} className="kid-select-chip" data-optional={isOptional} data-filled={!!item}>
                {item?.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : item ? (
                  <Check className="h-4 w-4 text-white" strokeWidth={3} />
                ) : isOptional ? (
                  <Plus className="h-3 w-3" strokeWidth={3} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGridBody = (stepIndex: number, groupId: string, items: NonNullable<ReturnType<typeof getItem>>[], groupSels: string[], config: { min: number; max: number }) => (
    <div className="mx-auto grid max-w-3xl grid-cols-2 justify-items-center gap-4 px-1 sm:grid-cols-3 md:gap-6 md:px-2">
      {items.map((item, idx) => {
        const isSelected = groupSels.includes(item.id);
        const isSelectedElsewhere = !isSelected && allSelectedFoodIds.has(item.id);
        const canAddMore = config.max > 1 && groupSels.length < config.max;

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
              disabled={selectionsLocked || isSelectedElsewhere}
              onClick={stepIndex === currentStep ? () => handleFoodSelect(groupId, item.id) : undefined}
              responsive
              variant="full-bleed"
              showAddBadge={canAddMore}
              className={`w-full min-w-[140px] h-auto ${isSelected ? 'selection-celebrate' : ''}`}
            />
          </div>
        );
      })}
    </div>
  );

  const renderCarouselBody = (stepIndex: number, groupId: string, items: NonNullable<ReturnType<typeof getItem>>[], groupSels: string[], config: { min: number; max: number }) => {
    if (items.length === 0) return null;
    const isActive = stepIndex === currentStep;
    const index = Math.min(carouselIndex, items.length - 1);
    const current = items[index];
    const isSelected = groupSels.includes(current.id);
    const isSelectedElsewhere = !isSelected && allSelectedFoodIds.has(current.id);
    // Picking beyond min only reads as "adding" when more than one pick is allowed;
    // for a max-1 group, selecting always swaps in the new choice.
    const isAddingMore = config.max > 1 && groupSels.length >= config.min;

    return (
      <div className="kid-carousel">
        <div
          className="kid-carousel-track"
          ref={isActive ? carouselTrackRef : undefined}
          onScroll={isActive ? handleCarouselScroll : undefined}
        >
          {items.map((item, idx) => {
            const itemSelected = groupSels.includes(item.id);
            const itemDisabledElsewhere = !itemSelected && allSelectedFoodIds.has(item.id);

            return (
              <div key={item.id} className="kid-carousel-item" data-active={idx === index}>
                <div className="kid-carousel-card" data-disabled={selectionsLocked || itemDisabledElsewhere}>
                  <img
                    src={item.imageUrl || getPlaceholderImageUrl()}
                    alt={item.name}
                    className="kid-carousel-card-photo"
                  />
                  <div className="kid-carousel-card-name">{item.name}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="kid-carousel-dots" role="tablist" aria-label="Food options">
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={idx === index}
              aria-label={`Show ${item.name}`}
              data-active={idx === index}
              className="kid-carousel-dot"
              onClick={() => scrollCarouselToIndex(idx)}
            />
          ))}
        </div>

        {/* Swiping browses freely; this row is only for selecting the centered
            item, plus a way to skip past it without picking (before the
            group's minimum is met — once it is, "Add this too"/"Selected"
            already cover browsing, and the bottom dock handles moving on). */}
        <div className="kid-carousel-controls">
          <Button
            mode="kid"
            variant={isSelected ? 'secondary' : 'primary'}
            size="touch"
            fullWidth
            disabled={selectionsLocked || !isActive || isSelectedElsewhere}
            onClick={() => handleFoodSelect(groupId, current.id)}
          >
            {isSelectedElsewhere ? (
              <span>Picked already</span>
            ) : isSelected ? (
              <>
                <span>Selected</span>
                <Check className="ml-2 h-6 w-6" strokeWidth={3} aria-hidden="true" />
              </>
            ) : isAddingMore ? (
              <>
                <span>Add this too</span>
                <Plus className="ml-2 h-6 w-6" strokeWidth={3} aria-hidden="true" />
              </>
            ) : (
              <>
                <span>This one</span>
                <Check className="ml-2 h-6 w-6" strokeWidth={3} aria-hidden="true" />
              </>
            )}
          </Button>

          {!isSelected && !isAddingMore && (
            <button
              type="button"
              className="kid-carousel-skip"
              onClick={() => scrollCarouselToIndex(Math.min(items.length - 1, index + 1))}
              disabled={index === items.length - 1}
              aria-label="Skip without picking"
            >
              <ChevronRight className="h-6 w-6" strokeWidth={2.6} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = (stepIndex: number, animClass: string) => {
    const group = sortedGroups[stepIndex];
    if (!group) return null;
    const config = SELECTION_PRESET_CONFIG[group.selectionPreset];
    const groupSels = selections[group.id] || [];
    const items = group.foodIds.map((id) => getItem(id)).filter((item): item is NonNullable<typeof item> => item != null);

    return (
      <div
        key={`step-${stepIndex}`}
        className={`${animClass ? 'absolute inset-0' : 'relative h-full'} min-h-0 overflow-y-auto overscroll-contain px-4 pb-5 pt-3 md:px-6 md:pb-6 md:pt-4 ${animClass}`}
      >
        {renderSelectHeader(stepIndex, viewMode === 'grid' ? 'grid' : 'carousel')}

        {viewMode === 'grid'
          ? renderGridBody(stepIndex, group.id, items, groupSels, config)
          : renderCarouselBody(stepIndex, group.id, items, groupSels, config)}
      </div>
    );
  };

  return (
    <AppShell mode="kid" className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
      {/* Keep identity on the left, the meal journey centered, and the layout
          control in the upper-right without letting any one area shift another. */}
      <header className="app-header flex-shrink-0 px-2 py-2 md:px-4">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-[5.75rem_minmax(0,1fr)_5.75rem] items-center">
          <div className="flex items-center gap-1 justify-self-start">
            <button
              onClick={currentStep > 0 ? goToPreviousStep : onBack}
              className="ui-icon-button"
              aria-label={currentStep > 0 ? 'Previous step' : 'Go back'}
            >
              <ChevronLeft className="h-8 w-8 text-gray-600" />
            </button>
            <KidAvatar
              name={kid.name}
              color={kid.avatarColor}
              avatarAnimal={kid.avatarAnimal}
              size="sm"
              compact
            />
          </div>

          <div className="kid-selection-progress-slot min-w-0 justify-self-center">
            <StepProgress
              currentStep={currentStep}
              totalSteps={totalSteps}
              completedSelections={completedSelections}
              onStepClick={goToStep}
              compact
            />
          </div>

          <div className="justify-self-end">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>

          <h1 className="sr-only">{kid.name}'s menu choices</h1>
        </div>
      </header>

      {/* Step Content - Animated */}
      <main
        ref={contentRef}
        className="relative min-h-0 flex-1 overflow-hidden"
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
          <span className="celebrate-text text-5xl font-extrabold text-kid-primary-deep font-heading">
            {celebrateText}
          </span>
        </div>
      )}

      {/* Footer */}
      <footer className="kid-action-dock flex-shrink-0 px-4 pb-2 pt-2 md:px-6 md:pb-3 md:pt-3">
        <div className="max-w-xl mx-auto">
          {isLastStep ? (
            <Button
              mode="kid"
              variant="primary"
              size="touch"
              fullWidth
              onClick={handleConfirm}
              disabled={!canConfirm || submitting}
            >
              <span>{submitting ? 'Saving…' : canConfirm ? 'This is my plate!' : getRequirementsMessage()}</span>
              {canConfirm && !submitting && <Check className="ml-2 h-7 w-7" strokeWidth={3} aria-hidden="true" />}
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
              <span>
                {canProceedFromStep
                  ? (presetConfig?.max === 1 ? 'Next...' : 'Next')
                  : `Pick ${presetConfig ? presetConfig.min - currentGroupSelections.length : 0} more!`
                }
              </span>
              {canProceedFromStep && <ArrowRight className="ml-2 h-7 w-7" strokeWidth={3} aria-hidden="true" />}
            </Button>
          )}
          {submitError && (
            <p className="text-center text-danger font-medium mt-3" role="alert">{submitError}</p>
          )}
        </div>
      </footer>
    </AppShell>
  );
}
