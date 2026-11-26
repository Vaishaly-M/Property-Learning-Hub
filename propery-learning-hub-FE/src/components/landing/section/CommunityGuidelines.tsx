// src/components/landing/section/CommunityGuidelines.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Heart,
  Handshake,
  Star,
  FileText,
  Globe,
  Lock,
  Camera,
  ThumbsUp,
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
  Sparkles,
  Award,
} from "lucide-react";

// Define types for the section data
interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const CommunityGuidelines = () => {
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
              <Users className="w-10 h-10 text-white" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-white/80 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
                <Building2 className="w-4 h-4 inline mr-2" />
                FREEDOM PROPERTY ACADEMY
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Community Guidelines & <br className="hidden sm:block" />
              Acceptable Use Policy
            </h1>
            <p className="text-xl text-blue-50 max-w-3xl mx-auto">
              Building a professional, supportive, and valuable community for
              Serviced Accommodation professionals.
            </p>
            <div className="mt-6 flex items-center gap-2 text-blue-200">
              <span>Last Updated: July 2026</span>
              <span className="w-1 h-1 rounded-full bg-blue-300"></span>
              <span>Applies to all Community Spaces</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl shadow-xl border border-blue-100 p-6 hover:shadow-2xl transition-shadow duration-300">
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              {sections.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Guideline Sections</div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              Respect
            </div>
            <div className="text-sm text-gray-600 mt-1">Expected Conduct</div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              Zero
            </div>
            <div className="text-sm text-gray-600 mt-1">Prohibited Conduct</div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              Actions
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Breach Consequences
            </div>
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
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      These guidelines help create a safe, professional, and
                      valuable environment for all members.
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
                  <Handshake className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-700 text-base leading-relaxed">
                    These Community Guidelines apply to everyone using the{" "}
                    <span className="font-semibold text-blue-700">
                      Online Portal
                    </span>
                    , the members' group chat, weekly meetings and webinars, and
                    the deals marketplace (together,{" "}
                    <span className="font-semibold text-blue-700">
                      "the Community Spaces"
                    </span>
                    ). They sit alongside, and do not replace, your Training &
                    Membership Services Agreement or Promotional Membership
                    Agreement.
                  </p>
                </div>
              </div>
            </div>

            {/* Policy Sections - Static Cards */}
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
                  <h4 className="font-semibold text-gray-800">Do</h4>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>• Be respectful and courteous</li>
                  <li>• Stay on topic</li>
                  <li>• Give constructive feedback</li>
                  <li>• Respect confidentiality</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-5 border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-gray-800">Don't</h4>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>• Harass or bully others</li>
                  <li>• Post spam or ads</li>
                  <li>• Share confidential info</li>
                  <li>• Misrepresent yourself</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-800">Report</h4>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li>• Suspicious listings</li>
                  <li>• Inappropriate conduct</li>
                  <li>• Confidentiality breaches</li>
                  <li>• Any concerns</li>
                </ul>
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 text-center">
              <p className="text-gray-600 text-sm">
                These Community Guidelines help maintain a professional,
                supportive, and valuable environment for all members of the
                Freedom Property Academy.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
                <Heart className="w-4 h-4 text-blue-500" />
                <span>Built with care for our community</span>
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
    id: "purpose",
    icon: <Globe className="w-5 h-5 text-blue-600" />,
    title: "1. Purpose and Scope",
    content: (
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-gray-700 leading-relaxed text-lg">
            We want the Community Spaces to be a{" "}
            <span className="font-semibold text-blue-700">
              genuinely useful, professional environment
            </span>{" "}
            where members can learn, ask questions, and support each other.
            These Guidelines exist to protect that environment for everyone.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "expected-conduct",
    icon: <ThumbsUp className="w-5 h-5 text-blue-600" />,
    title: "2. Expected Conduct",
    content: (
      <>
        <p className="text-gray-700 mb-4">
          When using the Community Spaces, we expect members to:
        </p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              treat other members, mentors, and staff with courtesy and respect
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              keep discussion relevant to Serviced Accommodation, the Programme,
              and members' businesses
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              give honest, constructive input if commenting on someone else's
              question, deal, or business plan
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              respect the confidentiality of information shared by other members
              (see clause 8.3 of your membership agreement)
            </span>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "prohibited-conduct",
    icon: <XCircle className="w-5 h-5 text-blue-600" />,
    title: "3. Prohibited Conduct",
    content: (
      <>
        <p className="text-gray-700 mb-4">Members must not:</p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              harass, threaten, bully, or discriminate against anyone in the
              Community Spaces
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              post spam, unsolicited advertising, or promote unrelated products,
              services, or opportunities (including other coaching programmes or
              MLM-style schemes)
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              copy, resell, or redistribute Programme Materials or other
              members' content without permission
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              impersonate any person, or misrepresent their affiliation with the
              Academy
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              share another member's personal or business information outside
              the Community Spaces without their consent
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>
              post false, misleading, or fraudulent information, including about
              a deal, property, or business opportunity
            </span>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "deals-marketplace",
    icon: <Star className="w-5 h-5 text-blue-600" />,
    title: "4. The Deals Marketplace",
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-gray-700 leading-relaxed">
            The deals marketplace allows members to list and view Serviced
            Accommodation opportunities. The Academy does not vet, verify,
            endorse, or guarantee any deal listed by a member, and is not a
            party to any transaction between members.
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 font-medium">
                Members are responsible for carrying out their own due diligence
                before acting on any listing.
              </p>
              <p className="text-sm text-gray-600 mt-1">
                If you believe a listing is fraudulent or misleading, please
                report it using the process in clause 7 below.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "group-chat",
    icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
    title: "5. The Group Chat and Meetings",
    content: (
      <ul className="space-y-3">
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            The group chat, weekly meetings, and webinars are for genuine
            members only. Please do not share invite links, recordings, or login
            details with anyone outside the Programme.
          </span>
        </li>
        <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
          <Camera className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <span>
            Where meetings are recorded (see your membership agreement), please
            be mindful that other members may be featured, and treat any
            information shared by them as confidential.
          </span>
        </li>
      </ul>
    ),
  },
  {
    id: "consequences",
    icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
    title: "6. Consequences of Breach",
    content: (
      <>
        <p className="text-gray-700 mb-4">
          If a member breaches these Guidelines, the Academy may, depending on
          the severity and frequency of the breach:
        </p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>issue a warning</span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>
              temporarily suspend access to one or more Community Spaces
            </span>
          </li>
          <li className="flex items-start gap-3 text-gray-700 hover:bg-blue-50/30 p-2 rounded-lg transition-colors">
            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
            <span>
              suspend or terminate the member's access to the Services entirely,
              in line with the termination provisions of their membership
              agreement
            </span>
          </li>
        </ul>
        <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Serious breaches</span> (such as
              fraud, harassment, or unlawful conduct) may result in immediate
              suspension without prior warning.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "reporting",
    icon: <Mail className="w-5 h-5 text-blue-600" />,
    title: "7. Reporting a Concern",
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-gray-700 leading-relaxed">
            If you experience or witness a breach of these Guidelines —
            including a suspicious deals marketplace listing, inappropriate
            conduct, or a confidentiality concern — please report it to{" "}
            <span className="font-semibold text-blue-600">
              info@freedompropertyacademy.com
            </span>{" "}
            as soon as possible.
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              We will look into all reports and treat them confidentially where
              possible.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "changes",
    icon: <RefreshCw className="w-5 h-5 text-blue-600" />,
    title: "8. Changes to These Guidelines",
    content: (
      <div className="flex items-start gap-3">
        <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-gray-700 leading-relaxed">
          We may update these Guidelines from time to time to keep the Community
          Spaces safe and useful. The current version will always be available
          on the Online Portal.
        </p>
      </div>
    ),
  },
];

export default CommunityGuidelines;