import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, UtensilsCrossed } from 'lucide-react';

export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [error, setError] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      navigate('/login?error=invalid');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, {
          credentials: 'include',
          redirect: 'manual', // Don't follow redirects — we handle routing client-side
        });

        // The server may redirect (302) or return JSON
        // With redirect: 'manual', a redirect comes back as opaqueredirect
        if (res.type === 'opaqueredirect' || res.ok) {
          await refreshAuth();
          navigate('/', { replace: true });
        } else {
          setError(true);
          setTimeout(() => navigate('/login?error=invalid', { replace: true }), 2000);
        }
      } catch {
        setError(true);
        setTimeout(() => navigate('/login?error=invalid', { replace: true }), 2000);
      }
    };

    verify();
  }, [token, navigate, refreshAuth]);

  return (
    <div className="min-h-dvh bg-[var(--color-parent-bg)] flex flex-col items-center justify-center p-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-parent-primary)] mb-4">
          <UtensilsCrossed className="w-8 h-8 text-white" />
        </div>
        {error ? (
          <>
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-gray-900 mb-2">
              Link expired
            </h2>
            <p className="text-gray-500">Redirecting to login...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 text-[var(--color-parent-primary)] animate-spin mx-auto mb-4" />
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-bold text-gray-900 mb-2">
              Verifying your login...
            </h2>
            <p className="text-gray-500">Just a moment</p>
          </>
        )}
      </div>
    </div>
  );
}
