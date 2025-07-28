import {
  CheckCircle2,
  Circle,
  Edit2,
  Trash2,
  TrendingUp,
  Sparkles,
  AlarmClock,
  Moon,
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
}

export default function HabitCard({
  habit,
  onToggleComplete,
  onEdit,
  onDelete,
}: HabitCardProps) {
  const today = new Date().toDateString();
  const isCompleted = habit.completedDates.includes(today);

  const isDefaultTimeHabit =
    habit.id === "wake-time" || habit.id === "winddown-time";

  const categoryIcons: { [key: string]: JSX.Element } = {
    "Health & Fitness": <FaRunning className="text-pink-600" />,
    Learning: <FaBook className="text-blue-600" />,
    Productivity: <FaBriefcase className="text-yellow-600" />,
    Mindfulness: <FaSpa className="text-green-600" />,
    Social: <FaUsers className="text-indigo-600" />,
    Hobbies: <FaPaintBrush className="text-purple-600" />,
    Finance: <FaMoneyBillWave className="text-emerald-600" />,
    Other: <FaStar className="text-gray-500" />,
  };

  const getStreakCount = () => {
    const sortedDates = habit.completedDates
      .map((dateStr) => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison

    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      date.setHours(0, 0, 0, 0); // Reset to start of day
      
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

  // Format datetime for display
  const formatDateTime = (dateTime: string) => {
    try {
      const date = new Date(dateTime);
      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (error) {
      console.warn("Error formatting date:", dateTime, error);
      return "Invalid date";
    }
  };

  return (
    <div
      className={`group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
        isCompleted
          ? "border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-green-50/30 shadow-sm"
          : "border-gray-200/80 hover:border-gray-300/80 shadow-sm hover:bg-white"
      }`}
    >
      {/* Completion status indicator */}
      <div
        className={`absolute top-4 right-4 w-2 h-2 rounded-full transition-all duration-200 ${
          isCompleted ? "bg-emerald-500 shadow-lg" : "bg-gray-300"
        }`}
      ></div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Completion Button */}
          <button
            onClick={() => onToggleComplete(habit.id)}
            className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
              isCompleted
                ? "bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700 border-pink-700 text-white shadow-lg"
                : "border-gray-300 hover:border-pink-400 hover:bg-pink-50 text-gray-400 hover:text-pink-600"
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 size={20} className="drop-shadow-sm" />
            ) : (
              <Circle size={20} />
            )}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-300 ${
                isCompleted ? "bg-emerald-400/20 scale-150 opacity-0" : ""
              }`}
            ></div>
          </button>

          {/* Habit Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <h3
                className={`text-lg font-semibold transition-all duration-200 ${
                  isCompleted
                    ? "text-pink-600 line-through opacity-75"
                    : "text-pink-800 group-hover:text-pink-800"
                }`}
              >
                {habit.name}
              </h3>

              {isDefaultTimeHabit ? (
                habit.id === "wake-time" ? (
                  <AlarmClock size={18} className="text-orange-500" />
                ) : (
                  <Moon size={18} className="text-indigo-500" />
                )
              ) : (
                <span className="text-xl" title={habit.category}>
                  {categoryIcons[habit.category] || "⭐"}
                </span>
              )}

              {isCompleted && (
                <Sparkles
                  size={16}
                  className="text-emerald-500 animate-pulse"
                />
              )}
            </div>

            {/* DateTime display */}
            <div className="text-sm text-gray-500 mb-1">
              {formatDateTime(habit.dateTime)}
            </div>

            <div className="flex items-center space-x-4 text-sm">
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

        {/* Action Buttons – hide for default time habits */}
        {!isDefaultTimeHabit && (
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button
              onClick={() => onEdit(habit)}
              className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-110"
              title="Edit habit"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => onDelete(habit.id)}
              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
              title="Delete habit"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}