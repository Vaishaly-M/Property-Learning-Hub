"use client";

import { useState, useCallback } from "react";

export interface TourStep {
  element?: string;
  intro: string;
  title?: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function useTour(steps: TourStep[]) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
  }, []);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsActive(false);
    }
  }, [currentStep, steps.length]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    setIsActive(false);
  }, []);

  return { startTour, currentStep, isActive, next, prev, skip };
}
