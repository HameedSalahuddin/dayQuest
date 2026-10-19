import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import PixelCard from '../../components/ui/PixelCard';
import EmptyState from '../../components/ui/EmptyState';
import { addScheduleException, deleteScheduleException, hasScheduleOverlap, listScheduleEntries, listScheduleExceptions, type ScheduleEntry, type ScheduleException } from '../../features/schedule/repository';
import { dateKeyOffset, isValidDateKey, localDateKey, parseTimeRange, weekdayForDateKey } from '../../utils/dates';

type EventType = 'class' | 'commitment';
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const showTime = (minutes: number) => { const value = ((minutes % 1440) + 1440) % 1440; return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; };
const nextDateForWeekday = (day: number) => dateKeyOffset(localDateKey(new Date()), (day - new Date().getDay() + 7) % 7);

export default function ScheduleScreen() {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number>();
  const [title, setTitle] = useState(''); const [subject, setSubject] = useState(''); const [location, setLocation] = useState('');
  const [weekday, setWeekday] = useState(new Date().getDay()); const [start, setStart] = useState('09:00'); const [end, setEnd] = useState('10:00'); const [kind, setKind] = useState<EventType>('class'); const [error, setError] = useState('');
  const [exceptionDate, setExceptionDate] = useState(() => localDateKey(new Date()));
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [oneOffTitle, setOneOffTitle] = useState(''); const [oneOffStart, setOneOffStart] = useState('09:00'); const [oneOffEnd, setOneOffEnd] = useState('10:00');
  const refresh = useCallback(async () => { try { setEntries(await listScheduleEntries(db)); } catch { setError('Could not load your schedule.'); } }, [db]);
  const refreshExceptions = useCallback(async () => {
    if (!isValidDateKey(exceptionDate)) { setExceptions([]); return; }
    try { setExceptions(await listScheduleExceptions(db, exceptionDate)); } catch { setError('Could not load date-specific changes.'); }
  }, [db, exceptionDate]);
  useEffect(() => {
    let active = true;
    listScheduleEntries(db)
      .then(rows => { if (active) setEntries(rows); })
      .catch(() => { if (active) setError('Could not load your schedule.'); });
    return () => { active = false; };
  }, [db]);
  useEffect(() => {
    if (!isValidDateKey(exceptionDate)) return;
    let active = true;
    listScheduleExceptions(db, exceptionDate)
      .then(rows => { if (active) setExceptions(rows); })
      .catch(() => { if (active) setError('Could not load date-specific changes.'); });
    return () => { active = false; };
  }, [db, exceptionDate]);
  const openEditor = (entry?: ScheduleEntry) => { setEditId(entry?.id); setTitle(entry?.title ?? ''); setSubject(entry?.subject ?? ''); setLocation(entry?.location ?? ''); setWeekday(entry?.weekday ?? selectedDay); setStart(entry ? showTime(entry.start_minute) : '09:00'); setEnd(entry ? showTime(entry.end_minute % 1440) : '10:00'); setKind(entry?.event_type ?? 'class'); setError(''); setModal(true); };
  const save = async () => {
    const range = parseTimeRange(start, end);
    const startMinute = range?.start ?? null, endMinute = range?.end ?? null;
    if (!title.trim()) { setError('Add a name for this event.'); return; }
    if (startMinute === null || endMinute === null) { setError('Enter valid 24-hour times. An end time earlier than the start means it ends the next day.'); return; }
    const overlaps = hasScheduleOverlap(entries, weekday, startMinute, endMinute, editId);
    if (overlaps) { setError('This overlaps another fixed event on that day. Adjust the time to continue.'); return; }
    const now = new Date().toISOString();
    try {
      if (editId === undefined) await db.runAsync(`INSERT INTO schedule_entries (title, subject, location, weekday, start_minute, end_minute, event_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, title.trim(), subject || null, location || null, weekday, startMinute, endMinute, kind, now, now);
      else await db.runAsync(`UPDATE schedule_entries SET title=?, subject=?, location=?, weekday=?, start_minute=?, end_minute=?, event_type=?, updated_at=? WHERE id=?`, title.trim(), subject || null, location || null, weekday, startMinute, endMinute, kind, now, editId);
      setModal(false); await refresh();
    } catch { setError('Could not save this event. Try again.'); }
  };
  const addOneOff = async () => {
    const day = weekdayForDateKey(exceptionDate);
    const range = parseTimeRange(oneOffStart, oneOffEnd);
    if (!isValidDateKey(exceptionDate)) { setError('Enter a real date in YYYY-MM-DD format.'); return; }
    if (!oneOffTitle.trim()) { setError('Add a name for this one-off event.'); return; }
    if (!range) { setError('Enter valid 24-hour times for this event.'); return; }
    if (exceptions.some(item => item.exception_type === 'holiday')) { setError('Remove the holiday before adding an event.'); return; }
    let previousExceptions: ScheduleException[];
    let nextExceptions: ScheduleException[];
    try {
      [previousExceptions, nextExceptions] = await Promise.all([
        listScheduleExceptions(db, dateKeyOffset(exceptionDate, -1)),
        listScheduleExceptions(db, dateKeyOffset(exceptionDate, 1)),
      ]);
    } catch { setError('Could not check nearby events. Please try again.'); return; }
    const overlapsDate = exceptions.some(item => item.exception_type === 'one_off' && item.start_minute !== null && item.end_minute !== null && range.start < item.end_minute && range.end > item.start_minute);
    const cancelledIds = (rows: ScheduleException[]) => new Set(rows.filter(item => item.exception_type === 'cancelled').map(item => item.entry_id));
    const currentCancelled = cancelledIds(exceptions);
    const previousCancelled = cancelledIds(previousExceptions);
    const nextCancelled = cancelledIds(nextExceptions);
    const overlapsWeekly = entries.some(item =>
      (item.weekday === day && !currentCancelled.has(item.id) && range.start < item.end_minute && range.end > item.start_minute) ||
      (item.weekday === ((day! + 6) % 7) && !previousExceptions.some(row => row.exception_type === 'holiday') && !previousCancelled.has(item.id) && item.end_minute > 1440 && range.start < item.end_minute - 1440) ||
      (item.weekday === ((day! + 1) % 7) && !nextExceptions.some(row => row.exception_type === 'holiday') && !nextCancelled.has(item.id) && range.end > 1440 && range.end - 1440 > item.start_minute));
    const overlapsPreviousOneOff = !previousExceptions.some(item => item.exception_type === 'holiday') && previousExceptions.some(item => item.exception_type === 'one_off' && item.end_minute !== null && item.end_minute > 1440 && range.start < item.end_minute - 1440);
    const overlapsNextOneOff = !nextExceptions.some(item => item.exception_type === 'holiday') && range.end > 1440 && nextExceptions.some(item => item.exception_type === 'one_off' && item.start_minute !== null && item.end_minute !== null && range.end - 1440 > item.start_minute && 0 < item.end_minute);
    if (overlapsDate || overlapsWeekly || overlapsPreviousOneOff || overlapsNextOneOff) { setError('This event overlaps another event on or around that date.'); return; }
    try {
      await addScheduleException(db, { date: exceptionDate, entry_id: null, exception_type: 'one_off', title: oneOffTitle.trim(), start_minute: range.start, end_minute: range.end, notes: null });
      setOneOffTitle(''); setError(''); await refreshExceptions();
    } catch { setError('Could not save this one-off event.'); }
  };
  const addHoliday = async () => {
    if (!isValidDateKey(exceptionDate)) { setError('Enter a real date in YYYY-MM-DD format.'); return; }
    try {
      await db.runAsync('DELETE FROM schedule_exceptions WHERE date=? AND exception_type=?', exceptionDate, 'holiday');
      await addScheduleException(db, { date: exceptionDate, entry_id: null, exception_type: 'holiday', title: 'Holiday', start_minute: null, end_minute: null, notes: null });
      setError(''); await refreshExceptions();
    } catch { setError('Could not save this holiday.'); }
  };
  const cancelForDate = async (entry: ScheduleEntry) => {
    if (!isValidDateKey(exceptionDate) || weekdayForDateKey(exceptionDate) !== entry.weekday) { setError('Choose a date that matches this event’s weekday.'); return; }
    try {
      if (!exceptions.some(item => item.exception_type === 'cancelled' && item.entry_id === entry.id)) {
        await addScheduleException(db, { date: exceptionDate, entry_id: entry.id, exception_type: 'cancelled', title: null, start_minute: null, end_minute: null, notes: null });
      }
      setError(''); await refreshExceptions();
    } catch { setError('Could not cancel this event for the selected date.'); }
  };
  const remove = (entry: ScheduleEntry) => Alert.alert('Delete event?', `Remove “${entry.title}” from your weekly schedule?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await db.runAsync('DELETE FROM schedule_entries WHERE id=?', entry.id); await refresh(); } }]);
  const visible = entries.filter(e => e.weekday === selectedDay);
  const dateWeekday = weekdayForDateKey(exceptionDate);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><View><Text style={styles.title}>Schedule</Text><Text style={styles.subtitle}>Your weekly timetable</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Add schedule event" style={styles.add} onPress={() => openEditor()}><Ionicons name="add" size={22} color={colors.bgPrimary} /></Pressable></View>
    <View style={styles.divider} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>{days.map((d, i) => <Pressable key={d} onPress={() => { setSelectedDay(i); setExceptionDate(nextDateForWeekday(i)); }} style={[styles.day, selectedDay === i && styles.dayActive]}><Text style={[styles.dayText, selectedDay === i && styles.dayTextActive]}>{d}</Text></Pressable>)}</ScrollView>
    <ScrollView contentContainerStyle={styles.pageList} keyboardShouldPersistTaps="handled">
      <PixelCard style={styles.datePanel}>
        <Text style={styles.panelTitle}>One-off changes</Text>
        <Text style={styles.eventMeta}>Set a holiday, cancel a weekly event, or add an event for one date.</Text>
        <Field label="DATE (YYYY-MM-DD)" value={exceptionDate} onChangeText={value => { setExceptionDate(value); if (!isValidDateKey(value)) setExceptions([]); const day = weekdayForDateKey(value); if (day !== null) setSelectedDay(day); }} placeholder="2026-10-30" />
        {dateWeekday !== null ? <Text style={styles.eventMeta}>{fullDays[dateWeekday]}</Text> : <Text style={styles.error}>Enter a real date (YYYY-MM-DD).</Text>}
        <Field label="ONE-OFF EVENT NAME" value={oneOffTitle} onChangeText={setOneOffTitle} placeholder="e.g. Study group" />
        <View style={styles.row}><Field label="START" value={oneOffStart} onChangeText={setOneOffStart} placeholder="09:00"/><Field label="END" value={oneOffEnd} onChangeText={setOneOffEnd} placeholder="10:00"/></View>
        <View style={styles.actions}><Pressable style={styles.smallAction} onPress={() => void addOneOff()}><Text style={styles.smallActionText}>Add one-off event</Text></Pressable><Pressable style={styles.smallAction} onPress={() => void addHoliday()}><Text style={styles.smallActionText}>Mark holiday</Text></Pressable></View>
        {exceptions.map(item => <View key={item.id} style={styles.exceptionRow}>
          <Text style={styles.eventMeta}>{item.exception_type === 'holiday' ? 'Holiday · weekly events hidden' : item.exception_type === 'cancelled' ? `Cancelled · ${entries.find(entry => entry.id === item.entry_id)?.title ?? 'weekly event'}` : `${item.title} · ${showTime(item.start_minute ?? 0)}–${showTime(item.end_minute ?? 0)}${(item.end_minute ?? 0) > 1440 ? ' +1d' : ''}`}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Remove date change" onPress={async () => { await deleteScheduleException(db, item.id); await refreshExceptions(); }}><Ionicons name="close-circle-outline" size={20} color={colors.textDisabled}/></Pressable>
        </View>)}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </PixelCard>
      <Text style={styles.panelTitle}>Weekly · {fullDays[selectedDay]}</Text>
      {visible.length === 0 ? <EmptyState icon="calendar-outline" title="A clear day" subtitle={`No classes or commitments on ${fullDays[selectedDay]}. Add an event to build your weekly rhythm.`} /> : visible.map(entry => {
        const cancelled = exceptions.some(item => item.exception_type === 'cancelled' && item.entry_id === entry.id);
        return <PixelCard key={entry.id} accentLeft style={styles.event}>
          <Pressable style={styles.eventPress} onPress={() => openEditor(entry)} onLongPress={() => remove(entry)}>
            <View style={styles.time}><Text style={styles.timeText}>{showTime(entry.start_minute)}</Text><View style={styles.timeLine} /><Text style={styles.timeText}>{showTime(entry.end_minute % 1440)}{entry.end_minute > 1440 ? ' +1d' : ''}</Text></View>
            <View style={styles.eventInfo}><Text style={styles.eventName}>{entry.title}</Text><Text style={styles.eventMeta}>{[entry.subject, entry.location, entry.event_type].filter(Boolean).join(' · ')}</Text></View><Ionicons name="create-outline" size={18} color={colors.textDisabled} />
          </Pressable>
          {dateWeekday === selectedDay ? <Pressable style={styles.cancelEvent} onPress={() => cancelled ? undefined : void cancelForDate(entry)}><Text style={styles.cancelEventText}>{cancelled ? 'Cancelled for date' : `Cancel on ${exceptionDate}`}</Text></Pressable> : null}
        </PixelCard>;
      })}
      <Text style={styles.hint}>Tap an event to edit · press and hold to delete</Text>
    </ScrollView>
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
  safe: { flex: 1, backgroundColor: colors.bgPrimary }, pageList: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm }, datePanel: { gap: spacing.sm }, panelTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '700' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, smallAction: { borderWidth: borders.thin, borderColor: colors.borderAccent, borderRadius: radii.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, smallActionText: { color: colors.accentSecondary, fontSize: typography.size.xs, fontWeight: '700' }, exceptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderTopWidth: borders.thin, borderTopColor: colors.borderDefault, paddingTop: spacing.xs }, eventPress: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, cancelEvent: { alignSelf: 'flex-start', marginLeft: 50, paddingVertical: spacing.xs }, cancelEventText: { color: colors.warning, fontSize: typography.size.xs, fontWeight: '700' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm }, title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: '700' }, subtitle: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: spacing.xxs }, add: { width: 42, height: 42, backgroundColor: colors.accentPrimary, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' }, divider: { height: 1, backgroundColor: colors.borderDefault, marginHorizontal: spacing.md }, days: { flexDirection: 'row', gap: spacing.xs, padding: spacing.md }, day: { borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, dayActive: { borderColor: colors.borderAccent, backgroundColor: colors.bgHighlight }, dayText: { color: colors.textMuted, fontSize: typography.size.sm, textTransform: 'capitalize' }, dayTextActive: { color: colors.accentSecondary, fontWeight: '700' }, empty: { flex: 1, justifyContent: 'center' }, event: { gap: spacing.sm }, time: { alignItems: 'center' }, timeText: { color: colors.accentSecondary, fontSize: typography.size.xs, fontWeight: '700' }, timeLine: { height: 12, width: 1, backgroundColor: colors.borderAccent, marginVertical: 2 }, eventInfo: { flex: 1, gap: 4 }, eventName: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '700' }, eventMeta: { color: colors.textMuted, fontSize: typography.size.xs, textTransform: 'capitalize' }, hint: { color: colors.textDisabled, fontSize: typography.size.xs, textAlign: 'center', padding: spacing.sm }, modal: { flex: 1, backgroundColor: colors.bgPrimary }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: borders.thin, borderBottomColor: colors.borderDefault }, modalTitle: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: '700' }, cancel: { color: colors.accentPrimary }, form: { padding: spacing.md, gap: spacing.md }, field: { flex: 1, gap: spacing.xs }, label: { color: colors.textMuted, fontSize: typography.size.xs, fontWeight: '700', letterSpacing: 1 }, input: { minHeight: 44, borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, backgroundColor: colors.bgCard, color: colors.textPrimary, paddingHorizontal: spacing.sm }, row: { flexDirection: 'row', gap: spacing.sm }, kind: { borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, error: { color: colors.dangerLight }, save: { backgroundColor: colors.accentPrimary, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center' }, saveText: { color: colors.bgPrimary, fontWeight: '700' },
});
