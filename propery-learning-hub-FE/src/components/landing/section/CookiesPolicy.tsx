// components/CookiesPolicy.tsx
import React from "react";
import {
  Cookie,
  Settings,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";

const CookiesPolicy = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-400 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 -right-40 w-80 h-80 bg-blue-300 rounded-full filter blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center p-3 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
              <Cookie className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Cookie Policy
            </h1>
            <p className="text-xl text-blue-50 max-w-3xl mx-auto">
              We use cookies on our website to keep it secure, remember your
              preferences, and understand how it's used.
            </p>
            <div className="mt-6 flex items-center gap-2 text-blue-200">
              <span>Last Updated: July 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl shadow-xl border border-blue-100 p-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">100%</div>
            <div className="text-sm text-gray-600">Transparency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">24/7</div>
            <div className="text-sm text-gray-600">Cookie Management</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">UK GDPR</div>
            <div className="text-sm text-gray-600">Compliant</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">Secure</div>
            <div className="text-sm text-gray-600">Data Processing</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Introduction */}
        <div className="bg-blue-50 rounded-2xl p-8 mb-12 border border-blue-100">
          <p className="text-gray-700 text-lg leading-relaxed">
            This Cookie Policy explains how{" "}
            <span className="font-semibold text-blue-700">
              Freedom Property Academy
            </span>{" "}
            ("we", "us", "our") uses cookies and similar technologies on our
            website at [insert website URL] ("the Website"). It should be read
            alongside our Privacy Policy.
          </p>
        </div>

        {/* Cookie Types */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Types of Cookies We Use
          </h2>

          <div className="grid gap-6">
            {cookieTypes.map((cookie, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-blue-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    {cookie.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {cookie.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          cookie.type === "Essential"
                            ? "bg-green-100 text-green-700"
                            : cookie.type === "Functional"
                              ? "bg-blue-100 text-blue-700"
                              : cookie.type === "Analytics"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {cookie.type}
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {cookie.description}
                    </p>
                    <ul className="mt-3 space-y-1">
                      {cookie.examples.map((example, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm text-gray-500"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cookie Management */}
        <div className="mt-16 bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              Manage Your Cookie Preferences
            </h3>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              You can control and manage your cookie preferences at any time:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-2">
                  Browser Settings
                </h4>
                <p className="text-sm text-gray-600">
                  You can control cookies through your browser settings and
                  block or delete them at any time. Note that blocking strictly
                  necessary cookies may affect the Website's functionality.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-2">
                  Cookie Settings
                </h4>
                <p className="text-sm text-gray-600">
                  Withdraw or update your consent to non-essential cookies at
                  any time via [insert: the "Cookie Settings" link in the
                  website footer].
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Third-Party Cookies */}
        <div className="mt-12 bg-amber-50 rounded-2xl p-6 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">
                Third-Party Cookies
              </h4>
              <p className="text-gray-600 text-sm">
                We use trusted third-party services, including Google Analytics
                and the Meta (Facebook/Instagram) Pixel, for analytics and
                advertising purposes. These services may place cookies on your
                device. Each third party has its own privacy policy and cookie
                practices.
              </p>
            </div>
          </div>
        </div>

        {/* Changes & Contact */}
        <div className="mt-12 bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-gray-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">
                  Changes to This Policy
                </h4>
                <p className="text-gray-600 text-sm">
                  We may update this Cookie Policy from time to time, including
                  if we change the cookies or tools we use. The current version
                  will always be available on the Website.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Contact Us</h4>
                <p className="text-gray-600 text-sm">
                  If you have any questions about this Cookie Policy, contact us
                  at [insert email address].
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const cookieTypes = [
  {
    icon: <Shield className="w-6 h-6 text-blue-600" />,
    name: "Strictly Necessary Cookies",
    type: "Essential",
    description:
      "Essential for the Website and Online Portal to work — for example, keeping you logged in, or remembering information as you complete a form. These do not require your consent.",
    examples: [
      "Portal session cookie – keeps you logged in while you browse (session only)",
      "Cookie consent preferences – remembers your cookie choices (up to 12 months)",
    ],
  },
  {
    icon: <Settings className="w-6 h-6 text-blue-600" />,
    name: "Functional & Low-Risk Analytics Cookies",
    type: "Functional",
    description:
      "Help us understand how visitors use the Website, so we can improve it, or remember your preferences. Where these are limited to basic, low-risk analytics, they may be used without your consent, in line with the Data (Use and Access) Act 2025. You can still opt out through our cookie settings.",
    examples: [
      "Google Analytics – helps us understand how visitors use the Website (up to 2 years)",
    ],
  },
  {
    icon: <Cookie className="w-6 h-6 text-blue-600" />,
    name: "Advertising & Targeting Cookies",
    type: "Marketing",
    description:
      "Used to measure and target advertising, including on Facebook and Instagram, and to show you more relevant content elsewhere. These are only set with your consent.",
    examples: [
      "Meta (Facebook/Instagram) Pixel – measures and targets advertising on Facebook and Instagram (up to 90 days)",
    ],
  },
];

export default CookiesPolicy;
