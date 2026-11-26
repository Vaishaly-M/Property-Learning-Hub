"use client";

import Image from "next/image";

export default function TransitionIntoSA() {
  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-10 shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-36 h-36 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-full -translate-x-16 -translate-y-16 opacity-60"></div>
      <div className="absolute bottom-0 right-0 w-44 h-44 bg-gradient-to-tl from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-full translate-x-22 translate-y-22 opacity-60"></div>

      {/* Corner Accents */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-blue-300 dark:border-blue-700 rounded-tl-3xl"></div>
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-green-300 dark:border-green-700 rounded-br-3xl"></div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-500 dark:to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <div className="text-white text-3xl font-bold">SA</div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Transition into Serviced Accommodation
          </h1>
          <div className="flex items-center space-x-4 mt-3">
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-300 dark:from-blue-400 dark:to-blue-600 rounded-full"></div>
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              From 2 units to £2M turnover
            </div>
            <div className="w-12 h-1 bg-gradient-to-l from-green-500 to-green-300 dark:from-green-400 dark:to-green-600 rounded-full"></div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-4xl mx-auto">
          {/* Two Images Section - Side by Side */}
          <div className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Transaction Screenshot */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 aspect-video group">
                <Image
                  src="/campaign/transaction3.png"
                  alt="Serviced Accommodation Transaction Dashboard - Monthly Revenue"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"></div>
              </div>

              {/* Second Transaction Screenshot */}
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 aspect-video group">
                <Image
                  src="/campaign/transaction4.png"
                  alt="Serviced Accommodation Transaction Details - Individual Bookings"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={true}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent"></div>
              </div>
            </div>

            {/* Image Description */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real transaction data showing monthly revenue and booking
                performance
              </p>
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-8">
            {/* First Paragraph */}
            <div className="relative">
              {/* Decorative Side Elements */}
              <div className="absolute -left-8 top-0 bottom-0 w-6 flex flex-col items-center">
                <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full mb-2"></div>
                <div className="flex-1 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200 dark:from-blue-600 dark:to-blue-800"></div>
              </div>

              <div className="pl-8">
                <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                  As my experience grew, I recognised the limits of traditional
                  buy-to-let and transitioned into Serviced Accommodation. I
                  started with just two units and managed everything myself.
                  Through systems, discipline, and long working hours, the
                  business scaled and eventually reached an annual turnover of
                  approximately £2,000,000.
                </p>
              </div>
            </div>

            {/* Second Paragraph in a Card - Glassmorphism */}
            <div className="relative">
              <div className="backdrop-blur-xl bg-gradient-to-br from-blue-400/20 via-green-400/10 to-blue-400/5 dark:from-blue-400/10 dark:via-green-400/5 dark:to-blue-400/5 p-6 md:p-8 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg border-r-4 border-blue-500 dark:border-blue-400">
                <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                  This wasn't passive income — it was built through execution,
                  operational control, and constant refinement.
                </p>
              </div>
            </div>
          </div>

          {/* Turnover Highlight */}
          <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col items-center">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                ANNUAL TURNOVER ACHIEVED
              </div>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent">
                £2,000,000
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Started with 2 units
                  </span>
                </div>
                <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-700"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Systems & Discipline
                  </span>
                </div>
                <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-700"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Active Execution
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
