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
  Trophy,
  Crown,
  Star,
  Zap,
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
  FaHeart,
  FaTasks,
  FaCalendarAlt,
  FaTrophy,
  FaCrown,
  FaMedal,
} from "react-icons/fa";

interface HabitCardProps {
  habit: Habit;
  onToggleComplete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  selectedDate?: string | null;
  allHabits?: Habit[];
}

// Streak milestone definitions
const STREAK_MILESTONES = [
  {
    days: 3,
    title: "Getting Started!",
    icon: <Star className="w-6 h-6" />,
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-700",
    reward: "Consistency Building",
    message: "Great start! You're building momentum!",
  },
  {
    days: 7,
    title: "Week Warrior!",
    icon: <Zap className="w-6 h-6" />,
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    borderColor: "border-purple-200 dark:border-purple-700",
    reward: "Weekly Champion",
    message: "Amazing! You've completed a full week!",
  },
  {
    days: 10,
    title: "Bronze Achiever!",
    icon: <FaMedal className="w-6 h-6" />,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-700",
    reward: "Bronze Medal",
    message: "Congratulations! You've earned your first medal!",
  },
  {
    days: 21,
    title: "Habit Former!",
    icon: <Trophy className="w-6 h-6" />,
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-700",
    reward: "Habit Master",
    message: "Incredible! You're officially forming a habit!",
  },
  {
    days: 30,
    title: "Monthly Master!",
    icon: <Crown className="w-6 h-6" />,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-700",
    reward: "Monthly Crown",
    message: "Outstanding! A full month of dedication!",
  },
  {
    days: 50,
    title: "Silver Champion!",
    icon: <FaTrophy className="w-6 h-6" />,
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    borderColor: "border-gray-200 dark:border-gray-700",
    reward: "Silver Trophy",
    message: "Phenomenal! You're a true champion!",
  },
  {
    days: 100,
    title: "Gold Legend!",
    icon: <FaCrown className="w-6 h-6" />,
    color: "text-yellow-400",
    bgColor:
      "bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30",
    borderColor: "border-yellow-300 dark:border-yellow-600",
    reward: "Gold Crown",
    message: "LEGENDARY! 100 days of unstoppable commitment!",
  },
];

