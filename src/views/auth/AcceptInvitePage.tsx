import { useSearchParams, Link } from 'react-router-dom';
import { UtensilsCrossed, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

const ERROR_MESSAGES: Record<string, { icon: typeof AlertCircle; color: string; bg: string; message: string }> = {
  expired: {
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    message: 'This invitation has expired. Please ask for a new one.',
  },
  'already-accepted': {
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-50',
    message: 'This invitation has already been accepted.',
  },
  invalid: {
    icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    message: 'This invitation link is invalid. It may have been revoked.',
  },
};

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get('error');

  const errorInfo = ERROR_MESSAGES[errorCode || ''] || ERROR_MESSAGES.invalid;
  const Icon = errorInfo.icon;

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
        </div>

        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${errorInfo.bg} mb-4`}>
            <Icon className={`w-6 h-6 ${errorInfo.color}`} />
          </div>
          <p className="text-gray-600 mb-6">{errorInfo.message}</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white bg-[var(--color-parent-primary)] hover:opacity-90 transition-opacity"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
