import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'touch';
type ButtonMode = 'kid' | 'parent';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  mode?: ButtonMode;
  children: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  mode = 'parent',
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      data-theme={mode}
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth}
      className={`ui-button ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
