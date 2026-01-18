import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { CompletionStatusSelector } from '../../components/parent/CompletionStatusSelector';
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
  const { currentMenu, selections, unlockAndClearSelections } = useMenu();
  const { addMeal } = useMealHistory();

  // Initialize reviews state for all kids with selections
  const [reviews, setReviews] = useState<{ [kidId: string]: KidMealReview }>(() => {
    const initial: { [kidId: string]: KidMealReview } = {};
    selections.forEach((selection) => {
      initial[selection.kidId] = {
        kidId: selection.kidId,
        mainCompletion: null,
        sideCompletions: selection.sideIds.reduce((acc, sideId) => {
          acc[sideId] = null;
          return acc;
        }, {} as { [sideId: string]: CompletionStatus }),
      };
    });
    return initial;
  });

  const updateMainCompletion = (kidId: string, status: CompletionStatus) => {
    setReviews((prev) => ({
      ...prev,
      [kidId]: {
        ...prev[kidId],
        mainCompletion: status,
      },
    }));
  };

  const updateSideCompletion = (kidId: string, sideId: string, status: CompletionStatus) => {
    setReviews((prev) => ({
      ...prev,
      [kidId]: {
        ...prev[kidId],
        sideCompletions: {
          ...prev[kidId].sideCompletions,
          [sideId]: status,
        },
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
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Review Meal</h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-lg">No selections to review.</p>
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
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Review Meal</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="max-w-lg md:max-w-3xl mx-auto">
          {/* Kid sections */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
        {selections.map((selection) => {
          const kid = getProfile(selection.kidId);
          const mainItem = selection.mainId ? getItem(selection.mainId) : null;
          const sideItems = selection.sideIds.map((id) => getItem(id)).filter(Boolean);
          const review = reviews[selection.kidId];

          if (!kid) return null;

          return (
            <Card key={selection.kidId} className="p-4">
              {/* Kid header */}
              <div className="flex items-center gap-3 mb-4">
                <KidAvatar name={kid.name} color={kid.avatarColor} size="md" />
                <h2 className="text-xl font-semibold text-gray-800">{kid.name}'s Meal</h2>
              </div>

              {/* Main dish */}
              {mainItem && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
                      <img
                        src={mainItem.imageUrl || getPlaceholderImageUrl()}
                        alt={mainItem.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Main</span>
                      <p className="font-medium text-gray-800">{mainItem.name}</p>
                    </div>
                  </div>
                  <CompletionStatusSelector
                    value={review.mainCompletion}
                    onChange={(status) => updateMainCompletion(selection.kidId, status)}
                    foodName={mainItem.name}
                  />
                </div>
              )}

              {/* Side dishes */}
              {sideItems.map((item) => item && (
                <div key={item.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200">
                      <img
                        src={item.imageUrl || getPlaceholderImageUrl()}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Side</span>
                      <p className="font-medium text-gray-800">{item.name}</p>
                    </div>
                  </div>
                  <CompletionStatusSelector
                    value={review.sideCompletions[item.id]}
                    onChange={(status) => updateSideCompletion(selection.kidId, item.id, status)}
                    foodName={item.name}
                  />
                </div>
              ))}
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
