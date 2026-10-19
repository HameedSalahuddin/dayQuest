export type TaskCategory = 'assignment' | 'lab' | 'exam' | 'revision' | 'project' | 'personal';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'completed';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  subject: string | null;
  category: TaskCategory;
  due_date: string | null;
  due_time: string | null;
  estimated_minutes: number;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  deadline_reminder_enabled: number;
  deadline_notification_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskInput = Pick<Task, 'title' | 'description' | 'subject' | 'category' | 'due_date' | 'due_time' | 'estimated_minutes' | 'priority' | 'notes'> & {
  deadline_reminder_enabled: boolean;
};
