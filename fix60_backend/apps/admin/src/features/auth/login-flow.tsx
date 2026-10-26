'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';
import type { AdminLoginResponse } from '@fix60/shared';
import { authCall } from '@/shared/api/client';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/form';
import { ErrorNotice } from '@/shared/ui/surfaces';

type Step =
  | { kind: 'password' }
  | { kind: 'totp'; challengeToken: string }
  | { kind: 'enroll'; challengeToken: string; otpauthUrl: string; secret: string };

function EnrollmentQr({ otpauthUrl, secret }: { otpauthUrl: string; secret: string }): ReactNode {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(otpauthUrl, { margin: 1, width: 180 }).then(setDataUrl, () => setDataUrl(null));
  }, [otpauthUrl]);
  return (
    <div className="flex flex-col items-center gap-3 rounded-md bg-surface-fog p-4 text-center">
      <p className="text-sm text-foreground">
        Scan with Google Authenticator, Microsoft Authenticator or 1Password, then enter the 6-digit code.
      </p>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="Authenticator QR code" width={180} height={180} className="rounded bg-white" />
      ) : null}
      <p className="text-xs text-muted">
        Can&apos;t scan? Enter this key: <code className="break-all font-mono text-foreground">{secret}</code>
      </p>
    </div>
  );
}

/** Two-step admin sign-in: password, then TOTP (with first-time enrolment). */
export function LoginFlow({ nextPath }: { nextPath: string }): ReactNode {
  const [step, setStep] = useState<Step>({ kind: 'password' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [isBusy, setIsBusy] = useState(false);
  const goNext = (): void => {
    window.location.assign(nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/');
  };

  const submitPassword = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      const result = await authCall<AdminLoginResponse>('/login', { email, password });
      if (result.status === 'authenticated') {
        goNext();
        return;
      }
      setStep(
        result.status === 'totp_enrollment_required'
          ? { kind: 'enroll', challengeToken: result.challengeToken, otpauthUrl: result.otpauthUrl, secret: result.secret }
          : { kind: 'totp', challengeToken: result.challengeToken },
      );
    } catch (loginError) {
      setError(loginError);
    } finally {
      setIsBusy(false);
    }
  };

  const submitCode = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (step.kind === 'password') {
      return;
    }
    setError(null);
    setIsBusy(true);
    try {
      await authCall('/totp', { challengeToken: step.challengeToken, code });
      goNext();
    } catch (totpError) {
      setError(totpError);
      setIsBusy(false);
    }
  };

  if (step.kind === 'password') {
    return (
      <form onSubmit={submitPassword} className="flex flex-col gap-4" noValidate>
        <Field label="Email">
          {(props) => (
            <Input {...props} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          )}
        </Field>
        <Field label="Password">
          {(props) => (
            <Input {...props} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          )}
        </Field>
        {error ? <ErrorNotice error={error} /> : null}
        <Button type="submit" isLoading={isBusy} disabled={!email || !password}>
          Continue
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCode} className="flex flex-col gap-4" noValidate>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ShieldCheck className="size-4 text-success" aria-hidden />
        {step.kind === 'enroll' ? 'Set up two-factor authentication' : 'Two-factor authentication'}
      </div>
      {step.kind === 'enroll' ? <EnrollmentQr otpauthUrl={step.otpauthUrl} secret={step.secret} /> : null}
      <Field label="6-digit code">
        {(props) => (
          <Input
            {...props}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="font-mono tracking-[0.4em]"
            autoFocus
          />
        )}
      </Field>
      {error ? <ErrorNotice error={error} /> : null}
      <Button type="submit" isLoading={isBusy} disabled={code.length !== 6}>
        Verify and sign in
      </Button>
      <Button variant="ghost" onClick={() => { setStep({ kind: 'password' }); setCode(''); setError(null); }}>
        Start again
      </Button>
    </form>
  );
}
