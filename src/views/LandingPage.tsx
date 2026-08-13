import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  CalendarDays,
  Sparkles,
  History,
  ShieldCheck,
  MailCheck,
  Salad,
  Tablet,
  Check,
  ArrowRight,
  Coffee,
} from 'lucide-react';

// Optional tip-jar link (e.g. Buy Me a Coffee); hidden when VITE_SUPPORT_URL is unset.
const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL;

const trustPoints = [
  { icon: MailCheck, label: 'No passwords — just a magic link' },
  { icon: Salad, label: '50 kid-friendly foods ready on day one' },
  { icon: Tablet, label: 'Works on any phone or tablet' },
];

const steps = [
  {
    number: '01',
    title: 'Stock your food library',
    description:
      'Start with 50 kid-tested foods, then add your own with a photo and a few tags. Every household gets its own editable copy.',
  },
  {
    number: '02',
    title: 'Build tonight’s menu',
    description:
      'Pick the options you’re willing to cook. Save the ones that work as presets and reuse them next week.',
  },
  {
    number: '03',
    title: 'Hand over the tablet',
    description:
      'Kid mode is big, bright, and tap-friendly. Kids build their own plate from what you already approved.',
  },
];

const features = [
  {
    icon: CalendarDays,
    title: 'Menus you build once',
    description:
      'Save the combinations that actually work as presets, then load a proven menu in a couple of taps.',
  },
  {
    icon: Sparkles,
    title: 'Kid mode they ask for',
    description:
      'Photo-first food cards, a plate that fills as they choose, and stars for trying something new.',
  },
  {
    icon: History,
    title: 'Meal history worth keeping',
    description:
      'Review how dinner went, then look back to see which meals are keepers and which never leave the plate.',
  },
  {
    icon: ShieldCheck,
    title: 'A PIN between the modes',
    description:
      'Kids stay in kid mode. Your food library, profiles, and settings sit behind a parent PIN.',
  },
];

