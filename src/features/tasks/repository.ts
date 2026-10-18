import type { SQLiteDatabase } from 'expo-sqlite';
import type { Task, TaskInput } from './types';

export function listTasks(db: SQLiteDatabase): Promise<Task[]> {
  return db.getAllAsync<Task>(`SELECT * FROM tasks ORDER BY
    CASE status WHEN 'open' THEN 0 ELSE 1 END,
    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date, due_time, created_at DESC`);
}

export async function saveTask(db: SQLiteDatabase, input: TaskInput, id?: number): Promise<void> {
  const now = new Date().toISOString();
  const values = [input.title.trim(), input.description, input.subject, input.category,
    input.due_date, input.due_time, input.estimated_minutes, input.priority, input.notes, now];
  if (id === undefined) {
    await db.runAsync(`INSERT INTO tasks
      (title, description, subject, category, due_date, due_time, estimated_minutes, priority, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ...values.slice(0, 9), now, now);
  } else {
    await db.runAsync(`UPDATE tasks SET title=?, description=?, subject=?, category=?, due_date=?, due_time=?,
      estimated_minutes=?, priority=?, notes=?, updated_at=? WHERE id=?`, ...values, id);
  }
}

export async function setTaskCompleted(db: SQLiteDatabase, task: Task, completed: boolean): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync('UPDATE tasks SET status=?, completed_at=?, updated_at=? WHERE id=?',
    completed ? 'completed' : 'open', completed ? now : null, now, task.id);
}

export async function deleteTask(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM tasks WHERE id=?', id);
}
