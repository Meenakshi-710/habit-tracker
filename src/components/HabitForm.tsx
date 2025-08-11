import React, { useEffect, useState } from "react";
import {
  X,
  Clock,
  Check,
  Calendar,
  Repeat,
  CalendarDays,
  Heart,
} from "lucide-react";
import {
  FaRunning,
  FaBookOpen,
  FaBriefcase,
  FaUsers,
  FaWallet,
  FaStar,
} from "react-icons/fa";
import { GiMeditation, GiPaintBrush } from "react-icons/gi";
import { useTheme } from "../hooks/useTheme";

interface FormProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (item: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editingItem?: any | null;
  initialDate?: string | null;
  defaultTab?: string;
}

// --- static data ---
// store component references — not JSX elements
const categories = [
  { name: "Health/Fitness", icon: FaRunning },
  { name: "Learning", icon: FaBookOpen },
  { name: "Productivity", icon: FaBriefcase },
  { name: "Mindfulness", icon: GiMeditation },
  { name: "Social", icon: FaUsers },
  { name: "Hobbies", icon: GiPaintBrush },
  { name: "Finance", icon: FaWallet },
  { name: "Other", icon: FaStar },
];

const colors = [
  "border-l-blue-500",
  "border-l-green-500",
  "border-l-purple-500",
  "border-l-pink-500",
  "border-l-yellow-500",
  "border-l-red-500",
  "border-l-indigo-500",
  "border-l-teal-500",
];

const tabs = [
  { id: "habit", label: "Habit", icon: <Heart size={16} /> },
  { id: "task", label: "Task", icon: <Check size={16} /> },
  { id: "event", label: "Event", icon: <Calendar size={16} /> },
];

