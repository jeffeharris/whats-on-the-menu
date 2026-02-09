import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { UtensilsCrossed, Users, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { householdApi } from '../../api/client';
import type { InviteInfo } from '../../types';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(!!token);
  const [error, setError] = useState<string | null>(token ? null : 'No invitation token provided');
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    householdApi.getInviteInfo(token)
      .then((info) => {
        if (cancelled) return;
        if (info.status !== 'pending') {
          setError('This invitation has already been used or revoked.');
        } else if (info.expired) {
          setError('This invitation has expired. Please ask for a new one.');
        } else {
          setInviteInfo(info);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Invitation not found.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setIsAccepting(true);
    setError(null);

    try {
      await householdApi.acceptInvitation(token);
      sessionStorage.removeItem('pendingInviteToken');
      // Session was cleared server-side, need to re-login
      navigate('/login', { state: { message: 'Invitation accepted! Please log in to access your new household.' } });
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to accept invitation');
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    sessionStorage.removeItem('pendingInviteToken');
    navigate('/');
  };

  // Store token for post-auth flow
  useEffect(() => {
    if (token && !isAuthenticated && !authLoading) {
      sessionStorage.setItem('pendingInviteToken', token);
    }
  }, [token, isAuthenticated, authLoading]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-dvh bg-[var(--color-parent-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--color-parent-primary)] animate-spin" />
      </div>
    );
  }

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

        {error ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 rounded-xl font-semibold text-white bg-[var(--color-parent-primary)] hover:opacity-90 transition-opacity"
            >
              Go home
            </Link>
          </div>
        ) : inviteInfo && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-50 mb-4">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-gray-900 mb-2">
              You're invited!
            </h2>
            <p className="text-gray-600 mb-1">
              <span className="font-medium">{inviteInfo.inviterEmail}</span> has invited you to join
            </p>
            <p className="text-lg font-semibold text-gray-900 mb-6">
              {inviteInfo.householdName}
            </p>

            {isAuthenticated ? (
              <div className="space-y-3">
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[var(--color-parent-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                >
                  {isAccepting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isAccepting ? 'Joining...' : 'Accept invitation'}
                </button>
                <button
                  onClick={handleDecline}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Decline
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Sign up or log in to accept this invitation.
                </p>
                <div className="space-y-3">
                  <Link
                    to="/signup"
                    className="block w-full py-3 px-4 rounded-xl font-semibold text-white bg-[var(--color-parent-primary)] hover:opacity-90 transition-opacity text-center"
                  >
                    Create account
                  </Link>
                  <Link
                    to="/login"
                    className="block w-full py-3 px-4 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors text-center"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
