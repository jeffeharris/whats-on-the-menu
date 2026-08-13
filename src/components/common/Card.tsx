import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  selected?: boolean;
  mode?: 'kid' | 'parent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  className = '',
  style,
  onClick,
  selected = false,
  mode = 'parent',
  padding = 'md',
}: CardProps) {
  const isClickable = !!onClick;

  return (
    <div
      data-theme={mode}
      data-padding={padding}
      data-interactive={isClickable}
      data-selected={selected}
      className={`ui-card ${className}`}
      style={style}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
