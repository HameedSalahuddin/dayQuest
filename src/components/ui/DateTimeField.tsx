import React, { useState } from 'react';
import { DateTimePickerAndroid, default as DateTimePicker } from '@react-native-community/datetimepicker';
import { Modal, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';

type PickerMode = 'date' | 'time';

interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  mode: PickerMode;
  onChange: (value: Date) => void;
  onClear?: () => void;
  placeholder?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function DateTimeField({ label, value, mode, onChange, onClear, placeholder, style, disabled = false }: DateTimeFieldProps) {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(value ?? new Date());
  const open = () => {
    if (disabled) return;
    const initial = value ?? new Date();
    setPending(initial);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode,
        is24Hour: true,
        title: label,
        onValueChange: (_event, selected) => onChange(selected),
      });
      return;
    }
    setVisible(true);
  };
  const displayValue = value ? mode === 'date'
    ? value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
    : placeholder ?? `Choose ${mode}`;

  return <View style={[styles.container, style]}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${displayValue}`} accessibilityState={{ disabled }} disabled={disabled} onPress={open} style={[styles.field, disabled && styles.disabled]}>
        <Text style={[styles.value, !value && styles.placeholder]}>{displayValue}</Text>
        <Text style={styles.icon}>{mode === 'date' ? '▦' : '◷'}</Text>
      </Pressable>
      {value && onClear ? <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={onClear} style={styles.clear}><Text style={styles.clearText}>Clear</Text></Pressable> : null}
    </View>
    {Platform.OS === 'ios' ? <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}>
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setVisible(false)}><Text style={styles.sheetAction}>Cancel</Text></Pressable>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Pressable onPress={() => { onChange(pending); setVisible(false); }}><Text style={[styles.sheetAction, styles.done]}>Done</Text></Pressable>
          </View>
          <DateTimePicker
            value={pending}
            mode={mode}
            display="spinner"
            themeVariant="dark"
            accentColor={colors.accentPrimary}
            is24Hour
            onValueChange={(_event, selected) => setPending(selected)}
            style={styles.picker}
          />
        </SafeAreaView>
      </View>
    </Modal> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: typography.size.xs, fontWeight: '700', letterSpacing: 1 },
  controls: { flexDirection: 'row', gap: spacing.xs },
  field: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, backgroundColor: colors.bgCard, paddingHorizontal: spacing.sm },
  disabled: { opacity: 0.55 },
  value: { color: colors.textPrimary, fontSize: typography.size.md },
  placeholder: { color: colors.textDisabled },
  icon: { color: colors.accentPrimary, fontSize: typography.size.lg },
  clear: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  clearText: { color: colors.dangerLight, fontSize: typography.size.xs, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000088' },
  sheet: { backgroundColor: colors.bgSecondary, borderTopWidth: borders.thin, borderColor: colors.borderAccent },
  sheetHeader: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderBottomWidth: borders.thin, borderBottomColor: colors.borderDefault },
  sheetTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '700' },
  sheetAction: { color: colors.textMuted, fontSize: typography.size.sm },
  done: { color: colors.accentPrimary, fontWeight: '700' },
  picker: { alignSelf: 'stretch' },
});
