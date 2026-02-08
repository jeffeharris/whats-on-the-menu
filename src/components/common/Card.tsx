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

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

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

  const baseStyles = `
    rounded-2xl bg-white shadow-md
    ${paddingStyles[padding]}
    ${isClickable ? 'cursor-pointer touch-feedback' : ''}
    ${isClickable ? 'hover:shadow-lg transition-shadow duration-150' : ''}
  `;

  const selectedStyles = selected
    ? mode === 'kid'
      ? 'ring-4 ring-kid-secondary bg-kid-secondary/10'
      : 'ring-2 ring-parent-primary bg-parent-primary/5'
    : '';

  return (
    <div
      className={`${baseStyles} ${selectedStyles} ${className}`}
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
