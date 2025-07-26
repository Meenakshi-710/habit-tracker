import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { getCalendarEvents, initTokenClient, requestAccessToken } from '../lib/googleAuth';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  description?: string;
}

export default function CalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let token: string | null = null;

    const fetchEvents = async () => {
      initTokenClient(async (accessToken: string) => {
        try {
          token = accessToken;
          const calendarEvents = await getCalendarEvents(token);
          setEvents(calendarEvents);
        } catch (error) {
          console.error('Failed to fetch calendar events:', error);
        } finally {
          setLoading(false);
        }
      });

      requestAccessToken();
    };

    fetchEvents();
  }, []);

  const formatEventTime = (event: CalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;

    if (!start) return '';

    const startDate = new Date(start);
    const endDate = new Date(end || start);

    if (event.start.date) {
      return 'All day';
    }

    const startTime = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const endTime = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${startTime} - ${endTime}`;
  };

  const isToday = (event: CalendarEvent) => {
    const eventDate = new Date(event.start.dateTime || event.start.date || '');
    const today = new Date();
    return eventDate.toDateString() === today.toDateString();
  };

  const todayEvents = events.filter(isToday);
  const upcomingEvents = events.filter(event => !isToday(event)).slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <Calendar className="mr-2" size={20} />
          Calendar Events
        </h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <Calendar className="mr-2" size={20} />
        Calendar Events
      </h3>

      {todayEvents.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-700 mb-3">Today</h4>
          <div className="space-y-3">
            {todayEvents.map(event => (
              <div key={event.id} className="border-l-4 border-l-blue-500 bg-blue-50 p-3 rounded-r-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-800">{event.summary}</h5>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Clock size={14} className="mr-1" />
                      {formatEventTime(event)}
                    </div>
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <MapPin size={14} className="mr-1" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-700 mb-3">Upcoming</h4>
          <div className="space-y-3">
            {upcomingEvents.map(event => (
              <div key={event.id} className="border-l-4 border-l-gray-300 bg-gray-50 p-3 rounded-r-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-800">{event.summary}</h5>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <Clock size={14} className="mr-1" />
                      {formatEventTime(event)}
                    </div>
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <MapPin size={14} className="mr-1" />
                        {event.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar size={48} className="mx-auto mb-3 opacity-50" />
          <p>No upcoming events found</p>
        </div>
      )}
    </div>
  );
}
