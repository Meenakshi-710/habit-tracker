// Enhanced Google Calendar integration with CRUD operations, yearly recurring habits, and auto next-day scheduling
// Fixed OAuth redirect URI handling for production deployments

const CLIENT_ID = "424581927926-c3v0f2n25upi474dl0lejm5hj5mbvdq2.apps.googleusercontent.com";

// Updated scopes to include write permissions
const SCOPES = "https://www.googleapis.com/auth/calendar";

const isChromeExtension = typeof chrome !== "undefined" && chrome.identity;

// Environment-aware redirect URI configuration
const getRedirectURI = () => {
  if (isChromeExtension) {
    return chrome.identity.getRedirectURL("oauth2");
  }
  
  // Handle different deployment environments
  const currentOrigin = window.location.origin;
  
  // For development environments
  if (currentOrigin.includes('localhost') || 
      currentOrigin.includes('127.0.0.1') || 
      currentOrigin.includes('192.168.')) {
    return currentOrigin;
  }
  
  // For production environments (Vercel, Netlify, etc.)
  // This should match exactly what you configure in Google Cloud Console
  return currentOrigin;
};

const REDIRECT_URI = getRedirectURI();

console.log("🔧 OAuth Configuration:", {
  redirectURI: REDIRECT_URI,
  clientId: CLIENT_ID,
  origin: window.location.origin,
  isExtension: isChromeExtension,
  environment: REDIRECT_URI.includes('localhost') ? 'development' : 'production'
});

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
 * Test function to validate OAuth configuration and debug issues
 */
export const testOAuthConfig = () => {
  console.log("🔧 OAuth Configuration Test:");
  console.log("- Client ID:", CLIENT_ID);
  console.log("- Redirect URI:", REDIRECT_URI);
  console.log("- Current Origin:", window.location.origin);
  console.log("- Is Chrome Extension:", isChromeExtension);
  console.log("- Scopes:", SCOPES);
  
  // Test if the redirect URI matches expected patterns
  const isValidRedirectURI = 
    REDIRECT_URI.startsWith('https://') || 
    REDIRECT_URI.startsWith('http://localhost') || 
    REDIRECT_URI.startsWith('chrome-extension://');
    
  console.log("- Valid Redirect URI format:", isValidRedirectURI);
  
  if (!isValidRedirectURI) {
    console.warn("⚠️ Warning: Redirect URI might not be properly configured");
    console.warn("Expected format: https://yourdomain.com or http://localhost:port");
  }
  
  // Check if running in production
  const isProduction = !REDIRECT_URI.includes('localhost') && !REDIRECT_URI.includes('127.0.0.1');
  console.log("- Production environment:", isProduction);
  
  if (isProduction) {
    console.log("🚀 Production detected. Make sure this URL is added to Google Cloud Console:");
    console.log(`   ${REDIRECT_URI}`);
  }
  
  return {
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    isExtension: isChromeExtension,
    isValidFormat: isValidRedirectURI,
    isProduction,
    currentOrigin: window.location.origin
  };
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

    console.log("🔐 Starting Chrome extension OAuth flow...");

    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          console.error("OAuth flow error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError || new Error("No redirect URL returned"));
          return;
        }

        const params = new URLSearchParams(new URL(redirectUrl).hash.substring(1));
        const accessToken = params.get("access_token");

        if (accessToken) {
          console.log("✅ Chrome extension OAuth successful");
          resolve(accessToken);
        } else {
          reject(new Error("Access token not found in redirect URL"));
        }
      }
    );
  });
};

/**
 * Enhanced OAuth flow for web with better error handling, CORS support, and production compatibility
 */
