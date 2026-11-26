// src/components/landing/section/ComplaintsPolicy.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Shield,
  CheckCircle,
  XCircle,
  Info,
  Globe,
  Lock,
  Users,
  AlertTriangle,
  Mail,
  RefreshCw,
  ChevronRight,
  ArrowUp,
  Bookmark,
  Calendar,
  Share2,
  Printer,
  ExternalLink,
  Search,
  Building2,
  Award,
  MessageSquare,
  AlertCircle,
  Clock,
  Scale,
  Headphones,
  Database,
  UserCheck,
  Heart,
} from "lucide-react";

// Define types for the section data
interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const ComplaintsPolicy = () => {
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = (): void => {
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = (): void => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id: string): void => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white font-sans">
      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-400 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 -right-40 w-80 h-80 bg-blue-300 rounded-full filter blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center p-3 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
              <Headphones className="w-10 h-10 text-white" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-white/80 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                <Building2 className="w-4 h-4 inline mr-2" />
                FREEDOM PROPERTY ACADEMY
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Complaints Policy
            </h1>
            <p className="text-xl text-blue-50 max-w-3xl mx-auto">
              Freedom Property Academy is committed to providing a good service.
              If something goes wrong, we want to hear about it and put it
              right. This Policy explains how to raise a complaint and what you
              can expect from us.
            </p>
            <div className="mt-6 flex items-center gap-2 text-blue-200">
              <span>Last Updated: July 2026</span>
              <span className="w-1 h-1 rounded-full bg-blue-300"></span>
              <span>Fair & Transparent Process</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl shadow-xl border border-blue-100 p-6 hover:shadow-2xl transition-shadow duration-300">
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              8
            </div>
            <div className="text-sm text-gray-600 mt-1">Policy Sections</div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              5 Days
            </div>
            <div className="text-sm text-gray-600 mt-1">Acknowledgment</div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              20 Days
            </div>
            <div className="text-sm text-gray-600 mt-1">Full Response</div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              ✓
            </div>
            <div className="text-sm text-gray-600 mt-1">Fair Investigation</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12">
          {/* Sidebar - On this page */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Bookmark className="w-4 h-4" />
                  On this page
                </p>
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="block w-full text-left text-sm text-gray-500 hover:text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg group"
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {section.title}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
              <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      We take all complaints seriously and are committed to
                      resolving them fairly and promptly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div>
            {/* Introduction Banner */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 mb-10 border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-700 text-base leading-relaxed">
                    <span className="font-semibold text-blue-700">
                      Freedom Property Academy
                    </span>{" "}
                    ("we", "us", "our") is committed to providing a good
                    service. If something goes wrong, we want to hear about it
                    and put it right. This Policy explains how to raise a
                    complaint and what you can expect from us.
                  </p>
                </div>
              </div>
            </div>

            {/* Policy Sections */}
            <div className="space-y-4 mb-12">
              {sections.map((section) => (
                <div
                  id={section.id}
                  key={section.id}
                  className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 scroll-mt-8"
                >
                  <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        {section.icon}
                      </div>
                      {section.title}
                    </h2>
                  </div>
                  <div className="p-6">{section.content}</div>
                </div>
              ))}
            </div>

            {/* Quick Reference Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-800">
                    How to Complain
                  </h4>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>• Online complaints form</li>
                  <li>• Email us</li>
                  <li>• Write to us</li>
                  <li>• Include as much detail as possible</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-800">Timeline</h4>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>• 5 working days: Acknowledgment</li>
                  <li>• 20 working days: Full response</li>
                  <li>• 30 days: Data protection complaints</li>
                  <li>• Updates provided for complex cases</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h4 className="font-semibold text-gray-800">Escalation</h4>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>• Request a review</li>
                  <li>• Contact ICO (data protection)</li>
                  <li>• Citizens Advice (general)</li>
                  <li>• Fair and transparent process</li>
                </ul>
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 text-center">
              <p className="text-gray-600 text-sm">
                We are committed to handling all complaints fairly,
                investigating them properly, and keeping you informed of
                progress throughout the process.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>Committed to continuous improvement</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Data
const sections: Section[] = [
  {
    id: "commitment",
    icon: <Award className="w-5 h-5 text-blue-600" />,
    title: "1. Our Commitment",
    content: (
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          We take all complaints seriously, whether about the Programme, our
          staff, billing, or how we've handled your personal data. We will
          handle your complaint fairly, investigate it properly, and keep you
          informed of progress.
        </p>
      </div>
    ),
  },
  {
    id: "what-to-complain",
    icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
    title: "2. What You Can Complain About",
    content: (
      <>
        <p className="text-gray-700 mb-4">
          You can complain about any aspect of our service, including (without
          limitation):
        </p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>
              the quality or delivery of the Programme, including the 1:1
              strategy day, meetings, or webinars
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>
              billing, fees, or a decision made under your membership agreement
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>the conduct of any member of our team</span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>
              how we have collected, used, or protected your personal data
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>any other aspect of your experience with the Academy</span>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-to-complain",
    icon: <Mail className="w-5 h-5 text-blue-600" />,
    title: "3. How to Make a Complaint",
    content: (
      <>
        <p className="text-gray-700 mb-4">You can make a complaint:</p>
        <ul className="space-y-3">
          {/* <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              using our online complaints form at{" "}
              <span className="font-semibold text-blue-700">
                [insert complaints form URL]
              </span>
            </span>
          </li> */}
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              by emailing{" "}
              <span className="font-semibold text-blue-700">
                info@freedompropertyacademy.com
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              in writing to{" "}
              <span className="font-semibold text-blue-700">
                1 Kensworth Gate 200-204 High Street South,Dunstable,England,LU6
                3HS
              </span>
            </span>
          </li>
        </ul>
        <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              Please give us as much detail as possible, including what
              happened, when, and what outcome you're looking for. This helps us
              investigate quickly and fairly.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "what-happens-next",
    icon: <Clock className="w-5 h-5 text-blue-600" />,
    title: "4. What Happens Next",
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-gray-700 leading-relaxed">
            For general service complaints, we aim to acknowledge your complaint
            within{" "}
            <span className="font-semibold text-blue-700">5 working days</span>,
            and to give you a full response within{" "}
            <span className="font-semibold text-blue-700">20 working days</span>
            .
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              If a complaint is more complex and needs longer to investigate, we
              will tell you why, and keep you updated on our progress.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "data-protection-complaints",
    icon: <Database className="w-5 h-5 text-blue-600" />,
    title: "5. Data Protection Complaints",
    content: (
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          If your complaint relates specifically to how we have handled your
          personal data, we will acknowledge it within{" "}
          <span className="font-semibold text-blue-700">30 days</span> of
          receipt, in line with our obligations under section 164A of the Data
          Protection Act 2018, and will respond substantively without undue
          delay, keeping you updated on progress. See our Privacy Policy for
          further detail on your data protection rights.
        </p>
      </div>
    ),
  },
  {
    id: "not-satisfied",
    icon: <AlertTriangle className="w-5 h-5 text-blue-600" />,
    title: "6. If You're Not Satisfied",
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <UserCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-gray-700 leading-relaxed">
            If you're not happy with our response, you can ask for your
            complaint to be reviewed by{" "}
            <span className="font-semibold text-blue-700">Andrei Bosancu</span>,
            who was not involved in the original decision.
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 font-medium">
                For data protection complaints specifically, you also have the
                right to contact the Information Commissioner's Office (ICO):
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>
                  • Website:{" "}
                  <span className="font-semibold text-blue-700">
                    ico.org.uk
                  </span>
                </li>
                <li>
                  • Phone:{" "}
                  <span className="font-semibold text-blue-700">
                    0303 123 1113
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              For general consumer concerns, you may also wish to contact the
              Citizens Advice consumer helpline.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "record-keeping",
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    title: "7. Record-Keeping",
    content: (
      <div className="flex items-start gap-3">
        <Database className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          We keep a log of all complaints received, including the outcome, so
          that we can identify and address any recurring issues and continually
          improve our service.
        </p>
      </div>
    ),
  },
  {
    id: "contact",
    icon: <Mail className="w-5 h-5 text-blue-600" />,
    title: "8. Contact Us",
    content: (
      <div className="flex items-start gap-3">
        <MessageSquare className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          If you have any questions about this Policy, contact us at{" "}
          <span className="font-semibold text-blue-700">
            info@freedompropertyacademy.com
          </span>
          .
        </p>
      </div>
    ),
  },
];

export default ComplaintsPolicy;
