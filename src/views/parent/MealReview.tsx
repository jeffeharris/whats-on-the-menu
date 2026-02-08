import { useState } from 'react';
import { ArrowLeft, Star, ClipboardCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { CompletionStatusSelector, getCompletionCardColor } from '../../components/parent/CompletionStatusSelector';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { CompletionStatus, KidMealReview, KidSelection } from '../../types';

interface MealReviewProps {
  onComplete: () => void;
  onBack: () => void;
}

// Helper to get all food IDs from a selection (handles both old and new format)
function getAllFoodIds(selection: KidSelection): string[] {
  const ids: string[] = [];
  if (selection.selections) {
    // New structure
    Object.values(selection.selections).forEach((groupIds) => {
      ids.push(...groupIds);
    });
  } else {
    // Legacy structure
    if (selection.mainId) ids.push(selection.mainId);
    if (selection.sideIds) ids.push(...selection.sideIds);
  }
  return ids;
}

export function MealReview({ onComplete, onBack }: MealReviewProps) {
  const { getItem } = useFoodLibrary();
  const { getProfile } = useKidProfiles();
  const { currentMenu, selections, unlockAndClearSelections } = useMenu();
  const { addMeal } = useMealHistory();

  // Initialize reviews state for all kids with selections
  const [reviews, setReviews] = useState<{ [kidId: string]: KidMealReview }>(() => {
    const initial: { [kidId: string]: KidMealReview } = {};
    selections.forEach((selection) => {
      const allFoodIds = getAllFoodIds(selection);
      initial[selection.kidId] = {
        kidId: selection.kidId,
        completions: allFoodIds.reduce((acc, foodId) => {
          acc[foodId] = null;
          return acc;
        }, {} as { [foodId: string]: CompletionStatus }),
        earnedStar: false,
      };
    });
    return initial;
  });

  // Track which kids have had their star manually overridden
  const [manualStarOverride, setManualStarOverride] = useState<{ [kidId: string]: boolean }>({});

  const updateCompletion = (kidId: string, foodId: string, status: CompletionStatus) => {
    setReviews((prev) => {
      const updatedCompletions = {
        ...prev[kidId].completions,
        [foodId]: status,
      };

      // Auto-calculate star if not manually overridden
      let earnedStar = prev[kidId].earnedStar;
      if (!manualStarOverride[kidId]) {
        const allEaten = Object.values(updatedCompletions).every((s) => s === 'all');
        earnedStar = allEaten;
      }

      return {
        ...prev,
        [kidId]: {
          ...prev[kidId],
          completions: updatedCompletions,
          earnedStar,
        },
      };
    });
  };

  const toggleStar = (kidId: string) => {
    setManualStarOverride((prev) => ({ ...prev, [kidId]: true }));
    setReviews((prev) => ({
      ...prev,
      [kidId]: {
        ...prev[kidId],
        earnedStar: !prev[kidId].earnedStar,
      },
    }));
  };

  const handleComplete = async () => {
    if (!currentMenu) return;

    // Save to history
    await addMeal(currentMenu.id, selections, Object.values(reviews));

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
        <div className="max-w-lg md:max-w-3xl mx-auto">
          {/* Kid sections */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {selections.map((selection, kidIndex) => {
              const kid = getProfile(selection.kidId);
              const allFoodIds = getAllFoodIds(selection);
              const foodItems = allFoodIds.map((id) => getItem(id)).filter(Boolean);
              const review = reviews[selection.kidId];

              if (!kid) return null;

              return (
                <Card
                  key={selection.kidId}
                  className="p-4 fade-up-in"
                  style={{ animationDelay: `${kidIndex * 100}ms` }}
                >
                  {/* Kid header */}
                  <div className="flex items-center gap-3 mb-4">
                    <KidAvatar name={kid.name} color={kid.avatarColor} avatarAnimal={kid.avatarAnimal} size="md" />
                    <h2
                      className="text-xl font-semibold text-gray-800"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {kid.name}'s Meal
                    </h2>
                  </div>

                  {/* Food items */}
                  {foodItems.map((item, itemIndex) => {
                    if (!item) return null;
                    const completionStatus = review?.completions?.[item.id] ?? null;
                    const cardColor = getCompletionCardColor(completionStatus);

                    return (
                      <div
                        key={item.id}
                        className={`mb-3 p-3 rounded-xl transition-all duration-200 ${cardColor}`}
                        style={{ animationDelay: `${kidIndex * 100 + itemIndex * 50}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 shadow-sm">
                            <img
                              src={item.imageUrl || getPlaceholderImageUrl()}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            {item.tags && item.tags.length > 0 && (
                              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                                {item.tags[0]}
                              </span>
                            )}
                            <p className="font-medium text-gray-800 truncate text-sm">{item.name}</p>
                          </div>
                          <CompletionStatusSelector
                            value={completionStatus}
                            onChange={(status) => updateCompletion(selection.kidId, item.id, status)}
                            foodName={item.name}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Star toggle */}
                  <button
                    onClick={() => toggleStar(selection.kidId)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 mt-1 ${
                      review?.earnedStar
                        ? 'bg-yellow-50 border-2 border-yellow-300'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${review?.earnedStar ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill={review?.earnedStar ? 'currentColor' : 'none'}
                      strokeWidth={review?.earnedStar ? 0 : 1.5}
                    />
                    <span
                      className={`text-base font-semibold transition-colors ${
                        review?.earnedStar ? 'text-yellow-700' : 'text-gray-400'
                      }`}
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Happy Plate!
                    </span>
                  </button>
                </Card>
              );
            })}
          </div>

          {/* Complete button */}
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
        </div>
      </main>
    </div>
  );
}
