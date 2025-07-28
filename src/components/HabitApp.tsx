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
  const wakeTime = localStorage.getItem("wake-time");
  const windTime = localStorage.getItem("winddown-time");

  const convertLocalTimeToUTC = (
    dateString: string,
    timeString: string
  ): string => {
    const localDateTime = new Date(`${dateString}T${timeString}:00`);
    return localDateTime.toISOString();
  };

  // Create default time habits
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

  // 🔄 Function to sync habits to extension
  const syncHabitsToExtension = useCallback((habitsToSync: Habit[]) => {
    console.log("🔄 syncHabitsToExtension called:");
    console.log("  - habitsToSync.length:", habitsToSync.length);
    console.log("  - habitsToSync:", habitsToSync);

    const message = {
      type: "FROM_WEBPAGE_SAVE_HABITS",
      payload: habitsToSync,
    };

    console.log("📤 About to post message to contentScript:");
    console.log("  - Message type:", message.type);
    console.log("  - Payload length:", message.payload.length);
    console.log("  - Full message:", message);

    try {
      window.postMessage(message, "*");
      console.log("📤 Message posted successfully");
    } catch (error) {
      console.error("❌ Error posting message:", error);
    }
  }, []);

  // 🔄 Sync habits to extension whenever allHabits changes
  useEffect(() => {
    console.log("🔄 Sync effect triggered:");
    console.log("  - allHabits.length:", allHabits.length);
    console.log("  - habits.length:", habits.length);
    console.log("  - defaultTimeHabits.length:", defaultTimeHabits.length);

    // Add a small delay to ensure state is settled
    const timeoutId = setTimeout(() => {
      console.log("⏰ Timeout triggered, calling syncHabitsToExtension");
      syncHabitsToExtension(allHabits);
    }, 100);
    
    return () => {
      console.log("🧹 Cleanup: clearing timeout");
      clearTimeout(timeoutId);
    };
  }, [allHabits, syncHabitsToExtension]); // Use allHabits as dependency

  // Also sync when specific localStorage items change
  useEffect(() => {
    console.log("🔄 LocalStorage change detected, syncing habits");
    syncHabitsToExtension(allHabits);
  }, [wakeTime, windTime, defaultCompleted, syncHabitsToExtension, allHabits]);

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
      
      console.log("➕ Adding new habit:", newHabit);
      setHabits((prev) => {
        const updated = [...prev, newHabit];
        console.log("📝 Updated habits state:", updated);
        
        // Immediately sync after adding
        setTimeout(() => {
          const newAllHabits = [...defaultTimeHabits, ...updated];
          console.log("🚀 Immediate sync after adding habit:", newAllHabits);
          syncHabitsToExtension(newAllHabits);
        }, 50);
        
        return updated;
      });
    },
    [setHabits, defaultTimeHabits, syncHabitsToExtension]
  );

  const updateHabit = useCallback(
    (habitData: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      if (!editingHabit) return;
      
      console.log("✏️ Updating habit:", editingHabit.id, habitData);
      setHabits((prev) => {
        const updated = prev.map((habit) =>
          habit.id === editingHabit.id ? { ...habit, ...habitData } : habit
        );
        
        // Immediately sync after updating
        setTimeout(() => {
          const newAllHabits = [...defaultTimeHabits, ...updated];
          console.log("🚀 Immediate sync after updating habit:", newAllHabits);
          syncHabitsToExtension(newAllHabits);
        }, 50);
        
        return updated;
      });
      setEditingHabit(null);
    },
    [editingHabit, setHabits, defaultTimeHabits, syncHabitsToExtension]
  );

  const deleteHabit = useCallback(
    (habitId: string) => {
      console.log("🗑️ Deleting habit:", habitId);
      setHabits((prev) => {
        const updated = prev.filter((habit) => habit.id !== habitId);
        
        // Immediately sync after deleting
        setTimeout(() => {
          const newAllHabits = [...defaultTimeHabits, ...updated];
          console.log("🚀 Immediate sync after deleting habit:", newAllHabits);
          syncHabitsToExtension(newAllHabits);
        }, 50);
        
        return updated;
      });
    },
    [setHabits, defaultTimeHabits, syncHabitsToExtension]
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
      console.log("📋 Form submitted with data:", habitData);
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