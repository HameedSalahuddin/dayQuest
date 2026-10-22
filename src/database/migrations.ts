import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 5;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        subject TEXT,
        category TEXT NOT NULL DEFAULT 'assignment',
        due_date TEXT,
        due_time TEXT,
        estimated_minutes INTEGER NOT NULL DEFAULT 30,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'open',
        completed_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX tasks_due_date_idx ON tasks(due_date);
      CREATE TABLE schedule_entries (
        id INTEGER PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        subject TEXT,
        location TEXT,
        notes TEXT,
        weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
        start_minute INTEGER NOT NULL,
        end_minute INTEGER NOT NULL,
        event_type TEXT NOT NULL DEFAULT 'class',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (start_minute BETWEEN 0 AND 1439),
        CHECK (end_minute BETWEEN 1 AND 2880),
        CHECK (end_minute > start_minute)
      );
      CREATE TABLE schedule_exceptions (
        id INTEGER PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        entry_id INTEGER,
        exception_type TEXT NOT NULL,
        title TEXT,
        start_minute INTEGER,
        end_minute INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (entry_id) REFERENCES schedule_entries(id) ON DELETE CASCADE
      );
    `);
    version = 1;
  }
  if (version === 1) {
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS schedule_exceptions_date_idx ON schedule_exceptions(date);
      CREATE INDEX IF NOT EXISTS schedule_exceptions_entry_date_idx ON schedule_exceptions(entry_id, date);
    `);
    version = 2;
  }
  if (version === 2) {
    await db.execAsync(`
      CREATE TABLE task_xp_awards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        task_created_at TEXT NOT NULL,
        xp INTEGER NOT NULL CHECK (xp > 0),
        awarded_at TEXT NOT NULL,
        UNIQUE (task_id, task_created_at)
      );
      CREATE INDEX task_xp_awards_task_idx ON task_xp_awards(task_id);
      INSERT INTO task_xp_awards (task_id, task_created_at, xp, awarded_at)
        SELECT id, created_at, 25, COALESCE(completed_at, updated_at, created_at)
        FROM tasks WHERE status='completed';
    `);
    version = 3;
  }
  if (version === 3) {
    await db.execAsync(`
      ALTER TABLE tasks ADD COLUMN deadline_reminder_enabled INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE tasks ADD COLUMN deadline_notification_id TEXT;
      CREATE TABLE study_sessions (
        task_id INTEGER PRIMARY KEY NOT NULL,
        session_date TEXT NOT NULL,
        session_time TEXT NOT NULL,
        notification_id TEXT,
        updated_at TEXT NOT NULL
      );
    `);
    version = 4;
  }
  if (version === 4) {
    await db.execAsync(`
      CREATE TABLE profile_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        option_type TEXT NOT NULL CHECK (option_type IN ('subject', 'extracurricular')),
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (option_type, name COLLATE NOCASE)
      );
      CREATE INDEX profile_options_type_idx ON profile_options(option_type, name COLLATE NOCASE);
    `);
    version = 5;
  }
  await db.execAsync(`PRAGMA user_version = ${version};`);
}
