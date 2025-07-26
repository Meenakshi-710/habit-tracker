import { BarChart3, TrendingUp, Target, Calendar } from 'lucide-react';
import { Habit } from '../types/habit';

interface StatisticsProps {
  habits: Habit[];
}

export default function Statistics({ habits }: StatisticsProps) {
  const totalHabits = habits.length;
  const today = new Date().toDateString();
  const completedToday = habits.filter(habit => habit.completedDates.includes(today)).length;
  const totalCompletions = habits.reduce((sum, habit) => sum + habit.completedDates.length, 0);

  const getAverageStreak = () => {
    if (habits.length === 0) return 0;
    
    const streaks = habits.map(habit => {
      if (habit.completedDates.length === 0) return 0;
      
      const sortedDates = habit.completedDates
        .map(date => new Date(date))
        .sort((a, b) => b.getTime() - a.getTime());
      
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < sortedDates.length; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        
        if (sortedDates.some(date => date.toDateString() === checkDate.toDateString())) {
          streak++;
        } else {
          break;
        }
      }
      
      return streak;
    });
    
    return Math.round(streaks.reduce((sum, streak) => sum + streak, 0) / habits.length);
  };

  const getCategoryStats = () => {
    const categoryCount: Record<string, number> = {};
    habits.forEach(habit => {
      categoryCount[habit.category] = (categoryCount[habit.category] || 0) + 1;
    });
    return Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
  };

  const getWeeklyCompletion = () => {
    const weeklyData = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toDateString();
      
      const completions = habits.filter(habit => 
        habit.completedDates.includes(dateString)
      ).length;
      
      weeklyData.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        completions,
        percentage: totalHabits > 0 ? (completions / totalHabits) * 100 : 0
      });
    }
    
    return weeklyData;
  };

  const stats = [
    {
      icon: Target,
      label: 'Total Habits',
      value: totalHabits.toString(),
      color: 'text-blue-500 bg-blue-100'
    },
    {
      icon: Calendar,
      label: 'Completed Today',
      value: `${completedToday}/${totalHabits}`,
      color: 'text-green-500 bg-green-100'
    },
    {
      icon: TrendingUp,
      label: 'Average Streak',
      value: `${getAverageStreak()} days`,
      color: 'text-orange-500 bg-orange-100'
    },
    {
      icon: BarChart3,
      label: 'Total Completions',
      value: totalCompletions.toString(),
      color: 'text-purple-500 bg-purple-100'
    }
  ];

  const weeklyData = getWeeklyCompletion();
  const categoryStats = getCategoryStats();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Weekly Progress</h3>
          <div className="space-y-3">
            {weeklyData.map((day, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 w-12">{day.day}</span>
                <div className="flex-1 mx-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${day.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm text-gray-600 w-8">{day.completions}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Categories</h3>
          <div className="space-y-3">
            {categoryStats.map(([category, count], index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{category}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(count / totalHabits) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-6">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}