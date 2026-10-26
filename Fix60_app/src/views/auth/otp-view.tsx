import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { authFlow } from '@/features/auth/model/auth-flow';
import { hasErrorCode } from '@/shared/api/api-error';
import { errorMessageKey } from '@/shared/lib/error-copy';
import { maskPhone } from '@/shared/lib/format';
import { AuthScreen } from '@/widgets/auth/auth-header';
import { Button, Notice, OtpInput, Text } from '@/shared/ui';

const RESEND_SECONDS = 30;

export function OtpView(): ReactNode {
  const { t } = useTranslation();
  // Snapshot the flow into state: it is a mutable module object, so reading it during render is impure.
  const [phone] = useState(() => authFlow.get().phone);
  const [role, setRole] = useState(() => authFlow.get().role);
  const isVerifyingRef = useRef(false);
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
    if (value.length !== 6 || isVerifyingRef.current) {
      return;
    }
    isVerifyingRef.current = true;
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
      isVerifyingRef.current = false;
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
    <AuthScreen
      title={t('auth:otp.title')}
      subtitle={t('auth:otp.body', { phone: phone ? maskPhone(phone) : '' })}
      footer={<Button label={t('auth:otp.verify')} onPress={() => verify()} isLoading={isVerifying} isDisabled={code.length !== 6} />}>
      <OtpInput
        label={t('auth:otp.label')}
        value={code}
        onChange={(digits) => {
          setCode(digits);
          if (digits.length === 6) {
            verify(digits);
          }
        }}
        error={error && !isRoleMismatch ? t(errorMessageKey(error)) : null}
      />
      {isRoleMismatch ? (
        <>
          <Notice tone="warning" body={t('errors:roleMismatch')} />
          <Button
            variant="secondary"
            label={t(role === 'customer' ? 'auth:otp.switchToProvider' : 'auth:otp.switchToCustomer')}
            onPress={() => {
              const nextRole = role === 'customer' ? 'provider' : 'customer';
              authFlow.chooseRole(nextRole);
              setRole(nextRole);
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
    </AuthScreen>
  );
}
