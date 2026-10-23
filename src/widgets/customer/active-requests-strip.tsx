import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { RequestSummaryCard } from '@/entities/request/request-summary-card';
import type { ServiceRequestSummary } from '@/shared/api/types';
import { SectionHeader } from '@/shared/ui';

/** Requests still in progress (not booked or cancelled), as a horizontal strip. */
export function ActiveRequestsStrip({ requests }: { requests: ServiceRequestSummary[] }): ReactNode {
  const { t } = useTranslation();
  const active = requests.filter((request) => request.status !== 'booking_confirmed' && request.status !== 'cancelled');
  if (active.length === 0) return null;
  return (
    <View style={styles.wrapper}>
      <SectionHeader
        title={t('customer:home.activeRequests')}
        actionLabel={t('common:actions.viewAll')}
        onAction={() => router.push('/customer/requests')}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {active.map((request) => (
          <RequestSummaryCard
            key={request.code}
            request={request}
            isCompact
            onPress={() => router.push({ pathname: '/customer/requests/[code]', params: { code: request.code } })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 10 },
  strip: { gap: 12, paddingRight: 4 },
});
