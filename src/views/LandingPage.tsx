import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Smile, TrendingUp, Coffee } from 'lucide-react';
import { BrandMark } from '../components/common/BrandMark';

// Optional tip-jar link (e.g. Buy Me a Coffee); hidden when VITE_SUPPORT_URL is unset.
const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL;

const features = [
  {
    icon: CalendarDays,
    title: 'Plan Ahead',
    description: 'Build weekly menus from your family\'s favorite foods and discover new ones together.',
    iconStyle: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Smile,
    title: 'Kid-Friendly',
    description: 'Let kids pick their plates from parent-approved options — no more mealtime battles.',
    iconStyle: 'bg-teal-50 text-teal-600',
  },
  {
    icon: TrendingUp,
    title: 'Track Progress',
    description: 'See what your family loves, review meals together, and celebrate adventurous eaters.',
    iconStyle: 'bg-amber-50 text-amber-600',
  },
];

export function LandingPage() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--color-brand-cream)] text-[var(--color-brand-ink)]">
      <header className="sticky top-0 z-20 border-b border-slate-900/5 bg-[var(--color-brand-cream)]/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8 xl:max-w-7xl">
          <Link to="/" className="flex items-center gap-3" aria-label="What's On The Menu home">
            <BrandMark className="h-10 w-10 rounded-xl shadow-sm" />
            <span className="font-[family-name:var(--font-heading)] text-base font-bold tracking-tight sm:text-lg">
              What's On The Menu
            </span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white/70 hover:text-[var(--color-parent-primary)]"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="hidden rounded-xl bg-[var(--color-parent-primary-deep)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 sm:inline-flex"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate flex min-h-[520px] items-center overflow-hidden lg:min-h-[540px]">
          <div className="absolute -left-28 top-16 -z-10 h-64 w-64 rounded-full bg-[var(--color-kid-secondary)]/10 blur-3xl" />
          <div className="absolute -right-24 top-4 -z-10 h-80 w-80 rounded-full bg-[var(--color-kid-primary)]/10 blur-3xl" />

          {/* The family scene is decorative hero atmosphere rather than a
              second content column. Keeping it absolutely positioned lets the
              copy define the layout while the artwork can scale independently. */}
          <div className="pointer-events-none absolute inset-0 -z-10 mx-auto w-full max-w-7xl" aria-hidden="true">
            <img
              src="/brand/hero-family.svg"
              alt=""
              width="1280"
              height="832"
              fetchPriority="high"
              className="absolute left-1/2 top-1/2 w-[50rem] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.16] sm:w-[58rem] sm:opacity-20 lg:left-auto lg:right-[-12rem] lg:w-[64rem] lg:translate-x-0 lg:opacity-100"
            />
            <div className="absolute inset-0 bg-brand-cream/70 lg:hidden" />
            <div
              className="absolute inset-0 hidden lg:block"
              style={{
                background: 'linear-gradient(90deg, var(--color-brand-cream) 0%, var(--color-brand-cream) 38%, rgb(255 249 240 / 0.92) 52%, transparent 76%)',
              }}
            />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-6xl px-[15px] py-10 xl:max-w-7xl">
            <div className="max-w-xl text-center lg:text-left">
              <div className="mb-5 inline-flex items-center rounded-full border border-[var(--color-kid-secondary)]/25 bg-white/75 px-3 py-1.5 text-sm font-semibold text-teal-700 shadow-sm">
                Parent-approved <span className="mx-2 text-teal-300">•</span> Kid-powered
              </div>
              <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-[var(--color-brand-ink)] sm:text-5xl lg:text-6xl">
                Family meal planning made simple.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600 lg:mx-0 lg:text-xl">
                Build menus, let kids choose,<br />
                and enjoy dinner <em>together</em>.
              </p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  to="/signup"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-parent-primary-deep)] px-6 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(46,99,214,0.24)] transition-transform hover:-translate-y-0.5"
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white/80 px-6 py-3 font-semibold text-slate-700 transition-colors hover:border-[var(--color-parent-primary)] hover:text-[var(--color-parent-primary)]"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-900/5 bg-white/65 px-5 py-14 sm:px-8 sm:py-18" aria-labelledby="features-heading">
          <div className="mx-auto max-w-6xl xl:max-w-7xl">
            <div className="mx-auto mb-9 max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--color-parent-primary)]">Built for the whole family</p>
              <h2 id="features-heading" className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-[var(--color-brand-ink)] sm:text-4xl">
                One plan. Everyone gets a voice.
              </h2>
            </div>

            {/* 2-up on tablet, not 3: at 3-up these cards are ~185px wide, which
                is too narrow for the icon and title to share a row without the
                title wrapping mid-word. */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(35,48,71,0.06)]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${feature.iconStyle}`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--color-brand-ink)]">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-5 py-8 text-sm text-slate-500 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row xl:max-w-7xl">
          <div className="flex items-center gap-2.5 text-slate-600">
            <BrandMark className="h-7 w-7 rounded-lg" />
            <span className="font-semibold">What's On The Menu</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/terms" className="transition-colors hover:text-slate-800">
              Terms of Service
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-slate-800">
              Privacy Policy
            </Link>
            {SUPPORT_URL && (
              <a
                href={SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-800"
              >
                <Coffee className="h-3.5 w-3.5" />
                Buy me a coffee
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
