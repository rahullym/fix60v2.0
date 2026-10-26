import type { ConsentSource, ConsentType, RegistrationConsents } from '@fix60/shared';

/** CMS page slug whose `version` a consent type is recorded against. */
export const consentPolicyPage: Partial<Record<ConsentType, string>> = {
  terms: 'terms',
  privacy: 'privacy',
  safety_policy: 'safety',
};

export const DEFAULT_POLICY_VERSION = '1';

export interface ConsentRecord {
  type: ConsentType;
  isGranted: boolean;
  policyVersion: string;
  source: ConsentSource;
}

/** Expands registration checkboxes into one ledger row per consent type. */
export function registrationConsentRecords(
  consents: RegistrationConsents,
  policyVersions: Record<string, string>,
  source: ConsentSource,
): ConsentRecord[] {
  const entries: [ConsentType, boolean][] = [
    ['terms', consents.terms],
    ['privacy', consents.privacy],
    ['safety_policy', consents.safetyPolicy],
    ['service_communications', consents.serviceCommunications],
    ['whatsapp_updates', consents.whatsappUpdates],
  ];
  return entries.map(([type, isGranted]) => ({
    type,
    isGranted,
    policyVersion: policyVersions[consentPolicyPage[type] ?? ''] ?? DEFAULT_POLICY_VERSION,
    source,
  }));
}
