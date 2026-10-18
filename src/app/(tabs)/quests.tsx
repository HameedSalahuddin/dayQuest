import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import PixelCard from '../../components/ui/PixelCard';
import PixelBadge from '../../components/ui/PixelBadge';
import EmptyState from '../../components/ui/EmptyState';
import { deleteTask, listTasks, saveTask, setTaskCompleted } from '../../features/tasks/repository';
import type { Task, TaskCategory, TaskInput, TaskPriority } from '../../features/tasks/types';
import { classifyDeadline, localDateKey } from '../../utils/dates';

const categories: TaskCategory[] = ['assignment', 'lab', 'exam', 'revision', 'project', 'personal'];
const priorities: TaskPriority[] = ['low', 'medium', 'high'];
const blankForm: TaskInput = { title: '', description: null, subject: null, category: 'assignment', due_date: null, due_time: null, estimated_minutes: 30, priority: 'medium', notes: null };

export default function QuestsScreen() {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskInput>(blankForm);
  const [editingId, setEditingId] = useState<number | undefined>();
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { setTasks(await listTasks(db)); } catch { setError('Could not load your quests. Please try again.'); }
  }, [db]);
  useEffect(() => { void refresh(); }, [refresh]);

  const openForm = (task?: Task) => {
    setEditingId(task?.id);
    setForm(task ? { title: task.title, description: task.description, subject: task.subject, category: task.category,
      due_date: task.due_date, due_time: task.due_time, estimated_minutes: task.estimated_minutes,
      priority: task.priority, notes: task.notes } : blankForm);
    setError(''); setVisible(true);
  };
  const save = async () => {
    if (!form.title.trim()) { setError('Add a title for this quest.'); return; }
    if (form.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.due_date)) { setError('Use a date in YYYY-MM-DD format.'); return; }
    try { await saveTask(db, form, editingId); setVisible(false); await refresh(); }
    catch { setError('Could not save this quest. Please try again.'); }
  };
  const remove = (task: Task) => Alert.alert('Delete quest?', `“${task.title}” will be removed.`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTask(db, task.id); await refresh(); } },
  ]);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}><View><Text style={styles.title}>Quests</Text><Text style={styles.subtitle}>Assignments, exams & tasks</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Add quest" onPress={() => openForm()} style={styles.add}><Ionicons name="add" size={22} color={colors.bgPrimary} /></Pressable>
    </View>
    <View style={styles.divider} />
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {tasks.length === 0 ? <View style={styles.empty}><EmptyState icon="trophy-outline" title="Quest Board Empty" subtitle="Add an assignment, exam, revision session or personal task to get started." /></View> :
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {tasks.map(task => <PixelCard key={task.id} accentLeft={task.status === 'open'} style={styles.card}>
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
          <Field label="DUE DATE (YYYY-MM-DD)" value={form.due_date ?? ''} onChangeText={due_date => setForm({ ...form, due_date: due_date || null })} placeholder="2026-10-30" />
          <Field label="DUE TIME (HH:MM, OPTIONAL)" value={form.due_time ?? ''} onChangeText={due_time => setForm({ ...form, due_time: due_time || null })} placeholder="14:30" />
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
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: '700' }, subtitle: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: spacing.xxs }, divider: { height: 1, backgroundColor: colors.borderDefault, marginHorizontal: spacing.md },
  add: { backgroundColor: colors.accentPrimary, borderRadius: radii.sm, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, empty: { flex: 1, justifyContent: 'center' }, list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl }, card: { gap: spacing.sm },
  taskTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, check: { padding: 2 }, taskInfo: { flex: 1, gap: 3 }, taskTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '700' }, completed: { color: colors.textMuted, textDecorationLine: 'line-through' }, meta: { color: colors.textMuted, fontSize: typography.size.xs, textTransform: 'capitalize' }, badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginLeft: 38 }, description: { color: colors.textSecondary, marginLeft: 38, fontSize: typography.size.sm }, error: { color: colors.dangerLight, padding: spacing.md },
  modal: { flex: 1, backgroundColor: colors.bgPrimary }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: borders.thin, borderBottomColor: colors.borderDefault }, modalTitle: { fontSize: typography.size.xl, color: colors.textPrimary, fontWeight: '700' }, cancel: { color: colors.accentPrimary, fontSize: typography.size.md }, form: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl }, field: { gap: spacing.xs }, label: { color: colors.textMuted, fontSize: typography.size.xs, fontWeight: '700', letterSpacing: 1 }, input: { minHeight: 44, borderWidth: borders.thin, borderColor: colors.borderDefault, borderRadius: radii.sm, backgroundColor: colors.bgCard, color: colors.textPrimary, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm }, multiline: { minHeight: 80, textAlignVertical: 'top' }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }, choice: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.xs, borderWidth: borders.thin, borderColor: colors.borderDefault, backgroundColor: colors.bgCard }, choiceActive: { borderColor: colors.borderAccent, backgroundColor: colors.bgHighlight }, choiceText: { color: colors.textMuted, textTransform: 'capitalize', fontSize: typography.size.sm }, choiceTextActive: { color: colors.accentSecondary }, save: { backgroundColor: colors.accentPrimary, padding: spacing.md, borderRadius: radii.sm, alignItems: 'center' }, saveText: { color: colors.bgPrimary, fontWeight: '700', fontSize: typography.size.md },
});
