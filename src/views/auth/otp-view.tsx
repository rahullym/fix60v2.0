import { router } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { authFlow } from '@/features/auth/model/auth-flow';
import { hasErrorCode } from '@/shared/api/api-error';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { maskPhone } from '@/shared/lib/format';
import { Button, Notice, Screen, Text, TextField } from '@/shared/ui';

const RESEND_SECONDS = 30;

export function OtpView(): ReactNode {
  const { t } = useTranslation();
  const { phone, role } = authFlow.get();
  const [code, setCode] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const verify = async (value = code): Promise<void> => {
    if (value.length !== 6) {
      return;
    }
    setError(null);
    setIsVerifying(true);
    try {
      const outcome = await authFlow.verifyCode(value);
      if (outcome === 'needs_registration') {
        router.replace('/register');
      }
    } catch (verifyError) {
      setError(verifyError);
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async (): Promise<void> => {
    if (!phone) {
      return;
    }
    setError(null);
    try {
      await authFlow.sendCode(phone);
      setSecondsLeft(RESEND_SECONDS);
    } catch (resendError) {
      setError(resendError);
    }
  };

  const isRoleMismatch = hasErrorCode(error, 'ROLE_MISMATCH');

  return (
    <Screen footer={<Button label={t('auth:otp.verify')} onPress={() => verify()} isLoading={isVerifying} isDisabled={code.length !== 6} />}>
      <Text variant="title">{t('auth:otp.title')}</Text>
      <Text tone="muted">{t('auth:otp.body', { phone: phone ? maskPhone(phone) : '' })}</Text>
      <TextField
        label={t('auth:otp.label')}
        value={code}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '').slice(0, 6);
          setCode(digits);
          if (digits.length === 6) {
            verify(digits);
          }
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        autoFocus
        error={error && !isRoleMismatch ? t(errorMessageKey(error)) : null}
      />
      {isRoleMismatch ? (
        <>
          <Notice tone="warning" body={t('errors:roleMismatch')} />
          <Button
            variant="secondary"
            label={t(role === 'customer' ? 'auth:otp.switchToProvider' : 'auth:otp.switchToCustomer')}
            onPress={() => {
              authFlow.chooseRole(role === 'customer' ? 'provider' : 'customer');
              setError(null);
              verify();
            }}
          />
        </>
      ) : null}
      <Pressable accessibilityRole="button" disabled={secondsLeft > 0} onPress={resend} hitSlop={8}>
        <Text tone={secondsLeft > 0 ? 'muted' : 'primary'} variant="label">
          {secondsLeft > 0 ? t('auth:otp.resendIn', { seconds: secondsLeft }) : t('auth:otp.resend')}
        </Text>
      </Pressable>
    </Screen>
  );
}
