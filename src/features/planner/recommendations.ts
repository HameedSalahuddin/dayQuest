import type { Task } from '../tasks/types';

export interface FixedEvent { title: string; start_minute: number; end_minute: number; location: string | null; subject: string | null; event_type: string; }
export interface FreeSlot { start: number; end: number; duration: number; }
const PLANNING_END_MINUTE = 22 * 60;

export function getFreeSlots(events: FixedEvent[], now = new Date()): FreeSlot[] {
  const current = now.getHours() * 60 + now.getMinutes();
  const sorted = [...events].sort((a, b) => a.start_minute - b.start_minute);
  const slots: FreeSlot[] = [];
  let cursor = current;
  for (const event of sorted) {
    const start = Math.max(current, event.start_minute);
    const end = Math.min(PLANNING_END_MINUTE, event.end_minute);
    if (start > cursor) slots.push({ start: cursor, end: start, duration: start - cursor });
    cursor = Math.max(cursor, end);
  }
  if (cursor < PLANNING_END_MINUTE) slots.push({ start: cursor, end: PLANNING_END_MINUTE, duration: PLANNING_END_MINUTE - cursor });
  return slots.filter(slot => slot.duration >= 10);
}

export function recommendTasks(tasks: Task[], slots: FreeSlot[], today: string, limit = 3): Task[] {
  const open = tasks.filter(task => task.status === 'open');
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;
  const score = (task: Task) => {
    const overdue = task.due_date && task.due_date < today ? 100 : 0;
    const dueToday = task.due_date === today ? 60 : 0;
    const dueTomorrow = task.due_date === tomorrow ? 30 : 0;
    const priority = task.priority === 'high' ? 20 : task.priority === 'medium' ? 10 : 0;
    const fits = slots.some(slot => task.estimated_minutes <= slot.duration) ? 12 : 0;
    return overdue + dueToday + dueTomorrow + priority + fits;
  };
  return open.sort((a, b) => score(b) - score(a) || a.estimated_minutes - b.estimated_minutes).slice(0, limit);
}

export function formatMinute(minute: number): string {
  const normalized = minute % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}
