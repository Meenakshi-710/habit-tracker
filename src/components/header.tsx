import { Plus, Calendar, Sun, Moon, Check } from "lucide-react";

// At top
interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddHabit: () => void;
  onSelectDate: (date: string | null) => void;
  isCalendarConnected?: boolean;
  onCalendarConnect?: () => void; // NEW
  onCalendarDisconnect: () => void;
  completedCount: number;
  totalHabits: number;
  userName?: string | null;
  selectedDate?: string | null;
}

export default function Header({
  onAddHabit,
  onSelectDate,
  isCalendarConnected = false,
  onCalendarConnect,
  onCalendarDisconnect, 
  completedCount,
  totalHabits,
  userName,
  selectedDate,
}: HeaderProps) {
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const monthName = today.toLocaleDateString("en-US", { month: "long" });
  const dayNumber = today.getDate();
  const year = today.getFullYear();

  const greeting =
    today.getHours() < 12
      ? "Good Morning"
      : today.getHours() < 18
      ? "Good Afternoon"
      : "Good Evening";
  const GreetingIcon = today.getHours() < 18 ? Sun : Moon;

  const progressPercentage =
    totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0;

  type DayType = {
    date: Date;
    day: string;
    month: string;
    monthShort: string;
    number: number;
    isToday: boolean;
    isFirstOfMonth: boolean;
  };

  const getDaysFromMondayToYearEnd = (): DayType[] => {
    const days: DayType[] = [];

    // Get current date
    const today = new Date();

    // Get Monday of the current week
    const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    const daysSinceMonday = (dayOfWeek + 6) % 7; // makes Monday = 0, Sunday = 6
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysSinceMonday);

    const endOfYear = new Date(today.getFullYear(), 11, 31);

    const date = new Date(startOfWeek);
    while (date <= endOfYear) {
      days.push({
        date: new Date(date),
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        month: date.toLocaleDateString("en-US", { month: "long" }),
        monthShort: date.toLocaleDateString("en-US", { month: "short" }),
        number: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        isFirstOfMonth: date.getDate() === 1,
      });
      date.setDate(date.getDate() + 1);
    }

    return days;
  };

  const allDays = getDaysFromMondayToYearEnd();

  // Group days by month for rendering
  const groupedDays = allDays.reduce((acc, day) => {
    const monthKey = `${day.date.getFullYear()}-${day.date.getMonth()}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(day);
    return acc;
  }, {} as Record<string, DayType[]>);

  return (
    <div className="relative bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 backdrop-blur-xl border-b border-white/20">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0,0,0) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6 mb-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl">
                <GreetingIcon size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 tracking-wide">
                  {greeting}
                  {userName ? `, ${userName}` : ""}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {monthName} {dayNumber}, {year}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extralight text-gray-900 tracking-tight leading-none">
                {dayName}
              </h1>
              <div className="flex items-center space-x-3">
                <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                <p className="text-sm text-gray-500 font-medium">
                  Make today count
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div
  className={`group relative overflow-hidden px-4 py-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
    isCalendarConnected
      ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
      : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
  }`}
  onClick={isCalendarConnected ? onCalendarDisconnect : onCalendarConnect}
>
  <div className="flex items-center space-x-3">
    <div
      className={`p-1.5 rounded-xl ${
        isCalendarConnected ? "bg-emerald-100" : "bg-gray-100"
      }`}
    >
      <Calendar
        size={16}
        className={
          isCalendarConnected ? "text-emerald-600" : "text-gray-400"
        }
      />
    </div>
    <div>
      <p
        className={`text-sm font-medium ${
          isCalendarConnected ? "text-emerald-700" : "text-gray-600"
        } underline`}
      >
        {isCalendarConnected ? "Calendar Synced" : "Sync Calendar"}
      </p>
      <p className="text-xs text-gray-400">
        {isCalendarConnected ? "Click to disconnect" : "Connect to sync"}
      </p>
    </div>
  </div>
</div>


            <button
              onClick={onAddHabit}
              className="group relative overflow-hidden bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center space-x-3">
                <div className="p-1 bg-white/10 rounded-lg group-hover:rotate-90 transition-transform duration-300">
                  <Plus size={18} />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-300">Build something great</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Scrollable Year Calendar */}
        <div className="overflow-x-auto mb-8 pb-2 scrollbar-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-start space-x-1 min-w-max px-1">
            {Object.entries(groupedDays).map(([monthKey, monthDays]) => (
              <div key={monthKey} className="flex items-start space-x-1">
                {/* Month Label - Rotated and positioned at start of month */}
                <div className="flex flex-col items-center justify-center h-24 mr-2">
                  <div
                    className="text-sm font-bold text-gray-700 whitespace-nowrap transform -rotate-90 origin-center"
                    style={{
                      transformOrigin: "center center",
                    }}
                  >
                    {monthDays[0].month.toUpperCase()}
                  </div>
                </div>

                {/* Days for this month */}
                <div className="flex space-x-2">
                  {monthDays.map((day, index) => {
                    const isoDate = day.date.toISOString().split("T")[0];
                    const isSelected = selectedDate === isoDate;

                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() =>
                          onSelectDate(isSelected ? null : isoDate)
                        }
                        className="flex flex-col items-center space-y-1 p-2 rounded-2xl min-w-[64px]"
                      >
                        <span
                          className={`text-xs font-semibold ${
                            isSelected ? "text-pink-600" : "text-gray-500"
                          }`}
                        >
                          {day.day}
                        </span>
                        <div
                          className={`relative w-10 h-10 flex items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-200
                    ${
                      day.isToday
                        ? "bg-gradient-to-br from-gray-900 to-gray-700 text-white shadow-lg scale-110"
                        : isSelected
                        ? "bg-pink-100 text-pink-600 shadow-md scale-105"
                        : "text-gray-600 hover:bg-white hover:shadow-md hover:scale-105"
                    }`}
                        >
                          {day.number}
                          {day.isToday && (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white/40 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                  Today's Progress
                </h2>
                <p className="text-gray-600">
                  The secret of getting ahead is getting started.
                </p>
              </div>
              <div className="flex items-center space-x-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-pink-600">
                    {completedCount}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    Completed
                  </div>
                </div>
                <div className="w-px h-12 bg-gray-200"></div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-800">
                    {totalHabits}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">Total</div>
                </div>
                <div className="w-px h-12 bg-gray-200"></div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round(progressPercentage)}%
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    Progress
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completion Rate
              </span>
              <span className="text-sm font-bold text-gray-900">
                {Math.round(progressPercentage)}%
              </span>
            </div>

            <div className="relative h-3 bg-gray-300 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 pt-2">
              {[...Array(Math.max(totalHabits, 7))].map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 flex items-center justify-center rounded-full transition-all duration-300 ${
                    i < completedCount
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-sm"
                      : i < totalHabits
                      ? "bg-gray-200 text-gray-500 hover:bg-gray-300"
                      : "bg-gray-100"
                  }`}
                >
                  {i < completedCount && <Check className="w-4 h-4" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
