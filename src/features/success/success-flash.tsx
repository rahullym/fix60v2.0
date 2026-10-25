import { type ReactNode, useEffect, useSyncExternalStore } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SuccessScreen } from '@/shared/ui';

interface Flash {
  title: string;
  body?: string;
  actionLabel: string;
}

let current: Flash | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** Queues the full-blue confirmation (old "You're set" screens). Survives the route-guard switch on sign-in. */
export const successFlash = {
  show: (flash: Flash): void => {
    current = flash;
    emit();
  },
  dismiss: (): void => {
    current = null;
    emit();
  },
};

/** Mounted once in the root layout; overlays the app while a flash is pending. */
export function SuccessFlashHost(): ReactNode {
  const flash = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
  const isVisible = flash !== null;
  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }
    // Android back closes the overlay instead of navigating the screen underneath.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      successFlash.dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [isVisible]);
  if (!flash) {
    return null;
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <SuccessScreen title={flash.title} body={flash.body} actionLabel={flash.actionLabel} onAction={successFlash.dismiss} />
    </View>
  );
}
