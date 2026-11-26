"use client";

import { Star, MapPin, User, Quote, CheckCircle } from "lucide-react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

export default function BeginnerTestimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  const testimonials = [
    {
      name: "Sarah M.",
      location: "Birmingham",
      content:
        "Working with Andrei completely changed the trajectory of my serviced accommodation business. I came in with zero experience and a lot of fear, and within 6 weeks I secured my first deal. His step‑by‑step guidance made everything feel simple and achievable. If you're on the fence—jump in. It's truly life‑changing.",
      photo: "Sarah.png",
      achievement: "First Deal in 6 Weeks",
      stats: ["Zero Experience", "6 Weeks", "First Deal"],
    },
    {
      name: "Daniel R.",
      location: "Manchester",
      content:
        "I had been trying to start my Airbnb business for over a year with no real progress. After joining Andrei's mentorship, everything clicked. The strategies are practical, the support is hands‑on, and Andrei genuinely cares. I've now added three units in the last four months. Best investment I've ever made.",
      photo: "Daniel.png",
      achievement: "3 Units in 4 Months",
      stats: ["1 Year Stuck", "3 Units", "4 Months"],
    },
    {
      name: "Francesca P.",
      location: "London",
      content:
        "What sets Andrei apart is the way he breaks down complex things into simple, actionable steps. I'm a full‑time nurse and didn't think I had time to start a property business—but with his systems, I secured my first SA property while still working full-time. I earn more from my unit now than from all my overtime hours combined.",
      photo: "Francesca.png",
      achievement: "Income > Overtime",
      stats: ["Full-Time", "First Property", "Higher Income"],
    },
    {
      name: "Kareem H.",
      location: "Newcastle",
      content:
        "The mentorship is the real deal. Andrei doesn't just give information—he gives you a roadmap. From scripts to negotiation techniques, to setting up operations… everything is covered. I went from zero to fully booked in 3 weeks. I honestly wish I had found this sooner.",
      photo: "Kareem.png",
      achievement: "Fully Booked in 3 Weeks",
      stats: ["3 Weeks", "Fully Booked", "Complete Roadmap"],
    },
    {
      name: "Emma & Josh Team",
      location: "Bristol",
      content:
        "We joined the mentorship as complete beginners, newly married with very little capital. Andrei helped us secure a rent‑to‑SA property in record time and taught us how to automate it so we can manage it while traveling. He's supportive, funny, and genuinely wants you to win.",
      photo: "EmmaJosh.png",
      achievement: "Automated Business",
      stats: ["Newly Married", "Low Capital", "Automated"],
    },
    {
      name: "Oliver D.",
      location: "Glasgow",
      content:
        "I've taken other property courses before, but nothing compares to Andrei's program. The community, the accountability, and the clarity are unmatched. After applying his pricing strategy, my occupancy jumped from 57% to over 90% within two months. Highly recommended!",
      photo: "Oliver.png",
      achievement: "57% → 90% Occupancy",
      stats: ["90% Occupancy", "2 Months", "Community"],
    },
  ];

  return (
    <section ref={ref} className="py-16 bg-gray-50/50 dark:bg-gray-900/30">
      {/* Using exact same container structure as header */}
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-4xl mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider">
                From Zero to Profitable
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mt-3 leading-tight">
                Real people who started with no experience and built successful
                SA businesses
              </h2>
            </motion.div>
          </div>

          {/* Modern 3-Column Grid - Smaller Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-2xl hover:border-blue-200 transition-all duration-500 hover:-translate-y-2 dark:bg-gray-900 dark:border-gray-800 dark:hover:border-blue-800"
              >
                {/* Card Header - Smaller */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                        <Image
                          src={`/reviewers/${testimonial.photo}`}
                          alt={`${testimonial.name} profile photo`}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                          sizes="48px"
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">
                        {testimonial.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="font-medium text-xs">
                          {testimonial.location}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                </div>

                {/* Achievement Badge - Smaller */}
                <div className="mb-4">
                  <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-100 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300 dark:border-blue-800">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-bold text-sm">
                      {testimonial.achievement}
                    </span>
                  </div>
                </div>

                {/* Quote Icon & Content - Smaller */}
                <div className="relative mb-4">
                  <Quote className="absolute -top-1.5 -left-1.5 w-8 h-8 text-blue-100 dark:text-blue-900/30" />
                  <p className="text-gray-700 leading-relaxed text-sm pl-3 dark:text-gray-300 line-clamp-4">
                    "{testimonial.content}"
                  </p>
                </div>

                {/* Stats - Smaller */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {testimonial.stats.map((stat, statIndex) => (
                    <span
                      key={statIndex}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100 group-hover:border-blue-200 transition-colors dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300 dark:border-blue-800"
                    >
                      {stat}
                    </span>
                  ))}
                </div>

                {/* Card Footer - Smaller */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-600 font-medium">
                    Success Story #{index + 1}
                  </span>
                  <div className="text-blue-600 dark:text-blue-400 font-semibold text-xs">
                    Verified Beginner
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
