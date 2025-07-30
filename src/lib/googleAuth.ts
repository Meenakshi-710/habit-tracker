const CLIENT_ID = "424581927926-c3v0f2n25upi474dl0lejm5hj5mbvdq2.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

const isChromeExtension = typeof chrome !== "undefined" && chrome.identity;

// Chrome extensions must use this format as redirect URI
const REDIRECT_URI = isChromeExtension
  ? chrome.identity.getRedirectURL("oauth2")
  : window.location.origin;

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
  if (isChromeExtension) return getAuthTokenFromExtension();
  alert("Google login only works in Chrome extension for now."); // or redirect to extension
  return Promise.reject("Google login is only supported in the extension.");
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
