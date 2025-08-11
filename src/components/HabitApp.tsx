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

  /**
   * Enhanced function to check if a habit should appear on a specific date
   * based on its recurring type
   */
  const shouldHabitAppearOnDate = (
    habit: Habit,
    targetDateString: string
  ): boolean => {
    const habitStartDate = new Date(habit.dateTime);
    const targetDate = new Date(targetDateString);

    // Reset times to compare dates only
    habitStartDate.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    // Target date must be on or after the habit start date
    if (targetDate < habitStartDate) {
      return false;
    }

    // Target date must be within the current year
    const currentYear = new Date().getFullYear();
    if (targetDate.getFullYear() !== currentYear) {
      return false;
    }

    // If not recurring, must match exact date
    if (
      !habit.isRecurring ||
      !habit.recurringType ||
      habit.recurringType === "none"
    ) {
      return habitStartDate.getTime() === targetDate.getTime();
    }

    // Handle different recurring types
    switch (habit.recurringType) {
      case "daily":
        return true; // Appears every day from start date onwards

      case "weekly":
        // Appears on the same day of week every week
        return habitStartDate.getDay() === targetDate.getDay();

      case "monthly":
        // Appears on the same date every month
        return habitStartDate.getDate() === targetDate.getDate();

      case "monday":
        return targetDate.getDay() === 1; // Monday

      case "tuesday":
        return targetDate.getDay() === 2; // Tuesday

      case "wednesday":
        return targetDate.getDay() === 3; // Wednesday

      case "thursday":
        return targetDate.getDay() === 4; // Thursday

      case "friday":
        return targetDate.getDay() === 5; // Friday

      case "saturday":
        return targetDate.getDay() === 6; // Saturday

      case "sunday":
        return targetDate.getDay() === 0; // Sunday

      default:
        return false;
    }
  };

  /**
   * Enhanced function to create recurring habits based on the selected recurring type
   */
  const createRecurringHabit = (
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

    const isRecurring =
      baseHabit.isRecurring &&
      baseHabit.recurringType &&
      baseHabit.recurringType !== "none";

    const habit: Habit = {
      ...baseHabit,
      id: baseId,
      dateTime: habitDateTime.toISOString(),
      completedDates: [],
      createdAt: new Date().toISOString(),
      type: baseHabit.type || "habit",
      isRecurring,
      recurringType: isRecurring ? baseHabit.recurringType : undefined,
    };

    return habit;
  };

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

  useEffect(() => {
    const fetchGoogleEvents = async () => {
      if (!accessToken) return;

      try {
        setIsLoading(true);
        const events = await getCalendarEvents(accessToken);

        console.log("All events from Google Calendar:", events);

        // GROUP recurring events by their recurringEventId to avoid duplicates
        const uniqueEvents = new Map();

        // Process events and build unique map
        events
          .filter((event: any) => event.start) // Fix TypeScript error by explicitly typing event
          .forEach((event: any) => {
            // Fix TypeScript error by explicitly typing event
            const dateTime = event.start.dateTime || event.start.date;

            // For recurring events, use the recurringEventId as the key
            // For single events, use the event id
            const uniqueKey = event.recurringEventId || event.id;

            // Skip if we already processed this recurring series
            if (uniqueEvents.has(uniqueKey)) {
              console.log(
                `🔄 Skipping duplicate recurring event: ${event.summary} (${uniqueKey})`
              );
              return;
            }

            // Check if this is one of our created habits/tasks/events by looking at the title
            let type: "habit" | "task" | "event" = "event"; // Default type with proper typing
            let cleanName = event.summary || "Untitled Event";
            let isRecurring = false;
            let recurringType: string | undefined = undefined;

            if (event.summary?.startsWith("🎯 ")) {
              type = "habit";
              isRecurring = true;
              // Try to detect recurring type from recurrence rules or default to daily
              if (event.recurrence && event.recurrence.length > 0) {
                const rrule = event.recurrence[0];
                if (rrule.includes("FREQ=DAILY")) {
                  recurringType = "daily";
                } else if (rrule.includes("FREQ=WEEKLY")) {
                  if (rrule.includes("BYDAY=MO")) recurringType = "monday";
                  else if (rrule.includes("BYDAY=TU"))
                    recurringType = "tuesday";
                  else if (rrule.includes("BYDAY=WE"))
                    recurringType = "wednesday";
                  else if (rrule.includes("BYDAY=TH"))
                    recurringType = "thursday";
                  else if (rrule.includes("BYDAY=FR")) recurringType = "friday";
                  else if (rrule.includes("BYDAY=SA"))
                    recurringType = "saturday";
                  else if (rrule.includes("BYDAY=SU")) recurringType = "sunday";
                  else recurringType = "weekly";
                } else if (rrule.includes("FREQ=MONTHLY")) {
                  recurringType = "monthly";
                }
              } else {
                recurringType = "daily"; // Default fallback
              }
              cleanName = event.summary.substring(2).trim(); // Remove emoji and space
            } else if (event.summary?.startsWith("✅ ")) {
              type = "task";
              cleanName = event.summary.substring(2).trim(); // Remove emoji and space
            }

            // For recurring habits, use the FIRST occurrence datetime as the base
            // This ensures consistent behavior across days
            let baseDateTime = dateTime;
            if (event.recurringEventId) {
              // This is a recurring instance, but we want to use the original series start time
              // We'll use the current instance time but this represents the series
              baseDateTime = dateTime;
            }

            const habitData: Habit = {
              id: `gcal-${uniqueKey}`, // Use unique key to prevent duplicates
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
              dateTime: new Date(baseDateTime).toISOString(),
              completedDates: [],
              createdAt: new Date().toISOString(),
              type: type,
              remindBeforeMinutes: 0,
              isRecurring,
              recurringType: recurringType as
                | "none"
                | "daily"
                | "weekly"
                | "monthly"
                | "monday"
                | "tuesday"
                | "wednesday"
                | "thursday"
                | "friday"
                | "saturday"
                | "sunday"
                | undefined,
            };

            uniqueEvents.set(uniqueKey, habitData);
            console.log(
              `✅ Added unique event: ${cleanName} (${uniqueKey}, type: ${type}, recurring: ${
                recurringType || "none"
              })`
            );
          });

        // Convert Map values to array
        const finalEvents = Array.from(uniqueEvents.values());

        // IMPORTANT: Load existing completedDates from localStorage for calendar events
        const existingCalendarEvents = JSON.parse(
          localStorage.getItem("calendar-events") || "[]"
        );

        // Merge completion status from existing data
        const eventsWithCompletionStatus = finalEvents.map(
          (newEvent: Habit) => {
            const existingEvent = existingCalendarEvents.find(
              (existing: Habit) => existing.id === newEvent.id
            );
            if (existingEvent && existingEvent.completedDates) {
              return {
                ...newEvent,
                completedDates: existingEvent.completedDates, // Preserve completion history
              };
            }
            return newEvent;
          }
        );

        // REPLACE (don't append) calendar events to avoid duplicates
        setCalendarEvents(eventsWithCompletionStatus);
        console.log(
          `✅ Loaded ${eventsWithCompletionStatus.length} unique events from Google Calendar (${events.length} total events fetched)`
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

  // FIXED: Enhanced allHabits combination with better duplicate prevention
  const allHabits = useMemo(() => {
    console.log("🔄 Recalculating allHabits...");
    console.log(
      `📊 Input counts: ${defaultTimeHabits.length} default + ${habits.length} local + ${calendarEvents.length} calendar`
    );

    // Combine all habits but avoid duplicates
    const combined = [...defaultTimeHabits, ...habits, ...calendarEvents];

    // Remove duplicates based on ID - more robust deduplication
    const seenIds = new Set<string>();
    const uniqueHabits = combined.filter((habit) => {
      if (seenIds.has(habit.id)) {
        console.log(`🚫 Removing duplicate habit: ${habit.name} (${habit.id})`);
        return false;
      }
      seenIds.add(habit.id);
      return true;
    });

    console.log(`📊 Final unique habits: ${uniqueHabits.length}`);

    // Additional debug: log all habit IDs to spot patterns
    console.log(
      "📋 All habit IDs:",
      uniqueHabits.map(
        (h) => `${h.name} (${h.id}) - ${h.recurringType || "none"}`
      )
    );

    return uniqueHabits;
  }, [defaultTimeHabits, habits, calendarEvents]);

  const selectedDateString = selectedDate
    ? new Date(selectedDate).toDateString()
    : todayDateString;

  // ENHANCED: Better filtering for selected date habits using new recurring logic
  const habitsForSelectedDate = useMemo(() => {
    console.log(`🗓️ Filtering habits for date: ${selectedDateString}`);
    console.log(`📊 Total allHabits: ${allHabits.length}`);

    const filtered = allHabits.filter((habit) => {
      const shouldShow = shouldHabitAppearOnDate(habit, selectedDateString);

      console.log(
        `📅 Habit "${habit.name}" (${habit.recurringType || "none"}): ${
          shouldShow ? "SHOW" : "HIDE"
        } for ${selectedDateString}`
      );

      return shouldShow;
    });

    console.log(`📊 Filtered habits count: ${filtered.length}`);

    // Debug: check for any potential duplicates in filtered results
    const filteredIds = filtered.map((h) => h.id);
    const duplicateIds = filteredIds.filter(
      (id, index) => filteredIds.indexOf(id) !== index
    );
    if (duplicateIds.length > 0) {
      console.error(
        "🚨 DUPLICATE IDS FOUND IN FILTERED RESULTS:",
        duplicateIds
      );
    }

    return filtered;
  }, [allHabits, selectedDateString]);

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

        // Create recurring habit for habits with recurrence, single entry for non-recurring or tasks/events
        if (
          data.type === "habit" &&
          data.isRecurring &&
          data.recurringType &&
          data.recurringType !== "none"
        ) {
          const recurringHabit = createRecurringHabit(data, startDate);

          // SYNC TO GOOGLE CALENDAR if connected
          if (accessToken && isCalendarConnected) {
            try {
              // The createCalendarEvent function will automatically handle next-day scheduling and recurrence
              const calendarEvent = await createCalendarEvent(accessToken, {
                name: recurringHabit.name,
                description:
                  recurringHabit.description ||
                  `Recurring habit: ${recurringHabit.name}`,
                dateTime: recurringHabit.dateTime, // This will be auto-adjusted in the Google Calendar function
                remindBeforeMinutes: recurringHabit.remindBeforeMinutes || 0,
                type: "habit",
                isRecurring: true,
                recurringType: recurringHabit.recurringType,
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
                `✅ Created and synced recurring habit to Google Calendar${adjustmentMsg}`
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

          console.log(
            `✅ Created recurring habit with type: ${data.recurringType}`
          );
        }
        // For non-recurring habits, tasks and events, create single entry
        else {
          const newItem: Habit = {
            ...data,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            completedDates: [],
            createdAt: new Date().toISOString(),
            type: data.type || "event",
            isRecurring: data.isRecurring || false,
            recurringType: data.recurringType || undefined,
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
                isRecurring: data.isRecurring,
                recurringType: data.recurringType,
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
      createRecurringHabit,
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
            isRecurring: data.isRecurring || editingItem.isRecurring,
            recurringType: data.recurringType || editingItem.recurringType,
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

            console.log(
              `📋 Event: ${event.name} (${event.recurringType || "none"})`
            );
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

          console.log(`📋 Habit: ${h.name} (${h.recurringType || "none"})`);
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
    <div className="min-h-screen bg-white dark:!bg-black text-black dark:text-white">
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
              <span className="text-gray-600 dark:text-gray-300">
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
          allHabits={allHabits}
          onToggleComplete={toggleHabitComplete}
          onEdit={handleEditHabit}
          onDelete={deleteHabit}
        />
        <HabitForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleFormSubmit}
          initialDate={selectedDate} // This is important
          editingItem={editingItem}
          defaultTab={editingItem?.type || "habit"}
        />
      </div>
    </div>
  );
}

export default HabitApp;
