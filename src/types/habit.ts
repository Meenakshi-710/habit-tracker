export interface Habit {
  id: string;
  name: string;
  title?: string;
  description?: string;
  category: string;
  color: string;
  dateTime: string;
  completedDates: string[];
  createdAt: string;
  type?: "habit" | "task" | "event";
  remindBeforeMinutes?: number;
}