// src/components/onbording/loginSteps.ts
import { TourStep } from "@/hooks/onbording/useTour";

export const loginSteps: TourStep[] = [
  {
    intro:
      "Welcome to Freedom Property Academy! Let us quickly show you how to get started.",
    title: "Welcome!",
  },
  {
    element: "#login-email",
    title: "Your email",
    intro: "Enter the email address you registered with.",
    position: "bottom",
  },
  {
    element: "#login-password",
    title: "Your password",
    intro:
      "Enter your password. Click 'Show' if you want to see what you're typing.",
    position: "bottom",
  },
  {
    element: "#login-submit",
    title: "Sign in",
    intro:
      "Click here to access your dashboard once you've filled in your details.",
    position: "top",
  },
  {
    element: "#login-signup",
    title: "New here?",
    intro: "Don't have an account yet? Click Sign up to create one for free.",
    position: "top",
  },
];
