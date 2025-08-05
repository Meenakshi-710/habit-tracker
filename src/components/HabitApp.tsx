/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useMemo } from "react";

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
  const [calendarEvents, setCalendarEvents] = useState<Habit[]>([]);

  // ADD: Chrome message listener for pin bar integration
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChromeMessages = (
      message: any,
      _sender: any,
      sendResponse: any
    ) => {
      console.log("📨 HabitApp received message:", message);

      switch (message.type) {
        case "OPEN_ADD_FORM":
          console.log("➕ Opening add form from pin bar message");
          setEditingHabit(null);
          setIsFormOpen(true);
          sendResponse({ success: true });
          break;

        case "OPEN_DASHBOARD":
          console.log("🏠 Dashboard already open");
          sendResponse({ success: true });
          break;

        case "CALENDAR_STATUS_CHANGED":
          console.log("📅 Calendar status changed:", message.payload);
          if (message.payload?.connected !== undefined) {
            setIsCalendarConnected(message.payload.connected);
          }
          sendResponse({ success: true });
          break;

        default:
          console.log("❓ Unknown message type in HabitApp:", message.type);
          sendResponse({ success: false, error: "Unknown message type" });
      }
    };

    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.onMessage.addListener(handleChromeMessages);

      return () => {
        chrome.runtime.onMessage.removeListener(handleChromeMessages);
      };
    }
  }, []);

  // Handle URL hash for opening forms or connecting calendar
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log("🔗 URL hash changed:", hash);

      if (hash === "#add-habit") {
        console.log("➕ Opening add habit form from URL hash");
        setEditingHabit(null);
        setIsFormOpen(true);
        // Clear the hash
        window.history.replaceState(null, "", window.location.pathname);
      } else if (hash === "#calendar-connect") {
        console.log("📅 Triggering calendar connection from URL hash");
        handleCalendarConnect();
        // Clear the hash
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const createDailyRecurringHabit = (
    baseHabit: Omit<Habit, "id" | "completedDates" | "createdAt">,
    startDate: Date
  ): Habit => {
    const baseId =
      Date.now().toString() + Math.random().toString(36).substr(2, 9);

    // Set the time from the original habit but use the start date
    const originalDateTime = new Date(baseHabit.dateTime);
    const habitDateTime = new Date(startDate);
    habitDateTime.setHours(originalDateTime.getHours());
    habitDateTime.setMinutes(originalDateTime.getMinutes());
    habitDateTime.setSeconds(0);
    habitDateTime.setMilliseconds(0);

    const habit: Habit = {
      ...baseHabit,
      id: baseId,
      dateTime: habitDateTime.toISOString(),
      completedDates: [],
      createdAt: new Date().toISOString(),
      type: baseHabit.type || "habit",
      isRecurring: true,
      recurringType: "daily",
    };

    return habit;
  };

  // Load calendar events from storage on mount
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

  // Save calendar events to storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("calendar-events", JSON.stringify(calendarEvents));
    } catch (error) {
      console.error("Failed to save calendar events:", error);
    }
  }, [calendarEvents]);

  // Fetch Google Calendar events - FIXED to avoid duplicates
  useEffect(() => {
    const fetchGoogleEvents = async () => {
      if (!accessToken) return;

      try {
        setIsLoading(true);
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

            // Check if this is one of our created habits/tasks/events by looking at the title
            let type = "event"; // Default type
            let cleanName = event.summary || "Untitled Event";
            let isRecurring = false;
            let recurringType: "daily" | "weekly" | "monthly" | undefined =
              undefined;

            if (event.summary?.startsWith("🎯 ")) {
              type = "habit";
              isRecurring = true;
              recurringType = "daily";
              cleanName = event.summary.substring(2).trim(); // Remove emoji and space
            } else if (event.summary?.startsWith("✅ ")) {
              type = "task";
              cleanName = event.summary.substring(2).trim(); // Remove emoji and space
            }

            return {
              id: `gcal-${event.id}`,
              name: cleanName,
              title: cleanName,
              description: event.description || "",
              category:
                type === "habit"
                  ? "Health & Fitness"
                  : type === "task"
                  ? "Productivity"
                  : "Calendar",
              color:
                type === "habit"
                  ? "#10b981"
                  : type === "task"
                  ? "#f59e0b"
                  : "#3b82f6",
              dateTime: new Date(dateTime).toISOString(),
              completedDates: [],
              createdAt: new Date().toISOString(),
              type: type as "habit" | "task" | "event",
              remindBeforeMinutes: 0,
              isRecurring,
              recurringType,
            };
          });

        // REPLACE (don't append) calendar events to avoid duplicates
        setCalendarEvents(parsedEvents);
        console.log(
          `✅ Loaded ${parsedEvents.length} events from Google Calendar`
        );
      } catch (err) {
        console.error("Failed to sync Google events:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken && isCalendarConnected) {
      fetchGoogleEvents();
    }
  }, [accessToken, isCalendarConnected]); // Only depend on accessToken and connection status

  // Load saved token and check connection status
  useEffect(() => {
    const checkInitialCalendarStatus = () => {
      const savedToken = localStorage.getItem("google_access_token");
      if (savedToken) {
        console.log("🔐 Found saved Google Calendar token");
        setAccessToken(savedToken);
        setIsCalendarConnected(true);
      } else {
        console.log("📅 No Google Calendar token found");
        setIsCalendarConnected(false);
      }
    };

    checkInitialCalendarStatus();
  }, []);

  const handleCalendarConnect = async () => {
    try {
      setIsLoading(true);
      console.log("🔐 Starting Google Calendar connection...");

      const token = await getAuthToken();
      console.log("🔐 Token received:", token ? "✅" : "❌");

      if (token) {
        setAccessToken(token);
        setIsCalendarConnected(true);
        localStorage.setItem("google_access_token", token);

        // Notify background script and pin bar of status change
        if (typeof chrome !== "undefined" && chrome.runtime) {
          chrome.runtime
            .sendMessage({
              type: "CALENDAR_STATUS_CHANGED",
              payload: { connected: true },
            })
            .catch(console.warn);
        }

        console.log("✅ Google Calendar connected successfully");
      }
    } catch (err) {
      console.error("❌ Calendar connection failed:", err);
      alert("Failed to connect to Google Calendar. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarDisconnect = () => {
    console.log("🔌 Disconnecting from Google Calendar...");

    setIsCalendarConnected(false);
    setAccessToken(null);
    localStorage.removeItem("google_access_token");
    setCalendarEvents([]);
    localStorage.removeItem("calendar-events");

    // Notify background script and pin bar of status change
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime
        .sendMessage({
          type: "CALENDAR_STATUS_CHANGED",
          payload: { connected: false },
        })
        .catch(console.warn);
    }

    console.log("✅ Google Calendar disconnected");
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
      isRecurring: true,
      recurringType: "daily",
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
      isRecurring: true,
      recurringType: "daily",
    });
  }

  // Fixed allHabits combination - no duplicates
  const allHabits = useMemo(() => {
    // Combine all habits but avoid duplicates
    const combined = [...defaultTimeHabits, ...habits, ...calendarEvents];

    // Remove duplicates based on ID
    const uniqueHabits = combined.filter(
      (habit, index, self) => index === self.findIndex((h) => h.id === habit.id)
    );

    console.log(
      `📊 Total unique habits: ${uniqueHabits.length} (${defaultTimeHabits.length} default + ${habits.length} local + ${calendarEvents.length} calendar)`
    );

    return uniqueHabits;
  }, [defaultTimeHabits, habits, calendarEvents]);

  const selectedDateString = selectedDate
    ? new Date(selectedDate).toDateString()
    : todayDateString;

  const habitsForSelectedDate = allHabits.filter((habit) => {
    const habitDate = new Date(habit.dateTime).toDateString();
    const selectedDateString = selectedDate
      ? new Date(selectedDate).toDateString()
      : todayDateString;

    // For recurring daily habits, show on every day from the start date onwards
    if (habit.isRecurring && habit.recurringType === "daily") {
      const startDate = new Date(habit.dateTime);
      const checkDate = new Date(selectedDateString);

      // Reset times to compare dates only
      startDate.setHours(0, 0, 0, 0);
      checkDate.setHours(0, 0, 0, 0);

      // Only show if the selected date is on or after the habit start date
      return checkDate >= startDate;
    }

    // For non-recurring habits, tasks, and events, match exact date
    return habitDate === selectedDateString;
  });

  // Calculate completedCount with proper date string format
  const totalHabits = habitsForSelectedDate.length;
  const completedCount = habitsForSelectedDate.filter((h) => {
    if (h.id === "wake-time" || h.id === "winddown-time") {
      return defaultCompleted.includes(h.id);
    }
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
    }
    if (storedName) {
      setUserName(storedName);
    }
  }, []);

  const handleTabChange = (tab: string) => setActiveTab(tab);

  const addHabit = useCallback(
    async (data: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      setIsLoading(true);
      try {
        console.log("➕ Adding new item:", data);

        // Check if the time has passed and log the adjustment
        const now = new Date();
        const selectedDateTime = new Date(data.dateTime);
        const selectedDate = selectedDateTime.toDateString();
        const today = now.toDateString();

        let wasAutoAdjusted = false;
        if (selectedDate === today && selectedDateTime <= now) {
          wasAutoAdjusted = true;
          console.log(
            "⏰ Auto-scheduling detected: Time has passed, will be scheduled for next day"
          );
        }

        const startDate = new Date(data.dateTime);
        startDate.setHours(0, 0, 0, 0); // Reset to start of day for consistent date calculation

        // Create daily recurring habit for habits, single entry for tasks/events
        if (data.type === "habit") {
          const recurringHabit = createDailyRecurringHabit(data, startDate);

          // SYNC TO GOOGLE CALENDAR if connected
          if (accessToken && isCalendarConnected) {
            try {
              // The createCalendarEvent function will automatically handle next-day scheduling
              const calendarEvent = await createCalendarEvent(accessToken, {
                name: recurringHabit.name,
                description:
                  recurringHabit.description ||
                  `Daily habit: ${recurringHabit.name}`,
                dateTime: recurringHabit.dateTime, // This will be auto-adjusted in the Google Calendar function
                remindBeforeMinutes: recurringHabit.remindBeforeMinutes || 0,
                type: "habit",
                isRecurring: true,
                recurringType: "daily",
              });

              // Return the habit with Google Calendar ID and our custom properties
              const syncedHabit = {
                ...recurringHabit,
                id: `gcal-${calendarEvent.id}`,
              };

              // Add ONLY to calendarEvents (not to habits) to avoid duplicates
              setCalendarEvents((prev) => [...prev, syncedHabit]);

              const adjustmentMsg = wasAutoAdjusted
                ? " (automatically moved to next day)"
                : "";
              console.log(
                `✅ Created and synced daily recurring habit to Google Calendar${adjustmentMsg}`
              );
            } catch (calendarError) {
              console.error(
                "❌ Failed to sync to Google Calendar:",
                calendarError
              );
              // If calendar sync fails, add to local habits instead
              setHabits((prev) => [...prev, recurringHabit]);
              alert(
                "Habit created locally but failed to sync with Google Calendar. You can try again later."
              );
            }
          } else {
            // No calendar connection, add to local habits
            setHabits((prev) => [...prev, recurringHabit]);
          }

          console.log(`✅ Created daily recurring habit`);
        }
        // For tasks and events, create single entry (unchanged)
        else {
          const newItem: Habit = {
            ...data,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            completedDates: [],
            createdAt: new Date().toISOString(),
            type: data.type || "event",
          };

          // Sync to Google Calendar if connected (auto-scheduling will be handled there)
          if (accessToken && isCalendarConnected) {
            try {
              const calendarEvent = await createCalendarEvent(accessToken, {
                name: data.name,
                description: data.description || "",
                dateTime: data.dateTime, // This will be auto-adjusted in the Google Calendar function
                remindBeforeMinutes: data.remindBeforeMinutes || 0,
                type: data.type || "event",
              });

              newItem.id = `gcal-${calendarEvent.id}`;
              setCalendarEvents((prev) => [...prev, newItem]);

              const adjustmentMsg = wasAutoAdjusted
                ? " (automatically moved to next day)"
                : "";
              console.log(
                `✅ ${
                  data.type === "task" ? "Task" : "Event"
                } created in Google Calendar${adjustmentMsg}:`,
                calendarEvent.id
              );
            } catch (calendarError) {
              console.error(
                "❌ Failed to create in Google Calendar:",
                calendarError
              );
              setHabits((prev) => [...prev, newItem]);
              alert(
                `${
                  data.type === "task" ? "Task" : "Event"
                } created locally but failed to sync with Google Calendar. You can try again later.`
              );
            }
          } else {
            setHabits((prev) => [...prev, newItem]);
          }
        }

        // Close form after successful creation
        setIsFormOpen(false);
        setEditingHabit(null);

        // Show success message with adjustment info if applicable
        if (wasAutoAdjusted) {
          // You could show a toast notification here
          console.log(
            "✅ Item created and automatically scheduled for next day due to past time"
          );
        }
      } catch (error) {
        console.error("❌ Failed to add habit:", error);
        alert("Failed to create item. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      setHabits,
      accessToken,
      isCalendarConnected,
      setCalendarEvents,
      createDailyRecurringHabit,
    ]
  );

  // Enhanced updateHabit with Google Calendar integration and proper type handling
  const updateHabit = useCallback(
    async (data: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      if (!editingItem) return;

      setIsLoading(true);
      try {
        console.log("🔧 Updating item:", editingItem.id, data);

        if (isGoogleCalendarEvent(editingItem.id) && accessToken) {
          await updateCalendarEvent(accessToken, editingItem.id, {
            name: data.name,
            description: data.description || "",
            dateTime: data.dateTime,
            remindBeforeMinutes: data.remindBeforeMinutes || 0,
            type: data.type || editingItem.type || "event",
            isRecurring: editingItem.isRecurring,
            recurringType: editingItem.recurringType,
          });

          setCalendarEvents((prev) =>
            prev.map((event) =>
              event.id === editingItem.id ? { ...event, ...data } : event
            )
          );
          console.log(`✅ ${data.type || "Event"} updated in Google Calendar`);
        } else {
          setHabits((prev) =>
            prev.map((h) => (h.id === editingItem.id ? { ...h, ...data } : h))
          );
        }

        setEditingHabit(null);
        setIsFormOpen(false);
      } catch (error) {
        console.error("❌ Failed to update habit:", error);
        alert(
          `Failed to update ${
            data.type || "item"
          } in Google Calendar. Please try again.`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [editingItem, setHabits, accessToken, setCalendarEvents]
  );

  // Enhanced deleteHabit with Google Calendar integration - FIXED
  const deleteHabit = useCallback(
    async (habitId: string) => {
      setIsLoading(true);
      try {
        console.log("🗑️ Deleting item:", habitId);

        // Handle default time habits (unchanged)
        if (habitId === "wake-time") {
          localStorage.removeItem("wake-time");
          setDefaultCompleted((prev) =>
            prev.filter((id) => id !== "wake-time")
          );
        } else if (habitId === "winddown-time") {
          localStorage.removeItem("winddown-time");
          setDefaultCompleted((prev) =>
            prev.filter((id) => id !== "winddown-time")
          );
        }
        // Handle Google Calendar events
        else if (isGoogleCalendarEvent(habitId) && accessToken) {
          try {
            await deleteCalendarEvent(accessToken, habitId);
            setCalendarEvents((prev) =>
              prev.filter((event) => event.id !== habitId)
            );
            console.log("✅ Item deleted from Google Calendar");
          } catch (calendarError) {
            console.error(
              "❌ Failed to delete from Google Calendar:",
              calendarError
            );
            // Remove from local state even if Google Calendar delete fails
            setCalendarEvents((prev) =>
              prev.filter((event) => event.id !== habitId)
            );
            alert(
              "Failed to delete from Google Calendar, but removed locally. The item may still appear in your Google Calendar."
            );
          }
        }
        // Handle local habits
        else {
          setHabits((prev) => prev.filter((habit) => habit.id !== habitId));
        }
      } catch (error) {
        console.error("❌ Failed to delete habit:", error);
        alert("Failed to delete item. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [setHabits, setDefaultCompleted, accessToken, setCalendarEvents]
  );

  // Enhanced toggleHabitComplete with immediate persistence and better logging
  const toggleHabitComplete = useCallback(
    (id: string) => {
      console.log("🔄 Toggle called for:", id);

      const targetDateString = selectedDate
        ? new Date(selectedDate).toDateString()
        : new Date().toDateString();

      console.log("📅 Target date:", targetDateString);

      // Handle default time habits
      if (id === "wake-time" || id === "winddown-time") {
        if (targetDateString === new Date().toDateString()) {
          const updated = defaultCompleted.includes(id)
            ? defaultCompleted.filter((i) => i !== id)
            : [...defaultCompleted, id];
          setDefaultCompleted(updated);
        }
        return;
      }

      // Handle Google Calendar events (including synced habits and tasks)
      if (isGoogleCalendarEvent(id)) {
        console.log("🔄 Handling Google Calendar event completion");

        setCalendarEvents((prevEvents) => {
          const updatedEvents = prevEvents.map((event) => {
            if (event.id !== id) return event;

            const currentCompleted = [...event.completedDates];
            const isDone = currentCompleted.includes(targetDateString);

            const newCompletedDates = isDone
              ? currentCompleted.filter((d) => d !== targetDateString)
              : [...currentCompleted, targetDateString];

            console.log(`📋 Event: ${event.name}`);
            console.log(`📅 Previous completed dates:`, currentCompleted);
            console.log(`📅 New completed dates:`, newCompletedDates);
            console.log(
              `✅ Action: ${
                isDone ? "Uncompleting" : "Completing"
              } for ${targetDateString}`
            );

            return {
              ...event,
              completedDates: newCompletedDates,
            };
          });

          // Immediately save to localStorage (synchronously)
          try {
            localStorage.setItem(
              "calendar-events",
              JSON.stringify(updatedEvents)
            );
            console.log("💾 Calendar events immediately saved to localStorage");
          } catch (error) {
            console.error("❌ Failed to save calendar events:", error);
          }

          return updatedEvents;
        });
        return;
      }

      // Handle regular local habits
      console.log("🔄 Handling local habit completion");
      setHabits((prev) => {
        const updatedHabits = prev.map((h) => {
          if (h.id !== id) return h;

          const isDone = h.completedDates.includes(targetDateString);
          const newCompletedDates = isDone
            ? h.completedDates.filter((d) => d !== targetDateString)
            : [...h.completedDates, targetDateString];

          console.log(`📋 Habit: ${h.name}`);
          console.log(`📅 Previous completed dates:`, h.completedDates);
          console.log(`📅 New completed dates:`, newCompletedDates);
          console.log(
            `✅ Action: ${
              isDone ? "Uncompleting" : "Completing"
            } for ${targetDateString}`
          );

          return {
            ...h,
            completedDates: newCompletedDates,
          };
        });

        // Immediately save to localStorage (synchronously)
        try {
          localStorage.setItem("habits", JSON.stringify(updatedHabits));
          console.log("💾 Local habits immediately saved to localStorage");
        } catch (error) {
          console.error("❌ Failed to save habits:", error);
        }

        return updatedHabits;
      });
    },
    [
      defaultCompleted,
      setDefaultCompleted,
      selectedDate,
      setHabits,
      setCalendarEvents,
    ]
  );

  const handleEditHabit = useCallback((habit: Habit) => {
    console.log("🔧 Opening edit form for:", habit);
    const habitWithType = {
      ...habit,
      type: habit.type || (habit.id?.startsWith("gcal-") ? "event" : "habit"),
    };
    setEditingHabit(habitWithType);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    (data: Omit<Habit, "id" | "completedDates" | "createdAt">) => {
      console.log(
        "📝 Form submitted:",
        editingItem ? "update" : "create",
        data
      );
      editingItem ? updateHabit(data) : addHabit(data);
    },
    [editingItem, updateHabit, addHabit]
  );

  const handleCloseForm = useCallback(() => {
    console.log("❌ Closing form");
    setIsFormOpen(false);
    setEditingHabit(null);
  }, []);

  const handleAddHabit = useCallback(() => {
    console.log("➕ Opening add habit form");
    setEditingHabit(null);
    setIsFormOpen(true);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("onboarding-completed", "true");
    setShowOnboarding(false);
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
              <span className="text-gray-600">
                {accessToken && isCalendarConnected
                  ? "Syncing with Google Calendar..."
                  : "Processing..."}
              </span>
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
          allHabits={allHabits} // Pass all habits for streak calculation
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
          defaultTab={editingItem?.type || "habit"}
        />
      </div>
    </div>
  );
}

export default HabitApp;
