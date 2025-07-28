import { useState, useCallback, useEffect } from "react";
import { Habit } from "../types/habit";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Header from "./header";
import HabitList from "./HabitList";
import HabitForm from "./HabitForm";
import OnboardingFlow from "./OnboardingFlow";

function HabitApp() {
  const [habits, setHabits] = useLocalStorage<Habit[]>("habits", []);
  const [defaultCompleted, setDefaultCompleted] = useLocalStorage<string[]>(
    "default-completed",
    []
  );
  const [activeTab, setActiveTab] = useState("habits");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayDateString = new Date().toDateString();
  const wakeTime = localStorage.getItem("wake-time");
  const windTime = localStorage.getItem("winddown-time");

  const convertLocalTimeToUTC = (
    dateString: string,
    timeString: string
  ): string => {
    const localDateTime = new Date(`${dateString}T${timeString}:00`);
    return localDateTime.toISOString();
  };

  const defaultTimeHabits: Habit[] = [];

  if (wakeTime) {
    const todayDate = new Date().toISOString().split("T")[0];
    defaultTimeHabits.push({
      id: "wake-time",
      name: "Wake Up",
      category: "Health & Fitness",
      color: "#FFA500",
      dateTime: convertLocalTimeToUTC(todayDate, wakeTime),
      completedDates: defaultCompleted.includes("wake-time")
        ? [todayDateString]
        : [],
      createdAt: new Date().toISOString(),
    });
  }

  if (windTime) {
    const todayDate = new Date().toISOString().split("T")[0];
    defaultTimeHabits.push({
      id: "winddown-time",
      name: "Wind Down",
      category: "Mindfulness",
      color: "#9370DB",
      dateTime: convertLocalTimeToUTC(todayDate, windTime),
      completedDates: defaultCompleted.includes("winddown-time")
        ? [todayDateString]
        : [],
      createdAt: new Date().toISOString(),
    });
  }

  const allHabits = [...defaultTimeHabits, ...habits];
  const totalHabits = allHabits.length;
  const completedCount = allHabits.filter((habit) =>
    habit.completedDates.includes(todayDateString)
  ).length;

  console.log("🧪 allHabits before syncing to chrome.storage:", allHabits);

  useEffect(() => {
    const syncHabitsToBackground = () => {
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(
          {
            type: "SAVE_HABITS",
            payload: allHabits,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Failed to sync habits:",
                chrome.runtime.lastError.message
              );
            } else {
              console.log("✅ Synced habits to background:", response);
            }
          }
        );
      } else {
        console.warn("⚠️ chrome.runtime is not available");
      }
    };

    syncHabitsToBackground();
  }, [allHabits]);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem("onboarding-completed");
    const storedName = localStorage.getItem("user-name");
    if (hasCompletedOnboarding) {
      setShowOnboarding(false);
      setIsCalendarConnected(true);
    }
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  const handleTabChange = (tab: string) => setActiveTab(tab);
  const generateId = () =>
    Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const addHabit = useCallback(
    (habitData: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      const newHabit: Habit = {
        ...habitData,
        id: generateId(),
        completedDates: [],
        createdAt: new Date().toISOString(),
      };
      setHabits((prev) => [...prev, newHabit]);
    },
    [setHabits]
  );

  const updateHabit = useCallback(
    (habitData: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      if (!editingHabit) return;
      setHabits((prev) =>
        prev.map((habit) =>
          habit.id === editingHabit.id ? { ...habit, ...habitData } : habit
        )
      );
      setEditingHabit(null);
    },
    [editingHabit, setHabits]
  );

  const deleteHabit = useCallback(
    (habitId: string) => {
      setHabits((prev) => prev.filter((habit) => habit.id !== habitId));
    },
    [setHabits]
  );

  const toggleHabitComplete = useCallback(
    (habitId: string) => {
      const today = new Date().toDateString();

      if (habitId === "wake-time" || habitId === "winddown-time") {
        const isAlreadyDone = defaultCompleted.includes(habitId);
        const updated = isAlreadyDone
          ? defaultCompleted.filter((id) => id !== habitId)
          : [...defaultCompleted, habitId];
        setDefaultCompleted(updated);
        return;
      }

      setHabits((prev) =>
        prev.map((habit) => {
          if (habit.id !== habitId) return habit;
          const isCompleted = habit.completedDates.includes(today);
          const updatedDates = isCompleted
            ? habit.completedDates.filter((date) => date !== today)
            : [...habit.completedDates, today];
          return { ...habit, completedDates: updatedDates };
        })
      );
    },
    [setHabits, defaultCompleted, setDefaultCompleted]
  );

  const handleEditHabit = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    (habitData: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      if (editingHabit) {
        updateHabit(habitData);
      } else {
        addHabit(habitData);
      }
    },
    [editingHabit, updateHabit, addHabit]
  );

  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingHabit(null);
  }, []);

  const handleAddHabit = () => {
    setEditingHabit(null);
    setIsFormOpen(true);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem("onboarding-completed", "true");
    setShowOnboarding(false);
    setIsCalendarConnected(true);
    const storedName = localStorage.getItem("user-name");
    if (storedName) setUserName(storedName);
  };

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full bg-white min-h-screen flex flex-col">
        <Header
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onAddHabit={handleAddHabit}
          onSelectDate={(date: string | null) => setSelectedDate(date)}
          isCalendarConnected={isCalendarConnected}
          completedCount={completedCount}
          totalHabits={totalHabits}
          userName={userName}
          selectedDate={selectedDate}
        />

        <HabitList
          habits={allHabits}
          onToggleComplete={toggleHabitComplete}
          onEdit={handleEditHabit}
          onDelete={deleteHabit}
        />

        <HabitForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          initialDate={selectedDate}
          editingHabit={editingHabit}
        />
      </div>
    </div>
  );
}

export default HabitApp;
