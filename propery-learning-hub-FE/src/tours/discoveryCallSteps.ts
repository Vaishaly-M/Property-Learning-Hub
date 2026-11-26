import { TourStep } from "@/hooks/onbording/useTour";

export const discoveryCallSteps: TourStep[] = [
  {
    intro:
      "Welcome! This page lets you book a free 30-minute strategy call with Andrei. Let us walk you through it.",
    title: "Book your discovery call",
  },
  {
    element: "#discovery-header",
    title: "What is this call?",
    intro:
      "A free 30-minute Zoom call with Andrei to discuss your property investment goals and how we can help.",
    position: "bottom",
  },
  {
    element: "#booking-first-name",
    title: "Your first name",
    intro: "Enter your first name so Andrei knows who he's speaking with.",
    position: "right",
  },
  {
    element: "#booking-last-name",
    title: "Your last name",
    intro: "Enter your last name to complete your full name.",
    position: "right",
  },
  {
    element: "#booking-email",
    title: "Your email address",
    intro:
      "Your Zoom invite and call confirmation will be sent to this email. Make sure it's correct!",
    position: "right",
  },
  {
    element: "#booking-phone",
    title: "Phone number",
    intro:
      "Optional — add your phone number in case we need to reach you before the call.",
    position: "right",
  },
  {
    element: "#booking-notes",
    title: "Tell us about yourself",
    intro:
      "Share where you are in your property journey and what's holding you back. This helps Andrei prepare for your call.",
    position: "right",
  },
  {
    element: "#booking-guests",
    title: "Add a participant",
    intro:
      "Bringing a partner or colleague? Add up to 5 extra participants here so they get the Zoom invite too.",
    position: "right",
  },
  {
    element: "#booking-calendar",
    title: "Pick a date",
    intro:
      "Click any available date on the calendar to see Andrei's available time slots for that day.",
    position: "left",
  },
  {
    element: "#booking-submit",
    title: "Book your call",
    intro:
      "Once you've filled in your details and selected a time, click here to confirm your booking.",
    position: "top",
  },
];
