import { Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RequestForm } from '@/features/customer/create-request/request-form';
import { useMe } from '@/features/customer/model/use-me';

/** New request (quick, or directed when `providerCode` is set). */
export function RequestFormView(): ReactNode {
  const { t } = useTranslation();
  const { serviceId, providerCode } = useLocalSearchParams<{ serviceId?: string; providerCode?: string }>();
  const me = useMe();
  return (
    <>
      <Stack.Screen options={{ title: t(providerCode ? 'customer:form.titleDirected' : 'customer:form.titleQuick') }} />
      <RequestForm me={me} initialServiceId={serviceId || undefined} providerCode={providerCode || undefined} />
    </>
  );
}
