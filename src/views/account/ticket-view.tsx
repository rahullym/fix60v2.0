import { Stack, useIsFocused, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ticketStatusTone, useReplyTicket, useTicket } from '@/features/support/support';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { useTheme } from '@/shared/theme/theme';
import { Button, ErrorState, LoadingState, Notice, Pill, Row, Screen, Text, TextField } from '@/shared/ui';
import { MessageBubble } from '@/widgets/account/message-bubble';

/** Support conversation; polls every 10 s while visible. */
export function TicketView(): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const isFocused = useIsFocused();
  const ticket = useTicket(code, isFocused);
  const reply = useReplyTicket(code);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  if (ticket.isPending) {
    return <LoadingState />;
  }
  if (ticket.isError) {
    return <ErrorState error={ticket.error} onRetry={ticket.refetch} />;
  }

  const send = (): void => {
    const body = draft.trim();
    if (!body) {
      return;
    }
    reply.mutate(body, { onSuccess: () => setDraft('') });
  };

  const composer = (
    <View style={styles.composer}>
      {reply.isError ? <Notice tone="danger" body={t(errorMessageKey(reply.error))} /> : null}
      <Row gap={8} style={styles.composerRow}>
        <View style={styles.flex}>
          <TextField
            label={t('common:support.reply')}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
          />
        </View>
        <Button
          label={t('common:actions.send')}
          icon="send"
          isCompact
          isDisabled={!draft.trim()}
          isLoading={reply.isPending}
          onPress={send}
          style={styles.sendButton}
        />
      </Row>
    </View>
  );

  return (
    <Screen isScrollable={false} footer={composer} contentStyle={styles.noPadding}>
      <Stack.Screen options={{ title: ticket.data.code }} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: theme.spacing(4), gap: theme.spacing(3) }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled">
        <Text variant="heading">{ticket.data.subject}</Text>
        <Row>
          <Pill label={t(`common:support.status.${ticket.data.status}`)} tone={ticketStatusTone[ticket.data.status]} />
          {ticket.data.bookingCode ? (
            <Text variant="caption" tone="muted">
              {ticket.data.bookingCode}
            </Text>
          ) : null}
        </Row>
        {ticket.data.status === 'resolved' ? <Notice body={t('common:support.resolvedNote')} /> : null}
        {ticket.data.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  noPadding: { padding: 0, gap: 0 },
  composer: { gap: 8 },
  composerRow: { alignItems: 'flex-end' },
  sendButton: { minHeight: 52 },
});
