// components/sections/AboutMentor.tsx
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";

export default function AboutMentor() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section className="py-12 sm:py-16 bg-white dark:bg-gray-950">
      {/* Using exact same container structure as header */}
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-6xl mx-auto mb-10 sm:mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider">
                Meet Your Mentor
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mt-2 sm:mt-3 leading-tight">
                From Construction Worker to{" "}
                <span className="bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                  £2M+
                </span>{" "}
                Property Portfolio
              </h2>
            </motion.div>
          </div>

          <div ref={ref}>
            {/* Main Content - Grid Layout */}
            <div className="grid lg:grid-cols-3 gap-8 md:gap-12 items-start">
              {/* Left - Image - Takes 1/3 */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6 }}
                className="lg:col-span-1"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-xl max-w-xs mx-auto lg:max-w-full">
                  <div className="relative aspect-[4/5] w-full">
                    <Image
                      src="/landingImages/mentor.png"
                      alt="Andrei Bosancu"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 sm:p-5">
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      Andrei Bosancu
                    </h3>
                    <p className="text-blue-200 text-xs sm:text-sm">
                      Property Entrepreneur & Mentor
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Right - Content - Takes 2/3 */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="lg:col-span-2 space-y-4 sm:space-y-6"
              >
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-white mb-3 sm:mb-4">
                    Hey, I'm Andrei Bosancu.
                  </h3>
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                    Not too long ago, I was exactly where you might be right
                    now. I was working long, exhausting hours in the
                    construction industry. On paper, I was earning a living. But
                    in reality? I had zero time. I was missing out on family
                    dinners, turning down friends, and completely losing my
                    social life. The work consumed everything.
                  </p>
                </div>

                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  I knew something had to change. I didn't want to just survive;
                  I wanted a real work-life balance.
                </p>

                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  So, in 2019, I took a leap into the Rent-to-Serviced
                  Accommodation (SA) market. I didn't have millions in the bank
                  to buy buildings, but I had a system.
                </p>

                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Fast forward 7 years. Today, that system has allowed me to
                  scale a portfolio of over 100 properties—all legally rented,
                  fully occupied, and generating over{" "}
                  <span className="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                    £2 million
                  </span>{" "}
                  in revenue. But more importantly? I got my time back.
                </p>
                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="pt-2"
                >
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg hover:shadow-xl hover:shadow-green-200/50 hover:from-green-700 hover:to-green-800 hover:scale-105 transition-all duration-300"
                  >
                    Let Andrei Guide You to Success
                    <ArrowRight size={18} className="sm:w-5 sm:h-5" />
                  </Link>
                </motion.div>
              </motion.div>
            </div>

            {/* Full Width - Why I'm Telling You This */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 sm:mt-16"
            >
              <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5 sm:p-8 md:p-10 lg:p-12 rounded-2xl sm:rounded-3xl border border-blue-200 dark:border-blue-800 max-w-6xl mx-auto shadow-lg">
                {/* Quote Icon */}
                <div className="absolute -top-3 sm:-top-4 -left-3 sm:-left-4 bg-blue-600 dark:bg-blue-500 rounded-full p-2 sm:p-3 shadow-lg">
                  <Quote className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>

                <div className="ml-2 sm:ml-4">
                  <h4 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-white mb-4 sm:mb-5">
                    Why I'm Telling You This
                  </h4>
                  <div className="space-y-3 sm:space-y-4">
                    <p className="text-sm sm:text-base md:text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                      I'm not a theorist or a textbook guru. I am in the
                      trenches of the UK property market every single day. I
                      know the mistakes beginners make because I made them
                      myself. I know how intimidating it feels to talk to your
                      first landlord or agent.
                    </p>
                    <p className="text-sm sm:text-base md:text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                      This Academy isn't about get-rich-quick fluff. It is the
                      exact step-by-step blueprint I used to escape the
                      construction site and build a multi-million-pound
                      business.
                    </p>
                    <div className="bg-white/50 dark:bg-gray-900/30 p-4 sm:p-5 md:p-6 rounded-xl border border-blue-200/50 dark:border-blue-800/50 mt-3 sm:mt-4">
                      <p className="text-sm sm:text-base md:text-lg text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                        "If a busy construction worker with zero property
                        background could do this, you can too. Let me save you
                        years of trial and error and show you the short, legal,
                        and profitable path to financial freedom."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
