// Updated Habit type definition with recurring options
export interface Habit {
  id: string;
  name: string;
  title?: string;
  description?: string;
  category: string; // made required as in first file
  color: string; // made required as in first file
  dateTime: string; // ISO string
  completedDates: string[];
  createdAt: string;
  type?: "habit" | "task" | "event";
  remindBeforeMinutes?: number;
  isRecurring?: boolean;
recurringType?: 
    | "none"           // One-time only
    | "daily"          // Every day
    | "weekly"         // Every week on the same day
    | "monthly"        // Every month on the same date
    | "monday"         // Every Monday
    | "tuesday"        // Every Tuesday
    | "wednesday"      // Every Wednesday
    | "thursday"       // Every Thursday
    | "friday"         // Every Friday
    | "saturday"       // Every Saturday
    | "sunday";        // Every Sunday
}

// Helper type for form data submission
export type HabitFormData = Omit<Habit, "id" | "completedDates" | "createdAt">;

// Helper function to get human-readable recurring description
export const getRecurringDescription = (recurringType?: string): string => {
  switch (recurringType) {
    case "daily":
      return "Every day";
    case "weekly":
      return "Every week";
    case "monthly":
      return "Every month";
    default:
      return "One-time only";
  }
};

// Helper function to get next occurrence date for a recurring habit
export const getNextOccurrence = (habit: Habit, fromDate: Date = new Date()): Date | null => {
  if (!habit.isRecurring || !habit.recurringType) {
    return null;
  }

  const habitDate = new Date(habit.dateTime);
  const checkDate = new Date(fromDate);
  
  habitDate.setHours(0, 0, 0, 0);
  checkDate.setHours(0, 0, 0, 0);

  switch (habit.recurringType) {
    case "daily":
      return checkDate >= habitDate
        ? new Date(checkDate.setDate(checkDate.getDate() + 1))
        : habitDate;

    case "weekly": {
      const dayDiff = (habitDate.getDay() - checkDate.getDay() + 7) % 7;
      if (dayDiff === 0 && checkDate >= habitDate) {
        checkDate.setDate(checkDate.getDate() + 7);
      } else {
        checkDate.setDate(checkDate.getDate() + dayDiff);
      }
      return checkDate;
    }

    case "monthly": {
      const nextMonth = new Date(checkDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(habitDate.getDate());
      return nextMonth;
    }

    default:
      return null;
  }
};

// Helper function to check if a habit is overdue
export const isHabitOverdue = (habit: Habit, currentDate: Date = new Date()): boolean => {
  const habitDate = new Date(habit.dateTime);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!habit.isRecurring || !habit.recurringType) {
    const habitDateOnly = new Date(habitDate);
    habitDateOnly.setHours(0, 0, 0, 0);
    return habitDateOnly < today && !habit.completedDates.includes(habitDateOnly.toDateString());
  }

  const todayString = today.toDateString();
  const shouldAppearToday = shouldHabitAppearOnDate(habit, todayString);
  
  return shouldAppearToday && !habit.completedDates.includes(todayString) && habitDate < currentDate;
};

// Helper function to check if habit should appear on a specific date
export const shouldHabitAppearOnDate = (habit: Habit, targetDateString: string): boolean => {
  const habitStartDate = new Date(habit.dateTime);
  const targetDate = new Date(targetDateString);
  
  habitStartDate.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  if (targetDate < habitStartDate) {
    return false;
  }

  if (!habit.isRecurring || !habit.recurringType) {
    return habitStartDate.getTime() === targetDate.getTime();
  }

  switch (habit.recurringType) {
    case "daily":
      return true;
    case "weekly":
      return habitStartDate.getDay() === targetDate.getDay();
    case "monthly":
      return habitStartDate.getDate() === targetDate.getDate();
    default:
      return false;
  }
};
