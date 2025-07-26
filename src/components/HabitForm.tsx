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

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setCategory(editingHabit.category);
      setColor(editingHabit.color);
      if ("dateTime" in editingHabit && editingHabit.dateTime) {
        const [editDate, editTime] = editingHabit.dateTime.split("T");
        setDate(editDate);
        setTime(editTime?.slice(0, 5));
      }
    } else {
      const today = new Date().toISOString().split("T")[0];
      setName("");
      setCategory(categories[0].name);
      setColor(colors[0]);
      setDate(initialDate || today);
      setTime("");
    }
  }, [editingHabit, initialDate]);

  // 🔒 Lock scroll when modal is open
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && date && time) {
      const dateTime = `${date}T${time}`;
      onSubmit({ name: name.trim(), category, color, dateTime });
      onClose();
    }
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
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Meditate, Run, Journal"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition text-gray-800 bg-white"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
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

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pick a Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-800 focus:ring-2 focus:ring-pink-200 focus:border-pink-500 outline-none"
                  required
                />
              </div>
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

          {/* Buttons */}
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
