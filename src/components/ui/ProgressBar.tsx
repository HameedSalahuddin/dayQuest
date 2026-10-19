import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii, borders, typography } from '../../theme/tokens';

interface ProgressBarProps {
  /** Value between 0 and 1 */
  progress: number;
  label?: string;
  showPercent?: boolean;
  height?: number;
  /** Colour override for the filled track */
  fillColor?: string;
}

/**
 * ProgressBar — pixel-art style horizontal progress indicator.
 * Used for daily completion and XP progress.
 */
export default function ProgressBar({
  progress,
  label,
  showPercent = true,
  height = 8,
  fillColor,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const percent = Math.round(clamped * 100);
  const fill = fillColor ?? colors.accentPrimary;

  return (
    <View style={styles.container}>
      {(label || showPercent) ? (
        <View style={styles.labelRow}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          {showPercent ? (
            <Text style={styles.percent}>{percent}%</Text>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent}%`,
              height,
              backgroundColor: fill,
            },
          ]}
        />
        {/* Pixel tick marks every 25% */}
        {[25, 50, 75].map((tick) => (
          <View
            key={tick}
            style={[styles.tick, { left: `${tick}%` as any, height }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    fontWeight: typography.weight.medium,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  percent: {
    fontSize: typography.size.xs,
    color: colors.accentPrimary,
    fontWeight: typography.weight.bold,
  },
  track: {
    width: '100%',
    backgroundColor: '#0f0f17',
    borderRadius: radii.xs,
    borderWidth: borders.thin,
    borderColor: '#0f0f17',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: radii.xs,
  },
  tick: {
    position: 'absolute',
    width: borders.thin,
    backgroundColor: colors.bgCard,
    opacity: 0.5,
  },
});
