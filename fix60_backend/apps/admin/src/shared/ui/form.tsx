import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const controlClass =
  'h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-2 focus:outline-offset-0 focus:outline-accent disabled:bg-surface-muted aria-invalid:border-destructive';

/** Label + control + hint/error, wired with ids for screen readers. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode;
}): ReactNode {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
      })}
      {error ? (
        <p id={messageId} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return <input className={cn(controlClass, className)} {...rest} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>): ReactNode {
  return <select className={cn(controlClass, 'pr-8', className)} {...rest} />;
}

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}): ReactNode {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 rounded border-border accent-primary"
      />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </label>
    </div>
  );
}
