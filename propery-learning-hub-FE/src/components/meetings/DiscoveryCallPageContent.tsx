"use client";

import { Clock, Video } from "lucide-react";
import LandingStrategyBooking from "./LandingStrategyBooking";
import { TourButton } from "@/components/onbording/tourButton";
import { discoveryCallSteps } from "@/tours/discoveryCallSteps";

export default function DiscoveryCallPageContent() {
  return (
    <section className="py-6 sm:py-8 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-6xl">
        {/* Header — id added */}
        <div
          id="discovery-header"
          className="max-w-2xl mx-auto text-center mb-6 sm:mb-8"
        >
          <div className="inline-flex items-center justify-center gap-2 text-sm text-slate-600 mb-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-900">
              <Video className="w-4 h-4" />
              Freedom Property Education
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
            Schedule a strategic call with Andrei
          </h1>

          {/* Call details — id added */}
          <div
            id="discovery-details"
            className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              30 minutes
            </span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span>Zoom</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span>Free</span>
          </div>

          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Tell us a bit about yourself and pick a time that works for you.
          </p>
        </div>

        {/* Booking widget — id added */}
        <div
          id="discovery-booking"
          className="rounded-2xl overflow-hidden shadow-xl shadow-slate-200/80 border border-slate-200/80 bg-white"
        >
          <LandingStrategyBooking />
        </div>
      </div>

      {/* Floating tour button */}
      <TourButton steps={discoveryCallSteps} label="How to book" />
    </section>
  );
}
