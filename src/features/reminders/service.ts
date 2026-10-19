import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { isValidDateKey, isValidTimeKey } from '../../utils/dates';

const CHANNEL_ID = 'dayquest-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface TaskReminderRow {
  id: number;
  title: string;
  due_date: string | null;
  due_time: string | null;
  status: string;
  deadline_reminder_enabled: number;
  deadline_notification_id: string | null;
}

export interface StudySessionReminder {
  task_id: number;
  session_date: string;
  session_time: string;
  notification_id: string | null;
}

export async function ensureReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Quest reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (!existing.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

async function hasReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.status === 'granted';
}

function notificationDate(dateKey: string, timeKey: string | null): Date | null {
  if (!isValidDateKey(dateKey)) return null;
  const time = timeKey && isValidTimeKey(timeKey) ? timeKey : '09:00';
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

async function cancelNotification(identifier: string | null): Promise<void> {
  if (identifier && Platform.OS !== 'web') {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }
}

export async function syncTaskReminderState(db: SQLiteDatabase, taskId: number): Promise<boolean> {
  const task = await db.getFirstAsync<TaskReminderRow>(
    'SELECT id, title, due_date, due_time, status, deadline_reminder_enabled, deadline_notification_id FROM tasks WHERE id=?', taskId,
  );
  if (!task) return false;

  const shouldSchedule = task.status === 'open' && task.deadline_reminder_enabled === 1 && task.due_date !== null;
  const triggerDate = shouldSchedule ? notificationDate(task.due_date!, task.due_time) : null;
  if (!triggerDate || triggerDate.getTime() <= Date.now()) {
    await cancelNotification(task.deadline_notification_id);
    await db.runAsync('UPDATE tasks SET deadline_notification_id=NULL WHERE id=?', taskId);
  } else if (await hasReminderPermission()) {
    const oldId = task.deadline_notification_id;
    const newId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Quest deadline',
        body: `“${task.title}” is due now.`,
        data: { taskId, kind: 'deadline' },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate, channelId: CHANNEL_ID },
    });
    try {
      await db.runAsync('UPDATE tasks SET deadline_notification_id=? WHERE id=?', newId, taskId);
    } catch (error) {
      await cancelNotification(newId);
      throw error;
    }
    if (oldId && oldId !== newId) await cancelNotification(oldId);
  } else {
    await cancelNotification(task.deadline_notification_id);
    await db.runAsync('UPDATE tasks SET deadline_notification_id=NULL WHERE id=?', taskId);
    if (task.status !== 'open') await cancelStudySessionReminder(db, taskId);
    return false;
  }

  if (task.status !== 'open') await cancelStudySessionReminder(db, taskId);
  else await refreshStudySessionNotification(db, taskId, task.title);
  return true;
}

export async function getStudySessionReminder(db: SQLiteDatabase, taskId: number): Promise<StudySessionReminder | null> {
  return db.getFirstAsync<StudySessionReminder>(
    'SELECT task_id, session_date, session_time, notification_id FROM study_sessions WHERE task_id=?', taskId,
  );
}

async function refreshStudySessionNotification(db: SQLiteDatabase, taskId: number, taskTitle: string): Promise<void> {
  const existing = await getStudySessionReminder(db, taskId);
  if (!existing) return;
  const date = notificationDate(existing.session_date, existing.session_time);
  if (!date || date.getTime() <= Date.now()) {
    await cancelNotification(existing.notification_id);
    await db.runAsync('DELETE FROM study_sessions WHERE task_id=?', taskId);
    return;
  }
  if (!(await hasReminderPermission())) {
    await cancelNotification(existing.notification_id);
    await db.runAsync('UPDATE study_sessions SET notification_id=NULL WHERE task_id=?', taskId);
    return;
  }
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Study session',
      body: `It’s time to work on “${taskTitle}”.`,
      data: { taskId, kind: 'study-session' },
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
  });
  try {
    await db.runAsync('UPDATE study_sessions SET notification_id=?, updated_at=? WHERE task_id=?', notificationId, new Date().toISOString(), taskId);
  } catch (error) {
    await cancelNotification(notificationId);
    throw error;
  }
  if (existing.notification_id) await cancelNotification(existing.notification_id);
}

export async function saveStudySessionReminder(
  db: SQLiteDatabase,
  taskId: number,
  taskTitle: string,
  sessionDate: string,
  sessionTime: string,
): Promise<StudySessionReminder> {
  if (!isValidDateKey(sessionDate) || !isValidTimeKey(sessionTime)) throw new Error('Choose a valid date and time.');
  const date = notificationDate(sessionDate, sessionTime);
  if (!date || date.getTime() <= Date.now()) throw new Error('Choose a study time in the future.');
  if (!(await ensureReminderPermission())) throw new Error('Notifications are not allowed. Enable them in your device settings to add reminders.');

  const existing = await getStudySessionReminder(db, taskId);
  let notificationId: string;
  try {
    notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Study session',
        body: `It’s time to work on “${taskTitle}”.`,
        data: { taskId, kind: 'study-session' },
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID },
    });
  } catch {
    throw new Error('Could not schedule this reminder. Check notification and exact alarm access in device settings.');
  }
  try {
    await db.runAsync(
      `INSERT INTO study_sessions (task_id, session_date, session_time, notification_id, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(task_id) DO UPDATE SET session_date=excluded.session_date,
         session_time=excluded.session_time, notification_id=excluded.notification_id, updated_at=excluded.updated_at`,
      taskId, sessionDate, sessionTime, notificationId, new Date().toISOString(),
    );
  } catch (error) {
    await cancelNotification(notificationId);
    throw error;
  }
  if (existing?.notification_id) await cancelNotification(existing.notification_id);
  return { task_id: taskId, session_date: sessionDate, session_time: sessionTime, notification_id: notificationId };
}

export async function cancelStudySessionReminder(db: SQLiteDatabase, taskId: number): Promise<void> {
  const existing = await getStudySessionReminder(db, taskId);
  if (existing?.notification_id) await cancelNotification(existing.notification_id);
  await db.runAsync('DELETE FROM study_sessions WHERE task_id=?', taskId);
}

export async function cancelTaskReminders(db: SQLiteDatabase, taskId: number): Promise<void> {
  const task = await db.getFirstAsync<{ deadline_notification_id: string | null }>(
    'SELECT deadline_notification_id FROM tasks WHERE id=?', taskId,
  );
  if (task?.deadline_notification_id) await cancelNotification(task.deadline_notification_id);
  await cancelStudySessionReminder(db, taskId);
}
