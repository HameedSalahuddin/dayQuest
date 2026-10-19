import type { SQLiteDatabase } from 'expo-sqlite';
import { cancelTaskReminders, syncTaskReminderState } from '../reminders/service';
import type { Task, TaskInput } from './types';

export function listTasks(db: SQLiteDatabase): Promise<Task[]> {
  return db.getAllAsync<Task>(`SELECT * FROM tasks ORDER BY
    CASE status WHEN 'open' THEN 0 ELSE 1 END,
    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date, due_time, created_at DESC`);
}

export async function saveTask(db: SQLiteDatabase, input: TaskInput, id?: number): Promise<number> {
  const now = new Date().toISOString();
  const values = [input.title.trim(), input.description, input.subject, input.category,
    input.due_date, input.due_time, input.estimated_minutes, input.priority, input.deadline_reminder_enabled ? 1 : 0, input.notes, now];
  if (id === undefined) {
    const result = await db.runAsync(`INSERT INTO tasks
      (title, description, subject, category, due_date, due_time, estimated_minutes, priority, deadline_reminder_enabled, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ...values.slice(0, 10), now, now);
    return result.lastInsertRowId;
  } else {
    await db.runAsync(`UPDATE tasks SET title=?, description=?, subject=?, category=?, due_date=?, due_time=?,
      estimated_minutes=?, priority=?, deadline_reminder_enabled=?, notes=?, updated_at=? WHERE id=?`, ...values, id);
    return id;
  }
}

export async function setTaskCompleted(db: SQLiteDatabase, task: Task, completed: boolean): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    if (completed) {
      const transition = await db.runAsync(
        "UPDATE tasks SET status='completed', completed_at=?, updated_at=? WHERE id=? AND status='open'",
        now, now, task.id,
      );
      if (transition.changes > 0) {
        await db.runAsync(
          `INSERT OR IGNORE INTO task_xp_awards (task_id, task_created_at, xp, awarded_at)
           SELECT id, created_at, 25, ? FROM tasks WHERE id=? AND status='completed'`,
          now, task.id,
        );
      }
    } else {
      await db.runAsync("UPDATE tasks SET status='open', completed_at=NULL, updated_at=? WHERE id=? AND status='completed'", now, task.id);
    }
  });
  await syncTaskReminderState(db, task.id);
}

export async function deleteTask(db: SQLiteDatabase, id: number): Promise<void> {
  await cancelTaskReminders(db, id);
  await db.runAsync('DELETE FROM tasks WHERE id=?', id);
}
