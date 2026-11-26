// components/landing/section/Curriculum.tsx
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  GraduationCap,
  Target,
  TrendingUp,
  Users,
  Search,
  Library,
  Award,
  Calendar,
  Building2,
  PoundSterling,
  Phone,
  UserCheck,
} from "lucide-react";

const reasons = [
  {
    icon: GraduationCap,
    title: "Property Investment Education",
    description:
      "Structured training from first deal to full portfolio, built on real-world experience.",
  },
  {
    icon: Target,
    title: "Live Mentorship",
    description:
      "Direct access to experienced investors with multi-million pound portfolios.",
  },
  {
    icon: TrendingUp,
    title: "Investment Strategies",
    description:
      "Proven frameworks including rent-to-rent, HMOs, buy-to-let, and deal sourcing.",
  },
  {
    icon: Users,
    title: "Community Network",
    description:
      "Connect with hundreds of active investors for deals, insights, and partnerships.",
  },
  {
    icon: Search,
    title: "Deal Analysis",
    description:
      "Learn to evaluate properties with cash flow modelling, ROI, and due diligence.",
  },
  {
    icon: Library,
    title: "Resource Library",
    description:
      "Contracts, templates, legal documents, and scripts ready to use from day one.",
  },
  {
    icon: UserCheck,
    title: "Personalised Blueprint",
    description:
      "Customised action plan tailored to your goals, finances, and local market.",
  },
  {
    icon: Phone,
    title: "1:1 Support",
    description:
      "One-on-one coaching calls with mentors who guide you through every decision.",
  },
  {
    icon: Calendar,
    title: "Weekly Group Calls",
    description:
      "Live training sessions covering market updates and strategy deep-dives.",
  },
  {
    icon: Award,
    title: "7 Years of Experience",
    description:
      "Learn from 7+ years of hands-on investing, including mistakes and wins.",
  },
  {
    icon: Building2,
    title: "200+ Properties",
    description:
      "Our UK portfolio spans over 200 properties with proven strategies.",
  },
  {
    icon: PoundSterling,
    title: "£2M+ Turnover",
    description:
      "Combined portfolio generates over £2 million annual turnover.",
  },
];

export default function Curriculum() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section className="py-16 bg-gray-50/50 dark:bg-gray-900/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-4xl mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-base uppercase tracking-wider">
                Why Choose Us
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mt-3 leading-tight">
                Everything You Need to
                <br />
                Succeed in Property
              </h2>
            </motion.div>
          </div>

          {/* Features Grid - 3 columns with centered content and medium cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {reasons.map((reason, idx) => (
              <motion.div
                key={idx}
                ref={ref}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: idx * 0.02 }}
                className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-pointer text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/50 transition-colors">
                  <reason.icon
                    size={20}
                    className="text-blue-600 dark:text-blue-400"
                  />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-tight">
                  {reason.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {reason.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
