import { useMemo, useState } from 'react';
import { Check, ChevronRight, CirclePause, Settings, Sparkles, Star, UtensilsCrossed } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { AppShell } from '../../components/common/AppShell';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { GrownUpGate } from '../../components/common/GrownUpGate';
import { KidAvatar } from '../../components/kid/KidAvatar';
import { SelectionThumbnails } from '../../components/kid/SelectionThumbnails';
import { useAppState } from '../../contexts/AppStateContext';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';
import { useSound } from '../../hooks/useSound';
import { computeFoodWall } from '../../utils/foodWallUtils';

interface KidModeHomeProps {
  onSelectKid: (kidId: string) => void;
  onNavigateToStars?: () => void;
  onNavigateToFoodWall?: (kidId: string) => void;
}

export function KidModeHome({ onSelectKid, onNavigateToStars, onNavigateToFoodWall }: KidModeHomeProps) {
  const { enterParentMode, grownUpCheckEnabled, selectedKidId } = useAppState();
  const {
    getItem,
    loading: foodsLoading,
    error: foodsError,
  } = useFoodLibrary();
  const { profiles, error: profilesError, reload: reloadProfiles } = useKidProfiles();
  const { activeMenu, hasKidSelected, selections, selectionsLocked, getSelectionForKid } = useMenu();
  const {
    meals,
    loading: mealHistoryLoading,
    error: mealHistoryError,
    getStarCountForKid,
    getTotalFamilyStars,
  } = useMealHistory();
  const totalStars = getTotalFamilyStars();
  const [showPinModal, setShowPinModal] = useState(false);
  const { playPlaced } = useSound();

  const hasAnySelections = selections.length > 0;
  const defaultFoodWallKidId = selectedKidId ?? profiles[0]?.id;
  const foodProgressByKid = useMemo(
    () => new Map(profiles.map((profile) => {
      // FoodWall omits historical IDs whose library item was deleted. Apply
      // the same filter here so its launcher never promises invisible foods.
      const foods = computeFoodWall(meals, profile.id)
        .filter((food) => getItem(food.foodId));
      return [profile.id, {
        tried: foods.filter((food) => food.tried).length,
        toTry: foods.filter((food) => !food.tried).length,
        total: foods.length,
      }] as const;
    })),
    [getItem, meals, profiles],
  );

  const handleParentLogin = () => {
    if (!grownUpCheckEnabled) {
      enterParentMode();
    } else {
      setShowPinModal(true);
    }
  };

  const handleGatePassed = () => {
    setShowPinModal(false);
    enterParentMode();
  };

  // No menu set
  if (!activeMenu) {
    return (
      <AppShell mode="kid" className="flex h-full flex-col overflow-hidden p-4 md:p-8">
        <header className="flex flex-shrink-0 items-center justify-between gap-3">
          <div className="ui-chip" role="status">
            <CirclePause className="h-5 w-5 text-kid-secondary-deep" aria-hidden="true" />
            <span className="text-sm font-bold text-brand-ink">No menu right now</span>
          </div>
          <button
            onClick={handleParentLogin}
            className="ui-icon-button"
            aria-label="Parent login"
          >
            <Settings className="h-6 w-6" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-1 pb-6">
          <div className="mx-auto w-full max-w-2xl">
            <div className="pb-6 pt-6 text-center md:pt-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-kid-accent/40 shadow-sm">
                <Sparkles className="h-8 w-8 text-yellow-600" aria-hidden="true" />
              </div>
              <h1 className="kid-hero-title text-3xl md:text-4xl">
                {meals.length > 0 ? 'All done for now!' : 'No menu yet!'}
              </h1>
              <p className="mx-auto mt-2 max-w-md text-lg text-gray-600">
                {meals.length > 0
                  ? 'See your stars and food adventures while you wait.'
                  : 'A grown-up can start a menu when it is time to eat.'}
              </p>
            </div>

            <Card
              mode="kid"
              padding="lg"
              onClick={onNavigateToStars}
              className="flex items-center gap-4 text-left"
            >
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-kid-accent/40">
                <Star className="h-8 w-8 fill-yellow-400 text-yellow-500" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="kid-hero-title text-xl">Our Stars</h2>
                <p className="mt-0.5 text-sm text-gray-600">
                  {mealHistoryError
                    ? 'Stars could not be updated right now'
                    : mealHistoryLoading
                      ? 'Counting your latest stars…'
                      : totalStars === 1
                        ? '1 Happy Plate Star'
                        : `${totalStars} Happy Plate Stars`}
                </p>
              </div>
              <ChevronRight className="h-6 w-6 flex-shrink-0 text-gray-400" aria-hidden="true" />
            </Card>

            <section className="mt-6" aria-labelledby="food-adventures-heading">
              <div className="mb-3 px-1">
                <h2 id="food-adventures-heading" className="kid-hero-title text-xl">
                  Food adventures
                </h2>
                <p className="mt-0.5 text-sm text-gray-600">See what you have tried and what is still waiting.</p>
              </div>

              {profilesError ? (
                <Card mode="kid" className="text-center">
                  <p className="text-gray-600">We could not find everyone right now.</p>
                  <Button mode="kid" variant="secondary" size="md" className="mt-3" onClick={reloadProfiles}>
                    Try Again
                  </Button>
                </Card>
              ) : profiles.length === 0 ? (
                <Card mode="kid" className="text-center text-gray-600">
                  Ask a grown-up to add your name.
                </Card>
              ) : (
                <div className={`grid gap-3 ${profiles.length === 1 ? 'mx-auto max-w-sm grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {profiles.map((profile) => {
                    const progress = foodProgressByKid.get(profile.id);
                    let progressText = 'Foods show up after your first meal';
                    if (mealHistoryError || foodsError) {
                      progressText = 'Foods could not be updated right now';
                    } else if (mealHistoryLoading || foodsLoading) {
                      progressText = 'Updating your food wall…';
                    } else if (progress && progress.total > 0) {
                      progressText = `${progress.tried} tried · ${progress.toTry} to try`;
                    }

                    return (
                      <Card
                        key={profile.id}
                        mode="kid"
                        padding="sm"
                        onClick={onNavigateToFoodWall ? () => onNavigateToFoodWall(profile.id) : undefined}
                        className="flex min-h-20 items-center gap-3 text-left"
                      >
                        <KidAvatar
                          name={profile.name}
                          color={profile.avatarColor}
                          avatarAnimal={profile.avatarAnimal}
                          size="md"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="kid-hero-title truncate text-lg">{profile.name}'s foods</h3>
                          <p className="mt-0.5 text-xs leading-snug text-gray-600">{progressText}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>

        <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} mode="kid">
          <GrownUpGate
            onSuccess={handleGatePassed}
            onCancel={() => setShowPinModal(false)}
          />
        </Modal>
      </AppShell>
    );
  }

  // No kids set up — or we couldn't read them. Kid-facing copy has to tell the
  // truth without asking a child to debug: "ask a grown-up to add your name"
  // sends them to a parent who will find their kids already there.
  if (profiles.length === 0) {
    return (
      <AppShell mode="kid" className="h-full flex flex-col items-center justify-center p-6 overflow-hidden">
        <div className="text-center max-w-md">
          <h1 className="kid-hero-title text-3xl mb-4">
            {profilesError ? 'Hang on!' : "Who's Here?"}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {profilesError
              ? "We can't find everyone right now. Ask a grown-up to check."
              : 'Ask a grown-up to add your name'}
          </p>
          {profilesError && (
            <div className="mb-6">
              <Button mode="kid" variant="secondary" size="touch" onClick={reloadProfiles}>
                Try Again
              </Button>
            </div>
          )}
          <Button
            mode="kid"
            variant="primary"
            size="touch"
            onClick={handleParentLogin}
          >
            Parent Login
          </Button>
        </div>

        <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} mode="kid">
          <GrownUpGate
            onSuccess={handleGatePassed}
            onCancel={() => setShowPinModal(false)}
          />
        </Modal>
      </AppShell>
    );
  }

  return (
    <AppShell mode="kid" className="h-full flex flex-col p-4 md:p-8 overflow-hidden">
      {/* Header with parent access */}
      <header className="flex-shrink-0 flex justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {(totalStars > 0 || selectionsLocked) && (
            <button
              onClick={onNavigateToStars}
              className="ui-chip hover:-translate-y-0.5 transition-transform"
              aria-label="Our Stars"
            >
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-bold text-yellow-700">Our Stars</span>
            </button>
          )}
          {onNavigateToFoodWall && defaultFoodWallKidId && (
            <button
              onClick={() => onNavigateToFoodWall(defaultFoodWallKidId)}
              className="ui-chip hover:-translate-y-0.5 transition-transform"
              aria-label="My Foods"
            >
              <UtensilsCrossed className="w-4 h-4 text-brand-teal-deep" />
              <span className="text-sm font-bold text-brand-ink">My Foods</span>
            </button>
          )}
        </div>
        <button
          onClick={handleParentLogin}
          className="ui-icon-button"
          aria-label="Parent login"
        >
          <Settings className="w-6 h-6" />
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="kid-hero-title text-4xl md:text-5xl mb-2 text-center">
          {selectionsLocked ? 'Enjoy your meal!' : "Who's hungry?"}
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 md:mb-12 text-center">
          {selectionsLocked ? 'Here are the plates your grown-up approved.' : 'Tap your name to pick your food!'}
        </p>

        {/* Kid avatars */}
        <div className={`grid ${profiles.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'} gap-6 md:gap-10 max-w-3xl mx-auto`}>
          {profiles.map((profile) => {
            const hasSelected = hasKidSelected(profile.id);
            const selection = getSelectionForKid(profile.id);
            return (
              <div key={profile.id} className="flex flex-col items-center">
                <div className="relative">
                  <KidAvatar
                    name={profile.name}
                    color={profile.avatarColor}
                    avatarAnimal={profile.avatarAnimal}
                    size="2xl"
                    onClick={selectionsLocked && !hasSelected
                      ? undefined
                      : () => { playPlaced(); onSelectKid(profile.id); }}
                    ariaLabel={selectionsLocked && !hasSelected
                      ? `${profile.name} has no plate this time`
                      : undefined}
                  />
                  {hasSelected && (
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-success border-[3px] border-white rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-6 h-6 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <span className="mt-4 text-2xl font-bold text-brand-ink font-heading">
                  {profile.name}
                </span>
                {(() => {
                  const starCount = getStarCountForKid(profile.id);
                  return starCount > 0 ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-bold text-yellow-600">{starCount}</span>
                    </div>
                  ) : null;
                })()}
                {hasSelected && selection && (
                  <>
                    <SelectionThumbnails selection={selection} />
                    <span className="text-sm text-success font-medium mt-1">
                      {selectionsLocked ? 'Plate ready!' : 'Done!'}
                    </span>
                  </>
                )}
                {selectionsLocked && !hasSelected && (
                  <span className="text-sm text-gray-500 font-medium mt-2">No plate this time</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-device handoff status */}
      {hasAnySelections && (
        <div className="kid-action-dock -mx-4 -mb-4 mt-6 p-4 md:-mx-8 md:-mb-8 md:p-6">
          <div className="max-w-xl mx-auto flex items-center justify-center gap-3 text-center" role="status" aria-live="polite">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${selectionsLocked ? 'bg-success' : 'bg-kid-secondary-deep'}`}>
              <Check className="w-6 h-6 text-white" strokeWidth={3} />
            </div>
            <div className="text-left">
              <p className="font-bold text-brand-ink font-heading">
                {selectionsLocked ? 'A grown-up approved your plates!' : 'Your choices are saved!'}
              </p>
              <p className="text-sm text-gray-600">
                {selectionsLocked ? 'Tap a name to see the whole plate.' : 'Tell your grown-up they can review them on their phone.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Parent Login Modal */}
      <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} mode="kid">
        <GrownUpGate
          onSuccess={handleGatePassed}
          onCancel={() => setShowPinModal(false)}
        />
      </Modal>
    </AppShell>
  );
}
