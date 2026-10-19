import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import PixelCard from '../../components/ui/PixelCard';
import PixelBadge from '../../components/ui/PixelBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import SectionHeader from '../../components/ui/SectionHeader';
import EmptyState from '../../components/ui/EmptyState';
import DateTimeField from '../../components/ui/DateTimeField';
import { listTasks, setTaskCompleted } from '../../features/tasks/repository';
import type { Task } from '../../features/tasks/types';
import { formatMinute, getFreeSlots, recommendTasks } from '../../features/planner/recommendations';
import { classifyDeadline, dateFromDateKey, dateFromTimeKey, isValidDateKey, isValidTimeKey, localDateKey, timeKeyFromDate } from '../../utils/dates';
import { getEventsForDate, type DatedEvent } from '../../features/schedule/repository';
import { getProgressSummary, type ProgressSummary } from '../../features/progress/repository';
import { cancelStudySessionReminder, ensureReminderPermission, getStudySessionReminder, saveStudySessionReminder, type StudySessionReminder } from '../../features/reminders/service';
import { useAuth } from '../../features/auth/AuthProvider';

const greeting = (hour: number) => hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Night owl mode';

export default function TodayScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const heroName = typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : 'Hero';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classes, setClasses] = useState<DatedEvent[]>([]);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary>({ totalXp: 0, level: 1, xpIntoLevel: 0, levelProgress: 0, completedQuests: 0 });
  const [loadError, setLoadError] = useState('');
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTaskDate, setSelectedTaskDate] = useState<string | null>(null);
  const [studySession, setStudySession] = useState<StudySessionReminder | null>(null);
  const [sessionDate, setSessionDate] = useState(() => localDateKey(new Date()));
  const [sessionTime, setSessionTime] = useState(() => timeKeyFromDate(new Date(Date.now() + 60_000)));
  const [sessionError, setSessionError] = useState('');
  const [now, setNow] = useState(() => new Date());
  const today = localDateKey(now);
  const lastLoadedDate = useRef(today);
  const refresh = useCallback(async () => {
    try {
      const currentDate = new Date();
      const [taskRows, events, currentProgress] = await Promise.all([
        listTasks(db),
        getEventsForDate(db, localDateKey(currentDate)),
        getProgressSummary(db),
      ]);
      lastLoadedDate.current = localDateKey(currentDate);
      setNow(currentDate);
      setTasks(taskRows); setClasses(events); setProgressSummary(currentProgress); setLoadError('');
    } catch { setLoadError('Could not load today’s plan.'); }
  }, [db]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (lastLoadedDate.current !== today) {
      lastLoadedDate.current = today;
      void refresh();
    }
  }, [refresh, today]);
  useEffect(() => {
    if (!reviewingTask) return;
    let active = true;
    getStudySessionReminder(db, reviewingTask.id).then(saved => {
      if (active && saved) { setStudySession(saved); setSessionDate(saved.session_date); setSessionTime(saved.session_time); }
    }).catch(() => { if (active) setSessionError('Could not load this quest’s study reminder.'); });
    return () => { active = false; };
  }, [db, reviewingTask]);
  const slots = useMemo(() => getFreeSlots(classes, now), [classes, now]);
  const selectedTask = selectedTaskDate === today ? tasks.find(task => task.id === selectedTaskId && task.status === 'open') ?? null : null;
  const recommendations = useMemo(() => recommendTasks(tasks, slots, today).filter(task => selectedTask?.id !== task.id), [selectedTask?.id, slots, tasks, today]);
  const dueTodayOrLate = tasks.filter(task => task.status === 'open' && task.due_date && task.due_date <= today);
  const doneCount = tasks.filter(task => task.status === 'completed' && task.completed_at && localDateKey(new Date(task.completed_at)) === today).length;
  const dueCount = tasks.filter(task => task.status === 'open' && task.due_date === today).length + doneCount;
  const totalFreeMinutes = slots.reduce((sum, slot) => sum + slot.duration, 0);
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const openReview = (task: Task) => {
    const defaultTime = new Date(Date.now() + 30 * 60_000);
    defaultTime.setMinutes(Math.ceil(defaultTime.getMinutes() / 15) * 15, 0, 0);
    setSessionDate(localDateKey(defaultTime));
    setSessionTime(timeKeyFromDate(defaultTime));
    setStudySession(null); setSessionError(''); setReviewingTask(task);
  };
  const scheduleStudySession = async () => {
    if (!reviewingTask) return;
    if (!isValidDateKey(sessionDate) || !isValidTimeKey(sessionTime)) { setSessionError('Choose a valid date and time.'); return; }
    if (Platform.OS === 'web') { setSessionError('Local study reminders are available in the iOS and Android apps.'); return; }
    try {
      if (!(await ensureReminderPermission())) { setSessionError('Allow notifications in your device settings to add study reminders.'); return; }
      const saved = await saveStudySessionReminder(db, reviewingTask.id, reviewingTask.title, sessionDate, sessionTime);
      setStudySession(saved); setSessionError('');
    } catch (error) { setSessionError(error instanceof Error ? error.message : 'Could not schedule this study reminder.'); }
  };
  const removeStudySession = async () => {
    if (!reviewingTask) return;
    try { await cancelStudySessionReminder(db, reviewingTask.id); setStudySession(null); setSessionError(''); }
    catch { setSessionError('Could not cancel this study reminder.'); }
  };

  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}><View><Text style={styles.greeting}>{greeting(now.getHours())}, {heroName}!</Text><Text style={styles.date}>{dateLabel}</Text></View><View style={styles.xp}><Ionicons name="star" size={13} color={colors.warning}/><Text style={styles.xpText}>Lv {progressSummary.level} · {progressSummary.totalXp} XP</Text></View></View>
    <View style={styles.levelProgress}><ProgressBar progress={progressSummary.levelProgress} label={`Level ${progressSummary.level} · ${progressSummary.xpIntoLevel}/100 XP`} showPercent={false} fillColor={colors.warning} height={6}/></View>
    {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
    <View style={styles.section}><SectionHeader title="Today's Overview"/><PixelCard style={styles.overview}>
      <ProgressBar progress={dueCount ? doneCount / dueCount : 0} label="Today's quests completed" showPercent />
      <View style={styles.stats}><Stat icon="checkmark-circle-outline" value={`${doneCount}/${dueCount}`} label="Quests"/><Stat icon="school-outline" value={String(classes.filter(c => c.event_type === 'class').length)} label="Classes"/><Stat icon="time-outline" value={`${Math.floor(totalFreeMinutes / 60)}h`} label="Free"/></View>
    </PixelCard></View>
    <View style={styles.section}><SectionHeader title="Classes Today" subtitle={`${classes.length} fixed event${classes.length === 1 ? '' : 's'}`}/>
      {classes.length === 0 ? <PixelCard><EmptyState icon="school-outline" title="No classes today" subtitle="Add a weekly class, one-off event, or personal commitment in Schedule."/></PixelCard> : classes.map(item => <PixelCard key={item.key} style={styles.rowCard}><Text style={styles.eventTime}>{formatMinute(item.start_minute)}</Text><View style={styles.flex}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.meta}>{[item.subject, item.location].filter(Boolean).join(' · ') || item.event_type}{item.start_minute < 0 ? ' · from yesterday' : ''}</Text></View><Text style={styles.endTime}>{formatMinute(item.end_minute)}{item.continues_next_day ? ' +1d' : ''}</Text></PixelCard>)}
    </View>
    <View style={styles.section}><SectionHeader title="Needs Attention" subtitle="Overdue & due today"/>
      {dueTodayOrLate.length === 0 ? <PixelCard><EmptyState icon="checkmark-done-outline" title="Nothing urgent" subtitle="You have no overdue quests or tasks due today."/></PixelCard> : dueTodayOrLate.map(task => <TaskRow key={task.id} task={task} onComplete={async () => { await setTaskCompleted(db, task, true); await refresh(); }}/>) }
    </View>
    <View style={styles.section}><SectionHeader title="Suggested Next" subtitle="Choose what fits your time"/>
      {selectedTask ? <PixelCard accentLeft style={styles.selectedCard}><Pressable style={styles.flex} onPress={() => openReview(selectedTask)}><Text style={styles.selectedLabel}>TODAY’S PICK</Text><Text style={styles.itemTitle}>{selectedTask.title}</Text><Text style={styles.meta}>{selectedTask.estimated_minutes} min · chosen by you · tap to review</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Clear today's pick" onPress={() => { setSelectedTaskId(null); setSelectedTaskDate(null); }} hitSlop={8}><Ionicons name="close-circle-outline" size={22} color={colors.textMuted}/></Pressable></PixelCard> : null}
      {recommendations.length === 0 ? <PixelCard><EmptyState icon="compass-outline" title="No suggestions yet" subtitle="Add an open quest and dayQuest will recommend a next step. Suggestions never book time automatically."/></PixelCard> : recommendations.map(task => { const deadline = classifyDeadline(task.due_date, today); return <PixelCard key={task.id} accentLeft style={styles.suggestion}><View style={styles.flex}><Text style={styles.itemTitle}>{task.title}</Text><Text style={styles.meta}>{task.estimated_minutes} min · {task.priority} priority{task.due_date ? ` · due ${task.due_date}` : ''}</Text><Pressable accessibilityRole="button" style={styles.suggestionAction} onPress={() => openReview(task)}><Text style={styles.suggestionActionText}>Review quest</Text></Pressable></View><PixelBadge label={deadline === 'none' ? 'Quest' : deadline === 'today' ? 'Due today' : deadline === 'tomorrow' ? 'Tomorrow' : deadline === 'overdue' ? 'Overdue' : task.due_date ?? 'Upcoming'} variant={deadline === 'overdue' ? 'overdue' : deadline === 'today' ? 'today' : deadline === 'tomorrow' ? 'tomorrow' : 'accent'}/></PixelCard>; })}
      {slots.length > 0 ? <Text style={styles.freeHint}>Next open slot: {formatMinute(slots[0].start)}–{formatMinute(slots[0].end)} ({slots[0].duration} min)</Text> : null}
    </View>
    <View style={{ height: spacing.xl }}/>
  </ScrollView>
  <Modal visible={reviewingTask !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewingTask(null)}>
    <SafeAreaView style={styles.reviewModal} edges={['top', 'bottom']}>
      <View style={styles.reviewHeader}><Text style={styles.reviewHeaderTitle}>Review quest</Text><Pressable accessibilityRole="button" onPress={() => setReviewingTask(null)}><Text style={styles.reviewClose}>Close</Text></Pressable></View>
      {reviewingTask ? <ScrollView contentContainerStyle={styles.reviewContent}>
        <PixelCard style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>{reviewingTask.title}</Text>
          <Text style={styles.meta}>{[reviewingTask.subject, reviewingTask.category, `${reviewingTask.estimated_minutes} min`].filter(Boolean).join(' · ')}</Text>
          {reviewingTask.due_date ? <Text style={styles.meta}>{reviewingTask.due_time ? `Due ${reviewingTask.due_date} at ${reviewingTask.due_time}` : `Due ${reviewingTask.due_date}`}</Text> : null}
          <Text style={styles.meta}>Priority: {reviewingTask.priority}</Text>
          {reviewingTask.description ? <Text style={styles.reviewText}>{reviewingTask.description}</Text> : null}
          {reviewingTask.notes ? <Text style={styles.reviewText}>Notes: {reviewingTask.notes}</Text> : null}
        </PixelCard>
        <Pressable accessibilityRole="button" style={styles.chooseButton} onPress={() => { setSelectedTaskId(reviewingTask.id); setSelectedTaskDate(today); setReviewingTask(null); }}><Text style={styles.chooseText}>{selectedTaskId === reviewingTask.id && selectedTaskDate === today ? 'Keep as today’s pick' : 'Choose for today'}</Text></Pressable>
        <Pressable accessibilityRole="button" style={styles.completeButton} onPress={async () => { await setTaskCompleted(db, reviewingTask, true); if (selectedTaskId === reviewingTask.id) { setSelectedTaskId(null); setSelectedTaskDate(null); } setReviewingTask(null); await refresh(); }}><Text style={styles.completeText}>Mark quest complete</Text></Pressable>
        <Text style={styles.reviewHint}>Choosing a quest keeps it on your Today screen. It does not add a time to your schedule.</Text>
        <PixelCard style={styles.sessionCard}>
          <Text style={styles.sessionTitle}>Study session reminder</Text>
          <Text style={styles.reviewHint}>Pick when you want to work on this quest. This reminder won’t change your timetable.</Text>
          <DateTimeField label="SESSION DATE" mode="date" value={dateFromDateKey(sessionDate)} onChange={date => setSessionDate(localDateKey(date))}/>
          <DateTimeField label="START TIME" mode="time" value={dateFromTimeKey(sessionTime)} onChange={date => setSessionTime(timeKeyFromDate(date))}/>
          {studySession ? <Text style={styles.sessionExisting}>Reminder set for {studySession.session_date} at {studySession.session_time}</Text> : null}
          {sessionError ? <Text style={styles.sessionError}>{sessionError}</Text> : null}
          <Pressable accessibilityRole="button" style={styles.chooseButton} onPress={() => void scheduleStudySession()}><Text style={styles.chooseText}>{studySession ? 'Update study reminder' : 'Set study reminder'}</Text></Pressable>
          {studySession ? <Pressable accessibilityRole="button" style={styles.completeButton} onPress={() => void removeStudySession()}><Text style={styles.completeText}>Cancel study reminder</Text></Pressable> : null}
        </PixelCard>
      </ScrollView> : null}
    </SafeAreaView>
  </Modal>
  </SafeAreaView>;
}

