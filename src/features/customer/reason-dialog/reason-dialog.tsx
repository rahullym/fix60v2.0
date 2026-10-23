import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { useTheme } from '@/shared/theme/theme';
import { Button, Notice, Text, TextField } from '@/shared/ui';

const MIN_REASON = 3;
const MAX_REASON = 500;

/** Modal that collects a required reason (cancellations). Android has no Alert.prompt. */
export function ReasonDialog({
  isVisible,
  title,
  body,
  confirmLabel,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: {
  isVisible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  isSubmitting: boolean;
  error: unknown;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}): ReactNode {
  const { t } = useTranslation();
  const theme = useTheme();
  const [reason, setReason] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const submit = (): void => {
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON) {
      setFieldError(t('customer:cancel.reasonRequired'));
      return;
    }
    setFieldError(null);
    onSubmit(trimmed);
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <View style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: theme.colors.railDeep }]} />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg }]}>
          <Text variant="heading">{title}</Text>
          {body ? <Text tone="muted">{body}</Text> : null}
          <TextField
            label={t('customer:cancel.reasonLabel')}
            value={reason}
            onChangeText={setReason}
            placeholder={t('customer:cancel.reasonPlaceholder')}
            multiline
            maxLength={MAX_REASON}
            error={fieldError}
          />
          {error ? <Notice tone="danger" body={t(errorMessageKey(error))} /> : null}
          <View style={styles.actions}>
            <Button label={t('customer:cancel.keep')} variant="secondary" onPress={onClose} style={styles.flex} />
            <Button label={confirmLabel} variant="danger" onPress={submit} isLoading={isSubmitting} style={styles.flex} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'center', padding: 16 },
  scrim: { opacity: 0.5 },
  sheet: { padding: 20, gap: 14 },
  actions: { flexDirection: 'row', gap: 12 },
});
