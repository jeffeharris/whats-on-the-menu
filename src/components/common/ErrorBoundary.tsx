import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors anywhere below it and shows a recoverable
 * screen instead of React unmounting the tree into a blank white page.
 *
 * Must stay a class component — there is no hook equivalent of
 * componentDidCatch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep the details in the console for now; this is the hook to wire up a
    // reporting service (Sentry et al.) when one is added.
    console.error('Unhandled UI error:', error, errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="min-h-dvh bg-[var(--color-parent-bg)] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-gray-900 mb-3">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">
            Sorry about that — the app hit an unexpected error. Your saved menus and profiles are
            safe.
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl font-semibold text-white bg-[var(--color-parent-primary)] hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Start over
          </button>

          {import.meta.env.DEV && (
            <pre className="mt-6 text-left text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
