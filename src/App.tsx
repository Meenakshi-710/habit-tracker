import { useState } from "react";
import WelcomePage from "./components/WelcomePage";
import HabitApp from "./components/HabitApp"; // renamed Habit Tracker component

function App() {
  const [started, setStarted] = useState(false);

  return (
    <div className="">
      {!started ? (
        <WelcomePage onGetStarted={() => setStarted(true)} />
      ) : (
        <HabitApp />
      )}
    </div>
  );
}

export default App;
