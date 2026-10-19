import type { SQLiteDatabase } from 'expo-sqlite';

export const XP_PER_LEVEL = 100;

export interface ProgressSummary {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  levelProgress: number;
  completedQuests: number;
}

export async function getProgressSummary(db: SQLiteDatabase): Promise<ProgressSummary> {
  const [xpRow, completedRow] = await Promise.all([
    db.getFirstAsync<{ total_xp: number }>('SELECT COALESCE(SUM(xp), 0) AS total_xp FROM task_xp_awards'),
    db.getFirstAsync<{ completed_count: number }>("SELECT COUNT(*) AS completed_count FROM tasks WHERE status='completed'"),
  ]);
  const totalXp = xpRow?.total_xp ?? 0;
  const xpIntoLevel = totalXp % XP_PER_LEVEL;
  return {
    totalXp,
    level: Math.floor(totalXp / XP_PER_LEVEL) + 1,
    xpIntoLevel,
    levelProgress: xpIntoLevel / XP_PER_LEVEL,
    completedQuests: completedRow?.completed_count ?? 0,
  };
}
