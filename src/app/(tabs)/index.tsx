import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import PixelCard from '../../components/ui/PixelCard';
import PixelBadge from '../../components/ui/PixelBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import SectionHeader from '../../components/ui/SectionHeader';
import EmptyState from '../../components/ui/EmptyState';
import { listTasks, setTaskCompleted } from '../../features/tasks/repository';
import type { Task } from '../../features/tasks/types';
import { formatMinute, getFreeSlots, recommendTasks, type FixedEvent } from '../../features/planner/recommendations';
import { classifyDeadline, localDateKey } from '../../utils/dates';

interface ClassRow extends FixedEvent { id: number; weekday: number; }
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const greeting = (hour: number) => hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Night owl mode';

export default function TodayScreen() {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loadError, setLoadError] = useState('');
  const now = useMemo(() => new Date(), []);
  const today = dateKey(now);
  const refresh = useCallback(async () => {
    try {
      const [taskRows, events] = await Promise.all([
        listTasks(db),
        db.getAllAsync<ClassRow>('SELECT * FROM schedule_entries WHERE weekday=? ORDER BY start_minute', now.getDay()),
      ]);
      setTasks(taskRows); setClasses(events); setLoadError('');
    } catch { setLoadError('Could not load today’s plan.'); }
  }, [db, now]);
  useEffect(() => {
    let active = true;
    Promise.all([
      listTasks(db),
      db.getAllAsync<ClassRow>('SELECT * FROM schedule_entries WHERE weekday=? ORDER BY start_minute', now.getDay()),
    ]).then(([taskRows, events]) => {
      if (active) { setTasks(taskRows); setClasses(events); setLoadError(''); }
    }).catch(() => { if (active) setLoadError('Could not load today’s plan.'); });
    return () => { active = false; };
  }, [db, now]);
  const slots = useMemo(() => getFreeSlots(classes, now), [classes, now]);
  const recommendations = useMemo(() => recommendTasks(tasks, slots, today), [tasks, slots, today]);
  const dueTodayOrLate = tasks.filter(task => task.status === 'open' && task.due_date && task.due_date <= today);
  const doneCount = tasks.filter(task => task.status === 'completed' && task.completed_at?.slice(0, 10) === today).length;
  const dueCount = tasks.filter(task => task.status === 'open' && task.due_date === today).length + doneCount;
  const totalFreeMinutes = slots.reduce((sum, slot) => sum + slot.duration, 0);
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.greeting}>{greeting(now.getHours())}, Hero!</Text><Text style={styles.date}>{dateLabel}</Text></View><View style={styles.xp}><Ionicons name="star" size={13} color={colors.warning}/><Text style={styles.xpText}>0 XP</Text></View></View>
    {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
    <View style={styles.section}><SectionHeader title="Today's Overview"/><PixelCard style={styles.overview}>
      <ProgressBar progress={dueCount ? doneCount / dueCount : 0} label="Today's quests completed" showPercent />
      <View style={styles.stats}><Stat icon="checkmark-circle-outline" value={`${doneCount}/${dueCount}`} label="Quests"/><Stat icon="school-outline" value={String(classes.filter(c => c.event_type === 'class').length)} label="Classes"/><Stat icon="time-outline" value={`${Math.floor(totalFreeMinutes / 60)}h`} label="Free"/></View>
    </PixelCard></View>
    <View style={styles.section}><SectionHeader title="Classes Today" subtitle={`${classes.length} fixed event${classes.length === 1 ? '' : 's'}`}/>
      {classes.length === 0 ? <PixelCard><EmptyState icon="school-outline" title="No classes today" subtitle="Add a weekly class or personal commitment in Schedule."/></PixelCard> : classes.map(item => <PixelCard key={item.id} style={styles.rowCard}><Text style={styles.eventTime}>{formatMinute(item.start_minute)}</Text><View style={styles.flex}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.meta}>{[item.subject, item.location].filter(Boolean).join(' · ') || item.event_type}</Text></View><Text style={styles.endTime}>{formatMinute(item.end_minute)}</Text></PixelCard>)}
    </View>
    <View style={styles.section}><SectionHeader title="Needs Attention" subtitle="Overdue & due today"/>
      {dueTodayOrLate.length === 0 ? <PixelCard><EmptyState icon="checkmark-done-outline" title="Nothing urgent" subtitle="You have no overdue quests or tasks due today."/></PixelCard> : dueTodayOrLate.map(task => <TaskRow key={task.id} task={task} onComplete={async () => { await setTaskCompleted(db, task, true); await refresh(); }}/>) }
    </View>
    <View style={styles.section}><SectionHeader title="Suggested Next" subtitle="Choose what fits your time"/>
      {recommendations.length === 0 ? <PixelCard><EmptyState icon="compass-outline" title="No suggestions yet" subtitle="Add an open quest and dayQuest will recommend a next step. Suggestions never book time automatically."/></PixelCard> : recommendations.map(task => { const deadline = classifyDeadline(task.due_date, today); return <PixelCard key={task.id} accentLeft style={styles.suggestion}><View style={styles.flex}><Text style={styles.itemTitle}>{task.title}</Text><Text style={styles.meta}>{task.estimated_minutes} min · {task.priority} priority{task.due_date ? ` · due ${task.due_date}` : ''}</Text></View><PixelBadge label={deadline === 'none' ? 'Quest' : deadline === 'today' ? 'Due today' : deadline === 'tomorrow' ? 'Tomorrow' : deadline === 'overdue' ? 'Overdue' : task.due_date ?? 'Upcoming'} variant={deadline === 'overdue' ? 'overdue' : deadline === 'today' ? 'today' : deadline === 'tomorrow' ? 'tomorrow' : 'accent'}/></PixelCard>; })}
      {slots.length > 0 ? <Text style={styles.freeHint}>Next open slot: {formatMinute(slots[0].start)}–{formatMinute(slots[0].end)} ({slots[0].duration} min)</Text> : null}
    </View>
    <View style={{ height: spacing.xl }}/>
  </ScrollView></SafeAreaView>;
}

