export interface CoachMarkStep {
  id: string;
  selector: string;           // data-coach-mark attribute value
  title: string;
  description: string;
  icon: string;               // Lucide icon name
  placement: 'bottom' | 'top';
}

export const DASHBOARD_STEPS: CoachMarkStep[] = [
  {
    id: 'quick-launch',
    selector: 'quick-launch',
    title: 'Your sample menus are ready!',
    description: 'Tap play to launch one for your kids.',
    icon: 'Rocket',
    placement: 'bottom',
  },
  {
    id: 'food-library',
    selector: 'food-library',
    title: 'Your food library',
    description: 'You have 48 kid-friendly foods to start. Add, edit, or remove anytime.',
    icon: 'UtensilsCrossed',
    placement: 'bottom',
  },
  {
    id: 'kid-profiles',
    selector: 'kid-profiles',
    title: 'Kid profiles',
    description: 'Add your kids so they can pick their own meals.',
    icon: 'Users',
    placement: 'top',
  },
  {
    id: 'completion',
    selector: '',              // No target — centered card
    title: "You're all set!",
    description: 'Add a kid profile to get started.',
    icon: 'PartyPopper',
    placement: 'bottom',
  },
];
