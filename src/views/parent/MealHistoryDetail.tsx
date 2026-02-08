import { ArrowLeft, Star, ClipboardCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { getCompletionCardColor } from '../../components/parent/CompletionStatusSelector';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { CompletionStatus, KidSelection } from '../../types';

interface MealHistoryDetailProps {
  mealId: string;
  onBack: () => void;
}

function CompletionBadge({ status }: { status: CompletionStatus }) {
  if (!status) return null;

  const styles: Record<NonNullable<CompletionStatus>, { bg: string; text: string; label: string }> = {
    all: { bg: 'bg-success/10', text: 'text-success', label: 'All eaten' },
    some: { bg: 'bg-warning/10', text: 'text-warning', label: 'Some eaten' },
    none: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Not eaten' },
  };

  const style = styles[status];

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// Helper to get all food IDs from a selection (handles both old and new format)
function getAllFoodIds(selection: KidSelection): string[] {
  const ids: string[] = [];
  if (selection.selections) {
    Object.values(selection.selections).forEach((groupIds) => {
      ids.push(...groupIds);
    });
  } else {
    if (selection.mainId) ids.push(selection.mainId);
    if (selection.sideIds) ids.push(...selection.sideIds);
  }
  return ids;
}

export function MealHistoryDetail({ mealId, onBack }: MealHistoryDetailProps) {
  const { getMeal, deleteMeal } = useMealHistory();
  const { getItem } = useFoodLibrary();
  const { getProfile } = useKidProfiles();

  const meal = getMeal(mealId);

  if (!meal) {
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
            Meal Details
          </h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
              Meal not found
            </p>
          </div>
        </main>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this meal record?')) {
      await deleteMeal(mealId);
      onBack();
    }
  };

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
            Meal Details
          </h1>
          <p className="text-sm text-gray-500">{formatDate(meal.completedAt)}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="max-w-lg md:max-w-3xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            {meal.selections.map((selection, kidIndex) => {
              const kid = getProfile(selection.kidId);
              const allFoodIds = getAllFoodIds(selection);
              const foodItems = allFoodIds.map((id) => getItem(id)).filter(Boolean);
              const review = meal.reviews.find((r) => r.kidId === selection.kidId);

              if (!kid) return null;

              const getCompletionStatus = (foodId: string): CompletionStatus => {
                if (review?.completions) return review.completions[foodId] ?? null;
                if (review?.mainCompletion && selection.mainId === foodId) return review.mainCompletion;
                if (review?.sideCompletions && review.sideCompletions[foodId]) return review.sideCompletions[foodId];
                return null;
              };

              return (
                <Card
                  key={selection.kidId}
                  className="p-4 fade-up-in"
                  style={{ animationDelay: `${kidIndex * 100}ms` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <KidAvatar name={kid.name} color={kid.avatarColor} avatarAnimal={kid.avatarAnimal} size="md" />
                    <h2
                      className="text-xl font-semibold text-gray-800 flex-1"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {kid.name}'s Meal
                    </h2>
                    {review?.earnedStar && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-full">
                        <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                        <span className="text-xs font-semibold text-yellow-700">Happy Plate!</span>
                      </div>
                    )}
                  </div>

                  {foodItems.map((item) => {
                    if (!item) return null;
                    const status = getCompletionStatus(item.id);
                    const cardColor = getCompletionCardColor(status);

                    return (
                      <div key={item.id} className={`mb-3 p-3 rounded-xl transition-all ${cardColor}`}>
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
                            <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                          </div>
                          <CompletionBadge status={status} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
              );
            })}
          </div>

          <div className="max-w-md mx-auto">
            <Button variant="danger" size="md" fullWidth onClick={handleDelete}>
              Delete Record
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