function TaskRow({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const state = classifyDeadline(task.due_date, localDateKey(new Date()));
  const label = state === 'today' ? 'Due today' : state === 'tomorrow' ? 'Due tomorrow' : state === 'overdue' ? `Overdue · ${task.due_date}` : task.due_date ?? 'No deadline';
  return <PixelCard style={styles.rowCard}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: false }} onPress={onComplete}><Ionicons name="ellipse-outline" size={23} color={colors.textMuted}/></Pressable><View style={styles.flex}><Text style={styles.itemTitle}>{task.title}</Text><Text style={styles.meta}>{label}</Text></View><PixelBadge label={state === 'overdue' ? 'Overdue' : state === 'today' ? 'Today' : state === 'tomorrow' ? 'Tomorrow' : 'Upcoming'} variant={state === 'overdue' ? 'overdue' : state === 'today' ? 'today' : state === 'tomorrow' ? 'tomorrow' : 'upcoming'}/></PixelCard>;
}
function Stat({ icon, value, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }) { return <View style={styles.stat}><Ionicons name={icon} size={15} color={colors.accentPrimary}/><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary }, content: { paddingBottom: spacing.md }, header: { padding: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, greeting: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: '700' }, date: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: spacing.xxs }, xp: { flexDirection: 'row', gap: spacing.xxs, borderWidth: borders.thin, borderColor: colors.warning, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.sm }, xpText: { color: colors.warning, fontWeight: '700', fontSize: typography.size.xs }, section: { marginHorizontal: spacing.md, marginTop: spacing.lg }, overview: { gap: spacing.md }, stats: { flexDirection: 'row', justifyContent: 'space-around' }, stat: { alignItems: 'center', gap: 2 }, statValue: { color: colors.textPrimary, fontWeight: '700' }, statLabel: { color: colors.textDisabled, fontSize: typography.size.xs, textTransform: 'uppercase' }, rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }, eventTime: { color: colors.accentSecondary, fontWeight: '700', width: 44, fontSize: typography.size.sm }, endTime: { color: colors.textDisabled, fontSize: typography.size.xs }, flex: { flex: 1, gap: 3 }, itemTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '700' }, meta: { color: colors.textMuted, fontSize: typography.size.xs }, suggestion: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }, freeHint: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: spacing.xs }, error: { color: colors.dangerLight, paddingHorizontal: spacing.md },
});
