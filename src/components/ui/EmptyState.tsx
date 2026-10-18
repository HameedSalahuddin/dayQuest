import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, iconSizes } from '../../theme/tokens';

interface EmptyStateProps {
  /** Ionicons icon name */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  /** Optional pixel-art flavour text shown below subtitle */
  flavourText?: string;
}

/**
 * EmptyState — shown when a section has no data yet.
 * Keeps the UI purposeful and hints at what the user can do next.
 */
export default function EmptyState({
  icon = 'journal-outline',
  title,
  subtitle,
  flavourText,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={iconSizes.xxl} color={colors.accentPrimary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {flavourText ? <Text style={styles.flavour}>{flavourText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
    marginBottom: spacing.sm,
  },
  flavour: {
    fontSize: typography.size.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
});
