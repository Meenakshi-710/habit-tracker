import { useState, useCallback, useEffect } from "react";
import { Habit } from "../types/habit";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Header from "./Header";
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
  const wakeTimeISO = localStorage.getItem("wake-time");
  const windDownTimeISO = localStorage.getItem("winddown-time");

  const wakeTime = wakeTimeISO ? new Date(wakeTimeISO) : null;
  const windTime = windDownTimeISO ? new Date(windDownTimeISO) : null;

  const defaultTimeHabits: Habit[] = [];

  if (wakeTime) {
    const todayDate = new Date().toDateString();
    defaultTimeHabits.push({
      id: "wake-time",
      name: "Wake Up",
      category: "Health & Fitness",
      color: "#FFA500",
      dateTime: wakeTime.toISOString(),
      completedDates: defaultCompleted.includes("wake-time") ? [todayDate] : [],
      createdAt: new Date().toISOString(),
    });
  }

  if (windTime) {
    const todayDate = new Date().toDateString();
    defaultTimeHabits.push({
      id: "winddown-time",
      name: "Wind Down",
      category: "Mindfulness",
      color: "#9370DB",
      dateTime: windTime.toISOString(),
      completedDates: defaultCompleted.includes("winddown-time")
        ? [todayDate]
        : [],
      createdAt: new Date().toISOString(),
    });
  }

  const allHabits = [...defaultTimeHabits, ...habits];
  const totalHabits = allHabits.length;
  const completedCount = allHabits.filter((h) =>
    h.completedDates.includes(todayDateString)
  ).length;

  // ✅ Send habits to background on change
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(
        {
          type: "SAVE_HABITS",
          payload: allHabits,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn("⚠️ Sync error:", chrome.runtime.lastError.message);
          } else {
            console.log("✅ Habits synced:", response);
          }
        }
      );
    }
  }, [habits, defaultCompleted, wakeTime, windTime]);

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
    (data: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      const newHabit: Habit = {
        ...data,
        id: generateId(),
        completedDates: [],
        createdAt: new Date().toISOString(),
      };
      setHabits((prev) => [...prev, newHabit]);
    },
    [setHabits]
  );

  const updateHabit = useCallback(
    (data: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      if (!editingHabit) return;
      setHabits((prev) =>
        prev.map((h) => (h.id === editingHabit.id ? { ...h, ...data } : h))
      );
      setEditingHabit(null);
    },
    [editingHabit, setHabits]
  );

  const deleteHabit = useCallback(
    (habitId: string) => {
      if (habitId === "wake-time") {
        localStorage.removeItem("wake-time");
        setDefaultCompleted((prev) => prev.filter((id) => id !== "wake-time"));
      } else if (habitId === "winddown-time") {
        localStorage.removeItem("winddown-time");
        setDefaultCompleted((prev) =>
          prev.filter((id) => id !== "winddown-time")
        );
      } else {
        setHabits((prev) => prev.filter((habit) => habit.id !== habitId));
      }
    },
    [setHabits, setDefaultCompleted]
  );

  const toggleHabitComplete = useCallback(
    (id: string) => {
      const today = new Date().toDateString();
      if (id === "wake-time" || id === "winddown-time") {
        const updated = defaultCompleted.includes(id)
          ? defaultCompleted.filter((i) => i !== id)
          : [...defaultCompleted, id];
        setDefaultCompleted(updated);
        return;
      }

      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const isDone = h.completedDates.includes(today);
          return {
            ...h,
            completedDates: isDone
              ? h.completedDates.filter((d) => d !== today)
              : [...h.completedDates, today],
          };
        })
      );
    },
    [defaultCompleted, setDefaultCompleted, setHabits]
  );

  const handleEditHabit = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    (data: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      editingHabit ? updateHabit(data) : addHabit(data);
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
      <div className="w-full flex flex-col">
        <Header
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onAddHabit={handleAddHabit}
          onSelectDate={setSelectedDate}
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



