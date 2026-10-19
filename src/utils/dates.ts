export type DeadlineState = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'none';

export function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function weekdayForDateKey(value: string): number | null {
  if (!isValidDateKey(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function dateFromDateKey(value: string): Date | null {
  if (!isValidDateKey(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function dateFromTimeKey(value: string | null): Date | null {
  if (!value || !isValidTimeKey(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function timeKeyFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function dateKeyOffset(value: string, offset: number): string {
  if (!isValidDateKey(value)) return value;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day + offset);
  return localDateKey(date);
}

export function parseTimeRange(startValue: string, endValue: string): { start: number; end: number } | null {
  const parse = (value: string) => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour < 24 && minute < 60 ? hour * 60 + minute : null;
  };
  const start = parse(startValue);
  const enteredEnd = parse(endValue);
  if (start === null || enteredEnd === null || enteredEnd === start) return null;
  const end = enteredEnd < start ? enteredEnd + 1440 : enteredEnd;
  return end > start && end - start <= 1440 ? { start, end } : null;
}

export function isValidTimeKey(value: string): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  return !!match && Number(match[1]) < 24 && Number(match[2]) < 60;
}

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function classifyDeadline(dueDate: string | null, today = localDateKey(new Date())): DeadlineState {
  if (!dueDate) return 'none';
  const tomorrowDate = new Date(`${today}T12:00:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateKey(tomorrowDate);
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  if (dueDate === tomorrow) return 'tomorrow';
  return 'upcoming';
}
