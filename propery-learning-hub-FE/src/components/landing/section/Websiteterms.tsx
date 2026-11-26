// components/WebsiteTerms.tsx
import React, { useState } from "react";
import {
  Building2,
  Users,
  Copyright,
  AlertTriangle,
  Quote,
  Link2,
  Server,
  ShieldCheck,
  Handshake,
  Gavel,
  RefreshCw,
  Mail,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
interface WebsiteTermsProps {
  sections?: Section[];
}
interface Section {
  icon: React.ReactNode;
  title: string;
  description?: string;
  list?: string[];
  note?: string;
}
const WebsiteTerms = ({ sections = [] }: WebsiteTermsProps) => {
  const [openSections, setOpenSections] = useState(() => new Set([0]));

  const toggleSection = (idx: number): void => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const scrollToSection = (id: string): void => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
              <FileTextIcon />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Website Terms & Conditions
            </h1>
            <p className="text-xl text-blue-50 max-w-3xl mx-auto">
              These Terms govern your use of the Freedom Property Academy
              website. They're separate from, and don't affect, the Training &
              Membership Services Agreement or Promotional Membership Agreement
              that applies if you enrol on our Programme.
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
            <div className="text-2xl font-bold text-blue-600">
              {sections.length}
            </div>
            <div className="text-sm text-gray-600">Terms Sections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">18+</div>
            <div className="text-sm text-gray-600">Age Requirement</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">E&W</div>
            <div className="text-sm text-gray-600">Governing Law</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">Personal</div>
            <div className="text-sm text-gray-600">Use Only</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
          {/* On this page - jump nav */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                On this page
              </p>
              <nav className="space-y-1 border-l border-gray-200 pl-4">
                {sections.map((section, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToSection(`section-${idx}`)}
                    className="block w-full text-left text-sm text-gray-500 hover:text-blue-600 transition-colors py-1 truncate"
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div>
            {/* Introduction */}
            <div className="bg-blue-50 rounded-2xl p-8 mb-10 border border-blue-100">
              <p className="text-gray-700 text-lg leading-relaxed">
                These Website Terms & Conditions ("Terms") govern your use of
                the{" "}
                <span className="font-semibold text-blue-700">
                  Freedom Property Academy
                </span>{" "}
                website at www.freedompropertyacademy.com ("the Website"). By
                using the Website, you agree to these Terms. These Terms are
                separate from, and do not affect, the Training & Membership
                Services Agreement or Promotional Membership Agreement that
                applies if you enrol on our Programme.
              </p>
            </div>

            {/* Terms Sections - Accordion */}
            <div className="space-y-3 mb-12">
              {sections.map((section, index) => (
                <div
                  id={`section-${index}`}
                  key={index}
                  className="bg-white rounded-2xl border border-blue-100 overflow-hidden scroll-mt-8"
                >
                  <div className="w-full flex items-center gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <div className="flex-shrink-0 w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                      {section.icon}
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 flex-1">
                      {section.title}
                    </h2>
                  </div>

                  <div className="px-5 pb-6 pt-4 pl-[4.25rem]">
                    {section.description && (
                      <p className="text-gray-600 leading-relaxed mb-3">
                        {section.description}
                      </p>
                    )}
                    {section.list && (
                      <ul className="space-y-2">
                        {section.list.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-gray-600"
                          >
                            <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.note && (
                      <p className="text-gray-500 text-sm mt-3 italic">
                        {section.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Liability highlight */}
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200 mb-10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    Your Statutory Rights Are Protected
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Nothing in these Terms excludes or limits our liability for
                    death or personal injury caused by our negligence, for fraud
                    or fraudulent misrepresentation, or for any other liability
                    which cannot lawfully be excluded or limited. Nothing in
                    these Terms affects your statutory rights as a consumer.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact footer card */}
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-100">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">
                    Questions About These Terms?
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    If you have any questions about these Terms, contact us at
                    info@freedompropertyacademy.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small wrapper so the hero icon matches the document/terms theme
const FileTextIcon = () => <Handshake className="w-10 h-10 text-white" />;

// Data
const sections: Section[] = [
  {
    icon: <Building2 className="w-6 h-6 text-blue-600" />,
    title: "Who We Are",
    list: [
      'Freedom Property Academy ("we", "us", "our") operates the Website',
      "We are based at 1 Kensworth Gate 200-204 High Street South,Dunstable,England,LU6 3HS",
      "You can contact us at info@freedompropertyacademy.com",
    ],
  },
  {
    icon: <Users className="w-6 h-6 text-blue-600" />,
    title: "Using the Website",
    list: [
      "The Website is intended for adults aged 18 or over. By using the Website, you confirm that you are at least 18",
      "You must not misuse the Website, including by introducing viruses or malicious code, attempting unauthorised access to our systems, or using automated means (such as scraping) to extract content without our permission",
      "You must not use the Website in any way that breaches applicable law, or that is fraudulent, defamatory, or infringes anyone else's rights",
    ],
  },
  {
    icon: <Copyright className="w-6 h-6 text-blue-600" />,
    title: "Intellectual Property",
    list: [
      'All content on the Website — including text, graphics, logos, videos, and the "Freedom Property Academy" name and branding — is owned by us or our licensors and is protected by copyright, trade mark, and other intellectual property laws',
      "You may view and download content for your own personal, non-commercial use only. You must not copy, reproduce, republish, or distribute any part of the Website for commercial purposes without our prior written consent",
    ],
  },
  {
    icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
    title: "No Advice, and No Guaranteed Results",
    list: [
      "Content on the Website — including blog posts, articles, videos, Reels, and social media content — is provided for general information and educational purposes only. It does not constitute financial, investment, tax, legal, or other regulated professional advice, and should not be relied on as such. You should seek independent professional advice before making any financial or property decision",
      "Any references to income, profit, or results that others have achieved through Serviced Accommodation are individual examples and are not typical. Your own results will depend on your own effort, capital, market conditions, and circumstances, and we do not guarantee any particular outcome",
    ],
  },
  {
    icon: <Quote className="w-6 h-6 text-blue-600" />,
    title: "Testimonials and Case Studies",
    list: [
      "Testimonials, reviews, and case studies displayed on the Website reflect the genuine experiences of the individuals featured, given at a specific point in time. We take reasonable steps to satisfy ourselves that testimonials are genuine before publishing them",
      "Where a testimonial has been given in exchange for free or discounted access to our Programme, we will make this reasonably clear",
      "Individual results vary, and a testimonial about one person's experience is not a promise or guarantee of what you will achieve",
    ],
  },
  {
    icon: <Link2 className="w-6 h-6 text-blue-600" />,
    title: "Links to Other Websites",
    description:
      "The Website may contain links to third-party websites (including the Platform Software, payment processors, and social media platforms). We are not responsible for the content, accuracy, or practices of any third-party website, and including a link does not imply our endorsement of it.",
  },
  {
    icon: <Server className="w-6 h-6 text-blue-600" />,
    title: "Availability of the Website",
    description:
      "We aim to keep the Website available and up to date, but we do not guarantee that it will always be available, uninterrupted, or error-free. We may suspend, withdraw, or restrict access to the Website, or any part of it, at any time.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
    title: "Limitation of Liability",
    list: [
      "Nothing in these Terms excludes or limits our liability for death or personal injury caused by our negligence, for fraud or fraudulent misrepresentation, or for any other liability which cannot lawfully be excluded or limited",
      "Subject to the above, we accept no liability for any loss or damage arising from your use of, or inability to use, the Website, or from your reliance on any content on it, including where that content is provided by a third party",
      "Nothing in this clause affects your statutory rights as a consumer",
    ],
  },
  {
    icon: <Handshake className="w-6 h-6 text-blue-600" />,
    title: "Relationship to Your Membership Agreement",
    description:
      "Browsing the Website, and any general content, offers, or promotions on it, do not by themselves create a contract between you and us. If you enrol on the Programme, your relationship with us is governed by the separate Training & Membership Services Agreement (or Promotional Membership Agreement, as applicable), which takes priority over these Terms for anything relating to the Programme itself.",
  },
  {
    icon: <Gavel className="w-6 h-6 text-blue-600" />,
    title: "Governing Law and Jurisdiction",
    description:
      "These Terms are governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction over any dispute arising from them.",
  },
  {
    icon: <RefreshCw className="w-6 h-6 text-blue-600" />,
    title: "Changes to These Terms",
    description:
      "We may update these Terms from time to time. The current version will always be available on the Website, and continuing to use the Website after an update means you accept the revised Terms.",
  },
  {
    icon: <Mail className="w-6 h-6 text-blue-600" />,
    title: "Contact Us",
    description:
      "If you have any questions about these Terms, contact us at info@freedompropertyacademy.com",
  },
];

export default WebsiteTerms;
