import { useState, useCallback } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { DASHBOARD_STEPS } from './steps';
import type { CoachMarkStep } from './steps';

const STORAGE_KEY = 'onboarding_seen_steps';

interface CoachMarksState {
  active: boolean;
  stepIndex: number;
  currentStep: CoachMarkStep | null;
  next: () => void;
  skip: () => void;
  start: () => void;
  isComplete: boolean;
}

export function useCoachMarks(): CoachMarksState {
  const [seenSteps, setSeenSteps] = useLocalStorage<string[]>(STORAGE_KEY, []);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = DASHBOARD_STEPS;
  const isComplete = seenSteps.length > 0;

  const markAllSeen = useCallback(() => {
    setSeenSteps(steps.map((s) => s.id));
    setActive(false);
  }, [steps, setSeenSteps]);

  const next = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      markAllSeen();
    } else {
      setStepIndex(nextIndex);
    }
  }, [stepIndex, steps.length, markAllSeen]);

  const skip = useCallback(() => {
    markAllSeen();
  }, [markAllSeen]);

  const start = useCallback(() => {
    if (isComplete) return;
    setStepIndex(0);
    setActive(true);
  }, [isComplete]);

  return {
    active,
    stepIndex,
    currentStep: active ? steps[stepIndex] ?? null : null,
    next,
    skip,
    start,
    isComplete,
  };
}
