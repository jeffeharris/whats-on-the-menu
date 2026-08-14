import { useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, LockKeyhole, RotateCcw } from 'lucide-react';
import { AppShell } from '../../components/common/AppShell';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';
import { getPlaceholderImageUrl } from '../../utils/imageUtils';

interface ChoiceReviewProps {
  onBack: () => void;
  onContinueToMealReview: () => void;
}

export function ChoiceReview({ onBack, onContinueToMealReview }: ChoiceReviewProps) {
  const {
    getItem,
    loading: foodsLoading,
    error: foodsError,
    reload: reloadFoods,
  } = useFoodLibrary();
  const {
    getProfile,
    loading: profilesLoading,
    error: profilesError,
    reload: reloadProfiles,
  } = useKidProfiles();
  const {
    activeMenu: currentMenu,
    selections,
    selectionStatus,
    approveSelections,
    unlockSelections,
  } = useMenu();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reviewDataLoading = foodsLoading || profilesLoading;
  const reviewDataError = foodsError || profilesError;

  const changeStatus = async (action: 'approve' | 'unlock') => {
    setSaving(true);
    setError(null);
    try {
      if (action === 'approve') await approveSelections();
      else await unlockSelections();
    } catch (err) {
      setError((err as Error).message || 'Could not update the choices');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell mode="parent" className="relative h-full flex flex-col overflow-hidden">
      <header className="app-header flex-shrink-0">
        <div className="flex items-center gap-3 p-4 md:px-6 md:py-5 max-w-3xl mx-auto w-full">
          <button onClick={onBack} className="ui-icon-button" aria-label="Go back">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-500">Before the meal</p>
            <h1 className="text-2xl font-bold text-brand-ink font-heading">Review choices</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          {reviewDataLoading ? (
            <div className="text-center py-16" role="status">
              <div className="w-8 h-8 border-4 border-parent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading choices…</p>
            </div>
          ) : reviewDataError ? (
            <Card className="max-w-md mx-auto text-center py-10">
              <AlertTriangle className="w-10 h-10 text-warning mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-brand-ink font-heading">Choices couldn't load</h2>
              <p className="text-gray-500 mt-2 mb-5">
                Nothing has been approved. Try again so you can see every plate first.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  if (foodsError) reloadFoods();
                  if (profilesError) reloadProfiles();
                }}
              >
                Try again
              </Button>
            </Card>
          ) : selections.length === 0 || !currentMenu ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="w-8 h-8 text-gray-300" />
              </div>
              <h2 className="text-xl font-semibold text-brand-ink font-heading">No choices yet</h2>
              <p className="text-gray-500 mt-2">Kids' completed plates will appear here automatically.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                {selections.map((selection, index) => {
                  const kid = getProfile(selection.kidId);
                  if (!kid) return null;

                  const groups = [...currentMenu.groups]
                    .sort((a, b) => a.order - b.order)
                    .map((group) => ({
                      label: group.label,
                      items: (selection.selections[group.id] || []).map((foodId) => ({
                        foodId,
                        item: getItem(foodId),
                      })),
                    }))
                    .filter((group) => group.items.length > 0);

                  return (
                    <Card
                      key={selection.kidId}
                      className="fade-up-in"
                      style={{ animationDelay: `${index * 75}ms` }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <KidAvatar
                          name={kid.name}
                          color={kid.avatarColor}
                          avatarAnimal={kid.avatarAnimal}
                          size="md"
                        />
                        <div className="min-w-0">
                          <h2 className="text-xl font-semibold text-brand-ink font-heading truncate">
                            {kid.name}'s plate
                          </h2>
                          <p className="text-xs text-gray-500">
                            Updated {new Date(selection.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {groups.map((group) => (
                          <section key={group.label}>
                            <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-2">
                              {group.label}
                            </h3>
                            <div className="space-y-2">
                              {group.items.map(({ foodId, item }) => item ? (
                                <div key={foodId} className="flex items-center gap-3 rounded-xl bg-gray-50 p-2.5">
                                  <img
                                    src={item.imageUrl || getPlaceholderImageUrl()}
                                    alt=""
                                    className="w-11 h-11 rounded-lg object-cover bg-gray-200"
                                  />
                                  <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                                </div>
                              ) : (
                                <div key={foodId} className="flex items-center gap-3 rounded-xl bg-warning/10 p-2.5 text-warning">
                                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                  <span className="font-medium text-sm">This choice is no longer in the food library</span>
                                </div>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>

              {selectionStatus === 'approved' ? (
                <div className="h-56" aria-hidden="true" />
              ) : (
                <div className="max-w-md mx-auto mt-6 pb-4">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="gap-2"
                    disabled={saving}
                    onClick={() => void changeStatus('approve')}
                  >
                    <LockKeyhole className="w-5 h-5" />
                    {saving ? 'Approving…' : 'Approve & lock choices'}
                  </Button>
                  {error && <p className="text-sm text-danger text-center mt-3" role="alert">{error}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {!reviewDataLoading && !reviewDataError && selections.length > 0 && currentMenu && selectionStatus === 'approved' && (
        <footer
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pt-10 md:px-6"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <div
            className="absolute inset-0 -z-10"
            style={{
              background: 'linear-gradient(to top, var(--ui-color-canvas) 0%, color-mix(in srgb, var(--ui-color-canvas) 90%, transparent) 72%, transparent 100%)',
            }}
          />
          <div className="pointer-events-auto max-w-md mx-auto rounded-2xl bg-success/10 border border-success/20 p-4 text-center backdrop-blur-md shadow-lg">
            <div role="status" aria-live="polite">
              <CheckCircle2 className="w-9 h-9 text-success mx-auto mb-2" />
              <h2 className="font-semibold text-brand-ink font-heading">Choices approved</h2>
              <p className="text-sm text-gray-600 mt-1 mb-4">The kids' plates are locked on every device.</p>
            </div>
            <div className="space-y-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                className="gap-2"
                onClick={onContinueToMealReview}
              >
                Continue to meal review
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                fullWidth
                className="gap-2"
                disabled={saving}
                onClick={() => void changeStatus('unlock')}
              >
                <RotateCcw className="w-4 h-4" />
                {saving ? 'Unlocking…' : 'Unlock choices'}
              </Button>
            </div>
            {error && <p className="text-sm text-danger text-center mt-3" role="alert">{error}</p>}
          </div>
        </footer>
      )}
    </AppShell>
  );
}
