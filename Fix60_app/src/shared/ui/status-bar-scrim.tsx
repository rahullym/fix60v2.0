import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme";

/** Solid primary strip behind the status bar so scrolled content never shows under the clock. */
export function StatusBarScrim(): ReactNode {
  const { top } = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <View
      pointerEvents="none"
      style={[
        styles.scrim,
        { height: top, backgroundColor: theme.colors.primary },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  scrim: { position: "absolute", top: 0, left: 0, right: 0 },
});
