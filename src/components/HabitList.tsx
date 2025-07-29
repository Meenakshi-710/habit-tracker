import { Target, TrendingUp, Calendar, Sparkles } from 'lucide-react';
import HabitCard from './HabitCard';

// Habit type definition
interface Habit {
  id: string;
  name: string;
  category: string;
  color: string;
  dateTime: string;
  completedDates: string[];
  createdAt: string;
}

interface HabitListProps {
  habits: Habit[];
  onToggleComplete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
}

export default function HabitList({ habits, onToggleComplete, onEdit, onDelete }: HabitListProps) {
  const today = new Date().toDateString();

  // Sort habits: incomplete first, then completed
  const sortedHabits = [...habits].sort((a, b) => {
    const aCompleted = a.completedDates.includes(today);
    const bCompleted = b.completedDates.includes(today);

    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;
    
    // If both have same completion status, sort by time
    const aTime = new Date(a.dateTime).getTime();
    const bTime = new Date(b.dateTime).getTime();
    return aTime - bTime;
  });

  if (habits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] px-8">
        <div className="text-center max-w-md">
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-gray-100 via-gray-50 to-white rounded-full flex items-center justify-center mx-auto shadow-inner border border-gray-200/50">
              <Target size={48} className="text-gray-400" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
          
          <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
            Start Your Journey
          </h3>
          <p className="text-gray-500 leading-relaxed mb-8">
            Build positive habits that will transform your daily routine. 
            Every small step counts towards your bigger goals.
          </p>
          
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <Calendar size={16} />
              <span>Track Daily</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="flex items-center space-x-2">
              <TrendingUp size={16} />
              <span>Build Streaks</span>
            </div>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <div className="flex items-center space-x-2">
              <Target size={16} />
              <span>Reach Goals</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50/50 via-white to-blue-50/20">
      {/* Habits List */}
      <div className="max-w-5xl mx-auto px-8 py-6">
        <div className="grid gap-6">
          {sortedHabits.map((habit, index) => (
            <div
              key={habit.id}
              className="transform transition-all duration-200 animate-fadeInUp"
              style={{ 
                animationDelay: `${index * 100}ms`,
              }}
            >
              <HabitCard
                habit={habit}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}