import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/** Refetches when the screen regains focus (skips the first focus, which already fetched). */
export function useRefetchOnFocus(refetch: () => unknown): void {
  const isFirstFocus = useRef(true);
  const latest = useRef(refetch);
  useEffect(() => {
    latest.current = refetch;
  }, [refetch]);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      latest.current();
    }, []),
  );
}
