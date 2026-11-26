import { TourStep } from "@/hooks/onbording/useTour";

export const paymentSteps: TourStep[] = [
  {
    intro:
      "Welcome to enrollment! Let us walk you through the checkout process step by step.",
    title: "Complete your enrollment",
  },
  {
    element: "#payment-product-info",
    title: "What you're getting",
    intro:
      "Here's a summary of everything included in your Freedom Property Journey membership.",
    position: "right",
  },
  {
    element: "#payment-price",
    title: "One-time payment",
    intro:
      "This is a one-time payment of £3,000. No hidden fees, no recurring charges.",
    position: "right",
  },
  {
    element: "#payment-features",
    title: "Your benefits",
    intro:
      "You get live mentorship, weekly meetings, community access, templates and much more.",
    position: "right",
  },
  {
    element: "#payment-first-name",
    title: "Your first name",
    intro:
      "Start by entering your first name. This will be used for your academy account.",
    position: "bottom",
  },
  {
    element: "#payment-last-name",
    title: "Your last name",
    intro:
      "Enter your last name to complete your full name for the academy account.",
    position: "bottom",
  },
  {
    element: "#payment-email",
    title: "Your email address",
    intro:
      "Enter a valid email — your login details and course access will be sent here after payment.",
    position: "bottom",
  },
  {
    element: "#payment-phone",
    title: "Your phone number",
    intro:
      "We'll use this to contact you about your mentorship sessions and live meetings.",
    position: "bottom",
  },
  {
    element: "#payment-card",
    title: "Payment details",
    intro:
      "Enter your card details securely. Your payment is encrypted and processed by Stripe.",
    position: "top",
  },
  {
    element: "#payment-card-number",
    title: "Card number",
    intro:
      "Type your 16-digit card number here. We accept Visa, Mastercard, Amex and more.",
    position: "top",
  },
  {
    element: "#payment-submit",
    title: "Complete enrollment",
    intro:
      "Click here to pay and get instant access. You'll set your password on the next step.",
    position: "top",
  },
];
