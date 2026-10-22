import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { addProfileOption, deleteProfileOption, listProfileOptions, type ProfileOption, type ProfileOptionType } from '../../features/profile/options';
import { borders, colors, radii, spacing, typography } from '../../theme/tokens';
import PixelCard from './PixelCard';

export default function ProfileOptionManager({ type, title, description, placeholder }: {
  type: ProfileOptionType;
  title: string;
  description: string;
  placeholder: string;
}) {
  const db = useSQLiteContext();
  const [items, setItems] = useState<ProfileOption[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const refresh = useCallback(async () => setItems(await listProfileOptions(db, type)), [db, type]);

  useEffect(() => {
    let active = true;
    listProfileOptions(db, type)
      .then(options => { if (active) setItems(options); })
      .catch(() => { if (active) setError(`Could not load ${title.toLowerCase()}.`); });
    return () => { active = false; };
  }, [db, title, type]);

  const add = async () => {
    if (!draft.trim()) { setError('Enter a name first.'); return; }
    try {
      await addProfileOption(db, type, draft);
      setDraft(''); setError(''); await refresh();
    } catch { setError(`Could not add this ${type === 'subject' ? 'subject' : 'activity'}.`); }
  };

  const remove = async (item: ProfileOption) => {
    try { await deleteProfileOption(db, item.id); setItems(current => current.filter(option => option.id !== item.id)); setError(''); }
    catch { setError(`Could not remove ${item.name}.`); }
  };

  return <PixelCard style={styles.card}>
    <View style={styles.heading}><View style={styles.headingIcon}><Ionicons name={type === 'subject' ? 'book-outline' : 'bicycle-outline'} size={18} color={colors.accentPrimary}/></View><View style={styles.headingText}><Text style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text></View></View>
    <View style={styles.addRow}>
      <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => void add()} returnKeyType="done" placeholder={placeholder} placeholderTextColor={colors.textDisabled} style={styles.input} maxLength={48}/>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${type}`} onPress={() => void add()} style={styles.addButton}><Ionicons name="add" size={21} color="#0f172a"/></Pressable>
    </View>
    {items.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.items}>
      {items.map(item => <View key={item.id} style={styles.item}><Text style={styles.itemName}>{item.name}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} hitSlop={7} onPress={() => void remove(item)}><Ionicons name="close-circle" size={16} color={colors.textMuted}/></Pressable></View>)}
    </ScrollView> : <Text style={styles.empty}>Nothing added yet</Text>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </PixelCard>;
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headingIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0d19', borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.xs },
  headingText: { flex: 1, gap: 2 },
  title: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: typography.size.xs },
  addRow: { flexDirection: 'row', gap: spacing.sm },
  input: { flex: 1, minHeight: 42, backgroundColor: '#14141f', borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.xs, color: colors.textPrimary, paddingHorizontal: spacing.sm, fontSize: typography.size.sm },
  addButton: { width: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentPrimary, borderWidth: borders.thin, borderColor: colors.accentPrimary, borderBottomWidth: 4, borderBottomColor: '#0284c7', borderRadius: radii.xs },
  items: { gap: spacing.xs, paddingVertical: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: '#181824', borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  itemName: { color: colors.accentSecondary, fontSize: typography.size.xs, fontWeight: '700' },
  empty: { color: colors.textDisabled, fontSize: typography.size.xs },
  error: { color: colors.dangerLight, fontSize: typography.size.xs },
});
