import { useState, useEffect } from "react";
import { WiSunrise, WiMoonAltWaningCrescent6 } from "react-icons/wi";
import { HiArrowLeft, HiArrowRight } from "react-icons/hi";

interface StepOneProps {
  onBack: () => void;
  onContinue: () => void;
}

const StepOne = ({ onBack, onContinue }: StepOneProps) => {
  const [wakeTime, setWakeTime] = useState("07:00");
  const [windDownTime, setWindDownTime] = useState("22:00");

  // Load from localStorage if already saved
  useEffect(() => {
    const getTimeFromStorage = (key: string) => {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const date = new Date(stored);
      if (isNaN(date.getTime())) return null;
      return date.toTimeString().slice(0, 5); // HH:mm format
    };

    const savedWake = getTimeFromStorage("wake-time");
    const savedWind = getTimeFromStorage("winddown-time");

    if (savedWake) setWakeTime(savedWake);
    if (savedWind) setWindDownTime(savedWind);
  }, []);


  const handleContinue = () => {
    const now = new Date();

    const getAdjustedTime = (timeStr: string): string => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);

      // If time has already passed today, schedule for tomorrow
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }

      return target.toISOString();
    };

    const adjustedWake = getAdjustedTime(wakeTime);
    const adjustedWind = getAdjustedTime(windDownTime);

    localStorage.setItem("wake-time", adjustedWake);
    localStorage.setItem("winddown-time", adjustedWind);
    onContinue();
  };

  const handleSkip = () => {
    onContinue();
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12 bg-gradient-to-br from-white to-gray-100 dark:from-black dark:to-gray-900 text-center">
      {/* Top Nav */}
      <div className="w-full max-w-2xl flex justify-between mb-6 px-1">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <HiArrowLeft className="text-base" />
          Back
        </button>

        {/* Skip Button */}
        <button
          onClick={handleSkip}
          className="flex items-center gap-2 text-sm font-medium text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-700 bg-pink-50 dark:bg-pink-900 px-4 py-2 rounded-full shadow-sm hover:bg-pink-100 dark:hover:bg-pink-800 transition-colors"
        >
          Skip
          <HiArrowRight className="text-base" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center gap-6 w-full max-w-xl">
        <h1 className="text-[42px] font-extrabold text-gray-900 dark:text-white leading-tight">
          Set your{" "}
          <WiSunrise className="inline-block text-[38px] text-pink-600" />{" "}
          wake-up <br />
          and{" "}
          <WiMoonAltWaningCrescent6 className="inline-block text-[38px] text-pink-600" />{" "}
          wind-down time
        </h1>

        <p className="text-[20px] text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
          Establish your ideal routine. These times will be tracked to build
          healthy habits around your day.
        </p>

        {/* Time Inputs */}
        <div className="w-full space-y-6 mt-4">
          <div className="flex justify-between items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-6 py-4 shadow-sm focus-within:border-pink-600 focus-within:ring-2 focus-within:ring-pink-200 dark:focus-within:ring-pink-800">
            <span className="text-[20px] font-medium flex items-center gap-2">
              <WiSunrise className="text-[30px] text-pink-600" />
              Wake up
            </span>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="appearance-none w-[140px] sm:w-[150px] text-[18px] text-right font-medium bg-transparent text-gray-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="flex justify-between items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-6 py-4 shadow-sm focus-within:border-pink-600 focus-within:ring-2 focus-within:ring-pink-200 dark:focus-within:ring-pink-800">
            <span className="text-[20px] font-medium flex items-center gap-2">
              <WiMoonAltWaningCrescent6 className="text-[30px] text-pink-600" />
              Wind down
            </span>
            <input
              type="time"
              value={windDownTime}
              onChange={(e) => setWindDownTime(e.target.value)}
              className="appearance-none w-[140px] sm:w-[150px] text-[18px] text-right font-medium bg-transparent text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="mt-10 w-full max-w-sm bg-black dark:bg-white text-white dark:text-black text-xl font-semibold py-4 px-6 rounded-full shadow-md hover:scale-105 transition-transform hover:bg-pink-600"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default StepOne;
