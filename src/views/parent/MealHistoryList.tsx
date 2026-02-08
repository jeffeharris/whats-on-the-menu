import { ArrowLeft, ClipboardCheck, Clock, ChevronRight } from 'lucide-react';
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
          Meal History
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-0">
        <div className="max-w-lg md:max-w-3xl mx-auto">
          {meals.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-gray-500 text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                No meals recorded yet
              </p>
              <p className="text-gray-400 text-sm mt-1">Complete a meal to see it here.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-xs font-semibold tracking-widest uppercase text-gray-400"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {meals.map((meal, index) => {
                  const kidNames = meal.selections
                    .map((s) => getProfile(s.kidId)?.name)
                    .filter(Boolean);

                  return (
                    <Card
                      key={meal.id}
                      onClick={() => onSelectMeal(meal.id)}
                      className="hover:shadow-lg transition-all duration-200 fade-up-in"
                      style={{ animationDelay: `${Math.min(index * 60, 500)}ms` }}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <ClipboardCheck className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{formatDate(meal.completedAt)}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {kidNames.length} {kidNames.length === 1 ? 'kid' : 'kids'}: {kidNames.join(', ')}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
