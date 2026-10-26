import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-mid',
  secondary: 'border border-border bg-background text-foreground hover:bg-surface-muted',
  ghost: 'text-foreground hover:bg-surface-muted',
  destructive: 'bg-destructive text-white hover:opacity-90',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  isLoading?: boolean;
}

/** Button with variants and a loading state. */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps): ReactNode {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm',
        variants[variant],
        className,
      )}
      {...rest}>
      {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
