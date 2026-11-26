import React from "react";
import {
  Shield,
  Lock,
  Eye,
  FileText,
  Users,
  Video,
  Download,
  Globe,
  CheckCircle,
  ArrowRight,
  Mail,
  MapPin,
  MessageSquare,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

const PrivacyPolicy = () => {
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
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xl text-blue-50 max-w-3xl mx-auto">
              Your privacy matters to us. Learn how Freedom Property Academy
              protects your data and ensures a secure learning environment.
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl shadow-xl border border-blue-100 p-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">50K+</div>
            <div className="text-sm text-gray-600">Active Learners</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">1.2K+</div>
            <div className="text-sm text-gray-600">Instructors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">99.9%</div>
            <div className="text-sm text-gray-600">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">24/7</div>
            <div className="text-sm text-gray-600">Support</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Introduction */}
        <div className="bg-blue-50 rounded-2xl p-8 mb-12 border border-blue-100">
          <p className="text-gray-700 text-lg leading-relaxed">
            This Privacy Policy explains how{" "}
            <span className="font-semibold text-blue-700">
              Freedom Property Academy
            </span>{" "}
            ("we", "us", "our") collects, uses, stores, and protects your
            personal data when you engage with our training, mentoring, and
            membership services ("the Programme"), and when you visit our
            website. It is written to reflect the UK General Data Protection
            Regulation (UK GDPR), the Data Protection Act 2018, and the Data
            (Use and Access) Act 2025.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-10">
          {sections.map((section, index) => (
            <div key={index} className="group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    {section.title}
                  </h2>
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
            </div>
          ))}
        </div>

        {/* Data Collection Table */}
        <div className="mt-16 bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800">
              Data We Collect
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Collected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dataTable.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {row.data}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {row.purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security / Compliance Features */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-2xl p-8 border border-blue-200">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <Lock className="w-6 h-6 text-blue-600" />
            How We Protect Your Data
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {securityFeatures.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-blue-100"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <span className="text-gray-700">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact / Complaints footer note */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Questions or Complaints?
            </h3>
            <p className="text-gray-500 max-w-xl mx-auto">
              We're here to help. Here's how to reach us, step by step.
            </p>
          </div>

          {/* Step 1 - Contact us */}
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 md:p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                1
              </div>
              <h4 className="text-lg font-semibold text-gray-800">
                Contact us first
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 bg-blue-50/60 rounded-xl p-5 border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Email us
                </span>
                <span className="text-gray-800 font-medium break-words">
                  info@freedompropertyacademy.com
                </span>
              </div>
              <div className="flex flex-col gap-2 bg-blue-50/60 rounded-xl p-5 border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Write to us
                </span>
                <span className="text-gray-800 font-medium break-words">
                  1 Kensworth Gate 200-204 High Street
                  South,Dunstable,England,LU6 3HS
                </span>
              </div>
              {/* <div className="flex flex-col gap-2 bg-blue-50/60 rounded-xl p-5 border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Complaints form
                </span>
                <span className="text-gray-800 font-medium break-words">
                  [insert complaints form URL]
                </span>
              </div> */}
            </div>
            <p className="text-gray-500 text-sm mt-5">
              We'll acknowledge your complaint within 30 days and aim to resolve
              it without undue delay, keeping you updated on progress.
            </p>
          </div>

          {/* Step 2 - Escalate to ICO */}
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                2
              </div>
              <h4 className="text-lg font-semibold text-gray-800">
                Still not satisfied?
              </h4>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-gray-700 leading-relaxed">
                You have the right to contact the Information Commissioner's
                Office (ICO) directly.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <a
                href="https://ico.org.uk"
                className="flex items-center justify-center gap-2 bg-white text-amber-700 font-medium px-5 py-3 rounded-xl border border-amber-200 hover:bg-amber-100/50 transition-colors"
              >
                ico.org.uk
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="flex items-center justify-center gap-2 bg-white text-gray-700 font-medium px-5 py-3 rounded-xl border border-amber-200">
                Call 0303 123 1113
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Data
const sections = [
  {
    icon: <Shield className="w-6 h-6 text-blue-600" />,
    title: "Who We Are & How to Contact Us",
    description:
      "Freedom Property Academy is the data controller responsible for your personal data. We are based at [registered/trading address] and are registered with the Information Commissioner's Office (ICO) as a data controller, registration number [insert ICO registration number]. If you have any questions about this Policy or how we handle your personal data, contact us at info@freedompropertyacademy.com, or by post at the address above.",
  },
  {
    icon: <Eye className="w-6 h-6 text-blue-600" />,
    title: "Personal Data We Collect",
    description:
      "Depending on how you interact with us, we may collect and process the following categories of personal data about you:",
    list: [
      "Identity data – your name, date of birth, and signature",
      "Contact data – your address, email address, and telephone number",
      "Financial data – billing and payment details, processed via our invoicing provider or payment processor",
      "Programme data – your enrolment details, meeting attendance, progress through the Programme, and notes from your 1:1 strategy day",
      "Communications data – messages in our members' group chat, emails, and other correspondence with us",
      "Video and image data – recordings of meetings and webinars you attend, and photographs, video footage, or testimonials of you, where you have consented",
      "Technical data – IP address, browser and device information, and cookie data collected via our website or Online Portal",
      "Marketing data – your preferences for receiving communications from us",
    ],
    note: "We do not set out to collect special category data (such as health data). If you choose to share sensitive information with us, we only use it for that specific purpose and keep it to the minimum necessary.",
  },
  {
    icon: <FileText className="w-6 h-6 text-blue-600" />,
    title: "How We Collect Your Data",
    list: [
      "Directly from you – when you enrol, sign an agreement, attend sessions, use the Online Portal, or contact us",
      "Automatically – through cookies and similar technologies when you visit our website",
      "From third parties – occasionally, for example payment confirmations from our payment processor",
    ],
  },
  {
    icon: <Users className="w-6 h-6 text-blue-600" />,
    title: "How We Use Your Data & Our Legal Basis",
    description:
      "UK data protection law requires us to have a valid legal basis for each way we use your data:",
    list: [
      "Providing access to the Programme and managing your membership — Performance of a contract with you",
      "Processing payments and keeping financial records — Performance of a contract; legal obligation (tax/accounting)",
      "Recording sessions, and using your image, video, or testimonials in our marketing — Your consent (withdrawable at any time)",
      "Sending service-related communications (e.g. reminders, portal updates) — Performance of a contract; legitimate interests",
      "Sending marketing communications about the Academy — Your consent, where required by law",
      "Monitoring engagement (e.g. attendance) where this affects a free membership arrangement — Performance of a contract",
      "Preventing fraud and enforcing our agreements — Legitimate interests in protecting our business",
      "Complying with our legal and regulatory obligations — Legal obligation",
    ],
  },
  {
    icon: <Globe className="w-6 h-6 text-blue-600" />,
    title: "Who We Share Your Data With & International Transfers",
    description:
      "We share personal data with trusted third parties who help us deliver the Programme, including the providers of our Online Portal, CRM, Property Management System (PMS), Guestalizer, Infinit Invoice, Infinit Doc, our bookings platform, our deals marketplace, and our email/marketing platform. These providers act as our data processors and may only use your data on our instructions, under a written data processing agreement.",
    list: [
      "We do not sell your personal data to any third party",
      "We may share data with professional advisers, regulators, or law enforcement where required by law",
      "Where a service provider stores or processes data outside the UK, we ensure an appropriate safeguard is in place — such as reliance on UK adequacy regulations, the UK International Data Transfer Agreement, or standard contractual clauses",
    ],
  },
  {
    icon: <Lock className="w-6 h-6 text-blue-600" />,
    title: "How Long We Keep Your Data",
    description:
      "We keep personal data only as long as necessary for the purposes set out in this Policy. As a general guide:",
    list: [
      "Client and financial records are kept for 6 years after our relationship with you ends (to meet HMRC and accounting requirements)",
      "Marketing images, video, and testimonials are kept while in active marketing use, or until you withdraw consent, whichever is earlier",
      "Meeting/webinar recordings are kept for 12 months unless a longer period is genuinely needed",
    ],
  },
  {
    icon: <Video className="w-6 h-6 text-blue-600" />,
    title: "Cookies and Similar Technologies",
    description:
      "Our website and Online Portal use cookies. Cookies that are strictly necessary, or used only for basic, low-risk analytics, may be used without asking for your consent, in line with the Data (Use and Access) Act 2025. Cookies used for advertising or cross-site tracking — for example, tools that help us measure or target Facebook and Instagram advertising — are only used with your consent, which you can manage at any time through our cookie settings.",
  },
  {
    icon: <CheckCircle className="w-6 h-6 text-blue-600" />,
    title: "Your Rights",
    description: "Under UK data protection law, you have the right to:",
    list: [
      "Request access to your personal data",
      "Request correction of inaccurate data",
      "Request erasure of your data",
      "Request that we restrict our processing",
      "Request your data in a portable format",
      "Object to processing based on legitimate interests",
      "Withdraw consent at any time where we rely on it",
    ],
    note: "We will normally respond within one calendar month, which may be extended by up to two further months for complex or numerous requests. We do not use automated decision-making that produces legal or similarly significant effects on you.",
  },
  {
    icon: <Users className="w-6 h-6 text-blue-600" />,
    title: "Children",
    description:
      "Our Services are intended for adults and are not directed at children. We do not knowingly collect personal data from children.",
  },
  {
    icon: <FileText className="w-6 h-6 text-blue-600" />,
    title: "Changes to This Policy",
    description:
      "We may update this Privacy Policy from time to time. The current version is always available at [insert link], and we will notify you of any significant changes where appropriate.",
  },
];

const dataTable = [
  {
    category: "Identity & Contact",
    data: "Name, date of birth, signature, address, email, phone",
    purpose: "Manage your enrolment and account",
  },
  {
    category: "Financial",
    data: "Billing and payment details",
    purpose: "Process payments and keep financial records",
  },
  {
    category: "Programme",
    data: "Enrolment details, attendance, progress, 1:1 strategy day notes",
    purpose: "Deliver and personalize the Programme",
  },
  {
    category: "Communications",
    data: "Group chat messages, emails, correspondence",
    purpose: "Respond to you and provide support",
  },
  {
    category: "Video & Image",
    data: "Meeting/webinar recordings, photos, testimonials",
    purpose: "Deliver sessions and, with consent, marketing",
  },
  {
    category: "Technical",
    data: "IP address, browser/device info, cookies",
    purpose: "Operate and secure our website and Online Portal",
  },
  {
    category: "Marketing",
    data: "Communication preferences",
    purpose: "Send relevant updates, where permitted",
  },
];

const securityFeatures = [
  {
    icon: <Shield className="w-4 h-4 text-blue-600" />,
    label: "ICO registered data controller",
  },
  {
    icon: <FileText className="w-4 h-4 text-blue-600" />,
    label: "Written data processing agreements with all processors",
  },
  {
    icon: <CheckCircle className="w-4 h-4 text-blue-600" />,
    label: "UK GDPR & Data Protection Act 2018 compliant",
  },
  {
    icon: <Globe className="w-4 h-4 text-blue-600" />,
    label: "Safeguards for any international data transfers",
  },
];

export default PrivacyPolicy;
