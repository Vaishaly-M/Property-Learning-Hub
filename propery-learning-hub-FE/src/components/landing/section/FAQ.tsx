// components/sections/FAQ.tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Do I need any experience to join?",
    a: "Absolutely not. FPA is designed for complete beginners through to experienced investors. Our staged curriculum means you always learn at the right level for you.",
  },
  {
    q: "What is rent-to-rent and can I start with no money?",
    a: "Rent-to-rent is a strategy where you rent a property from a landlord and sub-let it at a profit. It can be started with minimal capital — typically £2,000–£5,000 for furnishing and deposits.",
  },
  {
    q: "How long does the course take to complete?",
    a: "The core training can be completed in 4–8 weeks at your own pace. As an Academy Member you have lifetime access, so you can revisit content as your portfolio grows.",
  },
  {
    q: "What is included in the Academy Membership?",
    a: "Full course access, weekly live mentorship sessions, community posting rights, Q&A sessions, contracts, templates, bonus content and priority support.",
  },
  {
    q: "How often are the weekly meetings?",
    a: "Academy Members get access to live weekly group sessions hosted by experienced investors. Sessions are recorded so you never miss a thing.",
  },
  {
    q: "Can I get personal mentorship?",
    a: "Yes — Academy Members have direct access to mentors through weekly sessions, community channels and priority support. You are never on your own.",
  },
  {
    q: "Is property investing right for me as a beginner?",
    a: "If you are committed to learning and willing to take action, property investing is one of the most proven wealth-building strategies available. FPA gives you the education to do it safely.",
  },
  {
    q: "What investment strategies does FPA cover?",
    a: "Rent-to-rent, HMOs, buy-to-let, deal sourcing, lease options, portfolio scaling, refinancing and advanced wealth-building frameworks.",
  },
  {
    q: "Do I need a large amount of capital to start?",
    a: "Not necessarily. Several strategies taught at FPA, including rent-to-rent and deal sourcing, can be started with limited funds. We teach you to leverage what you have.",
  },
  {
    q: "Are the resources and contracts ready to use?",
    a: "Yes. All templates, agreements and contracts are professionally drafted and ready to customise for your deals from day one.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-gray-50/50" id="faq">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="text-center">
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">
            Questions Answered
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-blue-950 mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex justify-between items-center p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-gray-500 transition-transform ${openIndex === idx ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`px-5 pb-5 text-gray-600 text-sm leading-relaxed ${openIndex === idx ? "block" : "hidden"}`}
              >
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