/** Decorative mock of the kid-mode plate picker. */
function KidModePreview() {
  const foods = [
    { name: 'Chicken Nuggets', emoji: '\u{1F357}', picked: true },
    { name: 'Mac & Cheese', emoji: '\u{1F35D}', picked: false },
    { name: 'Broccoli', emoji: '\u{1F966}', picked: true },
    { name: 'Apple Slices', emoji: '\u{1F34E}', picked: false },
    { name: 'Carrots', emoji: '\u{1F955}', picked: true },
    { name: 'Milk', emoji: '\u{1F95B}', picked: false },
  ];

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-sm select-none"
    >
      {/* Soft glow behind the device */}
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-[var(--color-parent-primary)]/20 via-[var(--color-parent-secondary)]/15 to-[var(--color-kid-primary)]/20 blur-2xl" />

      <div className="relative rounded-[2rem] border border-white/70 bg-[var(--color-kid-bg)] p-5 shadow-xl shadow-gray-900/10 ring-1 ring-gray-900/5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-kid-secondary)] text-base font-bold text-white">
              M
            </div>
            <div>
              <p className="font-[family-name:var(--font-heading)] text-sm font-bold text-gray-900">
                Maya&apos;s plate
              </p>
              <p className="text-xs text-gray-500">Pick 3 more</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-[var(--color-kid-accent)] px-2.5 py-1 text-xs font-bold text-gray-800">
            <Sparkles className="h-3.5 w-3.5" />3
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {foods.map((food) => (
            <div
              key={food.name}
              className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-white p-2 text-center ${
                food.picked
                  ? 'border-[var(--color-kid-primary)] shadow-md shadow-[var(--color-kid-primary)]/20'
                  : 'border-gray-100'
              }`}
            >
              {food.picked && (
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-kid-primary)] text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              )}
              <span className="text-2xl leading-none">{food.emoji}</span>
              <span className="text-[10px] font-semibold leading-tight text-gray-600">
                {food.name}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-[var(--color-kid-primary)] py-3 text-center font-[family-name:var(--font-heading)] text-sm font-bold text-white">
          That&apos;s my plate!
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--color-parent-bg)]">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-parent-primary)]">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <span className="font-[family-name:var(--font-heading)] text-base font-bold text-gray-900">
            What&apos;s On The Menu
          </span>
        </div>
        <Link
          to="/login"
          className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-parent-primary-deep)] transition-colors hover:bg-[var(--color-parent-primary)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-parent-primary-deep)]"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-4 pt-6 sm:pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="fade-up-in motion-reduce:animate-none text-center lg:text-left">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-parent-primary)]/25 bg-white px-3 py-1 text-xs font-semibold text-[var(--color-parent-primary-deep)]">
              <Sparkles className="h-3.5 w-3.5" />
              Built by parents, tested at the dinner table
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl">
              End the{' '}
              <span className="text-[var(--color-parent-primary-deep)]">
                &ldquo;what&apos;s for dinner?&rdquo;
              </span>{' '}
              standoff
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-gray-600 lg:mx-0">
              You decide what&apos;s on the menu. Your kids decide what goes on
              their plate. Everybody eats, and nobody negotiates.
            </p>

            <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row lg:mx-0">
              <Link
                to="/signup"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-parent-primary-deep)] px-6 py-3.5 font-semibold text-white transition-transform hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-parent-primary-deep)] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex flex-1 items-center justify-center rounded-xl border-2 border-gray-300 bg-white px-6 py-3.5 font-semibold text-gray-800 transition-colors hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-parent-primary-deep)]"
              >
                I have an account
              </Link>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Free to start. No credit card, no password to forget.
            </p>
          </div>

          <div className="fade-up-in motion-reduce:animate-none [animation-delay:120ms]">
            <KidModePreview />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <ul className="grid gap-4 rounded-2xl border border-gray-200/80 bg-white/70 p-5 sm:grid-cols-3">
          {trustPoints.map((point) => (
            <li
              key={point.label}
              className="flex items-center justify-center gap-2.5 text-sm font-medium text-gray-700"
            >
              <point.icon className="h-5 w-5 shrink-0 text-[var(--color-parent-primary-deep)]" />
              {point.label}
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mb-10 text-center">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-gray-900">
            Dinner, sorted in three steps
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            Set it up once on a quiet afternoon. After that, planning a meal
            takes about a minute.
          </p>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.number}
              className="relative rounded-2xl border border-gray-200/80 bg-white p-6"
            >
              <span className="font-[family-name:var(--font-heading)] text-sm font-bold text-[var(--color-parent-primary-deep)]">
                {step.number}
              </span>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-lg font-bold text-gray-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mb-10 text-center">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-gray-900">
            Two modes, one family
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            A calm planning tool for you. A bright, tappable game for them.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-gray-200/80 bg-white p-6 transition-shadow hover:shadow-md motion-reduce:transition-none"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-parent-primary)]/10">
                <feature.icon className="h-5 w-5 text-[var(--color-parent-primary-deep)]" />
              </div>
              <h3 className="font-[family-name:var(--font-heading)] text-lg font-bold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="rounded-3xl bg-gradient-to-br from-[var(--color-parent-primary-deep)] to-[var(--color-parent-secondary)] px-6 py-12 text-center">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-white">
            Your next dinner could be the easy one
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/90">
            Create your household, enter your email, and click the link we send.
            You&apos;ll be building a menu in under two minutes.
          </p>
          <Link
            to="/signup"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 font-semibold text-[var(--color-parent-primary-deep)] transition-transform hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Create your family account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 text-sm text-gray-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-[var(--color-parent-primary-deep)]" />
            <span>What&apos;s On The Menu</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/terms"
              className="rounded transition-colors hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-parent-primary-deep)]"
            >
              Terms of Service
            </Link>
            <span aria-hidden="true">&middot;</span>
            <Link
              to="/privacy"
              className="rounded transition-colors hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-parent-primary-deep)]"
            >
              Privacy Policy
            </Link>
            {SUPPORT_URL && (
              <>
                <span aria-hidden="true">&middot;</span>
                <a
                  href={SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded transition-colors hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-parent-primary-deep)]"
                >
                  <Coffee className="h-3.5 w-3.5" />
                  Buy me a coffee
                </a>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
