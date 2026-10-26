import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

/** The ⚡ tab never renders; its button opens the request form. */
export default function QuickTab(): ReactNode {
  return <Redirect href="/customer/requests/new" />;
}
