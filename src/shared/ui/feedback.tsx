import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../lib/error-copy';
import { useTheme } from '../theme/theme';
import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export function LoadingState({ label }: { label?: string }): ReactNode {
  const theme = useTheme();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      {label ? (
        <Text tone="muted" align="center">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}): ReactNode {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.iconBubble, { backgroundColor: theme.colors.surfaceAlt }]}>
        <Icon name={icon} size={30} color={theme.colors.textMuted} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body ? (
        <Text tone="muted" align="center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} isCompact /> : null}
    </View>
  );
}

/** Layman error copy from the API error code; never shows the server message. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }): ReactNode {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title={t('common:error.title')}
      body={t(errorMessageKey(error))}
      actionLabel={onRetry ? t('common:actions.retry') : undefined}
      onAction={onRetry}
    />
  );
}

/** Inline banner for form-level errors or notices. */
export function Notice({
  tone = 'info',
  title,
  body,
  icon,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  body: string;
  icon?: IconName;
}): ReactNode {
  const theme = useTheme();
  const palette = {
    info: { bg: theme.colors.infoLight, fg: theme.colors.info, icon: 'information-circle' as IconName },
    success: { bg: theme.colors.successLight, fg: theme.colors.success, icon: 'checkmark-circle' as IconName },
    warning: { bg: theme.colors.warningLight, fg: theme.colors.warning, icon: 'warning' as IconName },
    danger: { bg: theme.colors.dangerLight, fg: theme.colors.danger, icon: 'alert-circle' as IconName },
  }[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[styles.notice, { backgroundColor: palette.bg, borderRadius: theme.radius.md }]}>
      <Icon name={icon ?? palette.icon} color={palette.fg} size={20} />
      <View style={styles.flex}>
        {title ? (
          <Text variant="bodyStrong" style={{ color: palette.fg }}>
            {title}
          </Text>
        ) : null}
        <Text variant="caption" style={{ color: palette.fg }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export function Pill({ label, tone = 'neutral', icon }: { label: string; tone?: PillTone; icon?: IconName }): ReactNode {
  const theme = useTheme();
  const palette: Record<PillTone, { bg: string; fg: string }> = {
    neutral: { bg: theme.colors.surfaceAlt, fg: theme.colors.textMuted },
    info: { bg: theme.colors.infoLight, fg: theme.colors.info },
    success: { bg: theme.colors.successLight, fg: theme.colors.success },
    warning: { bg: theme.colors.warningLight, fg: theme.colors.warning },
    danger: { bg: theme.colors.dangerLight, fg: theme.colors.danger },
    accent: { bg: theme.colors.accentLight, fg: theme.colors.accent },
  };
  const colors = palette[tone];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      {icon ? <Icon name={icon} size={13} color={colors.fg} /> : null}
      <Text variant="label" style={{ color: colors.fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Selectable chip (filters, multi-select options). */
export function Chip({
  label,
  isSelected,
  onPress,
  icon,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  icon?: IconName;
}): ReactNode {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        },
      ]}>
      {icon ? <Icon name={icon} size={16} color={isSelected ? theme.colors.onPrimary : theme.colors.text} /> : null}
      <Text variant="label" style={{ color: isSelected ? theme.colors.onPrimary : theme.colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Avatar({ uri, name, size = 48 }: { uri: string | null; name: string; size?: number }): ReactNode {
  const theme = useTheme();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        accessibilityLabel={name}
      />
    );
  }
  return (
    <View
      accessibilityLabel={name}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.primarySoft }]}>
      <Text variant="bodyStrong" style={{ color: theme.colors.primaryMid, fontSize: size * 0.36 }}>
        {initials || '?'}
      </Text>
    </View>
  );
}

/** Star rating; pass onChange to make it an input. */
export function RatingStars({
  value,
  onChange,
  size = 18,
  label,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  label?: string;
}): ReactNode {
  const theme = useTheme();
  return (
    <View style={styles.stars} accessibilityLabel={label ?? `${value} / 5`} accessibilityRole={onChange ? 'adjustable' : 'text'}>
      {[1, 2, 3, 4, 5].map((star) => {
        const name: IconName = value >= star ? 'star' : value >= star - 0.5 ? 'star-half' : 'star-outline';
        const icon = <Icon name={name} size={size} color={theme.colors.accent} />;
        return onChange ? (
          <Pressable
            key={star}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${star}`}
            onPress={() => onChange(star)}>
            {icon}
          </Pressable>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, minHeight: 240 },
  iconBubble: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', gap: 10, padding: 12, alignItems: 'flex-start' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 48, borderRadius: 999, borderWidth: 1 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  stars: { flexDirection: 'row', gap: 2 },
});
