"use client";

import Image from "next/image";

export default function UKConstruction() {
  return (
    <section className="py-16 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-10 shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-full -translate-x-20 -translate-y-20 opacity-70"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-gradient-to-tl from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-full translate-x-24 translate-y-24 opacity-70"></div>

            {/* Corner Accents */}
            <div className="absolute top-6 right-6 w-16 h-16 border-t-2 border-r-2 border-blue-300 dark:border-blue-700 rounded-tr-3xl"></div>
            <div className="absolute bottom-6 left-6 w-16 h-16 border-b-2 border-l-2 border-green-300 dark:border-green-700 rounded-bl-3xl"></div>

            {/* Main Content */}
            <div className="relative z-10">
              {/* Header with Icon */}
              <div className="flex flex-col items-center mb-10">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-500 dark:to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                  <div className="text-white text-3xl font-bold">UK</div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-2">
                  UK Construction & Early Career
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg md:text-xl text-center">
                  2015 - 2020
                </p>
              </div>

              {/* Content Container - Full Width */}
              <div className="w-full">
                {/* Top Row: Image and Stats - Full Width Layout */}
                <div className="flex flex-col lg:flex-row gap-8 mb-10">
                  {/* Construction Image - Full height on desktop */}
                  <div className="lg:w-2/5">
                    <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 h-64 lg:h-full min-h-[300px]">
                      <Image
                        src="/campaign/construction.png"
                        alt="UK Construction & Electrical Work"
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        priority={true}
                        style={{ objectPosition: "center 30%" }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                    </div>
                  </div>

                  {/* Stats and Details - Full width cards with glassmorphism */}
                  <div className="lg:w-3/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-400/20 via-blue-500/10 to-blue-600/5 dark:from-blue-400/10 dark:via-blue-500/5 dark:to-blue-600/5 p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg flex flex-col justify-center">
                        <div className="text-4xl font-bold text-blue-700 dark:text-blue-400 mb-2">
                          25+
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 font-medium">
                          Team Members
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          Managed projects with teams up to 25 people
                        </div>
                      </div>

                      <div className="backdrop-blur-xl bg-gradient-to-br from-green-400/20 via-green-500/10 to-green-600/5 dark:from-green-400/10 dark:via-green-500/5 dark:to-green-600/5 p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg flex flex-col justify-center">
                        <div className="text-4xl font-bold text-green-700 dark:text-green-400 mb-2">
                          5
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 font-medium">
                          Years Experience
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          2015-2020 in construction industry
                        </div>
                      </div>

                      {/* Projects Included - Full width card spanning both columns with center alignment */}
                      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-400/20 via-blue-500/10 to-blue-600/5 dark:from-blue-400/10 dark:via-blue-500/5 dark:to-blue-600/5 p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg sm:col-span-2 flex flex-col items-center">
                        <div className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                          Projects Included
                        </div>
                        <div className="flex flex-wrap gap-12 justify-center">
                          <span className="px-5 py-2.5 bg-white/30 dark:bg-white/10 backdrop-blur-sm text-green-700 dark:text-green-300 rounded-full font-medium text-sm hover:bg-white/50 dark:hover:bg-white/20 transition-colors border border-white/20 dark:border-white/10">
                            Residential
                          </span>
                          <span className="px-5 py-2.5 bg-white/30 dark:bg-white/10 backdrop-blur-sm text-green-700 dark:text-green-300 rounded-full font-medium text-sm hover:bg-white/50 dark:hover:bg-white/20 transition-colors border border-white/20 dark:border-white/10">
                            Commercial
                          </span>
                          <span className="px-5 py-2.5 bg-white/30 dark:bg-white/10 backdrop-blur-sm text-green-700 dark:text-green-300 rounded-full font-medium text-sm hover:bg-white/50 dark:hover:bg-white/20 transition-colors border border-white/20 dark:border-white/10">
                            New Build
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Biography Content - Full Width */}
                <div className="w-full space-y-8">
                  {/* First Paragraph */}
                  <div className="relative">
                    {/* Decorative Line Left */}
                    <div className="absolute -left-8 top-0 bottom-0 w-6 flex flex-col items-center">
                      <div className="w-4 h-4 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                      <div className="flex-1 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200 dark:from-blue-600 dark:to-blue-800"></div>
                    </div>

                    <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed pl-8">
                      Between 2015 and 2020, I worked hands-on in the UK
                      construction and renovation industry. I operated as an
                      electrical and construction contractor, managing projects
                      and employing teams of up to 25 people. I worked on both
                      residential and commercial sites, including large-scale
                      projects such as the AstraZeneca headquarters in
                      Cambridge.
                    </p>
                  </div>

                  {/* Second Paragraph */}
                  <div className="relative">
                    {/* Decorative Line Right */}
                    <div className="absolute -right-8 top-0 bottom-0 w-6 flex flex-col items-center">
                      <div className="w-4 h-4 bg-green-500 dark:bg-green-400 rounded-full"></div>
                      <div className="flex-1 w-0.5 bg-gradient-to-b from-green-400 to-green-200 dark:from-green-600 dark:to-green-800"></div>
                    </div>

                    <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed pr-8">
                      This period shaped everything that followed. Being on-site
                      taught me how properties truly function — from layouts and
                      structural decisions to cost control, compliance, and
                      timelines. These lessons became the foundation of my
                      approach to property and business.
                    </p>
                  </div>
                </div>

                {/* Decorative Bottom Elements */}
                <div className="flex items-center justify-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400 rounded-full"></div>
                    <div className="flex items-center space-x-4">
                      <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full"></div>
                    </div>
                    <div className="w-16 h-1 bg-gradient-to-l from-green-500 to-green-300 dark:from-green-600 dark:to-green-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