export const getAuthTokenFromWeb = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Add state parameter for security (CSRF protection)
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(CLIENT_ID)}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&state=${encodeURIComponent(state)}` +
      `&prompt=consent` +
      `&access_type=online`;

    console.log("🔐 Starting web OAuth flow...");
    console.log("Auth URL:", authUrl);
    console.log("Expected redirect URI:", REDIRECT_URI);

    const width = 500;
    const height = 600;
    const left = Math.max(0, window.innerWidth / 2 - width / 2);
    const top = Math.max(0, window.innerHeight / 2 - height / 2);

    const popup = window.open(
      authUrl,
      "GoogleOAuth",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes,status=yes`
    );

    if (!popup) {
      const error = "Failed to open OAuth popup. Please allow popups for this site and try again.";
      console.error(error);
      reject(new Error(error));
      return;
    }

    let pollCount = 0;
    const maxPolls = 300; // 150 seconds max wait time
    let hasResolved = false;

    const poll = setInterval(() => {
      pollCount++;
      
      try {
        // Check if popup was closed by user
        if (!popup || popup.closed) {
          if (!hasResolved) {
            clearInterval(poll);
            console.log("❌ OAuth popup was closed by user");
            reject(new Error("OAuth popup was closed before authentication completed"));
          }
          return;
        }

        // Check for timeout
        if (pollCount > maxPolls) {
          clearInterval(poll);
          popup.close();
          if (!hasResolved) {
            console.log("❌ OAuth flow timed out");
            reject(new Error("OAuth flow timed out after 150 seconds"));
          }
          return;
        }

        // Try to read the popup URL (this will fail due to CORS until we're redirected back)
        let currentUrl: string;
        try {
          currentUrl = popup.location.href;
        } catch (e) {
          // Expected cross-origin error while popup is on Google's domain
          return;
        }

        // If we can read the URL, we've been redirected back to our domain
        console.log("🔄 Redirected back to:", currentUrl);

        if (currentUrl && currentUrl.startsWith(REDIRECT_URI)) {
          const url = new URL(currentUrl);
          const hash = url.hash;
          
          if (hash && hash.includes("access_token")) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get("access_token");
            const returnedState = params.get("state");
            const error = params.get("error");
            const errorDescription = params.get("error_description");
            
            clearInterval(poll);
            popup.close();
            hasResolved = true;
            
            if (error) {
              console.error("❌ OAuth error:", error, errorDescription);
              reject(new Error(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`));
            } else if (returnedState !== state) {
              console.error("❌ State parameter mismatch - possible CSRF attack");
              reject(new Error("Invalid state parameter - possible CSRF attack"));
            } else if (token) {
              console.log("✅ Web OAuth successful - token received");
              resolve(token);
            } else {
              console.error("❌ No access token found in redirect");
              reject(new Error("No access token found in redirect URL"));
            }
          } else if (hash && hash.includes("error")) {
            // Handle error in hash
            const params = new URLSearchParams(hash.substring(1));
            const error = params.get("error");
            const errorDescription = params.get("error_description");
            
            clearInterval(poll);
            popup.close();
            hasResolved = true;
            
            console.error("❌ OAuth error in hash:", error, errorDescription);
            reject(new Error(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`));
          }
        }
      } catch (err) {
        // Ignore expected cross-origin errors while waiting
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (!errorMessage.toLowerCase().includes('cross-origin') && 
            !errorMessage.toLowerCase().includes('blocked a frame')) {
          console.warn("OAuth polling error:", err);
        }
      }
    }, 500);

    // Additional cleanup - handle popup focus/blur events
    const handlePopupClosed = () => {
      setTimeout(() => {
        try {
          if (popup && popup.closed && !hasResolved) {
            clearInterval(poll);
            console.log("❌ OAuth popup was closed during authentication");
            reject(new Error("OAuth popup was closed during authentication"));
          }
        } catch (e) {
          // Ignore errors checking popup status
        }
      }, 1000);
    };

    // Check if popup was blocked initially
    setTimeout(() => {
      try {
        if (!popup || popup.closed) {
          handlePopupClosed();
        }
      } catch (e) {
        // Ignore errors
      }
    }, 100);
  });
};

/**
 * Generic entry point — uses extension or web depending on context.
 */
export const getAuthToken = (): Promise<string> => {
  console.log("🚀 Getting auth token...", { isExtension: isChromeExtension });
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
 * Creates a new event in Google Calendar with yearly recurrence for habits and auto next-day scheduling
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
  recurringType?: 'daily' | 'weekly' | 'monthly';
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

  // Add recurrence rule for habits (daily recurring for a year)
  if (eventData.type === 'habit' && eventData.isRecurring && eventData.recurringType === 'daily') {
    // Calculate end date (1 year from start date)
    const endDate = new Date(startDateTime);
    endDate.setFullYear(endDate.getFullYear() + 1);
    
    // Format end date as YYYYMMDD for RRULE
    const endDateString = endDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // Add daily recurrence rule that repeats until end of year
    event.recurrence = [
      `RRULE:FREQ=DAILY;UNTIL=${endDateString}T235959Z`
    ];
    
    const adjustmentNote = wasAdjusted ? ' (auto-adjusted to next day)' : '';
    console.log(`📅 Creating recurring habit: ${eventTitle} from ${startDateTime.toDateString()} to ${endDate.toDateString()}${adjustmentNote}`);
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
    const recurringInfo = event.recurrence ? ' (recurring daily for 1 year)' : '';
    const adjustmentInfo = wasAdjusted ? ' [auto-adjusted to next day]' : '';
    console.log(`✅ ${eventData.type || 'Event'} created successfully in Google Calendar: ${createdEvent.id}${recurringInfo}${adjustmentInfo}`);
    return createdEvent;
  } catch (err) {
    console.error("❌ Create event error:", err);
    throw err;
  }
};