export default function HabitForm({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  initialDate,
  defaultTab = "habit",
}: FormProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // form state
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0].name);
  const [color, setColor] = useState(colors[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [remindBefore, setRemindBefore] = useState(0);
  const [recurringType, setRecurringType] = useState("none");
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [adjustedDateTime, setAdjustedDateTime] = useState<Date | null>(null);
  const [recurringOptions, setRecurringOptions] = useState<
    Array<{
      value: string;
      label: string;
      icon: React.ReactNode;
      dayNumber?: number;
    }>
  >([]);

  // day map
  const dayMap = [
    {
      value: "sunday",
      label: "Every Sunday",
      icon: <Calendar size={16} />,
      dayNumber: 0,
    },
    {
      value: "monday",
      label: "Every Monday",
      icon: <Calendar size={16} />,
      dayNumber: 1,
    },
    {
      value: "tuesday",
      label: "Every Tuesday",
      icon: <Calendar size={16} />,
      dayNumber: 2,
    },
    {
      value: "wednesday",
      label: "Every Wednesday",
      icon: <Calendar size={16} />,
      dayNumber: 3,
    },
    {
      value: "thursday",
      label: "Every Thursday",
      icon: <Calendar size={16} />,
      dayNumber: 4,
    },
    {
      value: "friday",
      label: "Every Friday",
      icon: <Calendar size={16} />,
      dayNumber: 5,
    },
    {
      value: "saturday",
      label: "Every Saturday",
      icon: <Calendar size={16} />,
      dayNumber: 6,
    },
  ];

  // initialize recurring options
  useEffect(() => {
    const today = new Date();
    const currentDayOption = dayMap[today.getDay()];

    setRecurringOptions([
      {
        value: "none",
        label: "One-time only",
        icon: <CalendarDays size={16} />,
      },
      { value: "daily", label: "Every day", icon: <Repeat size={16} /> },
      currentDayOption,
    ]);
  }, []);

  // update when date changes
  useEffect(() => {
    if (date) {
      const selectedDate = new Date(date);
      const selectedDayOption = dayMap[selectedDate.getDay()];

      setRecurringOptions([
        {
          value: "none",
          label: "One-time only",
          icon: <CalendarDays size={16} />,
        },
        { value: "daily", label: "Every day", icon: <Repeat size={16} /> },
        selectedDayOption,
      ]);

      if (recurringType !== "none" && recurringType !== "daily") {
        const currentOption = dayMap.find((day) => day.value === recurringType);
        if (currentOption?.dayNumber !== selectedDayOption.dayNumber) {
          setRecurringType("none");
        }
      }
    }
  }, [date]);

  const parseDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    const localDate = date.toISOString().split("T")[0];
    const localTime = date.toTimeString().slice(0, 5);
    return { localDate, localTime };
  };

  const createDateTime = (dateStr: string, timeStr: string): string => {
    const localDateTime = new Date(`${dateStr}T${timeStr}:00`);
    return localDateTime.toISOString();
  };

  const checkAndAdjustDateTime = (
    selectedDate: string,
    selectedTime: string
  ) => {
    if (!selectedDate || !selectedTime) {
      setShowTimeWarning(false);
      setAdjustedDateTime(null);
      return;
    }

    const now = new Date();
    const selectedDateTime = new Date(`${selectedDate}T${time}:00`);

    const today = new Date().toISOString().split("T")[0];
    if (selectedDate === today && selectedDateTime <= now) {
      const nextDay = new Date(selectedDateTime);
      nextDay.setDate(nextDay.getDate() + 1);

      setShowTimeWarning(true);
      setAdjustedDateTime(nextDay);
    } else {
      setShowTimeWarning(false);
      setAdjustedDateTime(null);
    }
  };

  useEffect(() => {
    checkAndAdjustDateTime(date, time);
  }, [date, time]);

  useEffect(() => {
  if (isOpen) {
    const today = new Date().toISOString().split("T")[0];

    if (editingItem) {
      setTitle(editingItem.name || editingItem.title || "");
      setDescription(editingItem.description || "");
      setCategory(editingItem.category || categories[0].name);
      setColor(editingItem.color || colors[0]);
      setRemindBefore(editingItem.remindBeforeMinutes ?? 0);
      setShowReminderOptions((editingItem.remindBeforeMinutes ?? 0) > 0);
      setActiveTab(editingItem.type || "habit");

      if (editingItem.recurringType) {
        setRecurringType(editingItem.recurringType);
      } else if (editingItem.isRecurring) {
        setRecurringType("daily");
      } else {
        setRecurringType("none");
      }

      if ("dateTime" in editingItem && editingItem.dateTime) {
        const { localDate, localTime } = parseDateTime(editingItem.dateTime);
        setDate(localDate);
        setTime(localTime);
      } else if (editingItem.selectedDate) {
        // Use the selectedDate if it exists
        setDate(editingItem.selectedDate);
        // Set a default time if not provided
        if (editingItem.dateTime) {
          const { localTime } = parseDateTime(editingItem.dateTime);
          setTime(localTime);
        } else {
          setTime("09:00"); // Default time
        }
      }
    } else {
      setTitle("");
      setDescription("");
      setCategory(categories[0].name);
      setColor(colors[0]);
      setDate(initialDate || today);
      setTime("");
      setRemindBefore(0);
      setRecurringType("none");
      setShowReminderOptions(false);
      setShowRecurringOptions(false);
      setActiveTab(defaultTab);
    }
    setErrors({});
    setShowTimeWarning(false);
    setAdjustedDateTime(null);
  }
}, [isOpen, editingItem, initialDate, defaultTab]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    setErrors({});
    setShowTimeWarning(false);
    setAdjustedDateTime(null);
    setShowReminderOptions(false);
    setShowRecurringOptions(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrors({ title: "Please enter a title" });
      return;
    }

    if (!date) {
      setErrors({ date: "Please select a date" });
      return;
    }

    if (!time) {
      setErrors({ time: "Please select a time" });
      return;
    }

    const finalDateTime = adjustedDateTime
      ? adjustedDateTime.toISOString()
      : createDateTime(date, time);

    const isRecurring = recurringType !== "none";

    const itemData = {
      type: activeTab,
      name: title.trim(),
      title: title.trim(),
      description: description.trim(),
      dateTime: finalDateTime,
      remindBeforeMinutes: remindBefore,
      isRecurring,
      recurringType: isRecurring ? recurringType : undefined,
      ...(activeTab === "habit" && { category, color }),
    };

    onSubmit(itemData);
    onClose();
  };

  const handleBellClick = () => {
    if (showReminderOptions) {
      setIsClosing(true);
      setTimeout(() => {
        setShowReminderOptions(false);
        setIsClosing(false);
      }, 300);
    } else {
      setShowReminderOptions(true);
      setShowRecurringOptions(false);
    }
  };

  const handleRecurringClick = () => {
    if (showRecurringOptions) {
      setIsClosing(true);
      setTimeout(() => {
        setShowRecurringOptions(false);
        setIsClosing(false);
      }, 300);
    } else {
      setShowRecurringOptions(true);
      setShowReminderOptions(false);
    }
  };

  const handleCloseMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowReminderOptions(false);
      setShowRecurringOptions(false);
      setIsClosing(false);
    }, 300);
  };

  const handleReminderOptionSelect = (value: number) => {
    setRemindBefore(value);
    setIsClosing(true);
    setTimeout(() => {
      setShowReminderOptions(false);
      setIsClosing(false);
    }, 300);
  };

  const handleRecurringOptionSelect = (value: string) => {
    setRecurringType(value);
    setIsClosing(true);
    setTimeout(() => {
      setShowRecurringOptions(false);
      setIsClosing(false);
    }, 300);
  };

  const getReminderText = () => {
    if (remindBefore === 0) return `At time of ${activeTab}`;
    if (remindBefore === 60) return "1 hour before";
    return `${remindBefore} minutes before`;
  };

  const getRecurringText = () => {
    const option = recurringOptions.find((opt) => opt.value === recurringType);
    return option ? option.label : "One-time only";
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "habit":
        return editingItem ? "Edit Habit" : "Create a New Habit";
      case "task":
        return editingItem ? "Edit Task" : "Create a New Task";
      case "event":
        return editingItem ? "Edit Event" : "Create a New Event";
      default:
        return "Create New";
    }
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case "habit":
        return "e.g., Meditate, Run, Journal";
      case "task":
        return "e.g., Complete project, Review documents";
      case "event":
        return "e.g., Team meeting, Doctor appointment";
      default:
        return "Enter title";
    }
  };

  if (!isOpen) return null;

  const today = new Date().toISOString().split("T")[0];

  // --- theme-aware class helpers ---
  const panelBg = isDark ? "bg-gray-900" : "bg-white";
  const panelText = isDark ? "text-gray-100" : "text-gray-900";
  const inputBg = isDark
    ? "bg-gray-800 text-gray-100"
    : "bg-white text-gray-800";
  const inputBorder = isDark ? "border-gray-700" : "border-gray-300";
  const mutedText = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
        .animate-slide-out-right { animation: slideOutRight 0.3s ease-in forwards; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-fade-out { animation: fadeOut 0.3s ease-in forwards; }
        .animate-option-hover { transition: all 0.2s ease-out; }
        .animate-option-hover:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
        .scrollbar-hidden { scrollbar-width: none; -ms-overflow-style: none; }
        .scrollbar-hidden::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div
          className={`${panelBg} ${panelText} w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-hidden border ${inputBorder}`}
        >
          {/* Header with Tabs */}
          <div
            className={`border-b sticky top-0 z-10 ${
              isDark ? "bg-gray-900" : "bg-white"
            }`}
          >
            <div className={`flex items-center justify-between px-6 py-5`}>
              <h2 className={`text-xl font-semibold ${panelText}`}>
                {getTabTitle()}
              </h2>
              <button
                onClick={handleClose}
                className={`p-2 rounded-full hover:${
                  isDark ? "bg-gray-800" : "bg-gray-100"
                } text-gray-400 transition-colors`}
              >
                <X size={22} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div
              className={`flex bg-${
                isDark ? "gray-800/60" : "gray-50"
              } mx-6 mb-4 rounded-xl p-1`}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-pink-600 text-white shadow-sm"
                      : `${
                          isDark
                            ? "text-gray-300 hover:text-white hover:bg-gray-800/50"
                            : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                        }`
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            <div>
              <label className={`text-sm font-medium mb-1 block ${mutedText}`}>
                {activeTab === "habit" ? "Habit Name" : "Title"}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={getPlaceholder()}
                className={`w-full px-4 py-3 rounded-xl border ${
                  errors.title ? "border-red-500" : inputBorder
                } focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition ${inputBg}`}
                required
              />
              {errors.title && (
                <p className="text-red-500 text-xs mt-1">{errors.title}</p>
              )}
            </div>

            {activeTab !== "habit" && (
              <div>
                <label
                  className={`text-sm font-medium mb-1 block ${mutedText}`}
                >
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Add details about your ${activeTab}...`}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border ${inputBorder} focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition ${inputBg} resize-none`}
                />
              </div>
            )}

            {activeTab === "habit" && (
              <div>
                <label
                  className={`text-sm font-medium mb-2 block ${mutedText}`}
                >
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => {
                    const Icon = cat.icon; // component ref
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setCategory(cat.name)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                          category === cat.name
                            ? "border-pink-600 bg-pink-50 text-pink-600"
                            : `${
                                isDark
                                  ? "border-gray-700 text-gray-200 hover:border-gray-600 hover:bg-gray-800"
                                  : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                              }`
                        }`}
                      >
                        <span className="text-lg">
                          <Icon size={18} />
                        </span>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recurring Options - Only for habits */}
            {activeTab === "habit" && (
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <label className={`text-sm font-medium ${mutedText}`}>
                    Repeat schedule
                  </label>
                  <button
                    type="button"
                    onClick={handleRecurringClick}
                    className={`p-2 rounded-full transition-colors ${
                      showRecurringOptions || recurringType !== "none"
                        ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                        : `${
                            isDark
                              ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`
                    }`}
                  >
                    <Repeat size={14} />
                  </button>
                  <span
                    className={`text-sm font-medium ${
                      isDark ? "text-blue-300" : "text-blue-600"
                    }`}
                  >
                    {getRecurringText()}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${mutedText}`}
                >
                  {recurringType === "none" ? "Pick a Date" : "Start Date"}
                </label>
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full px-4 py-3 border ${
                    errors.date ? "border-red-500" : inputBorder
                  } rounded-xl ${inputBg} focus:ring-2 focus:ring-pink-200 focus:border-pink-500 outline-none transition-colors`}
                  required
                />
                {errors.date && (
                  <p className="text-red-500 text-xs mt-1">{errors.date}</p>
                )}
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${mutedText}`}
                >
                  Pick a Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`w-full px-4 py-3 border ${
                    errors.time ? "border-red-500" : inputBorder
                  } rounded-xl ${inputBg} focus:ring-2 focus:ring-pink-200 focus:border-pink-500 outline-none transition-colors`}
                  required
                />
                {errors.time && (
                  <p className="text-red-500 text-xs mt-1">{errors.time}</p>
                )}
              </div>
            </div>

            {/* Reminder section */}
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <label className={`text-sm font-medium ${mutedText}`}>
                  Notify me before
                </label>
                <button
                  type="button"
                  onClick={handleBellClick}
                  className={`p-2 rounded-full transition-colors ${
                    showReminderOptions || remindBefore > 0
                      ? "bg-pink-100 text-pink-600 hover:bg-pink-200"
                      : `${
                          isDark
                            ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`
                  }`}
                >
                  🔔
                </button>
                {remindBefore >= 0 && (
                  <span
                    className={`text-sm font-medium ${
                      isDark ? "text-pink-300" : "text-pink-600"
                    }`}
                  >
                    {getReminderText()}
                  </span>
                )}
              </div>
            </div>

            {/* Final schedule display */}
            {date && time && (
              <div
                className={`border rounded-xl p-4 ${
                  isDark
                    ? "bg-gray-800 border-gray-700"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <p
                  className={`text-sm ${
                    isDark ? "text-pink-300" : "text-pink-600"
                  }`}
                >
                  <strong>Scheduled for:</strong>{" "}
                  {(
                    adjustedDateTime || new Date(createDateTime(date, time))
                  ).toLocaleString("en-US", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </p>
                {recurringType !== "none" && (
                  <p
                    className={`text-sm ${
                      isDark ? "text-blue-300" : "text-blue-600"
                    } mt-1`}
                  >
                    <strong>Repeats:</strong> {getRecurringText()} until end of
                    current year
                  </p>
                )}
                {remindBefore > 0 && (
                  <p
                    className={`text-sm ${
                      isDark ? "text-pink-300" : "text-pink-600"
                    } mt-1`}
                  >
                    <strong>Reminder:</strong> {getReminderText()}
                  </p>
                )}
                {showTimeWarning && (
                  <p
                    className={`text-sm ${
                      isDark ? "text-gray-200" : "text-black"
                    } mt-1`}
                  >
                    <strong>Note:</strong> Scheduled for the next day due to
                    past time.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className={`px-5 py-3 ${
                  isDark
                    ? "text-gray-300 border-gray-700 bg-gray-800 hover:bg-gray-700"
                    : "text-gray-600 border-gray-200 bg-white hover:bg-gray-50"
                } border rounded-xl transition-colors`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-3 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {editingItem ? "Update" : "Add"}{" "}
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </button>
            </div>
          </form>

          {/* Reminder Options Side Menu */}
          {showReminderOptions && (
            <>
              <div
                className={`fixed inset-0 bg-black/20 z-30 ${
                  isClosing ? "animate-fade-out" : "animate-fade-in"
                }`}
                onClick={handleCloseMenu}
              />

              <div
                className={`fixed right-0 top-0 h-full w-80 shadow-2xl z-40 ${
                  isDark
                    ? "bg-gray-900 text-gray-100"
                    : "bg-white text-gray-900"
                } ${
                  isClosing
                    ? "animate-slide-out-right"
                    : "animate-slide-in-right"
                }`}
              >
                <div className="flex items-center justify-between p-6 border-b">
                  <h3 className="text-lg font-semibold">
                    Choose Reminder Time
                  </h3>
                  <button
                    type="button"
                    onClick={handleCloseMenu}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-3">
                  {[0, 5, 10, 15, 30, 60].map((val) => {
                    const label =
                      val === 0
                        ? `At time of ${activeTab}`
                        : val === 60
                        ? "1 hour before"
                        : `${val} minutes before`;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleReminderOptionSelect(val)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left animate-option-hover transition-colors ${
                          remindBefore === val
                            ? "border-pink-500 bg-pink-50 text-pink-700"
                            : "border-gray-200"
                        }`}
                      >
                        <span className="text-xl">
                          <Clock size={20} />
                        </span>
                        <div className="flex-1">
                          <div className="font-medium">{label}</div>
                          {val > 0 ? (
                            <div className="text-sm text-gray-500">
                              Get notified{" "}
                              {val === 60 ? "1 hour" : `${val} minutes`} before
                              your {activeTab}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              No advance notification
                            </div>
                          )}
                        </div>
                        {remindBefore === val && (
                          <div className="w-2 h-2 bg-pink-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Recurring Options Side Menu */}
          {showRecurringOptions && (
            <>
              <div
                className={`fixed inset-0 bg-black/20 z-30 ${
                  isClosing ? "animate-fade-out" : "animate-fade-in"
                }`}
                onClick={handleCloseMenu}
              />

              <div
                className={`fixed right-0 top-0 h-full w-80 shadow-2xl z-40 ${
                  isDark
                    ? "bg-gray-900 text-gray-100"
                    : "bg-white text-gray-900"
                } ${
                  isClosing
                    ? "animate-slide-out-right"
                    : "animate-slide-in-right"
                }`}
              >
                <div className="flex items-center justify-between p-6 border-b">
                  <h3 className="text-lg font-semibold">
                    Choose Repeat Schedule
                  </h3>
                  <button
                    type="button"
                    onClick={handleCloseMenu}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-3">
                  {recurringOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleRecurringOptionSelect(option.value)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left animate-option-hover transition-colors ${
                        recurringType === option.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200"
                      }`}
                    >
                      <span className="text-xl">{option.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        {option.value !== "none" && (
                          <div className="text-sm text-gray-500">
                            {option.value === "daily"
                              ? "Repeats every day until end of year"
                              : `Repeats every ${
                                  option.label.split(" ")[1]
                                } until end of year`}
                          </div>
                        )}
                        {option.value === "none" && (
                          <div className="text-sm text-gray-500">
                            Occurs only once on the selected date
                          </div>
                        )}
                      </div>
                      {recurringType === option.value && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
