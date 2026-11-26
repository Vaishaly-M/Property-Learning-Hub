"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { TourStep } from "@/hooks/onbording/useTour";

interface TourComponentProps {
  steps: TourStep[];
  currentStep: number;
  isActive: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface TooltipPos {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right" | "center";
}

export function TourComponent({
  steps,
  currentStep,
  isActive,
  onNext,
  onPrev,
  onSkip,
}: TourComponentProps) {
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({
    top: 0,
    left: 0,
    placement: "center",
  });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const progress = ((currentStep + 1) / steps.length) * 100;

  useEffect(() => {
    if (!isActive) return;

    const elementSelector = step?.element;

    if (!elementSelector) {
      // No element = center modal
      setHighlightRect(null);
      setTooltipPos({ top: 0, left: 0, placement: "center" });
      return;
    }

    const el = document.querySelector(elementSelector);
    if (!el) {
      setHighlightRect(null);
      setTooltipPos({ top: 0, left: 0, placement: "center" });
      return;
    }

    // Scroll element into view
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setHighlightRect(rect);

      const tooltipWidth = 340;
      const tooltipHeight = 220;
      const gap = 16;
      const placement = step.position || "bottom";

      let top = 0;
      let left = 0;

      if (placement === "bottom") {
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
      } else if (placement === "top") {
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
      } else if (placement === "left") {
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
      } else if (placement === "right") {
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
      }

      // Keep tooltip inside viewport
      left = Math.max(
        12,
        Math.min(left, window.innerWidth - tooltipWidth - 12),
      );
      top = Math.max(
        12,
        Math.min(top, window.innerHeight - tooltipHeight - 12),
      );

      setTooltipPos({ top, left, placement });
    }, 300);
  }, [isActive, currentStep, step]);

  if (!isActive) return null;

  return (
    <>
      {/* Dark overlay with cutout for highlighted element */}
      {highlightRect ? (
        <>
          {/* Top overlay */}
          <div
            className="fixed inset-0 z-[98] bg-slate-900/60"
            style={{
              clipPath: `polygon(
                0% 0%, 100% 0%, 100% 100%, 0% 100%,
                0% ${highlightRect.top - 6}px,
                ${highlightRect.left - 6}px ${highlightRect.top - 6}px,
                ${highlightRect.left - 6}px ${highlightRect.bottom + 6}px,
                ${highlightRect.right + 6}px ${highlightRect.bottom + 6}px,
                ${highlightRect.right + 6}px ${highlightRect.top - 6}px,
                0% ${highlightRect.top - 6}px
              )`,
            }}
            onClick={onSkip}
          />
          {/* Highlight border around element */}
          <div
            className="fixed z-[99] pointer-events-none rounded-xl"
            style={{
              top: highlightRect.top - 6,
              left: highlightRect.left - 6,
              width: highlightRect.width + 12,
              height: highlightRect.height + 12,
              boxShadow: "0 0 0 3px #1e3a8a, 0 0 0 6px rgba(30,58,138,0.25)",
              transition: "all 0.3s ease",
            }}
          />
        </>
      ) : (
        /* Full dark overlay when no element (center modal) */
        <div
          className="fixed inset-0 z-[98] bg-slate-900/60 backdrop-blur-sm"
          onClick={onSkip}
        />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[100] w-[340px] bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden"
        style={
          tooltipPos.placement === "center"
            ? {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }
            : {
                top: tooltipPos.top,
                left: tooltipPos.left,
                transition: "top 0.3s ease, left 0.3s ease",
              }
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <span className="text-xs font-semibold text-blue-400 tracking-widest uppercase">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={onSkip}
            className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pt-3 pb-4">
          {step?.title && (
            <h3 className="text-lg font-bold text-blue-900 mb-1.5">
              {step.title}
            </h3>
          )}
          <p className="text-gray-500 text-sm leading-relaxed">{step?.intro}</p>
        </div>

        {/* Progress bar */}
        <div className="mx-5 h-1 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-blue-900 to-blue-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-4">
          <button
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-200
                  text-blue-900 rounded-lg hover:bg-blue-50 transition-all text-xs font-medium"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-4 py-1.5
                bg-gradient-to-r from-blue-900 to-blue-700 text-white
                rounded-lg hover:shadow-md hover:shadow-blue-900/30
                transition-all text-xs font-medium"
            >
              {isLast ? "Got it!" : "Next"}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
