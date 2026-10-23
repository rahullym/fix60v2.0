import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { useSession } from '@/shared/auth/session';

/** Entry point: sends each visitor to the area for their session and role. */
export default function Index(): ReactNode {
  const { tokens, user } = useSession();
  if (!tokens || !user) {
    return <Redirect href="/welcome" />;
  }
  return <Redirect href={user.role === 'provider' ? '/provider' : '/customer'} />;
}
