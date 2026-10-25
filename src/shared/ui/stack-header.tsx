import type { NativeStackHeaderProps } from 'expo-router';
import type { ReactNode } from 'react';
import { AppHeader } from './app-header';

const ON_PRIMARY = '#FFFFFF';

/**
 * Renders the blue Fix60 header for a stack screen; views keep setting `title` / `headerRight`.
 * The back button is always shown: with no history (e.g. a cold-start deep link) it falls back to `/`.
 */
function renderHeader({ options, back }: NativeStackHeaderProps): ReactNode {
  const title = typeof options.title === 'string' ? options.title : '';
  const right = options.headerRight?.({ tintColor: ON_PRIMARY, canGoBack: Boolean(back) });
  return <AppHeader title={title} canGoBack right={right} />;
}

/** Stack screenOptions shared by every area (customer, provider, account). */
export const blueStackHeader = {
  headerShown: true,
  header: renderHeader,
} as const;
