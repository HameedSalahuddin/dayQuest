import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii, borders, typography } from '../../theme/tokens';

type BadgeVariant = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'done' | 'accent';

interface PixelBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<
  BadgeVariant,
  { bg: string; text: string; border: string }
> = {
  overdue: {
    bg: colors.bgCard,
    text: colors.dangerLight,
    border: colors.danger,
  },
  today: {
    bg: colors.bgCard,
    text: colors.warning,
    border: colors.warning,
  },
  tomorrow: {
    bg: colors.bgCard,
    text: colors.accentSecondary,
    border: colors.accentPrimary,
  },
  upcoming: {
    bg: colors.bgCard,
    text: colors.textMuted,
    border: colors.borderDefault,
  },
  done: {
    bg: colors.bgCard,
    text: colors.success,
    border: colors.success,
  },
  accent: {
    bg: colors.bgCard,
    text: colors.accentPrimary,
    border: colors.borderAccent,
  },
};

/**
 * PixelBadge — compact status pill used throughout the app.
 * Communicates deadline urgency and task state.
 */
export default function PixelBadge({ label, variant = 'upcoming' }: PixelBadgeProps) {
  const v = variantStyles[variant];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
        },
      ]}
    >
      <Text style={[styles.label, { color: v.text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: borders.thin,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    letterSpacing: typography.letterSpacing.wider,
  },
});
