let tokenClient: google.accounts.oauth2.TokenClient;
const CLIENT_ID = '699329623158-d451c3nlvadp6p6pbnskdnqgp1adpl8d.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

export const initTokenClient = (onTokenReceived: (token: string) => void) => {
  if (!window.google || !window.google.accounts) return;

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse) => {
      onTokenReceived(tokenResponse.access_token);
    },
  });
};

export const requestAccessToken = () => {
  if (tokenClient) {
    tokenClient.requestAccessToken();
  }
};

export const getCalendarEvents = async (accessToken: string) => {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&singleEvents=true&orderBy=startTime`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  return data.items || [];
};
