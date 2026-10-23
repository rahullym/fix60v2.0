import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { type FieldErrors, hasErrors, RADIUS_RANGE, validateServiceArea } from '@/entities/application/validate-step';
import { useSaveStep } from '@/features/provider/application/use-save-step';
import { api } from '@/shared/api/endpoints';
import type { TravelPreference } from '@/shared/api/types';
import { useLocale } from '@/shared/lib/use-locale';
import { Button, Card, Chip, Notice, Stepper, Text } from '@/shared/ui';
import { WizardFrame } from '@/widgets/provider/wizard-frame';
import type { StepProps } from './step-props';

const TRAVEL: TravelPreference[] = ['yes', 'no', 'depends_on_distance'];

type CenterSource = 'draft' | 'locality' | 'device';
type LocateFailure = 'denied' | 'unavailable' | null;

type DeviceCenter =
  | { ok: true; center: { latitude: number; longitude: number } }
  | { ok: false; reason: Exclude<LocateFailure, null> };

/** Asks for foreground permission and reads one GPS fix. */
async function readDeviceCenter(): Promise<DeviceCenter> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, reason: 'denied' };
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { ok: true, center: { latitude: position.coords.latitude, longitude: position.coords.longitude } };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** Step 6: work-area centre (locality or GPS), radius and travel preference. */
export function ServiceAreaStep({ application, isEditable, returnTo }: StepProps): ReactNode {
  const { t } = useTranslation();
  const { pick } = useLocale();
  const draft = application.draft.service_area;
  const location = application.draft.location;
  const save = useSaveStep('service_area', returnTo);

  const localities = useQuery({
    queryKey: ['localities', location?.districtId ?? null],
    queryFn: () => api.locations.localities(location?.districtId ?? ''),
    enabled: Boolean(location?.districtId),
    staleTime: 60 * 60_000,
  });
  const locality = localities.data?.items.find((item) => item.id === location?.localityId) ?? null;

  const [deviceCenter, setDeviceCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(draft?.radiusKm ?? 10);
  const [travel, setTravel] = useState<TravelPreference>(draft?.travelPreference ?? 'depends_on_distance');
  const [isLocating, setIsLocating] = useState(false);
  const [locateFailure, setLocateFailure] = useState<LocateFailure>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const center = deviceCenter ?? (draft ? { latitude: draft.latitude, longitude: draft.longitude } : null) ?? (locality ? { latitude: locality.latitude, longitude: locality.longitude } : null);
  const source: CenterSource | null = deviceCenter ? 'device' : draft ? 'draft' : locality ? 'locality' : null;

  const locateMe = async (): Promise<void> => {
    setLocateFailure(null);
    setIsLocating(true);
    const result = await readDeviceCenter();
    setIsLocating(false);
    if (result.ok) {
      setDeviceCenter(result.center);
    } else {
      setLocateFailure(result.reason);
    }
  };

  const applyLocality = (): void => {
    if (locality) {
      setDeviceCenter({ latitude: locality.latitude, longitude: locality.longitude });
    }
  };

  const submit = (): void => {
    const data = {
      latitude: center?.latitude ?? Number.NaN,
      longitude: center?.longitude ?? Number.NaN,
      radiusKm,
      travelPreference: travel,
    };
    const next = validateServiceArea(data);
    setErrors(next);
    if (!hasErrors(next)) {
      save.mutate(data);
    }
  };

  return (
    <WizardFrame
      step="service_area"
      application={application}
      isEditable={isEditable}
      onContinue={submit}
      isSaving={save.isPending}
      saveError={save.error}
      hasFieldErrors={hasErrors(errors)}>
      <Card>
        <Text variant="label" tone="muted">
          {t('provider:serviceArea.centre')}
        </Text>
        {center ? (
          <>
            <Text variant="bodyStrong">
              {source === 'device' ? t('provider:serviceArea.fromDevice') : locality ? pick(locality.name) : t('provider:serviceArea.savedCentre')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('provider:serviceArea.coords', { lat: center.latitude.toFixed(4), lng: center.longitude.toFixed(4) })}
            </Text>
          </>
        ) : (
          <Text tone="muted">{t('provider:serviceArea.noCentre')}</Text>
        )}
        {errors.center ? (
          <Text variant="caption" tone="danger">
            {t(errors.center)}
          </Text>
        ) : null}
        {isEditable ? (
          <View style={styles.actions}>
            <Button
              label={t('provider:serviceArea.useMyLocation')}
              icon="locate-outline"
              variant="secondary"
              onPress={() => void locateMe()}
              isLoading={isLocating}
            />
            {locality && source !== 'locality' ? (
              <Button
                label={t('provider:serviceArea.useLocality', { name: pick(locality.name) })}
                variant="ghost"
                onPress={applyLocality}
              />
            ) : null}
          </View>
        ) : null}
        {locateFailure ? <Notice tone="warning" body={t(`provider:serviceArea.locate.${locateFailure}`)} /> : null}
      </Card>

      <Stepper
        label={t('provider:serviceArea.radius')}
        value={radiusKm}
        onChange={(value) => isEditable && setRadiusKm(value)}
        min={RADIUS_RANGE.min}
        max={RADIUS_RANGE.max}
        suffix="km"
      />
      <Text variant="caption" tone="muted" accessibilityLiveRegion="polite">
        {t('provider:serviceArea.radiusSummary', {
          radius: t('common:units.km', { value: radiusKm }),
          place: locality ? pick(locality.name) : t('provider:serviceArea.yourCentre'),
        })}
      </Text>
      {errors.radiusKm ? (
        <Text variant="caption" tone="danger">
          {t(errors.radiusKm)}
        </Text>
      ) : null}

      <View style={styles.group}>
        <Text variant="label" tone="muted">
          {t('provider:serviceArea.travel')}
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {TRAVEL.map((value) => (
            <Chip
              key={value}
              label={t(`provider:travel.${value}`)}
              isSelected={travel === value}
              onPress={() => isEditable && setTravel(value)}
            />
          ))}
        </View>
      </View>
    </WizardFrame>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
