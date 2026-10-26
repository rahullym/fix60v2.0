import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/shared/api/endpoints';
import { formatDate, localized } from '@/shared/lib/format';
import { ErrorState, LoadingState, Notice, Screen, Text } from '@/shared/ui';

function stripInline(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

/** Inline `**bold**` spans as nested bold Text; everything else stays plain. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={index} style={styles.bold}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      part
    ),
  );
}

/** One markdown block: heading (#), quote (>) as a callout, bullet list (- or *), or paragraph. */
function Block({ block }: { block: string }): ReactNode {
  if (block.startsWith('#')) {
    const [heading = '', ...rest] = block.split('\n');
    return (
      <>
        <Text variant="heading">{stripInline(heading.replace(/^#+\s*/, ''))}</Text>
        {rest.length > 0 ? <Block block={rest.join('\n').trim()} /> : null}
      </>
    );
  }
  const lines = block.split('\n');
  if (block.startsWith('>')) {
    const quote = lines.map((line) => line.replace(/^>\s?/, '')).join(' ');
    return <Notice tone="warning" body={stripInline(quote).trim()} />;
  }
  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    return lines.map((line, index) => (
      <Text key={index}>
        {'• '}
        {inline(line.replace(/^\s*[-*]\s+/, ''))}
      </Text>
    ));
  }
  return <Text>{inline(lines.join(' '))}</Text>;
}

/** Renders a CMS policy page: headings, paragraphs, bullet lists, quotes and **bold**. */
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
      {body
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, index) => (
          <Block key={index} block={block} />
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
});
