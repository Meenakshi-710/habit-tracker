/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Trophy, Crown, Star, Medal, Zap, Target, Calendar } from 'lucide-react';

const StreakAchievements = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Milestone definitions with enhanced styling
  const MILESTONE_CONFIG = {
    3: {
      title: "Getting Started!",
      icon: <Star className="w-8 h-8" />,
      color: "text-blue-500",
      bgGradient: "from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30",
      borderColor: "border-blue-300 dark:border-blue-600",
      description: "First steps on your journey"
    },
    7: {
      title: "Week Warrior!",
      icon: <Zap className="w-8 h-8" />,
      color: "text-purple-500",
      bgGradient: "from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30",
      borderColor: "border-purple-300 dark:border-purple-600",
      description: "One week of consistency"
    },
    10: {
      title: "Bronze Achiever!",
      icon: <Medal className="w-8 h-8" />,
      color: "text-amber-600",
      bgGradient: "from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30",
      borderColor: "border-amber-300 dark:border-amber-600",
      description: "Your first medal earned"
    },
    21: {
      title: "Habit Former!",
      icon: <Trophy className="w-8 h-8" />,
      color: "text-green-500",
      bgGradient: "from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30",
      borderColor: "border-green-300 dark:border-green-600",
      description: "Scientific habit formation"
    },
    30: {
      title: "Monthly Master!",
      icon: <Crown className="w-8 h-8" />,
      color: "text-yellow-500",
      bgGradient: "from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30",
      borderColor: "border-yellow-300 dark:border-yellow-600",
      description: "A full month of dedication"
    },
    50: {
      title: "Silver Champion!",
      icon: <Trophy className="w-8 h-8" />,
      color: "text-gray-500",
      bgGradient: "from-gray-100 to-gray-200 dark:from-gray-700/30 dark:to-gray-600/30",
      borderColor: "border-gray-300 dark:border-gray-500",
      description: "Champion level reached"
    },
    100: {
      title: "Gold Legend!",
      icon: <Crown className="w-8 h-8" />,
      color: "text-yellow-400",
      bgGradient: "from-yellow-200 to-orange-200 dark:from-yellow-800/30 dark:to-orange-800/30",
      borderColor: "border-yellow-400 dark:border-yellow-500",
      description: "Legendary commitment"
    }
  };

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage(
          { type: "GET_STREAK_ACHIEVEMENTS" },
          (response) => {
            if (response && response.success) {
              // Sort achievements by date (newest first) and then by streak (highest first)
              const sortedAchievements = response.achievements.sort((a: { achievedAt: string | number | Date; streak: number; }, b: { achievedAt: string | number | Date; streak: number; }) => {
                const dateA = new Date(a.achievedAt);
                const dateB = new Date(b.achievedAt);
                if (dateA.getTime() !== dateB.getTime()) {
                  return dateB.getTime() - dateA.getTime();
                }
                return b.streak - a.streak;
              });
              setAchievements(sortedAchievements);
            }
            setLoading(false);
          }
        );
      }
    } catch (error) {
      console.error("Failed to load achievements:", error);
      setLoading(false);
    }
  };

  const clearAchievements = () => {
    if (window.confirm("Are you sure you want to clear all achievements? This action cannot be undone.")) {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage(
          { type: "CLEAR_STREAK_ACHIEVEMENTS" },
          (response) => {
            if (response && response.success) {
              setAchievements([]);
            }
          }
        );
      }
    }
  };

  const formatDate = (dateString: string | number | Date) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group achievements by habit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const achievementsByHabit = achievements.reduce((acc: any, achievement: any) => {
    if (!acc[achievement.habitName]) {
      acc[achievement.habitName] = [];
    }
    acc[achievement.habitName].push(achievement);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-blue-900/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-blue-900/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-10 h-10 text-yellow-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 bg-clip-text text-transparent">
              Streak Achievements
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Celebrate your consistency and milestone achievements
          </p>
        </div>

        {achievements.length === 0 ? (
          // Empty state with improved layout
          <div className="text-center py-16">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 max-w-6xl mx-auto">
              {/* Left side - Empty state message */}
              <div className="flex-1 text-center lg:text-left">
                <div className="w-32 h-32 bg-gradient-to-br from-gray-100 via-gray-50 to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-950 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-8 shadow-inner border border-gray-200/50 dark:border-gray-700/50">
                  <Target size={64} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                  No Achievements Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed">
                  Start building consistent habits to unlock your first achievement milestones! 
                  Every completed day brings you closer to your next reward.
                </p>
              </div>

              {/* Right side - Milestone preview */}
              <div className="flex-1 max-w-md">
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                  <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6 text-center">
                    Unlock These Achievements
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                        <Star size={20} className="text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-gray-200">3 days: Getting Started</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Your first milestone</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-700/50">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                        <Zap size={20} className="text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-gray-200">7 days: Week Warrior</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Weekly champion</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/50">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <Medal size={20} className="text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-gray-200">10 days: Bronze Medal</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">First medal earned</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-700/50">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                        <Trophy size={20} className="text-green-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-gray-200">21+ days: Habit Former</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">And many more...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Achievements display
          <div className="space-y-8">
            {/* Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                      {achievements.length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Total Achievements
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                      {Object.keys(achievementsByHabit).length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Habits with Achievements
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-3">
                  <Crown className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                      {Math.max(...achievements.map(a => a.streak), 0)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Longest Streak
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements by habit */}
            {Object.entries(achievementsByHabit).map(([habitName, habitAchievements]) => (
              <div key={habitName} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {habitName}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(habitAchievements as any[]).map((achievement: any, index: number) => {
                    const config = MILESTONE_CONFIG[achievement.streak as keyof typeof MILESTONE_CONFIG];
                    
                    if (!config) return null;
                    
                    return (
                      <div
                        key={index}
                        className={`relative overflow-hidden rounded-xl border-2 ${config.borderColor} bg-gradient-to-br ${config.bgGradient} p-4 transform transition-all duration-200 hover:scale-105 hover:shadow-lg`}
                      >
                        {/* Achievement content */}
                        <div className="text-center">
                          <div className={`mx-auto mb-3 w-16 h-16 rounded-full bg-white/50 dark:bg-gray-800/50 flex items-center justify-center ${config.color}`}>
                            {config.icon}
                          </div>
                          
                          <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
                            {config.title}
                          </h4>
                          
                          <p className="text-2xl font-bold mb-2">
                            <span className={config.color}>{achievement.streak} Days</span>
                          </p>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {config.description}
                          </p>
                          
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {formatDate(achievement.achievedAt)}
                          </div>
                        </div>
                        
                        {/* Sparkle effect */}
                        <div className="absolute top-2 right-2">
                          <div className={`w-3 h-3 rounded-full ${config.color.replace('text-', 'bg-')} animate-pulse`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Clear achievements button */}
            <div className="text-center pt-8">
              <button
                onClick={clearAchievements}
                className="px-6 py-3 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
              >
                Clear All Achievements
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreakAchievements;