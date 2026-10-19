import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import PixelCard from '../../components/ui/PixelCard';
import PixelBadge from '../../components/ui/PixelBadge';
import EmptyState from '../../components/ui/EmptyState';
import { deleteTask, listTasks, saveTask, setTaskCompleted } from '../../features/tasks/repository';
import type { Task, TaskCategory, TaskInput, TaskPriority } from '../../features/tasks/types';
import DateTimeField from '../../components/ui/DateTimeField';
import { classifyDeadline, dateFromDateKey, dateFromTimeKey, isValidDateKey, isValidTimeKey, localDateKey, timeKeyFromDate } from '../../utils/dates';
import { ensureReminderPermission, syncTaskReminderState } from '../../features/reminders/service';

const categories: TaskCategory[] = ['assignment', 'lab', 'exam', 'revision', 'project', 'personal'];
const priorities: TaskPriority[] = ['low', 'medium', 'high'];
const blankForm: TaskInput = { title: '', description: null, subject: null, category: 'assignment', due_date: null, due_time: null, estimated_minutes: 30, priority: 'medium', deadline_reminder_enabled: false, notes: null };

export default function QuestsScreen() {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'open' | 'completed'>('open');
  const [form, setForm] = useState<TaskInput>(blankForm);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { setTasks(await listTasks(db)); } catch { setError('Could not load your quests. Please try again.'); }
  }, [db]);
  useEffect(() => {
    let active = true;
    listTasks(db).then(rows => { if (active) setTasks(rows); })
      .catch(() => { if (active) setError('Could not load your quests. Please try again.'); });
    return () => { active = false; };
  }, [db]);

  const openForm = (task?: Task) => {
    setEditingId(task?.id);
    setForm(task ? { title: task.title, description: task.description, subject: task.subject, category: task.category,
      due_date: task.due_date, due_time: task.due_time, estimated_minutes: task.estimated_minutes,
      priority: task.priority, deadline_reminder_enabled: task.deadline_reminder_enabled === 1, notes: task.notes } : blankForm);
    setError(''); setVisible(true);
  };
  const save = async () => {
    if (!form.title.trim()) { setError('Add a title for this quest.'); return; }
    if (form.due_date && !isValidDateKey(form.due_date)) { setError('Enter a real date in YYYY-MM-DD format.'); return; }
    if (form.due_time && !isValidTimeKey(form.due_time)) { setError('Enter a valid 24-hour time (HH:MM).'); return; }
    if (form.due_time && !form.due_date) { setError('Add a due date before setting a due time.'); return; }
    if (form.deadline_reminder_enabled && !form.due_date) { setError('Add a due date before setting a reminder.'); return; }
    if (form.deadline_reminder_enabled && form.due_date) {
      const reminderDate = dateFromDateKey(form.due_date);
      const [hour, minute] = (form.due_time ?? '09:00').split(':').map(Number);
      reminderDate?.setHours(hour, minute, 0, 0);
      if (reminderDate && reminderDate.getTime() <= Date.now()) { setError('Choose a future deadline time to set a reminder.'); return; }
    }
    if (!Number.isInteger(form.estimated_minutes) || form.estimated_minutes < 1 || form.estimated_minutes > 1440) { setError('Estimated time must be between 1 and 1440 minutes.'); return; }
    const existingReminderEnabled = editingId !== undefined && tasks.some(task => task.id === editingId && task.deadline_reminder_enabled === 1);
    if (form.deadline_reminder_enabled && !existingReminderEnabled && !(await ensureReminderPermission())) {
      setError(Platform.OS === 'web' ? 'Local reminders are available in the iOS and Android apps.' : 'Allow notifications in your device settings to use reminders.'); return;
    }
    try {
      const taskId = await saveTask(db, form, editingId);
      setVisible(false); await refresh();
      try {
        const reminderScheduled = await syncTaskReminderState(db, taskId);
        if (form.deadline_reminder_enabled && !reminderScheduled) Alert.alert('Quest saved', 'Notifications are currently disabled. Enable them in device settings, then switch the deadline reminder off and on again.');
      }
      catch { Alert.alert('Quest saved', 'The quest was saved, but its reminder could not be updated. Check notification and exact alarm access in device settings, then try again.'); }
    }
    catch { setError('Could not save this quest. Please try again.'); }
  };
  const remove = (task: Task) => Alert.alert('Delete quest?', `“${task.title}” will be removed.`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTask(db, task.id); await refresh(); } },
  ]);
  const openCount = tasks.filter(task => task.status === 'open').length;
  const completedCount = tasks.length - openCount;
  const visibleTasks = tasks.filter(task => task.status === filter);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><View><Text style={styles.kicker}>QUEST BOARD</Text><Text style={styles.title}>Quest Log</Text><Text style={styles.subtitle}><Text style={styles.activeCount}>{openCount} active</Text>  ·  {completedCount} cleared</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Add quest" onPress={() => openForm()} style={styles.add}><Ionicons name="add" size={22} color={colors.bgPrimary} /></Pressable>
    </View>
    <View style={styles.filterRow}>{(['open', 'completed'] as const).map(status => <Pressable key={status} accessibilityRole="tab" accessibilityState={{ selected: filter === status }} style={[styles.filterButton, filter === status && styles.filterButtonActive]} onPress={() => setFilter(status)}><Text style={[styles.filterText, filter === status && styles.filterTextActive]}>{status === 'open' ? `ACTIVE · ${openCount}` : `CLEARED · ${completedCount}`}</Text></Pressable>)}</View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {tasks.length === 0 ? <View style={styles.empty}><EmptyState icon="trophy-outline" title="Quest Board Empty" subtitle="Add an assignment, exam, revision session or personal task to get started." /></View> :
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {visibleTasks.length === 0 ? <EmptyState icon={filter === 'open' ? 'sparkles-outline' : 'trophy-outline'} title={filter === 'open' ? 'All quests cleared' : 'No cleared quests yet'} subtitle={filter === 'open' ? 'New quests you add will appear here.' : 'Completed quests stay here so you can review your progress.'} /> : null}
        {visibleTasks.map(task => <PixelCard key={task.id} accentLeft={task.status === 'open' && (task.priority === 'high' || task.category === 'exam') ? colors.danger : task.status === 'open'} style={styles.card}>
          <View style={styles.taskTop}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.status === 'completed' }} onPress={async () => { await setTaskCompleted(db, task, task.status !== 'completed'); await refresh(); }} style={styles.check}>
              <Ionicons name={task.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={task.status === 'completed' ? colors.success : colors.textMuted} />
            </Pressable>
            <Pressable style={styles.taskInfo} onPress={() => openForm(task)}>
              <Text style={[styles.taskTitle, task.status === 'completed' && styles.completed]}>{task.title}</Text>
              <Text style={styles.meta}>{[task.subject, task.category, `${task.estimated_minutes} min`].filter(Boolean).join(' · ')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${task.title}`} onPress={() => remove(task)} hitSlop={8}><Ionicons name="trash-outline" size={18} color={colors.textDisabled} /></Pressable>
          </View>
          <View style={styles.badges}><PixelBadge label={task.status === 'completed' ? 'Done' : task.priority} variant={task.status === 'completed' ? 'done' : task.priority === 'high' ? 'today' : 'upcoming'} />
            {task.due_date ? <PixelBadge label={task.status === 'completed' ? 'Deadline' : deadlineText(task.due_date)} variant={task.status === 'completed' ? 'upcoming' : deadlineVariant(task.due_date)} /> : null}</View>
          {task.description ? <Text style={styles.description}>{task.description}</Text> : null}
        </PixelCard>)}
      </ScrollView>}

    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editingId ? 'Edit Quest' : 'New Quest'}</Text><Pressable onPress={() => setVisible(false)}><Text style={styles.cancel}>Cancel</Text></Pressable></View>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Field label="TITLE *" value={form.title} onChangeText={title => setForm({ ...form, title })} placeholder="e.g. Chemistry lab record" />
          <Field label="SUBJECT" value={form.subject ?? ''} onChangeText={subject => setForm({ ...form, subject: subject || null })} placeholder="e.g. Chemistry" />
          <Field label="DESCRIPTION" value={form.description ?? ''} onChangeText={description => setForm({ ...form, description: description || null })} placeholder="What needs to get done?" multiline />
          <Text style={styles.label}>CATEGORY</Text><View style={styles.choices}>{categories.map(c => <Choice key={c} label={c} selected={form.category === c} onPress={() => setForm({ ...form, category: c })} />)}</View>
          <Text style={styles.label}>PRIORITY</Text><View style={styles.choices}>{priorities.map(p => <Choice key={p} label={p} selected={form.priority === p} onPress={() => setForm({ ...form, priority: p })} />)}</View>
          <DateTimeField label="DUE DATE" mode="date" value={dateFromDateKey(form.due_date ?? '')} onChange={date => setForm({ ...form, due_date: localDateKey(date) })} onClear={() => setForm({ ...form, due_date: null, due_time: null, deadline_reminder_enabled: false })} placeholder="Choose due date" />
          <DateTimeField label="DUE TIME (OPTIONAL)" mode="time" value={dateFromTimeKey(form.due_time)} onChange={date => setForm({ ...form, due_time: timeKeyFromDate(date) })} onClear={() => setForm({ ...form, due_time: null })} disabled={!form.due_date} placeholder={form.due_date ? 'Choose due time' : 'Choose a due date first'} />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: form.deadline_reminder_enabled, disabled: !form.due_date || Platform.OS === 'web' }} disabled={!form.due_date || Platform.OS === 'web'} onPress={async () => {
            if (form.deadline_reminder_enabled) { setForm({ ...form, deadline_reminder_enabled: false }); return; }
            if (await ensureReminderPermission()) setForm({ ...form, deadline_reminder_enabled: true });
            else setError(Platform.OS === 'web' ? 'Local reminders are available in the iOS and Android apps.' : 'Allow notifications in your device settings to use reminders.');
          }} style={[styles.reminderOption, (!form.due_date || Platform.OS === 'web') && styles.reminderDisabled]}>
            <Ionicons name={form.deadline_reminder_enabled ? 'checkbox' : 'square-outline'} size={21} color={form.deadline_reminder_enabled ? colors.accentPrimary : colors.textMuted}/>
            <View style={styles.reminderInfo}><Text style={styles.reminderTitle}>Remind me at the deadline</Text><Text style={styles.reminderHint}>At the due time, or 09:00 if no time is set.</Text></View>
          </Pressable>
          {Platform.OS === 'web' ? <Text style={styles.reminderHint}>Local notifications are supported in the iOS and Android apps.</Text> : null}
          <Field label="ESTIMATED MINUTES" value={String(form.estimated_minutes)} onChangeText={raw => setForm({ ...form, estimated_minutes: Math.max(1, Number.parseInt(raw, 10) || 1) })} keyboardType="number-pad" />
          <Field label="NOTES" value={form.notes ?? ''} onChangeText={notes => setForm({ ...form, notes: notes || null })} placeholder="Optional notes" multiline />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.save} onPress={() => void save()}><Text style={styles.saveText}>{editingId ? 'Save Changes' : 'Create Quest'}</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} placeholderTextColor={colors.textDisabled} style={[styles.input, inputProps.multiline && styles.multiline]} /></View>;
}
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceActive]}><Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{label}</Text></Pressable>;
}
function deadlineText(dueDate: string) { const state = classifyDeadline(dueDate, localDateKey(new Date())); return state === 'today' ? 'Due today' : state === 'tomorrow' ? 'Tomorrow' : state === 'overdue' ? 'Overdue' : dueDate; }
function deadlineVariant(dueDate: string): 'overdue' | 'today' | 'tomorrow' | 'upcoming' { const state = classifyDeadline(dueDate, localDateKey(new Date())); return state === 'none' ? 'upcoming' : state; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary }, header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: colors.warning, fontSize: typography.size.xs, fontWeight: '800', letterSpacing: 1.5, marginBottom: spacing.xxs }, title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: '800' }, subtitle: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: spacing.xxs }, activeCount: { color: colors.success, fontWeight: '700' }, filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, filterButton: { flex: 1, backgroundColor: colors.bgCard, borderWidth: borders.thin, borderColor: colors.borderDefault, borderBottomWidth: 4, borderBottomColor: '#0d0d19', borderRadius: radii.md, paddingVertical: spacing.sm, alignItems: 'center' }, filterButtonActive: { backgroundColor: colors.warning, borderColor: colors.warning, borderBottomColor: '#b45309' }, filterText: { color: colors.textMuted, fontSize: typography.size.xs, fontWeight: '800', letterSpacing: 0.5 }, filterTextActive: { color: '#181824' },
  add: { backgroundColor: colors.accentPrimary, borderRadius: radii.sm, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, empty: { flex: 1, justifyContent: 'center' }, list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl }, card: { gap: spacing.sm },
  taskTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, check: { padding: 2 }, taskInfo: { flex: 1, gap: 3 }, taskTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '700' }, completed: { color: colors.textMuted, textDecorationLine: 'line-through' }, meta: { color: colors.textMuted, fontSize: typography.size.xs, textTransform: 'capitalize' }, badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginLeft: 38 }, description: { color: colors.textSecondary, marginLeft: 38, fontSize: typography.size.sm }, error: { color: colors.dangerLight, padding: spacing.md },
  modal: { flex: 1, backgroundColor: colors.bgPrimary }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: borders.thin, borderBottomColor: colors.borderDefault }, modalTitle: { fontSize: typography.size.xl, color: colors.textPrimary, fontWeight: '700' }, cancel: { color: colors.accentPrimary, fontSize: typography.size.md }, form: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl }, field: { gap: spacing.xs }, label: { color: colors.textMuted, fontSize: typography.size.xs, fontWeight: '700', letterSpacing: 1 }, input: { minHeight: 44, borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, backgroundColor: colors.bgCard, color: colors.textPrimary, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, reminderOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, backgroundColor: colors.bgCard, padding: spacing.sm }, reminderDisabled: { opacity: 0.5 }, reminderInfo: { flex: 1, gap: 2 }, reminderTitle: { color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: '700' }, reminderHint: { color: colors.textMuted, fontSize: typography.size.xs }, multiline: { minHeight: 80, textAlignVertical: 'top' }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, choice: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.xs, borderWidth: borders.thin, borderColor: colors.borderDefault, backgroundColor: colors.bgCard }, choiceActive: { borderColor: colors.borderAccent, backgroundColor: colors.bgHighlight }, choiceText: { color: colors.textMuted, textTransform: 'capitalize', fontSize: typography.size.sm }, choiceTextActive: { color: colors.accentSecondary }, save: { backgroundColor: colors.accentPrimary, padding: spacing.md, borderRadius: radii.sm, alignItems: 'center' }, saveText: { color: colors.bgPrimary, fontWeight: '700', fontSize: typography.size.md },
});