export default function HabitCard({
  habit,
  onToggleComplete,
  onEdit,
  onDelete,
  selectedDate,
}: HabitCardProps) {
  const targetDateString = selectedDate
    ? new Date(selectedDate).toDateString()
    : new Date().toDateString();

  const isDefaultTimeHabit =
    habit.id === "wake-time" || habit.id === "winddown-time";

  const isCompleted = isDefaultTimeHabit
    ? targetDateString === new Date().toDateString() &&
      JSON.parse(localStorage.getItem("default-completed") || "[]").includes(
        habit.id
      )
    : habit.completedDates.includes(targetDateString);

  const isGoogleCalendarEvent = habit.id?.startsWith("gcal-");
  const isEvent = habit.type === "event" || isGoogleCalendarEvent;

  // Check if this is part of a 7-day series
  const is7DaySeries = () => {
    return (
      habit.type === "habit" &&
      habit.id.includes("-20") &&
      habit.id.match(/-\d{4}-\d{2}-\d{2}$/)
    );
  };

  // Helper function to get appropriate delete confirmation message
  const getDeleteConfirmationMessage = (habit: Habit) => {
    const isGoogleCalendarEvent = habit.id?.startsWith("gcal-");
    const is7DaySeries =
      habit.type === "habit" &&
      ((habit.id.includes("-20") && habit.id.match(/-\d{4}-\d{2}-\d{2}$/)) ||
        isGoogleCalendarEvent);

    if (isGoogleCalendarEvent) {
      if (habit.type === "habit") {
        return "This will delete the entire habit series from both your habit tracker and Google Calendar. Are you sure?";
      } else {
        return "This will delete the event from both your habit tracker and Google Calendar. Are you sure?";
      }
    } else if (is7DaySeries) {
      return "This will delete the entire habit series. Are you sure?";
    } else {
      return `Delete this ${habit.type || "habit"}?`;
    }
  };

  const categoryIcons: { [key: string]: React.ElementType } = {
    "Health/Fitness": FaRunning,
    Learning: FaBook,
    Productivity: FaBriefcase,
    Mindfulness: FaSpa,
    Social: FaUsers,
    Hobbies: FaPaintBrush,
    Finance: FaMoneyBillWave,
    Other: FaStar,

    // also accept older/alternate keys so old data still works
    "Health & Fitness": FaRunning,
    Calendar: Calendar,
  };

  const resolveCategoryIcon = (categoryName?: string): React.ElementType => {
    if (!categoryName) return FaStar;
    // try exact match first
    if (categoryIcons[categoryName]) return categoryIcons[categoryName];

    // try normalized variants (lowercase, replace & and / with space)
    const normalized = categoryName.replace(/[&/]/g, " ").trim().toLowerCase();
    for (const key of Object.keys(categoryIcons)) {
      if (key.toLowerCase().replace(/[&/]/g, " ").trim() === normalized) {
        return categoryIcons[key];
      }
    }

    // fallback
    return FaStar;
  };

  // Function to calculate streak with given completed dates
  const calculateStreak = (completedDates: string[], targetDate: Date) => {
    let streak = 0;
    const checkDate = new Date(targetDate);
    checkDate.setHours(0, 0, 0, 0);

    for (let daysBack = 0; daysBack < 365; daysBack++) {
      const currentCheckDate = new Date(checkDate);
      currentCheckDate.setDate(currentCheckDate.getDate() - daysBack);
      const checkDateString = currentCheckDate.toDateString();

      const isDateCompleted = completedDates.includes(checkDateString);

      if (isDateCompleted) {
        streak++;
      } else {
        const habitStartDate = new Date(habit.dateTime);
        habitStartDate.setHours(0, 0, 0, 0);
        const currentCheckDateOnly = new Date(currentCheckDate);
        currentCheckDateOnly.setHours(0, 0, 0, 0);

        if (currentCheckDateOnly < habitStartDate) {
          continue;
        }

        if (daysBack === 0) {
          return 0;
        } else {
          break;
        }
      }

      if (streak >= 365) break;
    }

    return streak;
  };

  // Enhanced streak calculation with milestone detection
  const getStreakInfo = () => {
    // Only show streaks for habits (not events, tasks, or default time habits)
    if (habit.type !== "habit" || isDefaultTimeHabit) {
      return { streak: 0, milestone: null, nextMilestone: null };
    }

    // If current habit is not completed, streak is 0
    if (!isCompleted) {
      return {
        streak: 0,
        milestone: null,
        nextMilestone: STREAK_MILESTONES[0],
      };
    }

    const checkDate = selectedDate ? new Date(selectedDate) : new Date();
    const streak = calculateStreak(habit.completedDates, checkDate);

    // Find current milestone and next milestone
    const currentMilestone = STREAK_MILESTONES.slice()
      .reverse()
      .find((m) => streak >= m.days);

    const nextMilestone = STREAK_MILESTONES.find((m) => streak < m.days);

    return { streak, milestone: currentMilestone, nextMilestone };
  };

  // Function to trigger streak achievement notification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const triggerStreakNotification = (milestone: any, streak: number) => {
    console.log(
      `🎉 Triggering notification for ${habit.name}: ${streak} days - ${milestone.title}`
    );

    // Send message to background script for notification
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          type: "STREAK_MILESTONE_ACHIEVED",
          payload: {
            habitId: habit.id,
            habitName: habit.name,
            streak,
            milestone: milestone.title,
            reward: milestone.reward,
            message: milestone.message,
            achievedAt: new Date().toISOString(),
          },
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              "❌ Failed to send streak notification:",
              chrome.runtime.lastError
            );
          } else {
            console.log("✅ Streak notification message sent successfully");
          }
        }
      );
    }

    // Show in-app celebration animation
    showStreakCelebration(milestone);
  };

  // Function to show celebration animation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const showStreakCelebration = (milestone: any) => {
    // Create celebration effect
    const celebration = document.createElement("div");
    celebration.className =
      "fixed inset-0 flex items-center justify-center z-50 pointer-events-none";
    celebration.innerHTML = `
      <div class="streak-celebration-card bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl border-4 ${milestone.borderColor} max-w-md mx-4 animate-bounce">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 ${milestone.bgColor} rounded-full flex items-center justify-center ${milestone.color}">
            🏆
          </div>
          <h2 class="text-2xl font-bold mb-2 ${milestone.color}">${milestone.title}</h2>
          <p class="text-lg mb-2">${milestone.reward}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">${milestone.message}</p>
        </div>
      </div>
    `;

    document.body.appendChild(celebration);

    // Remove after animation
    setTimeout(() => {
      if (document.body.contains(celebration)) {
        document.body.removeChild(celebration);
      }
    }, 3000);
  };

  const streakInfo = getStreakInfo();
  const { streak, milestone, nextMilestone } = streakInfo;

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
        <AlarmClock
          size={16}
          className="text-orange-500 dark:text-orange-400"
        />
      ) : (
        <Moon size={16} className="text-indigo-500 dark:text-indigo-400" />
      );
    }

    if (isGoogleCalendarEvent) {
      return (
        <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
      );
    }

    // Resolve a component and render it (so props like size/className apply)
    const Icon = resolveCategoryIcon(habit.category);
    return <Icon size={16} className="text-pink-600 dark:text-pink-400" />;
  };

  // Get type label and icon
  const getTypeInfo = () => {
    const type = habit.type || "habit";
    const isSynced = isGoogleCalendarEvent;

    const typeConfig = {
      habit: {
        label: "Habit",
        icon: <FaHeart size={12} />,
      },
      task: {
        label: "Task",
        icon: <FaTasks size={12} />,
      },
      event: {
        label: "Event",
        icon: <FaCalendarAlt size={12} />,
      },
    };

    const base = typeConfig[type] || typeConfig.habit;

    return {
      ...base,
      color: isSynced
        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
        : "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-700",
    };
  };

  const getCardStyle = () => {
    return isGoogleCalendarEvent
      ? isCompleted
        ? "border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50/50 to-sky-50/30 dark:from-blue-900/20 dark:to-sky-900/10 shadow-sm"
        : "border-blue-200/80 dark:border-blue-700/80 hover:border-blue-300/80 dark:hover:border-blue-600/80 shadow-sm hover:bg-blue-50/20 dark:hover:bg-blue-900/10"
      : isCompleted
      ? "border-pink-200 dark:border-pink-700 bg-gradient-to-r from-pink-50/50 to-rose-50/30 dark:from-pink-900/20 dark:to-rose-900/10 shadow-sm"
      : "border-gray-200/80 dark:border-gray-700/80 hover:border-pink-300/80 dark:hover:border-pink-600/80 shadow-sm hover:bg-white dark:hover:bg-gray-800/50";
  };

  const getButtonStyle = () => {
    return isGoogleCalendarEvent
      ? isCompleted
        ? "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-400 dark:via-blue-500 dark:to-blue-600 border-blue-700 dark:border-blue-500 text-white shadow-lg"
        : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
      : isCompleted
      ? "bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700 dark:from-pink-400 dark:via-pink-500 dark:to-pink-600 border-pink-700 dark:border-pink-500 text-white shadow-lg"
      : "border-gray-300 dark:border-gray-600 hover:border-pink-400 dark:hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-gray-400 dark:text-gray-500 hover:text-pink-600 dark:hover:text-pink-400";
  };

  const typeInfo = getTypeInfo();

  // FIXED: Handle habit completion with proper streak milestone check
  const handleToggleComplete = () => {
    const wasCompleted = isCompleted;
    const currentTargetDate = selectedDate
      ? new Date(selectedDate)
      : new Date();
    const currentTargetDateString = currentTargetDate.toDateString();

    console.log(
      `🔄 Toggle completion for ${habit.name}: was ${
        wasCompleted ? "completed" : "not completed"
      }`
    );

    // Call the parent's toggle function first
    onToggleComplete(habit.id);

    // If the habit was just completed (not uncompleted) and it's a regular habit
    if (!wasCompleted && habit.type === "habit" && !isDefaultTimeHabit) {
      // Calculate what the new streak would be AFTER completion
      // Create updated completed dates array
      const updatedCompletedDates = habit.completedDates.includes(
        currentTargetDateString
      )
        ? habit.completedDates
        : [...habit.completedDates, currentTargetDateString];

      // Calculate new streak with the updated dates
      const newStreak = calculateStreak(
        updatedCompletedDates,
        currentTargetDate
      );

      console.log(
        `📊 Calculated new streak for ${habit.name}: ${newStreak} days`
      );

      // Check if this completion hits a milestone
      const achievedMilestone = STREAK_MILESTONES.find(
        (m) => m.days === newStreak
      );

      if (achievedMilestone) {
        console.log(
          `🎯 Milestone detected: ${achievedMilestone.title} (${newStreak} days)`
        );

        // Check for duplicate notifications using a more robust key
        const notificationKey = `milestone-${habit.id}-${newStreak}`;
        const lastNotified = localStorage.getItem(notificationKey);
        const today = new Date().toDateString();

        if (lastNotified !== today) {
          // Store that we notified today to prevent duplicates
          localStorage.setItem(notificationKey, today);

          console.log(
            `🚀 Triggering milestone notification for ${habit.name}: ${newStreak} days`
          );

          // Delay the notification slightly to allow the UI to update
          setTimeout(() => {
            triggerStreakNotification(achievedMilestone, newStreak);
          }, 300);
        } else {
          console.log(
            `⏭️ Milestone notification already sent today for ${habit.name}: ${newStreak} days`
          );
        }
      } else {
        console.log(`📈 No milestone for ${newStreak} days (${habit.name})`);
      }
    }

    // Send completion message to background script
    if (!wasCompleted && typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage(
        {
          type: "HABIT_COMPLETED",
          payload: {
            id: habit.id,
            name: habit.name,
            type: habit.type,
            completedAt: new Date().toISOString(),
          },
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              "❌ Failed to send completion message:",
              chrome.runtime.lastError
            );
          } else {
            console.log("✅ Completion message sent successfully");
          }
        }
      );
    }
  };

  return (
    <div
      className={`group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${getCardStyle()}`}
    >
      {/* Status indicator */}
      <div
        className={`absolute top-4 right-4 w-2 h-2 rounded-full transition-all duration-200 ${
          isCompleted
            ? isGoogleCalendarEvent
              ? "bg-blue-500 dark:bg-blue-400 shadow-lg"
              : "bg-pink-500 dark:bg-pink-400 shadow-lg"
            : "bg-gray-300 dark:bg-gray-600"
        }`}
      />

      {/* Milestone indicator */}
      {milestone && (
        <div
          className={`absolute top-2 right-8 ${milestone.bgColor} ${milestone.borderColor} border rounded-lg px-2 py-1 flex items-center gap-1`}
        >
          <span className={milestone.color}>{milestone.icon}</span>
          <span className={`text-xs font-semibold ${milestone.color}`}>
            {milestone.title}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Check + Info */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
          {/* Toggle Button */}
          <button
            onClick={handleToggleComplete}
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
                      ? "text-blue-600 dark:text-blue-400 line-through opacity-75"
                      : "text-pink-600 dark:text-pink-400 line-through opacity-75"
                    : isGoogleCalendarEvent
                    ? "text-blue-800 dark:text-blue-200 group-hover:text-blue-800 dark:group-hover:text-blue-100"
                    : "text-pink-800 dark:text-pink-200 group-hover:text-pink-800 dark:group-hover:text-pink-100"
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
                      ? "text-blue-500 dark:text-blue-400"
                      : "text-pink-500 dark:text-pink-400"
                  }`}
                />
              )}
            </div>

            {/* Type Label */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}
              >
                {typeInfo.icon}
                {typeInfo.label}
              </span>

              {/* Google Calendar badge */}
              {isGoogleCalendarEvent && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                  <Calendar size={10} />
                  Synced
                </span>
              )}

              {/* 7-Day Series Badge for recurring habits */}
              {is7DaySeries() && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  7-Day Series
                </span>
              )}
            </div>

            {/* Time display */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
              <Clock size={14} />
              <span>{formatTime(habit.dateTime)}</span>
            </div>

            {/* Category for habits OR Description for tasks/events */}
            <div className="mb-2">
              {habit.type === "habit" || isDefaultTimeHabit ? (
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    {habit.category}
                  </span>
                  {/* Enhanced streak display with milestone info */}
                  {isCompleted && habit.type === "habit" && streak > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                        <TrendingUp size={14} />
                        <span className="font-semibold">
                          {streak} day{streak > 1 ? "s" : ""} streak
                        </span>
                      </div>
                      {milestone && (
                        <div
                          className={`flex items-center space-x-1 ${milestone.color}`}
                        >
                          {milestone.icon}
                          <span className="text-xs font-medium">
                            {milestone.reward}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Progress to next milestone */}
                  {nextMilestone && habit.type === "habit" && streak > 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {nextMilestone.days - streak} days to{" "}
                      {nextMilestone.title}
                    </div>
                  )}
                </div>
              ) : (
                // Show description for tasks and events
                habit.description && (
                  <p className="mt-1 leading-relaxed text-gray-600 dark:text-gray-300">
                    {habit.description}
                  </p>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right: Edit/Delete */}
        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200">
          {!isDefaultTimeHabit && (
            <button
              onClick={() => {
                const habitToEdit = {
                  ...habit,
                  selectedDate:
                    selectedDate || new Date().toISOString().split("T")[0],
                };
                onEdit(habitToEdit);
              }}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 hover:scale-110"
              title={`Edit ${
                isEvent || isGoogleCalendarEvent ? "event" : "habit"
              }`}
            >
              <Edit2 size={16} />
            </button>
          )}
          <button
            onClick={() => {
              const confirmMessage = getDeleteConfirmationMessage(habit);
              if (window.confirm(confirmMessage)) {
                onDelete(habit.id);
              }
            }}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:scale-110"
            title={`Delete ${
              isEvent || isGoogleCalendarEvent ? "event" : "habit"
            }`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0, -30px, 0);
          }
          70% {
            transform: translate3d(0, -15px, 0);
          }
          90% {
            transform: translate3d(0, -4px, 0);
          }
        }

        .streak-celebration-card {
          animation: bounce 1s ease-out;
        }
      `}</style>
    </div>
  );
}