"use client";

import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Target,
  TrendingUp,
  Users,
  Award,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Badge,
  Clock,
} from "lucide-react";

export default function AboutHero() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

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

  return (
    <section className="w-full py-2 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={stagger}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-2  shadow-sm">
              <span className="font-semibold text-sm uppercase tracking-wider">
                The Real Story
              </span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6"
          >
            <span className="block text-blue-950 dark:text-white">
              Biography
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600">
              Andrei Bosancu
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed"
          >
            Property Entrepreneur, Investor & Mentor with 15+ years of real
            experience
          </motion.p>

          {/* Stats Row - Compact Single Line */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 justify-center items-center mt-6"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
                Real experience, not theory
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors whitespace-nowrap">
              <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
                £2M+ SA business built
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors whitespace-nowrap">
              <Clock className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
                7 years SA Experience
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors whitespace-nowrap">
              <Award className="h-4 w-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
                15+ Years Experience
              </span>
            </div>
          </motion.div>

          {/* Divider */}
          <motion.div
            variants={fadeUp}
            className="mt-12 flex items-center justify-center gap-3"
          >
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-300 dark:to-blue-700"></div>
            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-blue-300 dark:to-blue-700"></div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
