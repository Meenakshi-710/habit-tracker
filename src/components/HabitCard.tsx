import {
  CheckCircle2,
  Circle,
  Edit2,
  Trash2,
  TrendingUp,
  Sparkles,
  AlarmClock,
  Moon,
  Calendar,
  Clock,
} from "lucide-react";
import { Habit } from "../types/habit";
import {
  FaRunning,
  FaBook,
  FaBriefcase,
  FaSpa,
  FaUsers,
  FaPaintBrush,
  FaMoneyBillWave,
  FaStar,
} from "react-icons/fa";

interface HabitCardProps {
  habit: Habit;
  onToggleComplete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  selectedDate?: string | null; // ADDED: selectedDate prop
}

export default function HabitCard({
  habit,
  onToggleComplete,
  onEdit,
  onDelete,
  selectedDate, // ADDED: receive selectedDate
}: HabitCardProps) {
  // FIXED: Use selectedDate or default to today
  const targetDateString = selectedDate 
    ? new Date(selectedDate).toDateString() 
    : new Date().toDateString();
  
  const isDefaultTimeHabit = habit.id === "wake-time" || habit.id === "winddown-time";
  
  // FIXED: For default time habits, check localStorage; for others, check completedDates
  const isCompleted = isDefaultTimeHabit 
    ? (targetDateString === new Date().toDateString() && 
       JSON.parse(localStorage.getItem("default-completed") || "[]").includes(habit.id))
    : habit.completedDates.includes(targetDateString);

  const isGoogleCalendarEvent = habit.id?.startsWith("gcal-");
  const isEvent = habit.type === "event" || isGoogleCalendarEvent;

  const categoryIcons: { [key: string]: JSX.Element } = {
    "Health & Fitness": <FaRunning className="text-pink-600" />,
    Learning: <FaBook className="text-blue-600" />,
    Productivity: <FaBriefcase className="text-yellow-600" />,
    Mindfulness: <FaSpa className="text-green-600" />,
    Social: <FaUsers className="text-indigo-600" />,
    Hobbies: <FaPaintBrush className="text-purple-600" />,
    Finance: <FaMoneyBillWave className="text-emerald-600" />,
    Calendar: <Calendar className="text-blue-600" />,
    Other: <FaStar className="text-gray-500" />,
  };

  const getStreakCount = () => {
    // Don't show streaks for events or default time habits
    if (isEvent || isGoogleCalendarEvent || isDefaultTimeHabit) return 0;
    
    const sortedDates = habit.completedDates
      .map((dateStr) => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      date.setHours(0, 0, 0, 0);
      const dayDiff = Math.floor(
        (currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dayDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const streak = getStreakCount();

  const formatTime = (dateTime: string) => {
    try {
      const date = new Date(dateTime);
      return date.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        timeStyle: "short",
      });
    } catch (error) {
      return "Invalid time";
    }
  };

  const getCardIcon = () => {
    if (isDefaultTimeHabit) {
      return habit.id === "wake-time" ? (
        <AlarmClock size={16} className="text-orange-500" />
      ) : (
        <Moon size={16} className="text-indigo-500" />
      );
    }

    if (isGoogleCalendarEvent) {
      return <Calendar size={16} className="text-blue-600" />;
    }

    if (isEvent) {
      return <Calendar size={16} className="text-green-600" />;
    }

    return (
      categoryIcons[habit.category] || <FaStar className="text-gray-500" />
    );
  };

  const getCardStyle = () => {
    if (isGoogleCalendarEvent) {
      return isCompleted
        ? "border-blue-200 bg-gradient-to-r from-blue-50/50 to-sky-50/30 shadow-sm"
        : "border-blue-200/80 hover:border-blue-300/80 shadow-sm hover:bg-blue-50/20";
    }

    if (isEvent) {
      return isCompleted
        ? "border-green-200 bg-gradient-to-r from-green-50/50 to-emerald-50/30 shadow-sm"
        : "border-green-200/80 hover:border-green-300/80 shadow-sm hover:bg-green-50/20";
    }

    return isCompleted
      ? "border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-green-50/30 shadow-sm"
      : "border-gray-200/80 hover:border-gray-300/80 shadow-sm hover:bg-white";
  };

  const getButtonStyle = () => {
    if (isGoogleCalendarEvent) {
      return isCompleted
        ? "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-blue-700 text-white shadow-lg"
        : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-600";
    }

    if (isEvent) {
      return isCompleted
        ? "bg-gradient-to-br from-green-500 via-green-600 to-green-700 border-green-700 text-white shadow-lg"
        : "border-gray-300 hover:border-green-400 hover:bg-green-50 text-gray-400 hover:text-green-600";
    }

    return isCompleted
      ? "bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700 border-pink-700 text-white shadow-lg"
      : "border-gray-300 hover:border-pink-400 hover:bg-pink-50 text-gray-400 hover:text-pink-600";
  };

  return (
    <div
      className={`group relative bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${getCardStyle()}`}
    >
      {/* Status indicator */}
      <div
        className={`absolute top-4 right-4 w-2 h-2 rounded-full transition-all duration-200 ${
          isCompleted
            ? isGoogleCalendarEvent
              ? "bg-blue-500 shadow-lg"
              : isEvent
              ? "bg-green-500 shadow-lg"
              : "bg-emerald-500 shadow-lg"
            : "bg-gray-300"
        }`}
      ></div>

      {/* Google Calendar badge */}
      {isGoogleCalendarEvent && (
        <div className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
          Google Calendar
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Check + Info */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
          {/* Toggle Button */}
          <button
            onClick={() => {
              onToggleComplete(habit.id);
              // FIXED: Use proper completion check based on habit type and selected date
              const alreadyCompleted = isDefaultTimeHabit 
                ? (targetDateString === new Date().toDateString() && 
                   JSON.parse(localStorage.getItem("default-completed") || "[]").includes(habit.id))
                : habit.completedDates.includes(targetDateString);
                
              if (
                !alreadyCompleted &&
                typeof chrome !== "undefined" &&
                chrome.runtime
              ) {
                chrome.runtime.sendMessage({
                  type: "HABIT_COMPLETED",
                  payload: {
                    id: habit.id,
                    name: habit.name,
                    completedAt: new Date().toISOString(),
                  },
                });
              }
            }}
            className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shrink-0 ${getButtonStyle()}`}
          >
            {isCompleted ? (
              <CheckCircle2 size={20} className="drop-shadow-sm" />
            ) : (
              <Circle size={20} />
            )}
          </button>

          {/* Habit Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3
                className={`text-base sm:text-lg font-semibold transition-all duration-200 ${
                  isCompleted
                    ? isGoogleCalendarEvent
                      ? "text-blue-600 line-through opacity-75"
                      : isEvent
                      ? "text-green-600 line-through opacity-75"
                      : "text-pink-600 line-through opacity-75"
                    : isGoogleCalendarEvent
                    ? "text-blue-800 group-hover:text-blue-800"
                    : isEvent
                    ? "text-green-800 group-hover:text-green-800"
                    : "text-pink-800 group-hover:text-pink-800"
                }`}
              >
                {habit.name}
              </h3>

              {getCardIcon()}

              {isCompleted && (
                <Sparkles
                  size={14}
                  className={`animate-pulse ${
                    isGoogleCalendarEvent
                      ? "text-blue-500"
                      : isEvent
                      ? "text-green-500"
                      : "text-emerald-500"
                  }`}
                />
              )}
            </div>

            {/* Time display */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-1">
              <Clock size={14} />
              <span>{formatTime(habit.dateTime)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="text-gray-500 font-medium">
                {habit.category}
              </span>
              {streak > 0 && (
                <div className="flex items-center space-x-1 text-orange-600">
                  <TrendingUp size={14} />
                  <span className="font-semibold">{streak} day streak</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Edit/Delete */}
        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
          {!isDefaultTimeHabit && (
            <button
              onClick={() => onEdit(habit)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-110"
              title={`Edit ${
                isEvent || isGoogleCalendarEvent ? "event" : "habit"
              }`}
            >
              <Edit2 size={16} />
            </button>
          )}
          <button
            onClick={() => {
              const confirmMessage = isGoogleCalendarEvent
                ? "This will delete the event from both your habit tracker and Google Calendar. Are you sure?"
                : `Delete this ${isEvent ? "event" : "habit"}?`;

              if (window.confirm(confirmMessage)) {
                onDelete(habit.id);
              }
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
            title={`Delete ${
              isEvent || isGoogleCalendarEvent ? "event" : "habit"
            }`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}