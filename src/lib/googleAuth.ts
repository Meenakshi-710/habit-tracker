// Enhanced Google Calendar integration with CRUD operations, flexible recurring habits, and auto next-day scheduling
const CLIENT_ID = "424581927926-c3v0f2n25upi474dl0lejm5hj5mbvdq2.apps.googleusercontent.com";

// Updated scopes to include write permissions
const SCOPES = "https://www.googleapis.com/auth/calendar";

const isChromeExtension = typeof chrome !== "undefined" && chrome.identity;

const REDIRECT_URI = isChromeExtension
  ? chrome.identity.getRedirectURL("oauth2")
  : window.location.origin;

console.log("OAuth Redirect URI:", REDIRECT_URI);

// Define proper TypeScript interface for Google Calendar event
interface GoogleCalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  colorId: string;
  reminders: {
    useDefault: boolean;
    overrides: { method: string; minutes: number; }[];
  };
  recurrence?: string[]; // Optional recurrence property
}

/**
 * Helper function to check if a time has passed for today and adjust to next day if needed
 */
const adjustDateTimeIfPastToday = (dateTime: string): { adjustedDateTime: string; wasAdjusted: boolean } => {
  const selectedDateTime = new Date(dateTime);
  const now = new Date();
  
  // Check if the selected date is today
  const selectedDate = selectedDateTime.toDateString();
  const today = now.toDateString();
  
  if (selectedDate === today && selectedDateTime <= now) {
    // Time has passed, move to next day
    const nextDay = new Date(selectedDateTime);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log('⏰ Google Calendar: Time adjustment applied', {
      original: selectedDateTime.toLocaleString(),
      adjusted: nextDay.toLocaleString(),
      reason: 'Selected time has passed today'
    });
    
    return {
      adjustedDateTime: nextDay.toISOString(),
      wasAdjusted: true
    };
  }
  
  return {
    adjustedDateTime: dateTime,
    wasAdjusted: false
  };
};

/**
 * Generate RRULE string based on recurring type
 */
const generateRecurrenceRule = (recurringType: string, startDate: Date): string[] => {
  const endOfYear = new Date(startDate.getFullYear(), 11, 31, 23, 59, 59); // Dec 31 of start date's year
  const endDateString = endOfYear.toISOString().split('T')[0].replace(/-/g, '') + 'T235959Z';
  
  switch (recurringType) {
    case "daily":
      return [`RRULE:FREQ=DAILY;UNTIL=${endDateString}`];
    
    case "weekly":
      return [`RRULE:FREQ=WEEKLY;UNTIL=${endDateString}`];
    
    case "monthly":
      return [`RRULE:FREQ=MONTHLY;UNTIL=${endDateString}`];
    
    case "monday":
      return [`RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=${endDateString}`];
    
    case "tuesday":
      return [`RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=${endDateString}`];
    
    case "wednesday":
      return [`RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=${endDateString}`];
    
    case "thursday":
      return [`RRULE:FREQ=WEEKLY;BYDAY=TH;UNTIL=${endDateString}`];
    
    case "friday":
      return [`RRULE:FREQ=WEEKLY;BYDAY=FR;UNTIL=${endDateString}`];
    
    case "saturday":
      return [`RRULE:FREQ=WEEKLY;BYDAY=SA;UNTIL=${endDateString}`];
    
    case "sunday":
      return [`RRULE:FREQ=WEEKLY;BYDAY=SU;UNTIL=${endDateString}`];
    
    default:
      return []; // No recurrence for "none" or unknown types
  }
};

/**
 * Get human-readable description for recurring type
 */
const getRecurringDescription = (recurringType: string): string => {
  switch (recurringType) {
    case "daily":
      return "Repeats every day";
    case "weekly":
      return "Repeats every week on the same day";
    case "monthly":
      return "Repeats every month on the same date";
    case "monday":
      return "Repeats every Monday";
    case "tuesday":
      return "Repeats every Tuesday";
    case "wednesday":
      return "Repeats every Wednesday";
    case "thursday":
      return "Repeats every Thursday";
    case "friday":
      return "Repeats every Friday";
    case "saturday":
      return "Repeats every Saturday";
    case "sunday":
      return "Repeats every Sunday";
    default:
      return "Does not repeat";
  }
};

/**
 * Launches Chrome extension OAuth flow and retrieves an access token.
 */
