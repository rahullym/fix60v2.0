import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/shared/api/endpoints';
import { formatDate, localized } from '@/shared/lib/format';
import { ErrorState, LoadingState, Screen, Text } from '@/shared/ui';

/** Renders a CMS policy page. Markdown headings (#) and paragraphs only. */
export function PolicyView(): ReactNode {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { i18n } = useTranslation();
  const page = useQuery({ queryKey: ['cms-page', slug], queryFn: () => api.public.page(slug) });

  if (page.isPending) {
    return <LoadingState />;
  }
  if (page.isError) {
    return <ErrorState error={page.error} onRetry={page.refetch} />;
  }
  const body = localized(page.data.body, i18n.language);
  return (
    <Screen>
      <Stack.Screen options={{ title: localized(page.data.title, i18n.language) }} />
      <Text variant="caption" tone="muted">
        {page.data.version} · {formatDate(page.data.updatedAt, i18n.language)}
      </Text>
      {body.split(/\n{2,}/).map((block, index) =>
        block.startsWith('#') ? (
          <Text key={index} variant="heading">
            {block.replace(/^#+\s*/, '')}
          </Text>
        ) : (
          <Text key={index}>{block}</Text>
        ),
      )}
    </Screen>
  );
}
