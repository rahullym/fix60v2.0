import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authFlow } from '@/features/auth/model/auth-flow';
import { DEV_OTP, toIndianE164 } from '@/shared/auth/phone-auth';
import { env } from '@/shared/config/env';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { AuthScreen } from '@/widgets/auth/auth-header';
import { Button, Notice, Text, TextField } from '@/shared/ui';

export function PhoneView(): ReactNode {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [role] = useState(() => authFlow.get().role);

  const send = async (): Promise<void> => {
    const phone = toIndianE164(input);
    if (!phone) {
      setError(t('errors:phone.invalid_phone'));
      return;
    }
    setError(null);
    setIsSending(true);
    try {
      await authFlow.sendCode(phone);
      router.push('/otp');
    } catch (sendError) {
      setError(t(errorMessageKey(sendError)));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthScreen
      title={t(role === 'provider' ? 'auth:phone.titleProvider' : 'auth:phone.titleCustomer')}
      subtitle={t('auth:phone.body')}
      footer={<Button label={t('auth:phone.sendCode')} onPress={send} isLoading={isSending} />}>
      <TextField
        label={t('auth:phone.label')}
        prefix="🇮🇳 +91"
        value={input}
        onChangeText={(text) => setInput(text.replace(/[^\d]/g, '').slice(0, 10))}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        maxLength={10}
        placeholder="98765 43210"
        error={error}
        autoFocus
        onSubmitEditing={send}
      />
      {env.authMode === 'dev' ? <Notice tone="warning" body={t('auth:phone.devNotice', { code: DEV_OTP })} /> : null}
    </AuthScreen>
  );
}
