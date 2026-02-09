import { Link } from 'react-router-dom';
import { UtensilsCrossed, CalendarDays, Smile, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: CalendarDays,
    title: 'Plan Ahead',
    description: 'Build weekly menus from your family\'s favorite foods and discover new ones together.',
  },
  {
    icon: Smile,
    title: 'Kid-Friendly',
    description: 'Let kids pick their plates from parent-approved options — no more mealtime battles.',
  },
  {
    icon: TrendingUp,
    title: 'Track Progress',
    description: 'See what your family loves, review meals together, and celebrate adventurous eaters.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-[var(--color-parent-bg)] flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[var(--color-parent-primary)] mb-6">
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold text-gray-900 mb-3">
          What's On The Menu
        </h1>
        <p className="text-lg text-gray-600 max-w-md mb-8">
          Family meal planning made simple. Build menus, let kids choose, and enjoy dinner together.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link
            to="/signup"
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-white bg-[var(--color-parent-primary)] hover:opacity-90 transition-opacity text-center"
          >
            Get Started Free
          </Link>
          <Link
            to="/login"
            className="flex-1 py-3 px-6 rounded-xl font-semibold text-[var(--color-parent-primary)] border-2 border-[var(--color-parent-primary)] hover:bg-[var(--color-parent-primary)] hover:text-white transition-colors text-center"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-16">
        <div className="max-w-3xl mx-auto grid gap-6 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-parent-primary)]/10 mb-4">
                <feature.icon className="w-6 h-6 text-[var(--color-parent-primary)]" />
              </div>
              <h3 className="font-[family-name:var(--font-heading)] font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-gray-200 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-4">
          <Link to="/terms" className="hover:text-gray-700 transition-colors">
            Terms of Service
          </Link>
          <span>&middot;</span>
          <Link to="/privacy" className="hover:text-gray-700 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
