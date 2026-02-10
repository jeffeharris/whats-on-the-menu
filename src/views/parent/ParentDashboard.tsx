import { useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
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
  const { items } = useFoodLibrary();
  const { profiles } = useKidProfiles();
  const { currentMenu, loadPresetAsActive, loadPreset, presets, presetsLoading } = useMenu();
  const { meals } = useMealHistory();
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
      count: `${items.length} ${items.length === 1 ? 'item' : 'items'}`,
      color: 'bg-parent-primary/10',
      iconColor: 'text-parent-primary',
    },
    {
      key: 'kid-profiles',
      label: 'Kid Profiles',
      icon: Users,
      count: `${profiles.length} ${profiles.length === 1 ? 'kid' : 'kids'}`,
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
      count: `${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}`,
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
      count: 'Change PIN',
      color: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
  ];

  return (
    <div className="h-full bg-parent-bg flex flex-col overflow-hidden">
      <header className="flex-shrink-0 flex justify-between items-start p-4 md:p-6 pb-2 max-w-2xl mx-auto w-full">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-1">
            {getGreeting()}
          </p>
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'var(--font-heading)' }}>
            What's on the menu?
          </h1>
        </div>
        <Button variant="ghost" size="sm" onClick={logoutParent} className="mt-1">
          <span className="flex items-center gap-1.5">
            <ArrowRightLeft className="w-4 h-4" />
            Kid Mode
          </span>
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-lg md:max-w-2xl mx-auto">
          <div data-coach-mark="quick-launch">
            <QuickLaunchPresets onLaunch={handleQuickLaunch} onEdit={handleQuickEdit} />
          </div>

          <div className="mb-3 flex items-center gap-3 mt-2">
            <h2
              className="text-xs font-semibold tracking-widest uppercase text-gray-400"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Manage
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
          </div>

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
                    className="hover:shadow-lg transition-all duration-200 fade-up-in"
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
    </div>
  );
}
