import { useState } from "react";
import WelcomePage from "./components/WelcomePage";
import StepOne from "./components/StepOne";
import HabitApp from "./components/HabitApp";

function App() {
  const [step, setStep] = useState<"welcome" | "stepOne" | "app">("welcome");

  return (
    <div>
      {step === "welcome" && (
        <WelcomePage onGetStarted={() => setStep("stepOne")} />
      )}
      {step === "stepOne" && (
        <StepOne
          onBack={() => setStep("welcome")}
          onContinue={() => setStep("app")}
        />
      )}
      {step === "app" && <HabitApp />}
    </div>
  );
}

export default App;
