// components/auth/AuthLayout.tsx
"use client";

import React, { ReactNode } from "react";
import { ChevronLeft, Home, Key } from "lucide-react";
import Link from "next/link";
import Header from "../landing/header";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const AuthLayout = ({
  children,
  title = "Welcome Back",
  subtitle = "Sign in to your account",
}: AuthLayoutProps) => {
  return (
    <div className=" bg-white dark:bg-gray-950">
      {/* Header */}
      <Header />

      {/* Main Content - with padding for header */}
      <div className="flex flex-1 items-center justify-center bg-white dark:bg-gray-950 py-16 lg:py-28">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-12">
            {/* Left Section - Brand/Info */}
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <div className="mb-10">
                {/* <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-4 group"
                >
                  <ChevronLeft
                    size={18}
                    className="group-hover:-translate-x-1 transition-transform"
                  />
                  Back to Home
                </Link> */}

                <h1 className="text-4xl lg:text-5xl font-bold text-blue-900 dark:text-white mb-6">
                  Unlock Your
                  <span className="block mt-2">Property Freedom</span>
                </h1>

                <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-lg">
                  Join thousands learning to build wealth through property
                  investment. Access expert courses, market insights, and
                  community support.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-6 max-w-lg">
                {[
                  {
                    title: "Market Insights",
                    desc: "Real-time property data & trends analysis",
                  },
                  {
                    title: "Expert Courses",
                    desc: "Learn from industry professionals",
                  },
                  {
                    title: "Secure Platform",
                    desc: "Your data is always protected",
                  },
                  {
                    title: "Community Network",
                    desc: "Connect with investors & mentors",
                  },
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <div className="w-3 h-3 bg-blue-900 dark:bg-blue-400 rounded-full"></div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-white mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Section - Auth Form */}
            <div className="w-full lg:w-1/2 lg:max-w-md">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg">
                {/* Form Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-center mb-2">
                    <h2 className="text-2xl font-bold text-blue-900 dark:text-white">
                      {title}
                    </h2>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center">
                    {subtitle}
                  </p>
                </div>

                {/* Form Content */}
                <div className="p-8">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
