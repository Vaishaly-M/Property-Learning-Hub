// src/components/landing/section/MarketingCompliancePolicy.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Shield,
  CheckCircle,
  XCircle,
  Info,
  FileText,
  Globe,
  Lock,
  Users,
  Star,
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
  TrendingUp,
  AlertCircle,
  UserCheck,
  Clock,
  Scale,
} from "lucide-react";

// Define types for the section data
interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const MarketingCompliancePolicy = () => {
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
              <Megaphone className="w-10 h-10 text-white" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-white/80 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                <Building2 className="w-4 h-4 inline mr-2" />
                FREEDOM PROPERTY ACADEMY
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Marketing, Sales & <br className="hidden sm:block" />
              Testimonials Compliance Policy
            </h1>
            <p className="text-xl text-blue-50 max-w-3xl mx-auto">
              An internal reference document for anyone creating marketing
              content, running sales conversations, or collecting testimonials
              on behalf of Freedom Property Academy.
            </p>
            <div className="mt-6 flex items-center gap-2 text-blue-200">
              <span>Last Updated: July 2026</span>
              <span className="w-1 h-1 rounded-full bg-blue-300"></span>
              <span>Version 2.4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl shadow-xl border border-blue-100 p-6 hover:shadow-2xl transition-shadow duration-300">
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              17
            </div>
            <div className="text-sm text-gray-600 mt-1">Policy Sections</div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              3
            </div>
            <div className="text-sm text-gray-600 mt-1">Core Areas</div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              CAP Code
            </div>
            <div className="text-sm text-gray-600 mt-1">Compliant</div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              Annual
            </div>
            <div className="text-sm text-gray-600 mt-1">Policy Review</div>
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
                <nav className="space-y-1 max-h-[60vh] overflow-y-auto">
                  <button
                    onClick={() => scrollToSection("part-a")}
                    className="block w-full text-left text-sm font-semibold text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      Part A — Marketing Claims
                    </span>
                  </button>
                  {sectionsPartA.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="block w-full text-left text-sm text-gray-500 hover:text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg pl-8"
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {section.title}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => scrollToSection("part-b")}
                    className="block w-full text-left text-sm font-semibold text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg mt-2"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      Part B — Testimonials & Reviews
                    </span>
                  </button>
                  {sectionsPartB.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="block w-full text-left text-sm text-gray-500 hover:text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg pl-8"
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {section.title}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => scrollToSection("part-c")}
                    className="block w-full text-left text-sm font-semibold text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg mt-2"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      Part C — Fair Treatment
                    </span>
                  </button>
                  {sectionsPartC.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="block w-full text-left text-sm text-gray-500 hover:text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg pl-8"
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {section.title}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => scrollToSection("review")}
                    className="block w-full text-left text-sm text-gray-500 hover:text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg mt-2"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      Review of This Policy
                    </span>
                  </button>
                </nav>
              </div>
              <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      This is an internal reference document covering marketing
                      claims, testimonials, and fair treatment of clients during
                      enrolment.
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
                    This is an internal reference document for anyone creating
                    marketing content, running sales conversations, or
                    collecting testimonials on behalf of{" "}
                    <span className="font-semibold text-blue-700">
                      Freedom Property Academy
                    </span>{" "}
                    ("the Academy"). It covers three related areas: marketing
                    claims, testimonials and reviews, and the fair treatment of
                    clients during enrolment.
                  </p>
                </div>
              </div>
            </div>

            {/* Part A - Marketing Claims */}
            <div id="part-a" className="scroll-mt-8 mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Megaphone className="w-7 h-7" />
                  Part A — Marketing Claims
                </h2>
              </div>

              {sectionsPartA.map((section) => (
                <div
                  id={section.id}
                  key={section.id}
                  className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 scroll-mt-8 mb-4"
                >
                  <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        {section.icon}
                      </div>
                      {section.title}
                    </h3>
                  </div>
                  <div className="p-6">{section.content}</div>
                </div>
              ))}
            </div>

            {/* Part B - Testimonials and Reviews */}
            <div id="part-b" className="scroll-mt-8 mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Star className="w-7 h-7" />
                  Part B — Testimonials and Reviews
                </h2>
              </div>

              {sectionsPartB.map((section) => (
                <div
                  id={section.id}
                  key={section.id}
                  className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 scroll-mt-8 mb-4"
                >
                  <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        {section.icon}
                      </div>
                      {section.title}
                    </h3>
                  </div>
                  <div className="p-6">{section.content}</div>
                </div>
              ))}
            </div>

            {/* Part C - Fair Treatment of Clients */}
            <div id="part-c" className="scroll-mt-8 mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <UserCheck className="w-7 h-7" />
                  Part C — Fair Treatment of Clients During Enrolment
                </h2>
              </div>

              {sectionsPartC.map((section) => (
                <div
                  id={section.id}
                  key={section.id}
                  className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 scroll-mt-8 mb-4"
                >
                  <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        {section.icon}
                      </div>
                      {section.title}
                    </h3>
                  </div>
                  <div className="p-6">{section.content}</div>
                </div>
              ))}
            </div>

            {/* Review of This Policy */}
            <div
              id="review"
              className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 scroll-mt-8 mb-10"
            >
              <div className="p-6 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                  </div>
                  17. Review of This Policy
                </h3>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 leading-relaxed">
                    This Policy is reviewed at least annually, and whenever
                    there is a material change in advertising or consumer
                    protection law, or in how the Academy markets or sells the
                    Programme.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 text-center">
              <p className="text-gray-600 text-sm">
                This Marketing, Sales & Testimonials Compliance Policy ensures
                the Academy maintains the highest standards of integrity and
                compliance in all marketing and sales activities.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>Committed to ethical marketing and sales practices</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Data - Part A: Marketing Claims
const sectionsPartA: Section[] = [
  {
    id: "purpose-a",
    icon: <Globe className="w-5 h-5 text-blue-600" />,
    title: "1. Purpose and Scope",
    content: (
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          This Part applies to all marketing content produced for the Academy,
          including Reels, social media posts, Monday Live sessions, blog
          content, adverts, and sales pages, whoever creates it.
        </p>
      </div>
    ),
  },
  {
    id: "general-principle",
    icon: <Scale className="w-5 h-5 text-blue-600" />,
    title: "2. General Principle",
    content: (
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          All marketing must be honest, capable of being substantiated, and not
          likely to mislead. This reflects the requirements of the CAP Code (the
          advertising rules enforced by the ASA) and the Digital Markets,
          Competition and Consumers Act 2024.
        </p>
      </div>
    ),
  },
  {
    id: "income-claims",
    icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
    title: "3. Income and Results Claims",
    content: (
      <ul className="space-y-3">
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Do not state or imply that a specific income or result is
            guaranteed, typical, or easily achievable by anyone who joins the
            Programme.
          </span>
        </li>
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Any specific figures used (e.g. "£10k in month one") must be
            genuine, attributable to a real, verifiable member, and accompanied
            by a clear statement that results are individual and not typical.
          </span>
        </li>
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Avoid absolute or universal claims ("this works for any business",
            "guaranteed profit") unless they can be robustly evidenced, which in
            practice is rarely possible for a training programme.
          </span>
        </li>
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Where a Reel or post implies results are achievable from free
            content alone, be clear about what is actually included versus what
            requires further enrolment.
          </span>
        </li>
      </ul>
    ),
  },
  {
    id: "free-offers",
    icon: <Star className="w-5 h-5 text-blue-600" />,
    title: '4. "Free" Offers and Promotions',
    content: (
      <ul className="space-y-3">
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Any promotion offering "free" membership must clearly state, in the
            marketing material itself (not only in the contract signed later),
            that the offer is conditional — including the videography,
            testimonial, and participation requirements, and that a Standard Fee
            may become payable if these are not met.
          </span>
        </li>
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Do not describe something as "free" if there is a realistic prospect
            of a cost being incurred, unless that condition is stated with equal
            prominence to the word "free" itself.
          </span>
        </li>
      </ul>
    ),
  },
  {
    id: "urgency-claims",
    icon: <Clock className="w-5 h-5 text-blue-600" />,
    title: "5. Urgency and Scarcity Claims",
    content: (
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          Only reference deadlines, limited spaces, or closing offers where
          these are genuinely true at the time of posting. Do not create
          artificial time pressure (e.g. a countdown that resets, or a "last
          chance" claim repeated indefinitely).
        </p>
      </div>
    ),
  },
  {
    id: "review-publishing",
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    title: "6. Review Before Publishing",
    content: (
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          Where marketing content includes specific numbers, income claims, or a
          new promotional offer, it should be reviewed by{" "}
          <span className="font-semibold text-blue-700">Andrei Bosancu</span>{" "}
          before it is published, to check it is accurate and compliant with
          this Policy.
        </p>
      </div>
    ),
  },
];

// Data - Part B: Testimonials and Reviews
const sectionsPartB: Section[] = [
  {
    id: "collecting",
    icon: <Users className="w-5 h-5 text-blue-600" />,
    title: "7. Collecting Testimonials",
    content: (
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          Testimonials are only requested from genuine current or former Academy
          clients. When asking a client for a testimonial, do not suggest
          specific claims, figures, or wording for them to use — the testimonial
          must be in the client's own words and reflect their own genuine
          experience.
        </p>
      </div>
    ),
  },
  {
    id: "verifying",
    icon: <Shield className="w-5 h-5 text-blue-600" />,
    title: "8. Verifying Testimonials",
    content: (
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          Before publishing a testimonial, check that: the person is a genuine,
          identifiable client; and any specific factual claims made within it
          (e.g. a stated income figure) are ones we can reasonably stand behind,
          or should be edited out if they cannot be verified.
        </p>
      </div>
    ),
  },
  {
    id: "disclosure",
    icon: <Lock className="w-5 h-5 text-blue-600" />,
    title: "9. Disclosure",
    content: (
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          Where a testimonial was provided as part of a free membership
          arrangement (i.e. given in exchange for enrolment, as described in the
          Promotional Membership Agreement), this should be reasonably disclosed
          when the testimonial is used — for example, by describing the person
          as "an enrolled Academy member" rather than presenting the testimonial
          as an unprompted, independent review. This reflects the Digital
          Markets, Competition and Consumers Act 2024's rules on incentivised
          reviews.
        </p>
      </div>
    ),
  },
  {
    id: "editing",
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    title: "10. Editing Testimonials",
    content: (
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          Testimonials may be lightly edited for length or clarity, but must not
          be edited in a way that changes their substantive meaning or adds a
          claim the client did not actually make.
        </p>
      </div>
    ),
  },
  {
    id: "consent-removal",
    icon: <Mail className="w-5 h-5 text-blue-600" />,
    title: "11. Consent Records and Removal Requests",
    content: (
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          A record is kept of each client's consent to their testimonial, image,
          or video being used in marketing (see clause 9 of the membership
          agreements). If a client asks for a testimonial or piece of footage to
          be taken down, we will action this within a reasonable time, though
          this does not affect material already published or distributed before
          the request was received.
        </p>
      </div>
    ),
  },
];

// Data - Part C: Fair Treatment of Clients
const sectionsPartC: Section[] = [
  {
    id: "purpose-c",
    icon: <Award className="w-5 h-5 text-blue-600" />,
    title: "12. Purpose",
    content: (
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          Regulators have specifically flagged aggressive sales practices that
          target financially vulnerable people as an enforcement priority in the
          coaching and training sector. This Part sets out how the Academy
          expects enrolment conversations — including 1:1 strategy days and
          sales calls — to be conducted.
        </p>
      </div>
    ),
  },
  {
    id: "vulnerability",
    icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
    title: "13. Recognising Possible Vulnerability",
    content: (
      <>
        <p className="text-gray-700 mb-4">
          Be alert to signs that a prospective client may be vulnerable to a
          pressured decision, including where someone:
        </p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>
              mentions using a loan, credit card debt, or borrowed money they
              are worried about affording, in order to enrol
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>
              shows signs of significant emotional distress, confusion, or
              pressure from a third party to sign up
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>
              does not appear to understand the fee, the commitment, or the
              cancellation/refund position
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>
              asks to be given time to think, or to discuss the decision with
              someone else
            </span>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "what-to-do",
    icon: <CheckCircle className="w-5 h-5 text-blue-600" />,
    title: "14. What To Do",
    content: (
      <ul className="space-y-3">
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Slow down. Make sure the person understands the Fee, what is
            included, and the refund position, in plain terms, before they sign
            anything.
          </span>
        </li>
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            If someone asks for time to consider, give it to them without
            pressure to decide immediately.
          </span>
        </li>
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            If you are concerned about a person's circumstances, pause the
            enrolment and raise it with{" "}
            <span className="font-semibold text-blue-700">
              [insert name/role]
            </span>{" "}
            before proceeding.
          </span>
        </li>
      </ul>
    ),
  },
  {
    id: "what-not-to-do",
    icon: <XCircle className="w-5 h-5 text-blue-600" />,
    title: "15. What Not To Do",
    content: (
      <ul className="space-y-3">
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Do not use high-pressure closing tactics, fabricated urgency, or
            countdown-style pressure to secure a same-day decision.
          </span>
        </li>
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Do not encourage someone to borrow money they have expressed concern
            about affording.
          </span>
        </li>
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Do not dismiss, minimise, or argue against a person's hesitation or
            wish to think it over.
          </span>
        </li>
      </ul>
    ),
  },
  {
    id: "escalation",
    icon: <AlertTriangle className="w-5 h-5 text-blue-600" />,
    title: "16. Escalation",
    content: (
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          If a team member is ever unsure whether it is appropriate to proceed
          with an enrolment, they should pause and consult{" "}
          <span className="font-semibold text-blue-700">
            [insert name/role]
          </span>{" "}
          before continuing.
        </p>
      </div>
    ),
  },
];

export default MarketingCompliancePolicy;
