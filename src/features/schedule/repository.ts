import type { SQLiteDatabase } from 'expo-sqlite';
import { dateKeyOffset, weekdayForDateKey } from '../../utils/dates';
import type { FixedEvent } from '../planner/recommendations';

export interface ScheduleEntry extends FixedEvent {
  id: number;
  weekday: number;
  notes: string | null;
  event_type: 'class' | 'commitment';
}

export interface ScheduleException {
  id: number;
  date: string;
  entry_id: number | null;
  exception_type: 'cancelled' | 'holiday' | 'one_off' | 'modified';
  title: string | null;
  start_minute: number | null;
  end_minute: number | null;
  notes: string | null;
}

export interface DatedEvent extends FixedEvent {
  id: number;
  key: string;
  source: 'weekly' | 'one_off';
  continues_next_day: boolean;
}

export async function listScheduleEntries(db: SQLiteDatabase): Promise<ScheduleEntry[]> {
  return db.getAllAsync<ScheduleEntry>('SELECT * FROM schedule_entries ORDER BY weekday, start_minute');
}

export async function listScheduleExceptions(db: SQLiteDatabase, date: string): Promise<ScheduleException[]> {
  return db.getAllAsync<ScheduleException>('SELECT * FROM schedule_exceptions WHERE date=? ORDER BY start_minute, id', date);
}

export async function addScheduleException(
  db: SQLiteDatabase,
  value: Omit<ScheduleException, 'id'>,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO schedule_exceptions (date, entry_id, exception_type, title, start_minute, end_minute, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    value.date, value.entry_id, value.exception_type, value.title, value.start_minute,
    value.end_minute, value.notes, new Date().toISOString(),
  );
}

export async function deleteScheduleException(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM schedule_exceptions WHERE id=?', id);
}

/** Build a date's events, applying holiday and cancellation exceptions to weekly events. */
export async function getEventsForDate(db: SQLiteDatabase, date: string): Promise<DatedEvent[]> {
  const weekday = weekdayForDateKey(date);
  if (weekday === null) return [];
  const previousDate = dateKeyOffset(date, -1);
  const previousWeekday = weekdayForDateKey(previousDate)!;
  const [weekly, exceptions, yesterdayExceptions] = await Promise.all([
    db.getAllAsync<ScheduleEntry>(
      'SELECT * FROM schedule_entries WHERE weekday=? ORDER BY start_minute', weekday,
    ),
    listScheduleExceptions(db, date),
    listScheduleExceptions(db, previousDate),
  ]);
  const previousWeekly = await db.getAllAsync<ScheduleEntry>(
    'SELECT * FROM schedule_entries WHERE weekday=? ORDER BY start_minute', previousWeekday,
  );
  if (exceptions.some(item => item.exception_type === 'holiday')) return [];
  const yesterdayWasHoliday = yesterdayExceptions.some(item => item.exception_type === 'holiday');

  const cancelled = new Set(exceptions.filter(item => item.exception_type === 'cancelled').map(item => item.entry_id));
  const yesterdayCancelled = new Set(yesterdayExceptions.filter(item => item.exception_type === 'cancelled').map(item => item.entry_id));
  const modifications = new Map(exceptions.filter(item => item.exception_type === 'modified' && item.entry_id !== null).map(item => [item.entry_id!, item]));
  const yesterdayModifications = new Map(yesterdayExceptions.filter(item => item.exception_type === 'modified' && item.entry_id !== null).map(item => [item.entry_id!, item]));
  const events: DatedEvent[] = [];
  for (const event of weekly) {
    const modification = modifications.get(event.id);
    if (!cancelled.has(event.id)) events.push({ ...event,
      ...(modification?.title ? { title: modification.title } : {}),
      ...(modification?.start_minute !== null && modification?.start_minute !== undefined ? { start_minute: modification.start_minute } : {}),
      ...(modification?.end_minute !== null && modification?.end_minute !== undefined ? { end_minute: modification.end_minute } : {}),
      key: `weekly-${event.id}`, source: 'weekly', continues_next_day: (modification?.end_minute ?? event.end_minute) > 1440 });
  }
  for (const event of previousWeekly) {
    const modification = yesterdayModifications.get(event.id);
    const modifiedStart = modification?.start_minute ?? event.start_minute;
    const modifiedEnd = modification?.end_minute ?? event.end_minute;
    if (!yesterdayWasHoliday && modifiedEnd > 1440 && !yesterdayCancelled.has(event.id)) {
      events.push({ ...event, ...(modification?.title ? { title: modification.title } : {}), start_minute: modifiedStart - 1440, end_minute: modifiedEnd - 1440,
        key: `weekly-${event.id}-carry`, source: 'weekly', continues_next_day: false });
    }
  }
  for (const event of exceptions.filter(item => item.exception_type === 'one_off' && item.title && item.start_minute !== null && item.end_minute !== null)) {
    events.push({ id: event.id, title: event.title!, start_minute: event.start_minute!, end_minute: event.end_minute!,
      location: null, subject: null, event_type: 'one-off', key: `exception-${event.id}`, source: 'one_off',
      continues_next_day: event.end_minute! > 1440 });
  }
  if (!yesterdayWasHoliday) {
    for (const event of yesterdayExceptions.filter(item => item.exception_type === 'one_off' && item.title && item.start_minute !== null && item.end_minute !== null && item.end_minute > 1440)) {
      events.push({ id: event.id, title: event.title!, start_minute: event.start_minute! - 1440, end_minute: event.end_minute! - 1440,
        location: null, subject: null, event_type: 'one-off', key: `exception-${event.id}-carry`, source: 'one_off', continues_next_day: false });
    }
  }
  return events.sort((a, b) => a.start_minute - b.start_minute || a.end_minute - b.end_minute);
}

/** Recurring intervals are compared on the selected day and the following day to catch overnight overlaps. */
export function hasScheduleOverlap(
  entries: ScheduleEntry[], weekday: number, start: number, end: number, omitId?: number,
): boolean {
  const previousDay = (weekday + 6) % 7;
  const nextDay = (weekday + 1) % 7;
  return entries.some(entry => {
    if (entry.id === omitId) return false;
    if (entry.weekday === weekday && start < entry.end_minute && end > entry.start_minute) return true;
    if (entry.weekday === previousDay && entry.end_minute > 1440 && start < entry.end_minute - 1440) return true;
    return entry.weekday === nextDay && end > 1440 && end - 1440 > entry.start_minute;
  });
}
