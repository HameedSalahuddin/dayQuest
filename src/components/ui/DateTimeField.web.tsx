import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import { dateFromDateKey, dateFromTimeKey, isValidDateKey, isValidTimeKey, localDateKey, timeKeyFromDate } from '../../utils/dates';

interface DateTimeFieldProps { label: string; value: Date | null; mode: 'date' | 'time'; onChange: (value: Date) => void; onClear?: () => void; placeholder?: string; style?: ViewStyle; disabled?: boolean; }

export default function DateTimeField({ label, value, mode, onChange, onClear, placeholder, style, disabled = false }: DateTimeFieldProps) {
  const stringValue = value ? mode === 'date' ? localDateKey(value) : timeKeyFromDate(value) : '';
  const handleChange = (next: string) => {
    if (!next) { onClear?.(); return; }
    if (mode === 'date' && isValidDateKey(next)) { const date = dateFromDateKey(next); if (date) onChange(date); }
    if (mode === 'time' && isValidTimeKey(next)) { const date = dateFromTimeKey(next); if (date) onChange(date); }
  };
  return <View style={[styles.container, style]}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.controls}>
      {React.createElement('input', { type: mode, value: stringValue, disabled, 'aria-label': label, onChange: (event: React.ChangeEvent<HTMLInputElement>) => handleChange(event.currentTarget.value), style: { flex: 1, minHeight: 44, borderWidth: borders.thin, borderStyle: 'solid', borderColor: colors.borderDefault, borderRadius: radii.sm, backgroundColor: colors.bgCard, color: colors.textPrimary, padding: `${spacing.sm}px`, fontSize: `${typography.size.md}px` } })}
      {value && onClear ? <Pressable accessibilityRole="button" onPress={onClear} style={styles.clear}><Text style={styles.clearText}>Clear</Text></Pressable> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs }, label: { color: colors.textMuted, fontSize: typography.size.xs, fontWeight: '700', letterSpacing: 1 },
  controls: { flexDirection: 'row', gap: spacing.xs }, clear: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm }, clearText: { color: colors.dangerLight, fontSize: typography.size.xs, fontWeight: '700' },
});
