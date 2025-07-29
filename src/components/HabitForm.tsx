import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Habit } from "../types/habit";
import {
  FaRunning,
  FaBook,
  FaBriefcase,
  FaSpa,
  FaUsers,
  FaPaintBrush,
  FaMoneyBillWave,
  FaStar,
  FaBell,
} from "react-icons/fa";

interface HabitFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (habit: Omit<Habit, "id" | "completedDates" | "createdAt">) => void;
  editingHabit?: Habit | null;
  initialDate?: string | null;
}

const categories = [
  { name: "Health/Fitness", icon: <FaRunning /> },
  { name: "Learning", icon: <FaBook /> },
  { name: "Productivity", icon: <FaBriefcase /> },
  { name: "Mindfulness", icon: <FaSpa /> },
  { name: "Social", icon: <FaUsers /> },
  { name: "Hobbies", icon: <FaPaintBrush /> },
  { name: "Finance", icon: <FaMoneyBillWave /> },
  { name: "Other", icon: <FaStar /> },
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

export default function HabitForm({
  isOpen,
  onClose,
  onSubmit,
  editingHabit,
  initialDate,
}: HabitFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0].name);
  const [color, setColor] = useState(colors[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [remindBefore, setRemindBefore] = useState(0);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Add custom styles for animations
  const customStyles = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
    
    .animate-slide-in-right {
      animation: slideInRight 0.3s ease-out forwards;
    }
    
    .animate-slide-out-right {
      animation: slideOutRight 0.3s ease-in forwards;
    }
    
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
    
    .animate-fade-out {
      animation: fadeOut 0.3s ease-in forwards;
    }
    
    .animate-option-hover {
      transition: all 0.2s ease-out;
    }
    
    .animate-option-hover:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  `;

  // Inject styles
  React.useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = customStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

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

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];

      if (editingHabit) {
        setName(editingHabit.name);
        setCategory(editingHabit.category);
        setColor(editingHabit.color);
        setRemindBefore(editingHabit.remindBeforeMinutes ?? 0);
        setShowReminderOptions((editingHabit.remindBeforeMinutes ?? 0) > 0);

        if ("dateTime" in editingHabit && editingHabit.dateTime) {
          const { localDate, localTime } = parseDateTime(editingHabit.dateTime);
          setDate(localDate);
          setTime(localTime);
        }
      } else {
        setName("");
        setCategory(categories[0].name);
        setColor(colors[0]);
        setDate(initialDate || today);
        setTime("");
        setRemindBefore(0);
        setShowReminderOptions(false);
      }
    }
  }, [isOpen, editingHabit, initialDate]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && date && time) {
      const dateTime = createDateTime(date, time);
      onSubmit({
        name: name.trim(),
        category,
        color,
        dateTime,
        remindBeforeMinutes: remindBefore,
      });
      onClose();
    }
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
    }
  };

  const handleCloseMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowReminderOptions(false);
      setIsClosing(false);
    }, 300);
  };

  const handleOptionSelect = (value: number) => {
    setRemindBefore(value);
    setIsClosing(true);
    setTimeout(() => {
      setShowReminderOptions(false);
      setIsClosing(false);
    }, 300);
  };

  const getReminderText = () => {
    if (remindBefore === 0) return "At time of habit";
    if (remindBefore === 60) return "1 hour before";
    return `${remindBefore} minutes before`;
  };

  if (!isOpen) return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingHabit ? "Edit Habit" : "Create a New Habit"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Meditate, Run, Journal"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition text-gray-800 bg-white"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${
                    category === cat.name
                      ? "border-pink-600 bg-pink-50 text-pink-600"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pick a Date
              </label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-pink-200 focus:border-pink-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pick a Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-pink-200 focus:border-pink-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Enhanced Reminder Before Section */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm font-medium text-gray-700">
                Notify me before
              </label>
              <button
                type="button"
                onClick={handleBellClick}
                className={`p-2 rounded-full transition-colors ${
                  showReminderOptions
                    ? "bg-pink-100 text-pink-600 hover:bg-pink-200"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                <FaBell size={14} />
              </button>
              {remindBefore > 0 && (
                <span className="text-sm text-pink-600 font-medium">
                  {getReminderText()}
                </span>
              )}
            </div>

            {/* Side Menu for Reminder Options */}
            {showReminderOptions && (
              <>
                {/* Backdrop */}
                <div
                  className={`fixed inset-0 bg-black/20 z-10 ${
                    isClosing ? "animate-fade-out" : "animate-fade-in"
                  }`}
                  onClick={handleCloseMenu}
                />

                {/* Side Menu */}
                <div
                  className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-20 ${
                    isClosing
                      ? "animate-slide-out-right"
                      : "animate-slide-in-right"
                  }`}
                >
                  <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Choose Reminder Time
                    </h3>
                    <button
                      type="button"
                      onClick={handleCloseMenu}
                      className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-6 space-y-3">
                    {[
                      { value: 0, label: "At time of habit", icon: "🕐" },
                      { value: 5, label: "5 minutes before", icon: "⏰" },
                      { value: 10, label: "10 minutes before", icon: "⏰" },
                      { value: 15, label: "15 minutes before", icon: "⏰" },
                      { value: 30, label: "30 minutes before", icon: "⏰" },
                      { value: 60, label: "1 hour before", icon: "⏰" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleOptionSelect(option.value)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left animate-option-hover ${
                          remindBefore === option.value
                            ? "border-pink-500 bg-pink-50 text-pink-700"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-xl">{option.icon}</span>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          {option.value > 0 && (
                            <div className="text-sm text-gray-500">
                              Get notified{" "}
                              {option.value === 60
                                ? "1 hour"
                                : `${option.value} minutes`}{" "}
                              before your habit
                            </div>
                          )}
                          {option.value === 0 && (
                            <div className="text-sm text-gray-500">
                              No advance notification
                            </div>
                          )}
                        </div>
                        {remindBefore === option.value && (
                          <div className="ml-auto">
                            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {date && time && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Scheduled for:</strong>{" "}
                {new Date(createDateTime(date, time)).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-3 bg-black text-white rounded-xl hover:bg-pink-700"
            >
              {editingHabit ? "Update" : "Add"} Habit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
