import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';
import type { CompletionStatus } from '../../types';

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
    <span className={`text-xs px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

export function MealHistoryDetail({ mealId, onBack }: MealHistoryDetailProps) {
  const { getMeal, deleteMeal } = useMealHistory();
  const { getItem } = useFoodLibrary();
  const { getProfile } = useKidProfiles();

  const meal = getMeal(mealId);

  if (!meal) {
    return (
      <div className="min-h-screen bg-parent-bg p-4">
        <header className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Meal Details</h1>
        </header>
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Meal not found.</p>
        </div>
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
    <div className="min-h-screen bg-parent-bg p-4">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Meal Details</h1>
          <p className="text-sm text-gray-500">{formatDate(meal.completedAt)}</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto space-y-6">
        {/* Kid sections */}
        {meal.selections.map((selection) => {
          const kid = getProfile(selection.kidId);
          const mainItem = selection.mainId ? getItem(selection.mainId) : null;
          const sideItems = selection.sideIds.map((id) => getItem(id)).filter(Boolean);
          const review = meal.reviews.find((r) => r.kidId === selection.kidId);

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
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
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
                    <CompletionBadge status={review?.mainCompletion ?? null} />
                  </div>
                </div>
              )}

              {/* Side dishes */}
              {sideItems.map((item) => item && (
                <div key={item.id} className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
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
                    <CompletionBadge status={review?.sideCompletions[item.id] ?? null} />
                  </div>
                </div>
              ))}
            </Card>
          );
        })}

        {/* Delete button */}
        <Button
          variant="danger"
          size="md"
          fullWidth
          onClick={handleDelete}
        >
          Delete Record
        </Button>
      </div>
    </div>
  );
}
