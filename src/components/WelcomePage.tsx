import { useState } from "react";

interface WelcomePageProps {
  onGetStarted: (name: string) => void;
}

const WelcomePage = ({ onGetStarted }: WelcomePageProps) => {
  const [name, setName] = useState("");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-br from-white to-gray-100 dark:from-black dark:to-gray-900 text-center">
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
        <img
          src="/logo.png"
          alt="App Logo"
          className="rounded-[24px] shadow-lg w-24 sm:w-28 md:w-32"
        />

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Welcome to <span className="text-pink-600">Habit Tracker</span>
        </h1>

        <p className="text-base sm:text-lg lg:text-xl max-w-xl text-gray-600 dark:text-gray-300 leading-relaxed px-2">
          All your{" "}
          <span className="font-semibold text-black dark:text-white">tasks</span>
          ,{" "}
          <span className="font-semibold text-black dark:text-white">meetings</span>{" "}
          and{" "}
          <span className="font-semibold text-black dark:text-white">habits</span>{" "}
          in one timeline.
        </p>

        {/* Name input */}
        <div className="mt-4 w-full max-w-sm px-4 sm:px-0">
          <input
            type="text"
            placeholder="What's your name?"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-5 py-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500 transition-all"
          />
        </div>

        <button
          onClick={() => {
            localStorage.setItem("user-name", name);
            onGetStarted(name);
          }}
          className="mt-8 bg-black dark:bg-white text-white dark:text-black text-lg sm:text-xl font-medium py-3 sm:py-4 px-8 sm:px-10 rounded-full shadow-md hover:scale-105 transition-transform hover:bg-pink-600"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default WelcomePage;
