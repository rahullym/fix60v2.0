import type { ReactNode } from 'react';
import { LoginFlow } from '@/features/auth/login-flow';

/** Sign-in screen. */
export async function LoginView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-fog px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary font-heading text-lg font-bold text-white">
            60
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-foreground">Fix60 Admin</p>
            <p className="text-xs text-muted">Operations console</p>
          </div>
        </div>
        <LoginFlow nextPath={typeof next === 'string' ? next : '/'} />
      </div>
    </main>
  );
}
