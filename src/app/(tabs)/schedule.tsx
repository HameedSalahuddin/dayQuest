import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import PixelCard from '../../components/ui/PixelCard';
import EmptyState from '../../components/ui/EmptyState';

type EventType = 'class' | 'commitment';
interface ScheduleEntry { id: number; title: string; subject: string | null; location: string | null; notes: string | null; weekday: number; start_minute: number; end_minute: number; event_type: EventType; }
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toMinutes = (value: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim()); if (!m) return null; const h = Number(m[1]), min = Number(m[2]); return h < 24 && min < 60 ? h * 60 + min : null; };
const showTime = (minutes: number) => `${String(Math.floor((minutes % 1440) / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export default function ScheduleScreen() {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number>();
  const [title, setTitle] = useState(''); const [subject, setSubject] = useState(''); const [location, setLocation] = useState('');
  const [weekday, setWeekday] = useState(new Date().getDay()); const [start, setStart] = useState('09:00'); const [end, setEnd] = useState('10:00'); const [kind, setKind] = useState<EventType>('class'); const [error, setError] = useState('');
  const refresh = useCallback(async () => { try { setEntries(await db.getAllAsync<ScheduleEntry>('SELECT * FROM schedule_entries ORDER BY weekday, start_minute')); } catch { setError('Could not load your schedule.'); } }, [db]);
  useEffect(() => {
    let active = true;
    db.getAllAsync<ScheduleEntry>('SELECT * FROM schedule_entries ORDER BY weekday, start_minute')
      .then(rows => { if (active) setEntries(rows); })
      .catch(() => { if (active) setError('Could not load your schedule.'); });
    return () => { active = false; };
  }, [db]);
  const openEditor = (entry?: ScheduleEntry) => { setEditId(entry?.id); setTitle(entry?.title ?? ''); setSubject(entry?.subject ?? ''); setLocation(entry?.location ?? ''); setWeekday(entry?.weekday ?? selectedDay); setStart(entry ? showTime(entry.start_minute) : '09:00'); setEnd(entry ? showTime(entry.end_minute % 1440) : '10:00'); setKind(entry?.event_type ?? 'class'); setError(''); setModal(true); };
  const save = async () => {
    const startMinute = toMinutes(start), endMinute = toMinutes(end);
    if (!title.trim()) { setError('Add a name for this event.'); return; }
    if (startMinute === null || endMinute === null || endMinute <= startMinute) { setError('Enter valid times. End time must be later than start time.'); return; }
    const overlaps = entries.some(e => e.weekday === weekday && e.id !== editId && startMinute < e.end_minute && endMinute > e.start_minute);
    if (overlaps) { setError('This overlaps another fixed event on that day. Adjust the time to continue.'); return; }
    const now = new Date().toISOString();
    try {
      if (editId === undefined) await db.runAsync(`INSERT INTO schedule_entries (title, subject, location, weekday, start_minute, end_minute, event_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, title.trim(), subject || null, location || null, weekday, startMinute, endMinute, kind, now, now);
      else await db.runAsync(`UPDATE schedule_entries SET title=?, subject=?, location=?, weekday=?, start_minute=?, end_minute=?, event_type=?, updated_at=? WHERE id=?`, title.trim(), subject || null, location || null, weekday, startMinute, endMinute, kind, now, editId);
      setModal(false); await refresh();
    } catch { setError('Could not save this event. Try again.'); }
  };
  const remove = (entry: ScheduleEntry) => Alert.alert('Delete event?', `Remove “${entry.title}” from your weekly schedule?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await db.runAsync('DELETE FROM schedule_entries WHERE id=?', entry.id); await refresh(); } }]);
  const visible = entries.filter(e => e.weekday === selectedDay);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><View><Text style={styles.title}>Schedule</Text><Text style={styles.subtitle}>Your weekly timetable</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Add schedule event" style={styles.add} onPress={() => openEditor()}><Ionicons name="add" size={22} color={colors.bgPrimary} /></Pressable></View>
    <View style={styles.divider} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>{days.map((d, i) => <Pressable key={d} onPress={() => setSelectedDay(i)} style={[styles.day, selectedDay === i && styles.dayActive]}><Text style={[styles.dayText, selectedDay === i && styles.dayTextActive]}>{d}</Text></Pressable>)}</ScrollView>
    {visible.length === 0 ? <View style={styles.empty}><EmptyState icon="calendar-outline" title="A clear day" subtitle={`No classes or commitments on ${fullDays[selectedDay]}. Add an event to build your weekly rhythm.`} /></View> :
      <ScrollView contentContainerStyle={styles.list}>{visible.map(entry => <Pressable key={entry.id} onPress={() => openEditor(entry)} onLongPress={() => remove(entry)}><PixelCard accentLeft style={styles.event}>
        <View style={styles.time}><Text style={styles.timeText}>{showTime(entry.start_minute)}</Text><View style={styles.timeLine} /><Text style={styles.timeText}>{showTime(entry.end_minute % 1440)}</Text></View>
        <View style={styles.eventInfo}><Text style={styles.eventName}>{entry.title}</Text><Text style={styles.eventMeta}>{[entry.subject, entry.location, entry.event_type].filter(Boolean).join(' · ')}</Text></View><Ionicons name="create-outline" size={18} color={colors.textDisabled} />
      </PixelCard></Pressable>)}</ScrollView>}
    <Text style={styles.hint}>Tap an event to edit · press and hold to delete</Text>
    <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}><SafeAreaView style={styles.modal}>
      <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editId ? 'Edit Event' : 'Add Event'}</Text><Pressable onPress={() => setModal(false)}><Text style={styles.cancel}>Cancel</Text></Pressable></View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="EVENT NAME *" value={title} onChangeText={setTitle} placeholder="e.g. Physics lecture" />
        <Field label="SUBJECT / TYPE" value={subject} onChangeText={setSubject} placeholder="e.g. Physics, gym, sleep" />
        <Field label="LOCATION" value={location} onChangeText={setLocation} placeholder="e.g. Lab 2" />
        <Text style={styles.label}>REPEATS ON</Text><View style={styles.days}>{days.map((d, i) => <Pressable key={d} onPress={() => setWeekday(i)} style={[styles.day, weekday === i && styles.dayActive]}><Text style={[styles.dayText, weekday === i && styles.dayTextActive]}>{d}</Text></Pressable>)}</View>
        <View style={styles.row}><Field label="START (24 HOUR)" value={start} onChangeText={setStart} placeholder="09:00"/><Field label="END (24 HOUR)" value={end} onChangeText={setEnd} placeholder="10:00"/></View>
        <Text style={styles.label}>EVENT KIND</Text><View style={styles.days}>{(['class', 'commitment'] as EventType[]).map(k => <Pressable key={k} onPress={() => setKind(k)} style={[styles.kind, kind === k && styles.dayActive]}><Text style={[styles.dayText, kind === k && styles.dayTextActive]}>{k === 'class' ? 'Class / lab' : 'Personal commitment'}</Text></Pressable>)}</View>
        {error ? <Text style={styles.error}>{error}</Text> : null}<Pressable style={styles.save} onPress={() => void save()}><Text style={styles.saveText}>{editId ? 'Save Changes' : 'Add to Schedule'}</Text></Pressable>
      </ScrollView>
    </SafeAreaView></Modal>
  </SafeAreaView>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, ...rest } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...rest} placeholderTextColor={colors.textDisabled} style={styles.input} /></View>; }
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm }, title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: '700' }, subtitle: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: spacing.xxs }, add: { width: 42, height: 42, backgroundColor: colors.accentPrimary, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' }, divider: { height: 1, backgroundColor: colors.borderDefault, marginHorizontal: spacing.md }, days: { flexDirection: 'row', gap: spacing.xs, padding: spacing.md }, day: { borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, dayActive: { borderColor: colors.borderAccent, backgroundColor: colors.bgHighlight }, dayText: { color: colors.textMuted, fontSize: typography.size.sm, textTransform: 'capitalize' }, dayTextActive: { color: colors.accentSecondary, fontWeight: '700' }, empty: { flex: 1, justifyContent: 'center' }, list: { paddingHorizontal: spacing.md, gap: spacing.sm }, event: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, time: { alignItems: 'center' }, timeText: { color: colors.accentSecondary, fontSize: typography.size.xs, fontWeight: '700' }, timeLine: { height: 12, width: 1, backgroundColor: colors.borderAccent, marginVertical: 2 }, eventInfo: { flex: 1, gap: 4 }, eventName: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '700' }, eventMeta: { color: colors.textMuted, fontSize: typography.size.xs, textTransform: 'capitalize' }, hint: { color: colors.textDisabled, fontSize: typography.size.xs, textAlign: 'center', padding: spacing.sm }, modal: { flex: 1, backgroundColor: colors.bgPrimary }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: borders.thin, borderBottomColor: colors.borderDefault }, modalTitle: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: '700' }, cancel: { color: colors.accentPrimary }, form: { padding: spacing.md, gap: spacing.md }, field: { flex: 1, gap: spacing.xs }, label: { color: colors.textMuted, fontSize: typography.size.xs, fontWeight: '700', letterSpacing: 1 }, input: { minHeight: 44, borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, backgroundColor: colors.bgCard, color: colors.textPrimary, paddingHorizontal: spacing.sm }, row: { flexDirection: 'row', gap: spacing.sm }, kind: { borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, error: { color: colors.dangerLight }, save: { backgroundColor: colors.accentPrimary, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center' }, saveText: { color: colors.bgPrimary, fontWeight: '700' },
});
