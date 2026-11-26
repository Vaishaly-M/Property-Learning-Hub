// components/sections/Hero.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export default function Headline() {
  return (
    <section className="relative w-full overflow-hidden bg-white dark:bg-gray-950 pt-16">
      {/* Background - Diagonal Lines */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, #1e40af 0px, #1e40af 1px, transparent 1px, transparent 30px)`,
            }}
          />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      {/* Content - Exact same padding as header */}
      <div className="w-full relative z-10 py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center"
          >
            {/* Badge */}
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full px-5 py-1.5 mb-6 shadow-lg shadow-blue-500/20">
                <Sparkles size={14} className="text-blue-200" />
                <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider">
                  YOU CAN DO THIS IN 90 DAYS
                </span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-blue-950 dark:text-white leading-[1.1] mb-6"
            >
              <span className="block">
                Replace Your Salary in 90 Days Using the Rent-to-Serviced
                Accommodation Strategy.
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              variants={fadeUp}
              className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-4xl mx-auto mb-8"
            >
              A step-by-step, beginner-friendly training designed to take you
              from zero property knowledge to your first income-generating
              short-let. Learn how to leverage other people's properties to
              build your financial freedom today.
            </motion.p>

            {/* CTA - Secure Your Training Spot + Green Button */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center gap-3 mb-8"
            >
              <span className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">
                Secure Your Training Spot
              </span>
              <div className="flex flex-wrap items-center justify-center gap-5">
                <Link
                  href="/agreement?next=payment"
                  className="inline-flex items-center gap-2 px-8 sm:px-8 py-3 sm:py-3.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-green-700 hover:to-green-800 hover:scale-105 transition-all duration-300 text-sm sm:text-base"
                >
                  Join the academy
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>

                {/* Book a Discovery Call Button - No icon */}
                <Link
                  href="/discovery-call"
                  className="inline-flex items-center px-8 sm:px-8 py-3 sm:py-3.5 text-gray-600 dark:text-green-400 font-bold rounded-xl shadow-lg backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 border border-green-200 dark:border-green-800 hover:shadow-xl hover:bg-white/50 dark:hover:bg-gray-800/50 hover:scale-105 transition-all duration-300 text-sm sm:text-base"
                >
                  Book a Discovery Call
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave Decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          className="relative block w-full h-6 md:h-8"
        >
          <path
            d="M0,0V30.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            fill="white"
            className="dark:fill-gray-950 fill-white"
          />
        </svg>
      </div>
    </section>
  );
}
