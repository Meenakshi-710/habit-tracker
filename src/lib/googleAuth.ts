// Enhanced Google Calendar integration with CRUD operations
const CLIENT_ID = "424581927926-c3v0f2n25upi474dl0lejm5hj5mbvdq2.apps.googleusercontent.com";

// Updated scopes to include write permissions
const SCOPES = "https://www.googleapis.com/auth/calendar";

const isChromeExtension = typeof chrome !== "undefined" && chrome.identity;

const REDIRECT_URI = isChromeExtension
  ? chrome.identity.getRedirectURL("oauth2")
  : "http://localhost:5173";

console.log("OAuth Redirect URI:", REDIRECT_URI);

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
          console.error("OAuth flow error:", chrome.runtime.lastError);
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
  const endpoint = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&singleEvents=true&orderBy=startTime`;

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
 * Creates a new event in Google Calendar
 */
export const createCalendarEvent = async (accessToken: string, eventData: {
  name: string;
  description?: string;
  dateTime: string;
  remindBeforeMinutes?: number;
}) => {
  const startDateTime = new Date(eventData.dateTime);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration

  const event = {
    summary: eventData.name,
    description: eventData.description || "",
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: eventData.remindBeforeMinutes && eventData.remindBeforeMinutes > 0 ? [
        { method: 'popup', minutes: eventData.remindBeforeMinutes },
        { method: 'email', minutes: eventData.remindBeforeMinutes }
      ] : []
    }
  };

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
    console.log("✅ Event created successfully:", createdEvent.id);
    return createdEvent;
  } catch (err) {
    console.error("❌ Create event error:", err);
    throw err;
  }
};

/**
 * Updates an existing event in Google Calendar
 */
export const updateCalendarEvent = async (accessToken: string, eventId: string, eventData: {
  name: string;
  description?: string;
  dateTime: string;
  remindBeforeMinutes?: number;
}) => {
  // Remove the 'gcal-' prefix if present to get the actual Google Calendar event ID
  const actualEventId = eventId.startsWith('gcal-') ? eventId.substring(5) : eventId;
  
  const startDateTime = new Date(eventData.dateTime);
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour duration

  const event = {
    summary: eventData.name,
    description: eventData.description || "",
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: eventData.remindBeforeMinutes && eventData.remindBeforeMinutes > 0 ? [
        { method: 'popup', minutes: eventData.remindBeforeMinutes },
        { method: 'email', minutes: eventData.remindBeforeMinutes }
      ] : []
    }
  };

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
    console.log("✅ Event updated successfully:", updatedEvent.id);
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

    console.log("✅ Event deleted successfully:", actualEventId);
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
 * Sync local habit changes with Google Calendar
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
        if (habit.type === 'event') {
          return await createCalendarEvent(accessToken, {
            name: habit.name,
            description: habit.description,
            dateTime: habit.dateTime,
            remindBeforeMinutes: habit.remindBeforeMinutes
          });
        }
        break;
        
      case 'update':
        if (isGoogleCalendarEvent(habit.id)) {
          return await updateCalendarEvent(accessToken, habit.id, {
            name: habit.name,
            description: habit.description,
            dateTime: habit.dateTime,
            remindBeforeMinutes: habit.remindBeforeMinutes
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