interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  // You can call onComplete directly or trigger it based on some action
  onComplete();

  return null;
}
