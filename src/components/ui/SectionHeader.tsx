import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, borders } from '../../theme/tokens';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional right-side action label */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * SectionHeader — labelled section divider with optional action.
 * The left accent bar reinforces the pixel-art grid aesthetic.
 */
export default function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.accentBar} />
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <Text style={styles.action} onPress={onAction}>
          {actionLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  accentBar: {
    width: borders.medium,
    height: 16,
    backgroundColor: colors.accentPrimary,
    borderRadius: 1,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.bold,
    color: colors.textMuted,
    letterSpacing: typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: typography.size.xs,
    color: colors.textDisabled,
    marginTop: 1,
  },
  action: {
    fontSize: typography.size.sm,
    color: colors.accentPrimary,
    fontWeight: typography.weight.medium,
  },
});
