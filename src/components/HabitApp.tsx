import { useState, useCallback, useEffect } from "react";
import { Habit } from "../types/habit";
import { useLocalStorage } from "../hooks/useLocalStorage";
import Header from "./header";
import HabitList from "./HabitList";
import HabitForm from "./HabitForm";
import OnboardingFlow from "./OnboardingFlow";
import { 
  getAuthToken, 
  getCalendarEvents, 
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  isGoogleCalendarEvent,
} from "../lib/googleAuth";

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
  const [isLoading, setIsLoading] = useState(false);

  const todayDateString = new Date().toDateString();
  const wakeTimeISO = localStorage.getItem("wake-time");
  const windDownTimeISO = localStorage.getItem("winddown-time");

  const wakeTime = wakeTimeISO ? new Date(wakeTimeISO) : null;
  const windTime = windDownTimeISO ? new Date(windDownTimeISO) : null;

  const defaultTimeHabits: Habit[] = [];
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // FIXED: Replace useLocalStorage with regular useState for calendarEvents
  const [calendarEvents, setCalendarEvents] = useState<Habit[]>([]);

  // FIXED: Load calendar events from storage on mount
  useEffect(() => {
    const loadCalendarEvents = () => {
      try {
        const stored = localStorage.getItem("calendar-events");
        if (stored) {
          const parsed = JSON.parse(stored);
          setCalendarEvents(parsed);
        }
      } catch (error) {
        console.error("Failed to load calendar events:", error);
      }
    };
    
    loadCalendarEvents();
  }, []);

  // FIXED: Save calendar events to storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("calendar-events", JSON.stringify(calendarEvents));
    } catch (error) {
      console.error("Failed to save calendar events:", error);
    }
  }, [calendarEvents]);

  // Fetch Google Calendar events
  useEffect(() => {
    const fetchGoogleEvents = async () => {
      if (!accessToken) return;
      try {
        const events = await getCalendarEvents(accessToken);

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
              title: event.summary || "Untitled Event", // Add title field
              description: event.description || "",
              category: "Calendar",
              color: "#3b82f6",
              dateTime: new Date(dateTime).toISOString(),
              completedDates: [],
              createdAt: new Date().toISOString(),
              type: "event",
              remindBeforeMinutes: 0, // You can parse this from event.reminders if needed
            };
          });

        setCalendarEvents(parsedEvents);
      } catch (err) {
        console.error("Failed to sync Google events:", err);
      }
    };

    fetchGoogleEvents();
  }, [accessToken]);

  // Load saved token
  useEffect(() => {
    const savedToken = localStorage.getItem("google_access_token");
    if (savedToken) {
      setAccessToken(savedToken);
      setIsCalendarConnected(true);
    }
  }, []);

  const handleCalendarConnect = async () => {
    try {
      setIsLoading(true);
      const token = await getAuthToken();
      console.log("🔐 Token received:", token);
      setAccessToken(token);
      setIsCalendarConnected(true);
      localStorage.setItem("google_access_token", token);
    } catch (err) {
      console.error("❌ Calendar connection failed:", err);
      alert("Failed to connect to Google Calendar. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarDisconnect = () => {
    setIsCalendarConnected(false);
    setAccessToken(null);
    localStorage.removeItem("google_access_token");
    setCalendarEvents([]);
    // Also clear from localStorage
    localStorage.removeItem("calendar-events");
  };

  // Create default time habits
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

  // FIXED: Calculate completedCount with proper date string format
  const totalHabits = habitsForSelectedDate.length;
  const completedCount = habitsForSelectedDate.filter((h) => {
    // For default time habits, check if their ID is in defaultCompleted
    if (h.id === "wake-time" || h.id === "winddown-time") {
      return defaultCompleted.includes(h.id);
    }
    // For regular habits and calendar events, check completedDates
    return h.completedDates.includes(selectedDateString);
  }).length;

  // Sync habits to background
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
  }, [habits, defaultCompleted, wakeTime, windTime, calendarEvents]);

  // Load onboarding state
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

  // Enhanced addHabit with Google Calendar integration
  const addHabit = useCallback(
    async (data: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      setIsLoading(true);
      try {
        const newHabit: Habit = {
          ...data,
          id: generateId(),
          completedDates: [],
          createdAt: new Date().toISOString(),
        };

        // Always sync to Google Calendar if connected and it's not a default time habit
        if (accessToken && isCalendarConnected) {
          try {
            const calendarEvent = await createCalendarEvent(accessToken, {
              name: data.name,
              description: data.description || "",
              dateTime: data.dateTime,
              remindBeforeMinutes: data.remindBeforeMinutes || 0
            });
            
            // Update the habit with Google Calendar event ID and add to calendar events
            newHabit.id = `gcal-${calendarEvent.id}`;
            newHabit.type = "event";
            
            setCalendarEvents(prev => [...prev, newHabit]);
            console.log("✅ Event created in Google Calendar:", calendarEvent.id);
          } catch (calendarError) {
            console.error("❌ Failed to create in Google Calendar:", calendarError);
            // Still add as local habit if calendar sync fails
            setHabits((prev) => [...prev, newHabit]);
            alert("Habit created locally but failed to sync with Google Calendar. You can try again later.");
          }
        } else {
          // Add as regular habit if calendar not connected or it's a default time habit
          setHabits((prev) => [...prev, newHabit]);
        }
      } catch (error) {
        console.error("❌ Failed to add habit:", error);
        alert("Failed to create habit. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [setHabits, accessToken, isCalendarConnected, setCalendarEvents]
  );

  // Enhanced updateHabit with Google Calendar integration
  const updateHabit = useCallback(
    async (data: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      if (!editingItem) return;
      
      setIsLoading(true);
      try {
        // If it's a Google Calendar event, update in Google Calendar
        if (isGoogleCalendarEvent(editingItem.id) && accessToken) {
          await updateCalendarEvent(accessToken, editingItem.id, {
            name: data.name,
            description: data.description || "",
            dateTime: data.dateTime,
            remindBeforeMinutes: data.remindBeforeMinutes || 0
          });
          
          // Update calendar events
          setCalendarEvents(prev =>
            prev.map(event => 
              event.id === editingItem.id 
                ? { ...event, ...data }
                : event
            )
          );
          console.log("✅ Event updated in Google Calendar");
        } else {
          // Update regular habits
          setHabits((prev) =>
            prev.map((h) => (h.id === editingItem.id ? { ...h, ...data } : h))
          );
        }
        
        setEditingHabit(null);
      } catch (error) {
        console.error("❌ Failed to update habit:", error);
        alert("Failed to update event in Google Calendar. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [editingItem, setHabits, accessToken, setCalendarEvents]
  );

  // Enhanced deleteHabit with Google Calendar integration
  const deleteHabit = useCallback(
    async (habitId: string) => {
      setIsLoading(true);
      try {
        if (habitId === "wake-time") {
          localStorage.removeItem("wake-time");
          setDefaultCompleted((prev) => prev.filter((id) => id !== "wake-time"));
        } else if (habitId === "winddown-time") {
          localStorage.removeItem("winddown-time");
          setDefaultCompleted((prev) =>
            prev.filter((id) => id !== "winddown-time")
          );
        } else if (isGoogleCalendarEvent(habitId) && accessToken) {
          // Delete from Google Calendar
          await deleteCalendarEvent(accessToken, habitId);
          
          // Remove from calendar events
          setCalendarEvents(prev => prev.filter(event => event.id !== habitId));
          console.log("✅ Event deleted from Google Calendar");
        } else {
          // Delete regular habit
          setHabits((prev) => prev.filter((habit) => habit.id !== habitId));
        }
      } catch (error) {
        console.error("❌ Failed to delete habit:", error);
        alert("Failed to delete event from Google Calendar. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [setHabits, setDefaultCompleted, accessToken, setCalendarEvents]
  );

  // FIXED: Enhanced toggleHabitComplete with Chrome extension compatibility
  const toggleHabitComplete = useCallback(
    (id: string) => {
      console.log("🔄 Toggle called for:", id);
      
      const targetDateString = selectedDate 
        ? new Date(selectedDate).toDateString() 
        : new Date().toDateString();
      
      console.log("📅 Target date:", targetDateString);

      if (id === "wake-time" || id === "winddown-time") {
        // For default time habits, we use a different completion tracking
        // Only track completion for today
        if (targetDateString === new Date().toDateString()) {
          const updated = defaultCompleted.includes(id)
            ? defaultCompleted.filter((i) => i !== id)
            : [...defaultCompleted, id];
          setDefaultCompleted(updated);
        }
        return;
      }

      // Handle Google Calendar events with Chrome extension compatibility
      if (isGoogleCalendarEvent(id)) {
        console.log("📊 Before update - Calendar events count:", calendarEvents.length);
        
        setCalendarEvents(prevEvents => {
          console.log("📊 Previous events:", prevEvents.length);
          
          const targetEvent = prevEvents.find(e => e.id === id);
          console.log("🎯 Target event found:", !!targetEvent);
          console.log("📋 Current completed dates:", targetEvent?.completedDates || []);
          
          const updatedEvents = prevEvents.map(event => {
            if (event.id !== id) return event;
            
            const currentCompleted = [...event.completedDates];
            const isDone = currentCompleted.includes(targetDateString);
            console.log("✅ Was completed:", isDone);
            
            let newCompletedDates;
            if (isDone) {
              newCompletedDates = currentCompleted.filter(d => d !== targetDateString);
            } else {
              newCompletedDates = [...currentCompleted, targetDateString];
            }
            
            console.log("📋 New completed dates:", newCompletedDates);
            
            return {
              ...event,
              completedDates: newCompletedDates
            };
          });
          
          console.log("📊 Updated events count:", updatedEvents.length);
          
          // Immediate storage save for Chrome extension
          setTimeout(() => {
            try {
              localStorage.setItem("calendar-events", JSON.stringify(updatedEvents));
              console.log("💾 Calendar events saved to localStorage");
            } catch (error) {
              console.error("❌ Failed to save calendar events:", error);
            }
          }, 0);
          
          return updatedEvents;
        });
        return;
      }

      // Handle regular habits
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const isDone = h.completedDates.includes(targetDateString);
          return {
            ...h,
            completedDates: isDone
              ? h.completedDates.filter((d) => d !== targetDateString)
              : [...h.completedDates, targetDateString],
          };
        })
      );
    },
    [defaultCompleted, setDefaultCompleted, setHabits, setCalendarEvents, selectedDate, calendarEvents]
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
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
              <span className="text-gray-600">Syncing with Google Calendar...</span>
            </div>
          </div>
        </div>
      )}
      
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
          selectedDate={selectedDate}
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