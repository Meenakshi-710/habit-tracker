import { useMemo, useState, useEffect, useRef } from "react";
import {
  Target,
  TrendingUp,
  Calendar,
  Sparkles,
  Filter,
  Search,
} from "lucide-react";
import HabitCard from "./HabitCard";

interface Habit {
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

interface HabitListProps {
  habits: Habit[];
  onToggleComplete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  selectedDate?: string | null;
  allHabits?: Habit[];
}

export default function HabitList({
  habits,
  onToggleComplete,
  onEdit,
  onDelete,
  selectedDate,
  allHabits = [],
}: HabitListProps) {
  const targetDateString = selectedDate
    ? new Date(selectedDate).toDateString()
    : new Date().toDateString();

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "completed" | "incomplete" | "habit" | "task" | "event"
  >("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sortedHabits = useMemo(() => {
    return habits
      .filter((habit) => {
        const matchesSearch = habit.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

        let matchesFilter = true;
        if (filter === "completed") {
          matchesFilter = habit.completedDates.includes(targetDateString);
        } else if (filter === "incomplete") {
          matchesFilter = !habit.completedDates.includes(targetDateString);
        } else if (
          filter === "habit" ||
          filter === "task" ||
          filter === "event"
        ) {
          matchesFilter = habit.type === filter;
        }

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        const isDefaultA = a.id === "wake-time" || a.id === "winddown-time";
        const isDefaultB = b.id === "wake-time" || b.id === "winddown-time";

        const aCompleted = isDefaultA
          ? targetDateString === new Date().toDateString() &&
            JSON.parse(
              localStorage.getItem("default-completed") || "[]"
            ).includes(a.id)
          : a.completedDates.includes(targetDateString);

        const bCompleted = isDefaultB
          ? targetDateString === new Date().toDateString() &&
            JSON.parse(
              localStorage.getItem("default-completed") || "[]"
            ).includes(b.id)
          : b.completedDates.includes(targetDateString);

        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;

        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      });
  }, [habits, targetDateString, searchQuery, filter]);

  const getEmptyMessage = () => {
    switch (filter) {
      case "habit":
        return "No Habit Found";
      case "task":
        return "No Task Found";
      case "event":
        return "No Event Found";
      default:
        return "No Habits Found";
    }
  };

  if (habits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center max-w-md">
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-950 rounded-full flex items-center justify-center mx-auto shadow-inner border border-gray-200 dark:border-gray-700">
              <Target size={40} className="text-gray-400 dark:text-gray-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-3">
            Start Your Journey
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Build positive habits that will transform your daily routine.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <Calendar size={16} /> <span>Track Daily</span>
            <TrendingUp size={16} /> <span>Build Streaks</span>
            <Target size={16} /> <span>Reach Goals</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-blue-900/30">
      <div className="relative max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col sm:flex-row gap-3 items-center">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
                pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-pink-600 focus:outline-none shadow-sm"
            />
          </div>

          {/* Filter Icon */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterMenu((prev) => !prev)}
              className="p-2 rounded-full border border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 
                hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-pink-600 shadow-sm"
            >
              <Filter size={18} />
            </button>

            {/* Filter Menu (Right side popup) */}
            {showFilterMenu && (
              <div
                className="absolute top-0 left-full ml-2 w-40 
                  bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                  rounded-lg shadow-lg z-50"
              >
                {[
                  "all",
                  "completed",
                  "incomplete",
                  "habit",
                  "task",
                  "event",
                ].map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      setFilter(option as any);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      filter === option
                        ? "bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 font-medium"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Habit List */}
        <div className="grid gap-6">
          {sortedHabits.length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-8">
              {getEmptyMessage()}
            </div>
          ) : (
            sortedHabits.map((habit, index) => (
              <div
                key={habit.id}
                className="transform transition-all duration-200 animate-fadeInUp"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <HabitCard
                  habit={habit}
                  selectedDate={selectedDate}
                  allHabits={allHabits}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
