import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, borders, shadows } from '../../theme/tokens';

interface PixelCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Accent border on the left edge — useful for emphasis cards */
  accentLeft?: boolean;
  /** Elevated variant uses a slightly lighter background */
  elevated?: boolean;
}

/**
 * PixelCard — the primary content container for dayQuest.
 * Uses a 1-px muted-green border and dark card background.
 */
export default function PixelCard({
  children,
  style,
  accentLeft = false,
  elevated = false,
}: PixelCardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        accentLeft && styles.accentLeft,
        shadows.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderWidth: borders.thin,
    borderColor: colors.borderDefault,
    borderRadius: radii.sm,
    padding: 12,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: colors.bgElevated,
  },
  accentLeft: {
    borderLeftWidth: borders.medium,
    borderLeftColor: colors.borderAccent,
  },
});
