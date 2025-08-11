import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

interface WelcomePageProps {
  onGetStarted: (name: string) => void;
}

const WelcomePage = ({ onGetStarted }: WelcomePageProps) => {
  const [name, setName] = useState("");
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-br from-white to-gray-100 dark:from-black dark:to-gray-900 text-center relative">
      {/* Theme Toggle Button - Top Right */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 group overflow-hidden px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 cursor-pointer shadow-lg"
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 transition-colors duration-200">
            {theme === "light" ? (
              <Moon size={16} className="text-gray-600 dark:text-gray-300" />
            ) : (
              <Sun size={16} className="text-yellow-500" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-200">
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Switch theme
            </p>
          </div>
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent dark:from-white/5 dark:via-white/2 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
      </button>

      {/* Main Content */}
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
        <div className="relative group">
          <img
            src="/logo.png"
            alt="App Logo"
            className="rounded-[24px] shadow-lg w-24 sm:w-28 md:w-32 group-hover:shadow-2xl transition-all duration-300 group-hover:scale-105"
          />
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-pink-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Welcome to{" "}
          <span className="text-pink-600 dark:text-pink-400">Time Planner</span>
        </h1>

        <p className="text-base sm:text-lg lg:text-xl max-w-xl text-gray-600 dark:text-gray-300 leading-relaxed px-2">
          All your{" "}
          <span className="font-semibold text-black dark:text-white">
            tasks
          </span>
          ,{" "}
          <span className="font-semibold text-black dark:text-white">
            meetings
          </span>{" "}
          and{" "}
          <span className="font-semibold text-black dark:text-white">
            habits
          </span>{" "}
          in one timeline.
        </p>

        {/* Name input */}
        <div className="mt-4 w-full max-w-sm px-4 sm:px-0">
          <input
            type="text"
            placeholder="What's your name?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-pink-500 dark:focus:border-pink-400 focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 transition-all shadow-sm focus:shadow-md"
          />
        </div>

        <button
          onClick={() => {
            localStorage.setItem("user-name", name);
            onGetStarted(name);
          }}
          className="mt-8 bg-black dark:bg-white text-white dark:text-black text-lg sm:text-xl font-medium py-3 sm:py-4 px-8 sm:px-10 rounded-full shadow-md hover:scale-105 transition-all duration-300 hover:bg-pink-600 dark:hover:bg-pink-400 hover:shadow-lg group relative overflow-hidden"
        >
          <span className="relative z-10">Get Started</span>
          {/* Subtle gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>

        {/* Theme preference hint */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
          Theme preference will be saved for your next visit
        </p>
      </div>

      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/4 left-10 w-32 h-32 bg-pink-500/5 dark:bg-pink-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-10 w-40 h-40 bg-purple-500/5 dark:bg-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/3 dark:bg-blue-400/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default WelcomePage;
