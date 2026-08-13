import type { HTMLAttributes, ReactNode } from 'react';

export type AppTheme = 'parent' | 'kid';

interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  mode: AppTheme;
  children: ReactNode;
}

/**
 * Establishes semantic design tokens for a product area. Keep layout concerns in
 * className; this component owns only the visual theme boundary.
 */
export function AppShell({ mode, children, className = '', ...props }: AppShellProps) {
  return (
    <div data-theme={mode} className={`app-shell ${className}`} {...props}>
      {children}
    </div>
  );
}