export const getAuthTokenFromExtension = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const authUrl =
      `https://accounts.google.com/o/oauth2/auth` +
      `?client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&prompt=consent` +
      `&access_type=online`;

    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          console.error(
            "OAuth flow error:",
            chrome.runtime.lastError?.message || chrome.runtime.lastError || "Unknown error"
          );
          reject(chrome.runtime.lastError || new Error("No redirect URL returned"));
          return;
        }

        const params = new URLSearchParams(new URL(redirectUrl).hash.substring(1));
        const accessToken = params.get("access_token");

        if (accessToken) {
          resolve(accessToken);
        } else {
          reject(new Error("Access token not found in redirect URL"));
        }
      }
    );
  });
};

/**
 * Dev-only fallback for localhost: Performs OAuth login in a popup.
 */
export const getAuthTokenFromWeb = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&prompt=consent`;

    const width = 500;
    const height = 600;
    const left = window.innerWidth / 2 - width / 2;
    const top = window.innerHeight / 2 - height / 2;

    const popup = window.open(
      authUrl,
      "GoogleOAuth",
      `width=${width},height=${height},top=${top},left=${left}`
    );

    if (!popup) {
      reject(new Error("Failed to open OAuth popup"));
      return;
    }

    const poll = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(poll);
          reject(new Error("OAuth popup closed"));
          return;
        }

        const hash = popup.location.hash;
        if (hash.includes("access_token")) {
          const params = new URLSearchParams(hash.substring(1));
          const token = params.get("access_token");
          clearInterval(poll);
          popup.close();
          if (token) {
            resolve(token);
          } else {
            reject(new Error("No access token found"));
          }
        }
      } catch (err) {
        // Ignore cross-origin errors while waiting
      }
    }, 500);
  });
};

/**
 * Generic entry point — uses extension or web depending on context.
 */
export const getAuthToken = (): Promise<string> => {
  return isChromeExtension ? getAuthTokenFromExtension() : getAuthTokenFromWeb();
};

/**
 * Fetches upcoming events from the user's primary Google Calendar using access token.
 */
export const getCalendarEvents = async (accessToken: string) => {
  const now = new Date().toISOString();
  // Fetch events for the next year to include all recurring instances
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const timeMax = nextYear.toISOString();
  
  const endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=2500`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch events:", errorText);
      throw new Error(`Google Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error("Calendar fetch error:", err);
    throw err;
  }
};

/**
 * Creates a new event in Google Calendar with flexible recurrence options and auto next-day scheduling
 */
export const createCalendarEvent = async (accessToken: string, eventData: {
  name: string;
  description?: string;
  dateTime: string;
  remindBeforeMinutes?: number;
  isHabit?: boolean;
  type?: 'habit' | 'task' | 'event';
  duration?: number; // Duration in minutes, default 60
  isRecurring?: boolean;
  recurringType?: string; // Changed from limited union to string to support all options
}) => {
  // Apply auto next-day scheduling if time has passed
  const { adjustedDateTime, wasAdjusted } = adjustDateTimeIfPastToday(eventData.dateTime);
  
  if (wasAdjusted) {
    console.log(`📅 Google Calendar: Auto-scheduled ${eventData.type || 'event'} "${eventData.name}" to next day due to past time`);
  }
  
  const startDateTime = new Date(adjustedDateTime);
  
  // Set different durations based on type
  let durationMinutes = eventData.duration || 60; // Default 1 hour
  if (eventData.type === 'habit') {
    durationMinutes = 30; // Habits typically shorter
  } else if (eventData.type === 'task') {
    durationMinutes = 60; // Tasks can be longer
  }
  
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  // Create different titles and descriptions based on type
  let eventTitle = eventData.name;
  let eventDescription = eventData.description || "";
  
  if (eventData.type === 'habit') {
    eventTitle = `🎯 ${eventData.name}`;
    eventDescription = `Daily Habit: ${eventData.name}\n\n${eventDescription}`.trim();
  } else if (eventData.type === 'task') {
    eventTitle = `✅ ${eventData.name}`;
    eventDescription = `Task: ${eventData.name}\n\n${eventDescription}`.trim();
  }

  // Add adjustment note to description if time was adjusted
  if (wasAdjusted) {
    const originalTime = new Date(eventData.dateTime).toLocaleString();
    eventDescription += `\n\n⏰ Note: Originally scheduled for ${originalTime}, automatically moved to next day due to past time.`;
  }

  // Add recurring schedule info to description
  if (eventData.isRecurring && eventData.recurringType && eventData.recurringType !== "none") {
    const recurringDesc = getRecurringDescription(eventData.recurringType);
    eventDescription += `\n\n🔄 Schedule: ${recurringDesc} until end of ${new Date().getFullYear()}`;
  }

  // Create event object with proper typing
  const event: GoogleCalendarEvent = {
    summary: eventTitle,
    description: eventDescription,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    // Set different colors for different types
    colorId: eventData.type === 'habit' ? '10' : eventData.type === 'task' ? '2' : '1', // Green for habits, Yellow for tasks, Blue for events
    reminders: {
      useDefault: false,
      overrides: eventData.remindBeforeMinutes && eventData.remindBeforeMinutes > 0 ? [
        { method: 'popup', minutes: eventData.remindBeforeMinutes },
        { method: 'email', minutes: eventData.remindBeforeMinutes }
      ] : []
    }
  };

  // Add recurrence rule based on recurringType
  if (eventData.isRecurring && eventData.recurringType && eventData.recurringType !== "none") {
    const recurrenceRules = generateRecurrenceRule(eventData.recurringType, startDateTime);
    if (recurrenceRules.length > 0) {
      event.recurrence = recurrenceRules;
      
      const adjustmentNote = wasAdjusted ? ' (auto-adjusted to next day)' : '';
      const recurringDesc = getRecurringDescription(eventData.recurringType);
      console.log(`📅 Creating recurring ${eventData.type}: ${eventTitle} - ${recurringDesc} until end of year${adjustmentNote}`);
    }
  }

  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to create event:", errorText);
      throw new Error(`Failed to create calendar event: ${response.statusText}`);
    }

    const createdEvent = await response.json();
    const recurringInfo = event.recurrence ? ` (${getRecurringDescription(eventData.recurringType || '')})` : '';
    const adjustmentInfo = wasAdjusted ? ' [auto-adjusted to next day]' : '';
    console.log(`✅ ${eventData.type || 'Event'} created successfully in Google Calendar: ${createdEvent.id}${recurringInfo}${adjustmentInfo}`);
    return createdEvent;
  } catch (err) {
    console.error("❌ Create event error:", err);
    throw err;
  }
};

/**
 * Updates an existing event in Google Calendar with auto next-day scheduling and flexible recurrence
 */
export const updateCalendarEvent = async (accessToken: string, eventId: string, eventData: {
  name: string;
  description?: string;
  dateTime: string;
  remindBeforeMinutes?: number;
  type?: 'habit' | 'task' | 'event';
  duration?: number;
  isRecurring?: boolean;
  recurringType?: string; // Changed from limited union to string
}) => {
  // Remove the 'gcal-' prefix if present to get the actual Google Calendar event ID
  const actualEventId = eventId.startsWith('gcal-') ? eventId.substring(5) : eventId;
  
  // Apply auto next-day scheduling if time has passed
  const { adjustedDateTime, wasAdjusted } = adjustDateTimeIfPastToday(eventData.dateTime);
  
  if (wasAdjusted) {
    console.log(`📅 Google Calendar Update: Auto-scheduled ${eventData.type || 'event'} "${eventData.name}" to next day due to past time`);
  }
  
  const startDateTime = new Date(adjustedDateTime);
  
  // Set different durations based on type
  let durationMinutes = eventData.duration || 60;
  if (eventData.type === 'habit') {
    durationMinutes = 30;
  } else if (eventData.type === 'task') {
    durationMinutes = 60;
  }
  
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  // Create different titles and descriptions based on type
  let eventTitle = eventData.name;
  let eventDescription = eventData.description || "";
  
  if (eventData.type === 'habit') {
    eventTitle = `🎯 ${eventData.name}`;
    eventDescription = `Daily Habit: ${eventData.name}\n\n${eventDescription}`.trim();
  } else if (eventData.type === 'task') {
    eventTitle = `✅ ${eventData.name}`;
    eventDescription = `Task: ${eventData.name}\n\n${eventDescription}`.trim();
  }

  // Add adjustment note to description if time was adjusted
  if (wasAdjusted) {
    const originalTime = new Date(eventData.dateTime).toLocaleString();
    eventDescription += `\n\n⏰ Note: Originally scheduled for ${originalTime}, automatically moved to next day due to past time.`;
  }

  // Add recurring schedule info to description
  if (eventData.isRecurring && eventData.recurringType && eventData.recurringType !== "none") {
    const recurringDesc = getRecurringDescription(eventData.recurringType);
    eventDescription += `\n\n🔄 Schedule: ${recurringDesc} until end of ${new Date().getFullYear()}`;
  }

  // Create event object with proper typing
  const event: GoogleCalendarEvent = {
    summary: eventTitle,
    description: eventDescription,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: eventData.type === 'habit' ? '10' : eventData.type === 'task' ? '2' : '1',
    reminders: {
      useDefault: false,
      overrides: eventData.remindBeforeMinutes && eventData.remindBeforeMinutes > 0 ? [
        { method: 'popup', minutes: eventData.remindBeforeMinutes },
        { method: 'email', minutes: eventData.remindBeforeMinutes }
      ] : []
    }
  };

  // Add recurrence rule based on recurringType
  if (eventData.isRecurring && eventData.recurringType && eventData.recurringType !== "none") {
    const recurrenceRules = generateRecurrenceRule(eventData.recurringType, startDateTime);
    if (recurrenceRules.length > 0) {
      event.recurrence = recurrenceRules;
      
      const adjustmentNote = wasAdjusted ? ' (auto-adjusted to next day)' : '';
      const recurringDesc = getRecurringDescription(eventData.recurringType);
      console.log(`📅 Updating recurring ${eventData.type}: ${eventTitle} - ${recurringDesc} until end of year${adjustmentNote}`);
    }
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${actualEventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to update event:", errorText);
      throw new Error(`Failed to update calendar event: ${response.statusText}`);
    }

    const updatedEvent = await response.json();
    const recurringInfo = event.recurrence ? ` (${getRecurringDescription(eventData.recurringType || '')})` : '';
    const adjustmentInfo = wasAdjusted ? ' [auto-adjusted to next day]' : '';
    console.log(`✅ ${eventData.type || 'Event'} updated successfully in Google Calendar: ${updatedEvent.id}${recurringInfo}${adjustmentInfo}`);
    return updatedEvent;
  } catch (err) {
    console.error("❌ Update event error:", err);
    throw err;
  }
};

/**
 * Deletes an event from Google Calendar
 */
export const deleteCalendarEvent = async (accessToken: string, eventId: string) => {
  // Remove the 'gcal-' prefix if present to get the actual Google Calendar event ID
  const actualEventId = eventId.startsWith('gcal-') ? eventId.substring(5) : eventId;

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${actualEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to delete event:", errorText);
      throw new Error(`Failed to delete calendar event: ${response.statusText}`);
    }

    console.log("✅ Event deleted successfully (including all recurring instances):", actualEventId);
    return true;
  } catch (err) {
    console.error("❌ Delete event error:", err);
    throw err;
  }
};

/**
 * Helper function to check if an event is a Google Calendar event
 */
export const isGoogleCalendarEvent = (habitId: string): boolean => {
  return habitId.startsWith('gcal-');
};

/**
 * Sync local habit changes with Google Calendar (with auto next-day scheduling and flexible recurrence)
 */
export const syncWithGoogleCalendar = async (
  accessToken: string, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  habit: any, 
  operation: 'create' | 'update' | 'delete'
) => {
  try {
    switch (operation) {
      case 'create':
        return await createCalendarEvent(accessToken, {
          name: habit.name,
          description: habit.description,
          dateTime: habit.dateTime,
          remindBeforeMinutes: habit.remindBeforeMinutes,
          type: habit.type,
          isRecurring: habit.isRecurring,
          recurringType: habit.recurringType
        });
        
      case 'update':
        if (isGoogleCalendarEvent(habit.id)) {
          return await updateCalendarEvent(accessToken, habit.id, {
            name: habit.name,
            description: habit.description,
            dateTime: habit.dateTime,
            remindBeforeMinutes: habit.remindBeforeMinutes,
            type: habit.type,
            isRecurring: habit.isRecurring,
            recurringType: habit.recurringType
          });
        }
        break;
        
      case 'delete':
        if (isGoogleCalendarEvent(habit.id)) {
          return await deleteCalendarEvent(accessToken, habit.id);
        }
        break;
    }
  } catch (error) {
    console.error(`Failed to ${operation} calendar event:`, error);
    throw error;
  }
};