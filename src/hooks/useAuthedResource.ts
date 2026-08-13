import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthedResource<T> {
  data: T;
  /** Direct setter so callers can apply optimistic updates after a mutation. */
  setData: React.Dispatch<React.SetStateAction<T>>;
  loading: boolean;
  /**
   * True when the fetch failed. Callers MUST branch on this before rendering an
   * "empty" state: a household with no foods and a household we failed to read
   * are indistinguishable in `data`, and telling a user their library is empty
   * when it isn't is how duplicate records get created.
   */
  error: boolean;
  reload: () => void;
}

/**
 * Load a household-scoped resource once the session is known.
 *
 * These providers are mounted by SessionDataProviders only after auth resolves,
 * so `isAuthenticated` is accurate on the first render and the initial
 * `loading` value can be derived from it rather than defaulting to true.
 *
 * Shared rather than copied per context on purpose. Four contexts need this
 * exact behaviour, and the last time this codebase kept a second inline copy of
 * a security-relevant detail — the session cookie in the accept-invite route —
 * the copy silently missed a fix and shipped the bug it was meant to prevent.
 */
export function useAuthedResource<T>(
  label: string,
  fetcher: () => Promise<T>,
  initialData: T,
): AuthedResource<T> {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  // Held in a ref so callers can pass an inline arrow without its changing
  // identity re-triggering the fetch on every render.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(() => {
    // Guarded so reload can never latch a spinner the effect below won't clear.
    if (!isAuthenticated) return;
    setLoading(true);
    setError(false);
    setReloadCount((n) => n + 1);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    fetcherRef.current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Failed to fetch ${label}:`, err);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isAuthenticated, reloadCount, label]);

  return { data, setData, loading, error, reload };
}
