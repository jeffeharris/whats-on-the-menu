import { Card } from '../../components/common/Card';
import { useMealHistory } from '../../contexts/MealHistoryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';

interface MealHistoryListProps {
  onBack: () => void;
  onSelectMeal: (mealId: string) => void;
}

export function MealHistoryList({ onBack, onSelectMeal }: MealHistoryListProps) {
  const { meals } = useMealHistory();
  const { getProfile } = useKidProfiles();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
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
        <h1 className="text-2xl font-bold text-gray-800">Meal History</h1>
      </header>

      <div className="max-w-lg mx-auto space-y-4">
        {meals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No meals recorded yet.</p>
            <p className="text-gray-400 text-sm mt-1">Complete a meal to see it here.</p>
          </div>
        ) : (
          meals.map((meal) => {
            const kidNames = meal.selections
              .map((s) => getProfile(s.kidId)?.name)
              .filter(Boolean);

            return (
              <Card
                key={meal.id}
                onClick={() => onSelectMeal(meal.id)}
                className="hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-parent-primary/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-parent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{formatDate(meal.completedAt)}</p>
                    <p className="text-sm text-gray-500">
                      {kidNames.length} {kidNames.length === 1 ? 'kid' : 'kids'}: {kidNames.join(', ')}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
