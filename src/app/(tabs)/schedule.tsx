import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import PixelCard from '../../components/ui/PixelCard';
import EmptyState from '../../components/ui/EmptyState';
import DateTimeField from '../../components/ui/DateTimeField';
import { hasScheduleOverlap, listScheduleEntries, type ScheduleEntry } from '../../features/schedule/repository';
import { listProfileOptions, type ProfileOption } from '../../features/profile/options';
import { dateFromTimeKey, parseTimeRange, timeKeyFromDate } from '../../utils/dates';

type EventType = 'class' | 'commitment' | 'extracurricular';
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const showTime = (minutes: number) => { const value = ((minutes % 1440) + 1440) % 1440; return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; };

export default function ScheduleScreen() {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [subjects, setSubjects] = useState<ProfileOption[]>([]);
  const [activities, setActivities] = useState<ProfileOption[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number>();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [weekday, setWeekday] = useState(new Date().getDay());
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [kind, setKind] = useState<EventType>('class');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [rows, subjectOptions, activityOptions] = await Promise.all([
        listScheduleEntries(db), listProfileOptions(db, 'subject'), listProfileOptions(db, 'extracurricular'),
      ]);
      setEntries(rows); setSubjects(subjectOptions); setActivities(activityOptions);
    } catch { setError('Could not load your schedule.'); }
  }, [db]);

  useEffect(() => {
    let active = true;
    Promise.all([listScheduleEntries(db), listProfileOptions(db, 'subject'), listProfileOptions(db, 'extracurricular')])
      .then(([rows, subjectOptions, activityOptions]) => { if (active) { setEntries(rows); setSubjects(subjectOptions); setActivities(activityOptions); } })
      .catch(() => { if (active) setError('Could not load your schedule.'); });
    return () => { active = false; };
  }, [db]);

  const openEditor = async (entry?: ScheduleEntry) => {
    try {
      const [subjectOptions, activityOptions] = await Promise.all([listProfileOptions(db, 'subject'), listProfileOptions(db, 'extracurricular')]);
      setSubjects(subjectOptions); setActivities(activityOptions);
    } catch { setSubjects([]); setActivities([]); }
    setEditId(entry?.id); setTitle(entry?.title ?? ''); setSubject(entry?.subject ?? ''); setLocation(entry?.location ?? '');
    setWeekday(entry?.weekday ?? selectedDay); setStart(entry ? showTime(entry.start_minute) : '09:00'); setEnd(entry ? showTime(entry.end_minute % 1440) : '10:00');
    setKind(entry?.event_type === 'extracurricular' ? 'extracurricular' : entry?.event_type === 'commitment' ? 'commitment' : 'class');
    setError(''); setModal(true);
  };

  const save = async () => {
    const range = parseTimeRange(start, end);
    if (!title.trim()) { setError('Add a name for this event.'); return; }
    if (!range) { setError('Choose a valid start and end time. An end time earlier than the start means it ends the next day.'); return; }
    if (hasScheduleOverlap(entries, weekday, range.start, range.end, editId)) { setError('This overlaps another fixed event on that day. Adjust the time to continue.'); return; }
    const now = new Date().toISOString();
    try {
      if (editId === undefined) {
        await db.runAsync('INSERT INTO schedule_entries (title, subject, location, weekday, start_minute, end_minute, event_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', title.trim(), subject || null, location.trim() || null, weekday, range.start, range.end, kind, now, now);
      } else {
        await db.runAsync('UPDATE schedule_entries SET title=?, subject=?, location=?, weekday=?, start_minute=?, end_minute=?, event_type=?, updated_at=? WHERE id=?', title.trim(), subject || null, location.trim() || null, weekday, range.start, range.end, kind, now, editId);
      }
      setModal(false); await refresh();
    } catch { setError('Could not save this event. Try again.'); }
  };

  const remove = (entry: ScheduleEntry) => Alert.alert('Delete event?', `Remove “${entry.title}” from your weekly schedule?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await db.runAsync('DELETE FROM schedule_entries WHERE id=?', entry.id); await refresh(); } },
  ]);

  const visible = entries.filter(entry => entry.weekday === selectedDay);
  const options = kind === 'class' ? subjects : kind === 'extracurricular' ? activities : [];
  const optionTypeLabel = kind === 'class' ? 'SUBJECT' : 'EXTRACURRICULAR';

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><View><Text style={styles.kicker}>WEEKLY ROUTINE</Text><Text style={styles.title}>Schedule</Text><Text style={styles.subtitle}>Classes, activities & commitments</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Add schedule event" style={styles.add} onPress={() => openEditor()}><Ionicons name="add" size={22} color="#0f172a" /></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>{days.map((day, index) => <Pressable key={day} accessibilityRole="tab" accessibilityState={{ selected: selectedDay === index }} onPress={() => setSelectedDay(index)} style={[styles.day, selectedDay === index && styles.dayActive]}><Text style={[styles.dayText, selectedDay === index && styles.dayTextActive]}>{day}</Text></Pressable>)}</ScrollView>
    <ScrollView contentContainerStyle={styles.pageList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.weekHeading}><Text style={styles.panelTitle}>{fullDays[selectedDay]}</Text><Text style={styles.eventMeta}>{visible.length} event{visible.length === 1 ? '' : 's'}</Text></View>
      {error && !modal ? <Text style={styles.error}>{error}</Text> : null}
      {visible.length === 0 ? <EmptyState icon="calendar-outline" title="A clear day" subtitle={`No classes or commitments on ${fullDays[selectedDay]}. Add an event to build your weekly rhythm.`} /> : visible.map(entry => <PixelCard key={entry.id} accentLeft={entry.event_type === 'extracurricular' ? colors.warning : true} style={styles.event}>
        <Pressable style={styles.eventPress} onPress={() => openEditor(entry)} onLongPress={() => remove(entry)}>
          <View style={styles.time}><Text style={styles.timeText}>{showTime(entry.start_minute)}</Text><View style={styles.timeLine}/><Text style={styles.timeText}>{showTime(entry.end_minute)}{entry.end_minute > 1440 ? ' +1d' : ''}</Text></View>
          <View style={styles.eventInfo}><Text style={styles.eventName}>{entry.title}</Text><Text style={styles.eventMeta}>{[entry.subject, entry.location, entry.event_type === 'class' ? 'Class' : entry.event_type === 'extracurricular' ? 'Extracurricular' : 'Personal'].filter(Boolean).join(' · ')}</Text></View>
          <Ionicons name="create-outline" size={18} color={colors.textDisabled}/>
        </Pressable>
      </PixelCard>)}
      {visible.length ? <Text style={styles.hint}>Tap an event to edit · press and hold to delete</Text> : null}
    </ScrollView>

    <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
      <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editId ? 'Edit Event' : 'Add Event'}</Text><Pressable accessibilityRole="button" onPress={() => setModal(false)}><Text style={styles.cancel}>Cancel</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label="EVENT NAME *" value={title} onChangeText={setTitle} placeholder={kind === 'class' ? 'e.g. Physics lecture' : kind === 'extracurricular' ? 'e.g. Basketball practice' : 'e.g. Personal commitment'} />
          <Text style={styles.label}>EVENT KIND</Text><View style={styles.kindChoices}>{(['class', 'extracurricular', 'commitment'] as EventType[]).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: kind === value }} onPress={() => { setKind(value); setSubject(''); }} style={[styles.kind, kind === value && styles.dayActive]}><Text style={[styles.dayText, kind === value && styles.dayTextActive]}>{value === 'class' ? 'Class' : value === 'extracurricular' ? 'Activity' : 'Personal'}</Text></Pressable>)}</View>
          {kind === 'commitment' ? <Field label="TYPE (OPTIONAL)" value={subject} onChangeText={setSubject} placeholder="e.g. Gym, sleep, chores" /> : <View style={styles.subjectField}>
            <Text style={styles.label}>{optionTypeLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionChoices}>
              <Option label="None" selected={!subject} onPress={() => setSubject('')}/>
              {subject && !options.some(option => option.name === subject) ? <Option label={subject} selected onPress={() => setSubject(subject)}/> : null}
              {options.map(option => <Option key={option.id} label={option.name} selected={subject === option.name} onPress={() => setSubject(option.name)}/>)}
            </ScrollView>
            {options.length === 0 ? <Text style={styles.optionHint}>Add {kind === 'class' ? 'subjects' : 'extracurriculars'} in Profile first.</Text> : null}
          </View>}
          <Field label="LOCATION (OPTIONAL)" value={location} onChangeText={setLocation} placeholder="e.g. Lab 2" />
          <Text style={styles.label}>REPEATS ON</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.repeatDays}>{days.map((day, index) => <Pressable key={day} accessibilityRole="radio" accessibilityState={{ selected: weekday === index }} onPress={() => setWeekday(index)} style={[styles.day, weekday === index && styles.dayActive]}><Text style={[styles.dayText, weekday === index && styles.dayTextActive]}>{day}</Text></Pressable>)}</ScrollView>
          <View style={styles.row}><DateTimeField style={styles.field} label="START" mode="time" value={dateFromTimeKey(start)} onChange={date => setStart(timeKeyFromDate(date))}/><DateTimeField style={styles.field} label="END" mode="time" value={dateFromTimeKey(end)} onChange={date => setEnd(timeKeyFromDate(date))}/></View>
          {error ? <Text style={styles.error}>{error}</Text> : null}<Pressable style={styles.save} onPress={() => void save()}><Text style={styles.saveText}>{editId ? 'Save Changes' : 'Add to Schedule'}</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, ...rest } = props; return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...rest} placeholderTextColor={colors.textDisabled} style={styles.input}/></View>; }
function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.option, selected && styles.optionSelected]}><Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  kicker: { color: colors.warning, fontSize: typography.size.xs, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: '800', marginTop: 2 },
  subtitle: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: spacing.xxs },
  add: { width: 44, height: 44, backgroundColor: colors.accentPrimary, borderWidth: borders.thin, borderColor: colors.accentPrimary, borderBottomWidth: 4, borderBottomColor: '#0284c7', borderRadius: radii.xs, alignItems: 'center', justifyContent: 'center' },
  days: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  day: { borderWidth: borders.thin, borderColor: colors.borderDefault, borderBottomWidth: 3, borderBottomColor: '#0d0d19', borderRadius: radii.xs, backgroundColor: colors.bgCard, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  dayActive: { borderColor: colors.accentPrimary, backgroundColor: colors.accentPrimary, borderBottomColor: '#0284c7' },
  dayText: { color: colors.textMuted, fontSize: typography.size.sm, fontWeight: '700', textTransform: 'capitalize' },
  dayTextActive: { color: '#0f172a', fontWeight: '800' },
  pageList: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  weekHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.xs },
  panelTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: '800' },
  event: { gap: spacing.sm },
  eventPress: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  time: { alignItems: 'center', minWidth: 52 },
  timeText: { color: colors.accentSecondary, fontSize: typography.size.xs, fontWeight: '800' },
  timeLine: { height: 10, width: 2, backgroundColor: colors.accentPrimary, marginVertical: 3 },
  eventInfo: { flex: 1, gap: 4 },
  eventName: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '800' },
  eventMeta: { color: colors.textMuted, fontSize: typography.size.xs, textTransform: 'capitalize' },
  hint: { color: colors.textDisabled, fontSize: typography.size.xs, textAlign: 'center', padding: spacing.sm },
  modal: { flex: 1, backgroundColor: colors.bgPrimary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: borders.thin, borderBottomColor: colors.borderDefault },
  modalTitle: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: '800' },
  cancel: { color: colors.accentPrimary, fontSize: typography.size.md, fontWeight: '700' },
  form: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  field: { flex: 1, gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: typography.size.xs, fontWeight: '800', letterSpacing: 1 },
  input: { minHeight: 46, borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.xs, backgroundColor: '#14141f', color: colors.textPrimary, paddingHorizontal: spacing.sm },
  kindChoices: { flexDirection: 'row', gap: spacing.xs },
  kind: { flex: 1, alignItems: 'center', borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.xs, backgroundColor: colors.bgCard, paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  subjectField: { gap: spacing.xs },
  optionChoices: { flexDirection: 'row', gap: spacing.xs, paddingVertical: 2 },
  option: { borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.xs, backgroundColor: colors.bgCard, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  optionSelected: { borderColor: colors.accentPrimary, backgroundColor: '#00354a' },
  optionText: { color: colors.textMuted, fontSize: typography.size.sm, fontWeight: '600' },
  optionTextSelected: { color: colors.accentSecondary, fontWeight: '800' },
  optionHint: { color: colors.textDisabled, fontSize: typography.size.xs },
  repeatDays: { flexDirection: 'row', gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  error: { color: colors.dangerLight, fontSize: typography.size.sm },
  save: { backgroundColor: colors.accentPrimary, borderWidth: borders.thin, borderColor: colors.accentPrimary, borderBottomWidth: 4, borderBottomColor: '#0284c7', borderRadius: radii.xs, padding: spacing.md, alignItems: 'center' },
  saveText: { color: '#0f172a', fontWeight: '800', fontSize: typography.size.md },
});
