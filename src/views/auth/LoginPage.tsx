import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { Mail, UtensilsCrossed, Loader2, Users } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const locationMessage = (location.state as { message?: string })?.message;

  const pendingInviteToken = sessionStorage.getItem('pendingInviteToken');

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError === 'invalid') {
      setError('That login link is invalid or expired. Please request a new one.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });

      if (res.ok) {
        navigate('/auth/check-email', { state: { email } });
      } else {
        const data = await res.json();
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-parent-bg)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-parent-primary)] mb-4">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-gray-900">
            What's On The Menu
          </h1>
          <p className="text-gray-500 mt-1">Sign in to your family account</p>
        </div>

        {/* Location message (e.g., after accepting invite) */}
        {locationMessage && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
            {locationMessage}
          </div>
        )}

        {/* Invite banner */}
        {pendingInviteToken && !locationMessage && (
          <div className="mb-4 p-3 rounded-lg bg-purple-50 text-purple-700 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>You have a pending household invitation. Log in to accept it.</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-parent-primary)] focus:border-transparent text-gray-900 placeholder-gray-400"
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[var(--color-parent-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {isSubmitting ? 'Sending...' : 'Send login link'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[var(--color-parent-primary)] font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
