import type { ReactNode } from 'react';
import { AppShell } from '@/widgets/app-shell';

/** Console pages load per-admin data on the client behind the session, so skip instant-navigation prerender validation. */
export const instant = false;

export default function ConsoleLayout({ children }: LayoutProps<'/'>): ReactNode {
  return <AppShell>{children}</AppShell>;
}
