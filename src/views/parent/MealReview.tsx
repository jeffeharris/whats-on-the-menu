import { useState } from 'react';
import { ArrowLeft, ChevronDown, Star, ClipboardCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { RingDotIcon } from '../../components/common/RingDotIcon';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { CompletionStatusSelector } from '../../components/parent/CompletionStatusSelector';
import { getAllFoodIds, getCompletionCardColor, summarizeKidReview } from '../../utils/completionUtils';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { CompletionStatus, KidMealReview } from '../../types';

interface MealReviewProps {
  onComplete: () => void;
  onBack: () => void;
}

export function MealReview({ onComplete, onBack }: MealReviewProps) {
  const { getItem } = useFoodLibrary();
  const { getProfile } = useKidProfiles();
  const { activeMenu: currentMenu, selections, unlockAndClearSelections } = useMenu();
  const { addMeal } = useMealHistory();

  // Only the marks a parent has actually made, keyed by kid then food.
  // `selections` loads asynchronously from the menu context, so reviews are
  // derived from `selections` + `marks` at read time rather than seeded into
  // state up front — a kid whose selection arrives after first render just
  // starts out fully unmarked instead of needing to be caught up.
  const [marks, setMarks] = useState<{ [kidId: string]: { [foodId: string]: CompletionStatus } }>({});

  // Kid sections collapse to a summary line once every item is marked, but stay
  // manually toggleable either way — this only tracks an explicit override.
  const [openKids, setOpenKids] = useState<{ [kidId: string]: boolean }>({});

  const toggleKidOpen = (kidId: string) => {
    setOpenKids((prev) => ({ ...prev, [kidId]: !(prev[kidId] ?? true) }));
  };

  // The star defaults to "every food marked All of it", but a parent can
  // always award or revoke it by hand (e.g. forgive a couple of crumbs) —
  // once they do, their call overrides the automatic one for this review.
  const [starOverrides, setStarOverrides] = useState<{ [kidId: string]: boolean }>({});

  const toggleStar = (kidId: string, currentEarnedStar: boolean) => {
    setStarOverrides((prev) => ({ ...prev, [kidId]: !currentEarnedStar }));
  };

  const buildReview = (kidId: string, foodIds: string[]): KidMealReview => {
    const completions = foodIds.reduce((acc, foodId) => {
      acc[foodId] = marks[kidId]?.[foodId] ?? null;
      return acc;
    }, {} as { [foodId: string]: CompletionStatus });
    const cleared = foodIds.length > 0 && foodIds.every((id) => completions[id] === 'all');
    const earnedStar = starOverrides[kidId] ?? cleared;
    return { kidId, completions, earnedStar };
  };

  const updateCompletion = (kidId: string, foodId: string, status: CompletionStatus, foodIds: string[]) => {
    setMarks((prev) => ({
      ...prev,
      [kidId]: { ...prev[kidId], [foodId]: status },
    }));

    // Auto-collapse the moment the last food is marked, same as the parent's
    // last tap. Re-opening stays available via the header.
    const updatedMarks = { ...marks[kidId], [foodId]: status };
    const allMarked = foodIds.length > 0 && foodIds.every((id) => updatedMarks[id]);
    if (allMarked) {
      setOpenKids((prev) => ({ ...prev, [kidId]: false }));
    }
  };

  const handleComplete = async () => {
    if (!currentMenu) return;

    const reviews = selections.map((selection) => buildReview(selection.kidId, getAllFoodIds(selection)));

    // Save to history
    await addMeal(currentMenu.id, selections, reviews);

    // Clear selections and unlock
    await unlockAndClearSelections();

    // Navigate back
    onComplete();
  };

  if (selections.length === 0) {
    return (
      <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
        <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
            Review Meal
          </h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
              No selections to review
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 p-4 md:p-6 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
          Review Meal
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="max-w-lg md:max-w-2xl mx-auto grid gap-3 md:grid-cols-2 md:items-start">
          {selections.map((selection, kidIndex) => {
            const kid = getProfile(selection.kidId);
            const allFoodIds = getAllFoodIds(selection);
            const foodItems = allFoodIds.map((id) => getItem(id)).filter(Boolean);
            const review = buildReview(selection.kidId, allFoodIds);

            if (!kid) return null;

            const summary = summarizeKidReview(review.completions, allFoodIds);
            const isOpen = openKids[selection.kidId] ?? true;

            return (
              <Card
                key={selection.kidId}
                padding="none"
                className="overflow-hidden fade-up-in"
                style={{ animationDelay: `${kidIndex * 100}ms` }}
              >
                {/* Kid header */}
                <div className="w-full flex items-center gap-3 p-3">
                  <button
                    onClick={() => toggleKidOpen(selection.kidId)}
                    className="flex-1 min-w-0 flex items-center gap-3 min-h-11 text-left bg-transparent border-0 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <KidAvatar name={kid.name} color={kid.avatarColor} avatarAnimal={kid.avatarAnimal} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-gray-800 text-[17px] truncate"
                        style={{ fontFamily: 'var(--font-heading)' }}
                      >
                        {kid.name}'s plate
                      </p>
                      {summary.triedEverything ? (
                        <span
                          className="inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-full bg-brand-teal-deep/10 text-brand-teal-deep text-[11px] font-bold"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          <RingDotIcon size={13} dotRadius={3.6} strokeWidth={2} />
                          Tried everything
                        </span>
                      ) : (
                        <p className="text-xs text-gray-500">{summary.summaryText}</p>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <button
                    onClick={() => toggleStar(selection.kidId, review.earnedStar ?? false)}
                    className="flex-shrink-0 p-1 -m-1 rounded-lg hover:bg-gray-50 transition-colors"
                    aria-pressed={review.earnedStar ?? false}
                    aria-label={review.earnedStar ? `Remove ${kid.name}'s Happy Plate star` : `Award ${kid.name} a Happy Plate star`}
                  >
                    <Star
                      className={`w-5 h-5 transition-colors ${review.earnedStar ? 'text-yellow-400' : 'text-gray-200'}`}
                      fill={review.earnedStar ? 'currentColor' : 'none'}
                      strokeWidth={review.earnedStar ? 0 : 1.5}
                    />
                  </button>
                </div>

                {/* Food items */}
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {foodItems.map((item) => {
                      if (!item) return null;
                      const completionStatus = review.completions[item.id] ?? null;
                      const cardColor = getCompletionCardColor(completionStatus);

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl transition-all duration-200 ${cardColor}`}
                        >
                          <div className="flex items-center gap-2.5 mb-2 min-w-0">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 shadow-sm">
                              <img
                                src={item.imageUrl || getPlaceholderImageUrl()}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              {item.tags && item.tags.length > 0 && (
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                                  {item.tags[0]}
                                </span>
                              )}
                              <p className="font-semibold text-gray-800 truncate text-sm">{item.name}</p>
                            </div>
                          </div>
                          <CompletionStatusSelector
                            value={completionStatus}
                            onChange={(status) => updateCompletion(selection.kidId, item.id, status, allFoodIds)}
                            foodName={item.name}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>

      {/* Complete button */}
      <footer className="flex-shrink-0 p-4 border-t border-gray-200/70 bg-parent-bg/90 backdrop-blur-md">
        <div className="max-w-md mx-auto">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleComplete}
          >
            Complete Meal
          </Button>
        </div>
      </footer>
    </div>
  );
}