/**
 * Updates an existing event in Google Calendar with auto next-day scheduling
 */
export const updateCalendarEvent = async (accessToken: string, eventId: string, eventData: {
  name: string;
  description?: string;
  dateTime: string;
  remindBeforeMinutes?: number;
  type?: 'habit' | 'task' | 'event';
  duration?: number;
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly';
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

  // Add recurrence rule for habits (daily recurring for a year)
  if (eventData.type === 'habit' && eventData.isRecurring && eventData.recurringType === 'daily') {
    // Calculate end date (1 year from start date)
    const endDate = new Date(startDateTime);
    endDate.setFullYear(endDate.getFullYear() + 1);
    
    // Format end date as YYYYMMDD for RRULE
    const endDateString = endDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // Add daily recurrence rule that repeats until end of year
    event.recurrence = [
      `RRULE:FREQ=DAILY;UNTIL=${endDateString}T235959Z`
    ];
    
    const adjustmentNote = wasAdjusted ? ' (auto-adjusted to next day)' : '';
    console.log(`📅 Updating recurring habit: ${eventTitle} until ${endDate.toDateString()}${adjustmentNote}`);
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
    const adjustmentInfo = wasAdjusted ? ' [auto-adjusted to next day]' : '';
    console.log(`✅ ${eventData.type || 'Event'} updated successfully in Google Calendar: ${updatedEvent.id}${adjustmentInfo}`);
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
 * Creates multiple calendar events for the whole year (alternative approach)
 * Use this if the recurrence rule approach doesn't work as expected
 */
export const createYearlyHabitEvents = async (accessToken: string, eventData: {
  name: string;
  description?: string;
  dateTime: string;
  remindBeforeMinutes?: number;
  type?: 'habit' | 'task' | 'event';
  duration?: number;
}) => {
  // Apply auto next-day scheduling to the initial date
  const { adjustedDateTime, wasAdjusted } = adjustDateTimeIfPastToday(eventData.dateTime);
  const startDate = new Date(adjustedDateTime);
  const events = [];
  
  if (wasAdjusted) {
    console.log(`📅 Creating yearly habit events with auto-adjustment: ${eventData.name} starting from next day`);
  } else {
    console.log(`📅 Creating yearly habit events: ${eventData.name}`);
  }
  
  // Create events for each day of the year
  for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayOffset);
    
    const eventForDay = {
      ...eventData,
      dateTime: currentDate.toISOString(),
    };
    
    try {
      const createdEvent = await createCalendarEvent(accessToken, eventForDay);
      events.push(createdEvent);
      
      // Add a small delay to avoid rate limiting
      if (dayOffset % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Failed to create event for day ${dayOffset}:`, error);
      // Continue with other days even if one fails
    }
  }
  
  const adjustmentInfo = wasAdjusted ? ' (with auto next-day adjustment)' : '';
  console.log(`✅ Created ${events.length} daily habit events for the year${adjustmentInfo}`);
  return events;
};

/**
 * Sync local habit changes with Google Calendar (with auto next-day scheduling)
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
        if (habit.type === 'habit' && habit.isRecurring) {
          // For habits, create with recurrence (with auto adjustment)
          return await createCalendarEvent(accessToken, {
            name: habit.name,
            description: habit.description,
            dateTime: habit.dateTime,
            remindBeforeMinutes: habit.remindBeforeMinutes,
            type: habit.type,
            isRecurring: habit.isRecurring,
            recurringType: habit.recurringType
          });
        } else {
          // For tasks and events, create single occurrence (with auto adjustment)
          return await createCalendarEvent(accessToken, {
            name: habit.name,
            description: habit.description,
            dateTime: habit.dateTime,
            remindBeforeMinutes: habit.remindBeforeMinutes,
            type: habit.type
          });
        }
        
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