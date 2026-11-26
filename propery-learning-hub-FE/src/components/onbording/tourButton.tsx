"use client";

import { TourStep, useTour } from "@/hooks/onbording/useTour";
import { TourComponent } from "@/components/onbording/TourComponent";
import { Compass } from "lucide-react";

interface TourButtonProps {
  steps: TourStep[];
  label?: string;
}

export function TourButton({ steps, label = "Take a tour" }: TourButtonProps) {
  const { startTour, currentStep, isActive, next, prev, skip } = useTour(steps);

  return (
    <>
      {/* Tour modal */}
      <TourComponent
        steps={steps}
        currentStep={currentStep}
        isActive={isActive}
        onNext={next}
        onPrev={prev}
        onSkip={skip}
      />

      {/* Floating button */}
      <button
        onClick={startTour}
        title="Start guided tour"
        className="group fixed bottom-6 right-6 z-50 flex items-center gap-2
          bg-gradient-to-r from-blue-900 to-blue-700
          hover:from-blue-800 hover:to-blue-600
          text-white rounded-full px-4 py-2.5 text-sm font-medium
          shadow-lg hover:shadow-xl hover:shadow-blue-900/25
          transition-all duration-300 hover:scale-105 active:scale-95
          border border-white/10"
      >
        <Compass className="h-4 w-4" />
        <span>{label}</span>
      </button>
    </>
  );
}
