import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/shared/api/endpoints';
import { useLocale } from '@/shared/lib/use-locale';
import { SelectField } from '@/shared/ui';
import { customerKeys } from '../model/query-keys';

/** District + locality pickers. Changing the district clears the locality. */
export function LocationFields({
  districtId,
  localityId,
  onChange,
  districtError,
  localityError,
}: {
  districtId: string | null;
  localityId: string | null;
  onChange: (next: { districtId: string | null; localityId: string | null }) => void;
  districtError?: string | null;
  localityError?: string | null;
}): ReactNode {
  const { t } = useTranslation();
  const { pick } = useLocale();
  const districts = useQuery({ queryKey: customerKeys.districts, queryFn: api.locations.districts, staleTime: 30 * 60 * 1000 });
  const localities = useQuery({
    queryKey: customerKeys.localities(districtId),
    queryFn: () => api.locations.localities(districtId!),
    enabled: Boolean(districtId),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <>
      <SelectField
        label={t('customer:location.district')}
        value={districtId}
        options={(districts.data?.items ?? []).map((district) => ({ value: district.id, label: pick(district.name) }))}
        onChange={(value) => onChange({ districtId: value, localityId: value === districtId ? localityId : null })}
        placeholder={districts.isLoading ? t('customer:common.loading') : t('customer:location.chooseDistrict')}
        error={districtError ?? (districts.isError ? t('customer:location.loadFailed') : null)}
      />
      <SelectField
        label={t('customer:location.locality')}
        value={localityId}
        options={(localities.data?.items ?? []).map((locality) => ({
          value: locality.id,
          label: pick(locality.name),
          description: [locality.localBody, locality.postalCode].filter(Boolean).join(' · ') || undefined,
        }))}
        onChange={(value) => onChange({ districtId, localityId: value })}
        placeholder={districtId ? t('customer:location.chooseLocality') : t('customer:location.districtFirst')}
        error={localityError ?? (localities.isError ? t('customer:location.loadFailed') : null)}
        isSearchable
      />
    </>
  );
}
