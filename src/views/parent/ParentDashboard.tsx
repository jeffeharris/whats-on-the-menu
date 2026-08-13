import { useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { AppShell } from '../../components/common/AppShell';
import { BrandMark } from '../../components/common/BrandMark';
import { SectionHeading } from '../../components/common/SectionHeading';
import { QuickLaunchPresets } from '../../components/parent/QuickLaunchPresets';
import { useAppState } from '../../contexts/AppStateContext';
import { useFoodLibrary } from '../../contexts/FoodLibraryContext';
import { useKidProfiles } from '../../contexts/KidProfilesContext';
import { useMenu } from '../../contexts/MenuContext';
import { useMealHistory } from '../../contexts/MealHistoryContext';
import { useCoachMarks } from '../../components/coachmarks/useCoachMarks';
import { CoachMarksOverlay } from '../../components/coachmarks/CoachMarksOverlay';
import { DASHBOARD_STEPS } from '../../components/coachmarks/steps';
import {
  UtensilsCrossed, Users, ClipboardList, Clock, Share2,
  Settings as SettingsIcon, ChevronRight, ArrowRightLeft,
} from 'lucide-react';
import type { PresetSlot } from '../../types';

const FEATURE_SHARED_MENUS = import.meta.env.VITE_FEATURE_SHARED_MENUS === 'true';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

type NavigableView = 'food-library' | 'kid-profiles' | 'menu-builder' | 'settings' | 'meal-history-list' | 'shared-menus-list';

interface ParentDashboardProps {
  onNavigate: (view: NavigableView) => void;
}

export function ParentDashboard({ onNavigate }: ParentDashboardProps) {
  const { logoutParent, setMode } = useAppState();
  const { items, loading: itemsLoading, error: itemsError } = useFoodLibrary();
  const { profiles, loading: profilesLoading, error: profilesError } = useKidProfiles();
  const { currentMenu, loadPresetAsActive, loadPreset, presets, presetsLoading } = useMenu();
  const { meals, loading: mealsLoading, error: mealsError } = useMealHistory();

  /**
   * This is the screen you land on after signing in, so it is where a bad count
   * does the most damage: "0 items" next to a full library is the symptom users
   * reported. Show a neutral placeholder rather than a number we don't have.
   */
  const countLabel = (
    loading: boolean,
    error: boolean,
    n: number,
    singular: string,
    plural: string,
  ) => {
    if (error) return 'Tap to retry';
    if (loading) return '—';
    return `${n} ${n === 1 ? singular : plural}`;
  };
  const coachMarks = useCoachMarks();

  // Start coach marks if presets exist (seeded) and user hasn't seen them
  useEffect(() => {
    if (presetsLoading || coachMarks.isComplete) return;
    const hasPresets = presets && Object.values(presets).some((p) => p !== null);
    if (hasPresets) {
      // Small delay to let layout settle
      const timer = setTimeout(() => coachMarks.start(), 600);
      return () => clearTimeout(timer);
    }
  }, [presetsLoading, presets, coachMarks.isComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickLaunch = async (slot: PresetSlot) => {
    await loadPresetAsActive(slot);
    setMode('kid');
  };

  const handleQuickEdit = (slot: PresetSlot) => {
    loadPreset(slot);
    onNavigate('menu-builder');
  };

  const features: {
    key: NavigableView;
    label: string;
    icon: React.ElementType;
    count: string;
    color: string;
    iconColor: string;
  }[] = [
    {
      key: 'food-library',
      label: 'Food Library',
      icon: UtensilsCrossed,
      count: countLabel(itemsLoading, itemsError, items.length, 'item', 'items'),
      color: 'bg-parent-primary/10',
      iconColor: 'text-parent-primary',
    },
    {
      key: 'kid-profiles',
      label: 'Kid Profiles',
      icon: Users,
      count: countLabel(profilesLoading, profilesError, profiles.length, 'kid', 'kids'),
      color: 'bg-parent-secondary/10',
      iconColor: 'text-parent-secondary',
    },
    {
      key: 'menu-builder',
      label: 'Menu Builder',
      icon: ClipboardList,
      count: currentMenu ? 'Menu active' : 'No menu set',
      color: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      key: 'meal-history-list',
      label: 'Meal History',
      icon: Clock,
      count: countLabel(mealsLoading, mealsError, meals.length, 'meal', 'meals'),
      color: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    ...(FEATURE_SHARED_MENUS ? [{
      key: 'shared-menus-list' as NavigableView,
      label: 'Shared Menus',
      icon: Share2,
      count: 'Create shareable links',
      color: 'bg-blue-100',
      iconColor: 'text-blue-600',
    }] : []),
    {
      key: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      count: 'Account & household',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
  ];

  return (
    <AppShell mode="parent" className="h-full flex flex-col overflow-hidden">
      <header className="app-header flex-shrink-0">
        <div className="flex justify-between items-center gap-4 p-4 md:px-6 md:py-5 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark className="hidden sm:block w-11 h-11 rounded-xl shadow-sm flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-widest uppercase text-gray-500 mb-0.5">
                {getGreeting()}
              </p>
              <h1 className="text-xl md:text-2xl font-bold text-brand-ink truncate font-heading">
                What's on the menu?
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentMenu && <span className="ui-chip hidden sm:inline-flex">Menu ready</span>}
            <Button variant="ghost" size="sm" onClick={logoutParent}>
              <span className="flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Kid Mode</span>
                <span className="sm:hidden">Kids</span>
              </span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-lg md:max-w-2xl mx-auto">
          <div data-coach-mark="quick-launch">
            <QuickLaunchPresets onLaunch={handleQuickLaunch} onEdit={handleQuickEdit} />
          </div>

          <SectionHeading className="mb-3 mt-2">Manage</SectionHeading>

          <div className="grid gap-3 md:grid-cols-2">
            {features.map((feature, index) => {
              const FeatureIcon = feature.icon;
              const coachMarkId = feature.key === 'food-library' || feature.key === 'kid-profiles'
                ? feature.key
                : undefined;
              return (
                <div key={feature.key} data-coach-mark={coachMarkId}>
                  <Card
                    onClick={() => onNavigate(feature.key)}
                    className="fade-up-in"
                    style={{ animationDelay: `${300 + index * 75}ms` }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 ${feature.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <FeatureIcon className={`w-5 h-5 ${feature.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-semibold text-gray-800 text-sm"
                          style={{ fontFamily: 'var(--font-heading)' }}
                        >
                          {feature.label}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{feature.count}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <CoachMarksOverlay
        step={coachMarks.currentStep}
        onNext={coachMarks.next}
        onSkip={coachMarks.skip}
        stepIndex={coachMarks.stepIndex}
        totalSteps={DASHBOARD_STEPS.length}
      />
    </AppShell>
  );
}
