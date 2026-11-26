// components/sections/Journey.tsx
"use client";

import {
  GraduationCap,
  BookOpen,
  Target,
  Zap,
  Home,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useInView } from "react-intersection-observer";

const steps = [
  {
    icon: GraduationCap,
    title: "Join Academy",
    desc: "Enrol and get instant access to your personalised learning dashboard.",
  },
  {
    icon: BookOpen,
    title: "Complete Training",
    desc: "Work through structured stages at your own pace with expert guidance.",
  },
  {
    icon: Target,
    title: "Attend Mentorship",
    desc: "Join live sessions with experienced investors and ask your real questions.",
  },
  {
    icon: Zap,
    title: "Implement Strategies",
    desc: "Take action with templates, contracts and systems in hand.",
  },
  {
    icon: Home,
    title: "Build Portfolio",
    desc: "Close your first deal and begin stacking cash-flowing properties.",
  },
  {
    icon: TrendingUp,
    title: "Achieve Financial Freedom",
    desc: "Replace your income through property and live life on your terms.",
  },
];

export default function Journey() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  const itemVariantsReverse: Variants = {
    hidden: { opacity: 0, x: 40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <section className="py-20 bg-white dark:bg-gray-950" id="journey">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full mb-4">
              <Sparkles size={16} />
              <span className="font-semibold text-sm uppercase tracking-wider">
                Your Roadmap
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-900 dark:text-white mb-4">
              The FPA Journey
            </h2>
            <p className="text-blue-600/70 dark:text-gray-400 text-lg">
              Six milestones. One outcome: financial freedom through property.
            </p>
          </motion.div>
        </div>

        {/* Timeline */}
        <div className="relative max-w-5xl mx-auto" ref={ref}>
          {/* Vertical Line - Reduced height and thinner */}
          <motion.div
            initial={{ height: 0 }}
            animate={inView ? { height: "100%" } : {}}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute left-1/2 transform -translate-x-1/2 w-0.5 bg-gradient-to-b from-blue-300 via-blue-400 to-blue-500 rounded-full hidden md:block"
          />

          {steps.map((step, idx) => {
            const isEven = idx % 2 === 0;
            const variants = isEven ? itemVariants : itemVariantsReverse;

            return (
              <motion.div
                key={idx}
                variants={containerVariants}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                className={`relative flex flex-col md:flex-row items-center mb-10 last:mb-0 ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Content Card - Reduced width and padding */}
                <motion.div
                  variants={variants}
                  className={`w-full md:w-[42%] ${isEven ? "md:pr-8" : "md:pl-8"}`}
                >
                  <div
                    className={`bg-white dark:bg-gray-900 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 ${
                      isEven ? "md:text-right" : "md:text-left"
                    }`}
                  >
                    <div
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white mb-3 ${
                        isEven ? "md:ml-auto" : ""
                      }`}
                    >
                      <step.icon size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-blue-900 dark:text-white mb-1.5">
                      {step.title}
                    </h3>
                    <p className="text-blue-600/70 dark:text-gray-400 text-sm leading-relaxed">
                      {step.desc}
                    </p>
                    <div
                      className={`flex items-center gap-2 mt-2 text-blue-600 dark:text-blue-400 text-sm font-medium ${
                        isEven ? "justify-end" : ""
                      } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    >
                      <span>Learn more</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </motion.div>

                {/* Step Number - Smaller */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: idx * 0.15 + 0.3 }}
                  className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 my-3 md:my-0 flex-shrink-0"
                >
                  <span className="text-md">{idx + 1}</span>
                  <span className="absolute inset-0 rounded-full bg-blue-600/30 animate-ping" />
                </motion.div>

                {/* Empty spacer */}
                <div className="w-full md:w-[42%] hidden md:block" />
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 px-5 py-3 rounded-xl border border-blue-200 dark:border-blue-800">
            <CheckCircle2 size={18} className="text-green-500" />
            <span className="text-blue-700 dark:text-gray-300 font-medium text-sm">
              Start your journey today — your future self will thank you
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
