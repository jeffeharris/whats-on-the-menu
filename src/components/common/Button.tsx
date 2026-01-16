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

const variantStyles: Record<ButtonMode, Record<ButtonVariant, string>> = {
  kid: {
    primary: 'bg-kid-primary text-white hover:bg-kid-primary/90',
    secondary: 'bg-kid-secondary text-white hover:bg-kid-secondary/90',
    danger: 'bg-danger text-white hover:bg-danger/90',
    ghost: 'bg-transparent text-kid-primary hover:bg-kid-primary/10',
  },
  parent: {
    primary: 'bg-parent-primary text-white hover:bg-parent-primary/90',
    secondary: 'bg-parent-secondary text-white hover:bg-parent-secondary/90',
    danger: 'bg-danger text-white hover:bg-danger/90',
    ghost: 'bg-transparent text-parent-primary hover:bg-parent-primary/10',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  touch: 'px-6 py-4 text-xl min-h-[60px]',
};

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
      className={`
        rounded-xl font-semibold
        transition-all duration-150
        touch-feedback
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[mode][variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${mode === 'kid' ? 'focus:ring-kid-primary' : 'focus:ring-parent-primary'}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
