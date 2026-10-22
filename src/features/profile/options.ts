import type { SQLiteDatabase } from 'expo-sqlite';

export type ProfileOptionType = 'subject' | 'extracurricular';

export interface ProfileOption {
  id: number;
  option_type: ProfileOptionType;
  name: string;
  created_at: string;
}

export function listProfileOptions(db: SQLiteDatabase, type: ProfileOptionType): Promise<ProfileOption[]> {
  return db.getAllAsync<ProfileOption>(
    'SELECT id, option_type, name, created_at FROM profile_options WHERE option_type=? ORDER BY name COLLATE NOCASE',
    type,
  );
}

export async function addProfileOption(db: SQLiteDatabase, type: ProfileOptionType, name: string): Promise<void> {
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  if (!normalizedName) throw new Error('Enter a name first.');
  await db.runAsync(
    'INSERT OR IGNORE INTO profile_options (option_type, name, created_at) VALUES (?, ?, ?)',
    type,
    normalizedName,
    new Date().toISOString(),
  );
}

export function deleteProfileOption(db: SQLiteDatabase, id: number): Promise<void> {
  return db.runAsync('DELETE FROM profile_options WHERE id=?', id).then(() => undefined);
}
