import { useTranslation } from 'react-i18next';
import type { ProviderRates } from '@/shared/api/types';
import { formatMoney } from '@/shared/lib/format';
import { useLocale } from '@/shared/lib/use-locale';

export interface ProviderFormat {
  /** Best single rate label (hourly, else daily, else monthly). */
  rateLabel: (rates: ProviderRates | null | undefined) => string | null;
  /** Every rate the provider set, e.g. ["₹250/hr", "₹1,500/day"]. */
  allRateLabels: (rates: ProviderRates) => string[];
  languageLabel: (code: string) => string;
  languagesLabel: (codes: string[]) => string;
  experienceLabel: (years: number | null) => string | null;
  distanceLabel: (km: number | null) => string | null;
}

/** Display helpers for provider DTOs. */
export function useProviderFormat(): ProviderFormat {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const money = (amount: number): string => formatMoney(amount, locale);

  const allRateLabels = (rates: ProviderRates): string[] => {
    const labels: string[] = [];
    if (rates.hourlyRate !== null) labels.push(t('common:rates.hourly', { amount: money(rates.hourlyRate) }));
    if (rates.dailyRate !== null) labels.push(t('common:rates.daily', { amount: money(rates.dailyRate) }));
    if (rates.monthlyRate !== null) labels.push(t('common:rates.monthly', { amount: money(rates.monthlyRate) }));
    return labels;
  };

  const languageLabel = (code: string): string => t(`common:languages.${code}`, { defaultValue: code });

  return {
    rateLabel: (rates) => {
      if (!rates) return null;
      const first = allRateLabels(rates)[0];
      if (!first) return rates.isNegotiable ? t('common:rates.negotiable') : null;
      return rates.isNegotiable ? `${first} · ${t('common:rates.negotiable')}` : first;
    },
    allRateLabels,
    languageLabel,
    languagesLabel: (codes) => codes.map(languageLabel).join(', '),
    experienceLabel: (years) =>
      years === null ? null : t('customer:provider.experience', { years: t('common:units.years', { count: years }) }),
    distanceLabel: (km) => (km === null ? null : t('common:units.km', { value: km < 10 ? km.toFixed(1) : Math.round(km) })),
  };
}