function TaskRow({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const state = classifyDeadline(task.due_date, localDateKey(new Date()));
  const label = state === 'today' ? 'Due today' : state === 'tomorrow' ? 'Due tomorrow' : state === 'overdue' ? `Overdue · ${task.due_date}` : task.due_date ?? 'No deadline';
  return <PixelCard style={styles.rowCard}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: false }} onPress={onComplete}><Ionicons name="ellipse-outline" size={23} color={colors.textMuted}/></Pressable><View style={styles.flex}><Text style={styles.itemTitle}>{task.title}</Text><Text style={styles.meta}>{label}</Text></View><PixelBadge label={state === 'overdue' ? 'Overdue' : state === 'today' ? 'Today' : state === 'tomorrow' ? 'Tomorrow' : 'Upcoming'} variant={state === 'overdue' ? 'overdue' : state === 'today' ? 'today' : state === 'tomorrow' ? 'tomorrow' : 'upcoming'}/></PixelCard>;
}
function Stat({ icon, value, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }) { return <View style={styles.stat}><Ionicons name={icon} size={15} color={colors.accentPrimary}/><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary }, content: { paddingBottom: spacing.md }, header: { padding: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, greeting: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: '700' }, date: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: spacing.xxs }, xp: { flexDirection: 'row', gap: spacing.xxs, borderWidth: borders.thin, borderColor: colors.warning, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.sm }, xpText: { color: colors.warning, fontWeight: '700', fontSize: typography.size.xs }, levelProgress: { marginHorizontal: spacing.md, marginTop: spacing.xs }, section: { marginHorizontal: spacing.md, marginTop: spacing.lg }, overview: { gap: spacing.md }, stats: { flexDirection: 'row', justifyContent: 'space-around' }, stat: { alignItems: 'center', gap: 2 }, statValue: { color: colors.textPrimary, fontWeight: '700' }, statLabel: { color: colors.textDisabled, fontSize: typography.size.xs, textTransform: 'uppercase' }, rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }, eventTime: { color: colors.accentSecondary, fontWeight: '700', width: 44, fontSize: typography.size.sm }, endTime: { color: colors.textDisabled, fontSize: typography.size.xs }, flex: { flex: 1, gap: 3 }, itemTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '700' }, meta: { color: colors.textMuted, fontSize: typography.size.xs }, suggestion: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }, suggestionAction: { marginTop: spacing.xs, alignSelf: 'flex-start', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderWidth: borders.thin, borderColor: colors.borderAccent, borderRadius: radii.xs }, suggestionActionText: { color: colors.accentSecondary, fontSize: typography.size.xs, fontWeight: '700' }, selectedCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, borderColor: colors.borderAccent }, selectedLabel: { color: colors.accentSecondary, fontSize: typography.size.xs, fontWeight: '700', letterSpacing: 1 }, reviewModal: { flex: 1, backgroundColor: colors.bgPrimary }, reviewHeader: { padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: borders.thin, borderBottomColor: colors.borderDefault }, reviewHeaderTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: '700' }, reviewClose: { color: colors.accentPrimary }, reviewContent: { padding: spacing.md, gap: spacing.md }, reviewCard: { gap: spacing.sm }, reviewTitle: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: '700' }, reviewText: { color: colors.textSecondary, fontSize: typography.size.md, lineHeight: 22 }, sessionCard: { gap: spacing.sm }, sessionTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: '700' }, sessionExisting: { color: colors.accentSecondary, fontSize: typography.size.xs }, sessionError: { color: colors.dangerLight, fontSize: typography.size.xs }, chooseButton: { backgroundColor: colors.accentPrimary, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center' }, chooseText: { color: colors.bgPrimary, fontWeight: '700' }, completeButton: { borderWidth: borders.thin, borderColor: colors.borderAccent, borderRadius: radii.sm, padding: spacing.md, alignItems: 'center' }, completeText: { color: colors.accentSecondary, fontWeight: '700' }, reviewHint: { color: colors.textMuted, fontSize: typography.size.xs, textAlign: 'center' }, freeHint: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: spacing.xs }, error: { color: colors.dangerLight, paddingHorizontal: spacing.md },
});
