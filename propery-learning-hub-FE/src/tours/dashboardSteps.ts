import { TourStep } from "@/hooks/onbording/useTour";

export const dashboardSteps: TourStep[] = [
  {
    intro: "👋 Welcome to your dashboard! Let us show you what's here.",
    title: "Your dashboard",
  },
  {
    element: "#main-nav",
    title: "Navigation",
    intro: "Use this menu to access Courses, Deal Finder, and Community.",
    position: "bottom",
  },
  {
    element: "#course-section",
    title: "Your courses",
    intro:
      "Continue your property investment modules and track your progress here.",
    position: "right",
  },
  {
    element: "#deal-finder",
    title: "Deal Finder",
    intro:
      "Browse real investment deals — HMOs, rent-to-rent, sourced by our experts.",
    position: "left",
  },
  {
    element: "#community-feed",
    title: "Community",
    intro: "Ask questions and connect with thousands of property investors.",
    position: "top",
  },
];
