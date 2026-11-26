// components/sections/Programs.tsx
"use client";

import { Check, X } from "lucide-react";

const plans = [
  {
    name: "Property Investment Course",
    price: "1,000",
    description:
      "The complete foundation for first-time property investors ready to build real knowledge.",
    featured: false,
    features: [
      { included: true, text: "Full Property Training" },
      { included: true, text: "Comprehensive Video Lessons" },
      { included: true, text: "Downloadable Resources" },
      { included: true, text: "Real Case Studies" },
      { included: true, text: "Progress Tracking" },
      { included: true, text: "Community View Access" },
      { included: false, text: "Community Posting" },
      { included: false, text: "Weekly Live Meetings" },
      { included: false, text: "Personal Mentorship" },
    ],
  },
  {
    name: "Academy Membership",
    price: "3,000",
    description:
      "The full FPA experience — mentorship, community, live sessions and everything in the course.",
    featured: true,
    features: [
      { included: true, text: "Everything In Course" },
      { included: true, text: "Weekly Live Meetings" },
      { included: true, text: "Live Personal Mentorship" },
      { included: true, text: "Full Community Access" },
      { included: true, text: "Networking Opportunities" },
      { included: true, text: "Bonus Content & Updates" },
      { included: true, text: "Templates & Contracts" },
      { included: true, text: "Live Q&A Sessions" },
      { included: true, text: "Priority Support" },
    ],
  },
];

export default function Programs() {
  return (
    <section className="py-16 bg-white" id="programs">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-blue-600 font-semibold text-base uppercase tracking-wider">
          Investment In Your Future
        </span>
        <h2 className="text-4xl sm:text-5xl font-bold text-blue-950 mt-3">
          Choose Your Path
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mt-5">
          Two clear entry points. One destination: financial freedom through
          property.
        </p>

        <div className="flex flex-col lg:flex-row justify-center items-stretch gap-10 mt-16 max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`flex-1 bg-white rounded-2xl p-10 border transition-all hover:-translate-y-1 ${
                plan.featured
                  ? "border-blue-300 shadow-xl relative"
                  : "border-gray-200 shadow-md"
              }`}
            >
              {plan.featured && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-bold px-5 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}
              <p className="text-5xl font-bold text-blue-950">
                £<span className="text-6xl">{plan.price}</span>
              </p>
              <h3 className="text-2xl font-bold text-blue-950 mt-5">
                {plan.name}
              </h3>
              <p className="text-base text-gray-500 mt-3 pb-5 border-b border-gray-100">
                {plan.description}
              </p>
              <ul className="mt-8 space-y-4 text-left">
                {plan.features.map((feature, fIdx) => (
                  <li
                    key={fIdx}
                    className={`flex items-center gap-3 text-base ${!feature.included ? "opacity-40" : ""}`}
                  >
                    {feature.included ? (
                      <Check
                        size={20}
                        className="text-blue-600 flex-shrink-0"
                      />
                    ) : (
                      <X size={20} className="text-gray-400 flex-shrink-0" />
                    )}
                    <span
                      className={
                        feature.included ? "text-gray-700" : "text-gray-500"
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                className={`mt-10 w-full py-4 rounded-xl font-semibold text-base transition-all ${
                  plan.featured
                    ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md hover:shadow-lg"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {plan.featured ? "Become A Member" : "Purchase Course"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
