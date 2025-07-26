import { useState, useCallback, useEffect } from "react";
import { Habit } from "../types/habit";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Header from "./Header";
import HabitList from "./HabitList";
import HabitForm from "./HabitForm";
import OnboardingFlow from "./OnboardingFlow";

function HabitApp() {
  const [habits, setHabits] = useLocalStorage<Habit[]>("habits", []);
  const [activeTab, setActiveTab] = useState("habits");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const totalHabits = habits.length;

  const completedCount = habits.filter((habit) =>
    habit.completedDates.includes(new Date().toDateString())
  ).length;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

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
    [setHabits]
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
    if (storedName) {
      setUserName(storedName);
    }
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
          habits={habits}
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
