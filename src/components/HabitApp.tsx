import { useState, useCallback, useEffect } from "react";
import { Habit } from "../types/habit";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Header from "./header";
import HabitList from "./HabitList";
import HabitForm from "./HabitForm";
import OnboardingFlow from "./OnboardingFlow";
import { getAuthToken, getCalendarEvents } from "../lib/googleAuth";

function HabitApp() {
  const [habits, setHabits] = useLocalStorage<Habit[]>("habits", []);
  const [defaultCompleted, setDefaultCompleted] = useLocalStorage<string[]>(
    "default-completed",
    []
  );
  const [activeTab, setActiveTab] = useState("habits");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingHabit] = useState<Habit | null>(null);
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<Habit[]>([]);

  useEffect(() => {
    const fetchGoogleEvents = async () => {
      if (!accessToken) return;
      try {
        const events = await getCalendarEvents(accessToken);

        // 🟨 Add these logs here
        console.log("All events:", events);
        console.log(
          "Filtered events (missing 'start'):",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          events.filter((e: any) => !e.start)
        );

        const parsedEvents = events
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((event: any) => event.start)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((event: any) => {
            const dateTime = event.start.dateTime || event.start.date;
            return {
              id: `gcal-${event.id}`,
              name: event.summary || "Untitled Event",
              category: "Calendar",
              color: "#3b82f6",
              dateTime: new Date(dateTime).toISOString(),
              completedDates: [],
              createdAt: new Date().toISOString(),
              type: "event",
            };
          });

        setCalendarEvents(parsedEvents);
      } catch (err) {
        console.error("Failed to sync Google events:", err);
      }
    };

    fetchGoogleEvents();
  }, [accessToken]);

  useEffect(() => {
  const savedToken = localStorage.getItem("google_access_token");
  if (savedToken) {
    setAccessToken(savedToken);
    setIsCalendarConnected(true);
  }
}, []);


  const handleCalendarConnect = async () => {
  try {
    const token = await getAuthToken();
    console.log("🔐 Token received:", token);
    setAccessToken(token);
    setIsCalendarConnected(true);
    localStorage.setItem("google_access_token", token);
  } catch (err) {
    console.error("❌ Calendar connection failed:", err);
  }
};


  const handleCalendarDisconnect = () => {
  setIsCalendarConnected(false);
  setAccessToken(null);
  localStorage.removeItem("google_access_token");
  setCalendarEvents([]); // 🧹 Clear calendar events on disconnect
};


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

  const allHabits = [...defaultTimeHabits, ...habits, ...calendarEvents];
  const selectedDateString = selectedDate
  ? new Date(selectedDate).toDateString()
  : todayDateString;

const habitsForSelectedDate = allHabits.filter((habit) => {
  const habitDate = new Date(habit.dateTime).toDateString();
  return habitDate === selectedDateString;
});

  const totalHabits = habitsForSelectedDate.length;
const completedCount = habitsForSelectedDate.filter((h) =>
  h.completedDates.includes(selectedDateString)
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
      if (!editingItem) return;
      setHabits((prev) =>
        prev.map((h) => (h.id === editingItem.id ? { ...h, ...data } : h))
      );
      setEditingHabit(null);
    },
    [editingItem, setHabits]
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
      editingItem ? updateHabit(data) : addHabit(data);
    },
    [editingItem, updateHabit, addHabit]
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
          onCalendarConnect={handleCalendarConnect}
          onCalendarDisconnect={handleCalendarDisconnect}
          completedCount={completedCount}
          totalHabits={totalHabits}
          userName={userName}
          selectedDate={selectedDate}
        />
        <HabitList
          habits={habitsForSelectedDate}
          onToggleComplete={toggleHabitComplete}
          onEdit={handleEditHabit}
          onDelete={deleteHabit}
        />
        <HabitForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          initialDate={selectedDate}
          editingItem={editingItem}
        />
      </div>
    </div>
  );
}

export default HabitApp;
