import { Suspense, type ReactNode } from 'react';
import { LoginView } from '@/views/login-view';

export default function LoginPage({ searchParams }: PageProps<'/login'>): ReactNode {
  return (
    <Suspense fallback={null}>
      <LoginView searchParams={searchParams} />
    </Suspense>
  );
}
