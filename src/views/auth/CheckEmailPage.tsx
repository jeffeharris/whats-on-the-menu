import { useLocation, Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';

export function CheckEmailPage() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email;

  return (
    <div className="min-h-dvh bg-[var(--color-parent-bg)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-parent-primary)]/10 mb-4">
          <Mail className="w-8 h-8 text-[var(--color-parent-primary)]" />
        </div>

        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-gray-900 mb-2">
          Check your email
        </h1>

        <p className="text-gray-600 mb-1">
          We sent a login link to
        </p>
        {email && (
          <p className="font-medium text-gray-900 mb-6">{email}</p>
        )}

        <p className="text-sm text-gray-500 mb-8">
          Click the link in the email to sign in. If you don't see it, check your spam folder.
        </p>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-[var(--color-parent-primary)] font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
