// components/DataProtectionPolicy.tsx
import React, { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Eye,
  FileText,
  Users,
  Globe,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  UserCheck,
  Clock,
  BookOpen,
  Scale,
  Building2,
  Baby,
  Bot,
  Mail,
  ChevronDown,
  ChevronRight,
  Award,
  Calendar,
  Share2,
  Printer,
  Bookmark,
  Search,
  ArrowUp,
  Download,
  ExternalLink,
  Info,
} from "lucide-react";

// Define types for the section and retention data
interface Section {
  icon: React.ReactNode;
  title: string;
  description?: string;
  list?: string[];
  note?: string;
}

interface RetentionRow {
  category: string;
  retention: string;
  disposal: string;
}

const DataProtectionPolicy = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  const scrollToSection = (id: string): void => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Scroll to top functionality
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

  // Filter sections based on search
  const filteredSections: Section[] = sections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (section.description &&
        section.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (section.list &&
        section.list.some((item) =>
          item.toLowerCase().includes(searchTerm.toLowerCase()),
        )),
  );

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
              <Scale className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Data Protection Policy
            </h1>
            <p className="text-xl text-blue-50 max-w-3xl mx-auto">
              How Freedom Property Academy meets its obligations under UK GDPR,
              the Data Protection Act 2018, and PECR. This internal governance
              document should be read alongside our public Privacy Policy.
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
              {sections.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Policy Sections</div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              72hrs
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Breach Notification
            </div>
          </div>
          <div className="text-center group cursor-default">
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-300">
              UK GDPR
            </div>
            <div className="text-sm text-gray-600 mt-1">& DPA 2018 Aligned</div>
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
                <nav className="space-y-1">
                  {sections.map((section, idx) => (
                    <button
                      key={idx}
                      onClick={() => scrollToSection(`section-${idx}`)}
                      className="block w-full text-left text-sm text-gray-500 hover:text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg group"
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {section.title}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => scrollToSection("retention-table")}
                    className="block w-full text-left text-sm text-gray-500 hover:text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg group"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      Data Retention & Disposal
                    </span>
                  </button>
                  <button
                    onClick={() => scrollToSection("breach-management")}
                    className="block w-full text-left text-sm text-gray-500 hover:text-blue-600 transition-colors py-1.5 px-2 hover:bg-blue-50 rounded-lg group"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      Data Breach Management
                    </span>
                  </button>
                </nav>
              </div>
              <div className="mt-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      This is an internal governance document. For external
                      inquiries, please refer to our public Privacy Policy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div>
            {/* Search Bar */}
            <div className="relative mb-8">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search policy sections..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
                className="block w-full pl-10 pr-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
              />
            </div>

            {/* Introduction */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 mb-10 border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <Award className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    This is an internal governance document. It sets out how{" "}
                    <span className="font-semibold text-blue-700">
                      Freedom Property Academy
                    </span>{" "}
                    ("the Academy") meets its obligations under the UK General
                    Data Protection Regulation (UK GDPR), the Data Protection
                    Act 2018, and the Privacy and Electronic Communications
                    Regulations (PECR), as amended by the Data (Use and Access)
                    Act 2025 ("DUAA"). It applies to anyone who processes
                    personal data on the Academy's behalf.
                  </p>
                </div>
              </div>
            </div>

            {/* Policy Sections - Always Open */}
            <div className="space-y-4 mb-12">
              {filteredSections.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    No sections found matching your search.
                  </p>
                </div>
              ) : (
                filteredSections.map((section, index) => {
                  const originalIndex = sections.indexOf(section);
                  return (
                    <div
                      id={`section-${originalIndex}`}
                      key={originalIndex}
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
                      <div className="p-6">
                        {section.description && (
                          <p className="text-gray-600 leading-relaxed mb-4">
                            {section.description}
                          </p>
                        )}
                        {section.list && (
                          <ul className="space-y-2">
                            {section.list.map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-3 text-gray-600 hover:bg-blue-50/50 p-2 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {section.note && (
                          <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <p className="text-gray-600 text-sm italic flex items-start gap-2">
                              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                              {section.note}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Data Retention Table */}
            <div
              id="retention-table"
              className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 mb-10 scroll-mt-8"
            >
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Data Retention & Disposal
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Personal data is retained only as long as necessary.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Database className="w-4 h-4" />
                    <span>{retentionTable.length} categories</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Data Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Retention Period
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Disposal Method
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {retentionTable.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {row.category}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-400" />
                            {row.retention}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Shield className="w-3 h-3 text-green-500" />
                            {row.disposal}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Data Breach Management - highlighted */}
            <div
              id="breach-management"
              className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200 mb-10 scroll-mt-8 shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 text-lg mb-3">
                    Data Breach Management
                  </h4>
                  <ul className="space-y-3">
                    <li className="text-gray-700 text-sm flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      Any suspected personal data breach must be reported
                      immediately to the person responsible for data protection
                      matters.
                    </li>
                    <li className="text-gray-700 text-sm flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      The Academy assesses the risk posed by a breach without
                      undue delay, and notifies the ICO within 72 hours of
                      becoming aware of it where the breach is likely to result
                      in a risk to individuals' rights and freedoms.
                    </li>
                    <li className="text-gray-700 text-sm flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      Where a breach is likely to result in a high risk to
                      individuals, the Academy also notifies the affected
                      individuals without undue delay.
                    </li>
                    <li className="text-gray-700 text-sm flex items-start gap-3">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0"></span>
                      All breaches, whether or not notifiable, are recorded in
                      an internal breach log, including the facts, effects, and
                      remedial action taken.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Review & Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                    <RefreshCw className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">
                      Review of This Policy
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      This policy is reviewed at least annually, and whenever
                      there is a material change in the law or in the Academy's
                      processing activities.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100 shadow-sm">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">
                      Questions About This Policy?
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Data protection complaints and queries can be raised via
                      info@freedompropertyacademy.com We acknowledge complaints
                      within 30 days and respond without undue delay.
                    </p>
                  </div>
                </div>
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
    icon: <FileText className="w-6 h-6 text-blue-600" />,
    title: "Purpose and Scope",
    description:
      "This policy applies to all personal data processed in connection with the Programme, the Platform Software, and the Academy's marketing activities, regardless of the format in which it is held.",
  },
  {
    icon: <Scale className="w-6 h-6 text-blue-600" />,
    title: "Data Protection Principles",
    description:
      "The Academy processes personal data in line with the following principles under Article 5 UK GDPR:",
    list: [
      "Lawfulness, fairness, and transparency",
      "Purpose limitation — data is only used for the purpose(s) it was collected for, or a compatible purpose",
      "Data minimisation — only the data genuinely needed is collected",
      "Accuracy — data is kept accurate and up to date",
      "Storage limitation — data is not kept longer than necessary",
      "Integrity and confidentiality — appropriate security is maintained",
      "Accountability — the Academy can demonstrate compliance with the above",
    ],
  },
  {
    icon: <Users className="w-6 h-6 text-blue-600" />,
    title: "Roles and Responsibilities",
    list: [
      "The Academy is the data controller for personal data processed in connection with the Programme",
      "[Andrei / insert name and role] is responsible for data protection matters, including data subject requests, complaints, maintaining this policy, and acting as the main point of contact with the ICO where necessary",
      "Having assessed the nature, scale, and purpose of its processing, the Academy has determined it is not currently required to appoint a formal Data Protection Officer under Article 37 UK GDPR — this will be revisited if processing changes materially",
    ],
  },
  {
    icon: <CheckCircle className="w-6 h-6 text-blue-600" />,
    title: "Lawful Basis for Processing",
    list: [
      "Before processing personal data for a new purpose, the responsible person identifies and documents an appropriate lawful basis under Article 6 UK GDPR (and, for special category data, an Article 9 condition)",
      "The Academy's current lawful bases for its main processing activities are set out in its Privacy Policy",
      'Where the Academy relies on legitimate interests, it carries out and documents a balancing test, save where processing falls within a DUAA "recognised legitimate interest" category (which must still be necessary and proportionate)',
    ],
  },
  {
    icon: <Shield className="w-6 h-6 text-blue-600" />,
    title: "Special Category Data",
    description:
      "The Academy does not, as a matter of course, seek to collect special category data (e.g. health data, or data about racial or ethnic origin, religious belief, or similar). Where a Client volunteers such data — for example, to explain a delay in meeting a Programme requirement on health grounds — it is used only for that purpose, access is restricted internally, and it is deleted once no longer needed.",
  },
  {
    icon: <UserCheck className="w-6 h-6 text-blue-600" />,
    title: "Data Subject Rights Procedures",
    description:
      "On receiving a request from an individual to exercise a data protection right, the Academy will:",
    list: [
      "Verify the requester's identity before disclosing any data",
      "Carry out a reasonable and proportionate search for the relevant data",
      "Respond within one calendar month of receipt, extendable by a further two months for complex or numerous requests (informing the individual of any extension within the first month)",
      'Where reasonably necessary to clarify what the requester is seeking, pause ("stop the clock") on the response period until that clarification is received',
    ],
  },
  {
    icon: <FileText className="w-6 h-6 text-blue-600" />,
    title: "Handling Complaints",
    description:
      "In line with section 164A of the Data Protection Act 2018 (in force from 19 June 2026), the Academy:",
    list: [
      "Provides an accessible, electronic means for individuals to submit data protection complaints, via info@freedompropertyacademy.com",
      "Maintains a log of all complaints received",
      "Acknowledges each complaint within 30 days of receipt",
      "Responds substantively without undue delay, keeping the complainant updated on progress",
    ],
    note: "Individuals who remain unsatisfied after raising a complaint with the Academy may also refer the matter to the ICO.",
  },
  {
    icon: <CheckCircle className="w-6 h-6 text-blue-600" />,
    title: "Consent Management",
    description:
      "Where the Academy relies on consent (for example, to record sessions, or to use a Client's image, video, or testimonial in marketing), it keeps a record of when and how consent was given, makes withdrawing consent as easy as giving it, and stops the relevant processing promptly on withdrawal, without affecting the lawfulness of processing carried out before that point.",
  },
  {
    icon: <Lock className="w-6 h-6 text-blue-600" />,
    title: "Data Security",
    description:
      "The Academy maintains appropriate technical and organisational measures, including:",
    list: [
      "Access controls and strong, unique passwords for internal systems and the Platform Software",
      "Restricting access to personal data to those who need it to perform their role",
      "Using reputable, secure third-party providers for the Online Portal, CRM, PMS, Guestalizer, Infinit Invoice, Infinit Doc, the bookings platform, and the deals marketplace",
      "Keeping software and systems up to date",
      "Providing data protection awareness to anyone working on behalf of the Academy",
    ],
  },
  {
    icon: <Building2 className="w-6 h-6 text-blue-600" />,
    title: "Third-Party Processors",
    description:
      "The Academy only engages third-party processors (including providers of the Platform Software) who can provide sufficient guarantees of appropriate technical and organisational security measures, and enters into a written data processing agreement with each, covering the requirements of Article 28 UK GDPR.",
  },
  {
    icon: <Globe className="w-6 h-6 text-blue-600" />,
    title: "International Transfers",
    description:
      "Where a processor stores or transfers personal data outside the UK, the Academy ensures an appropriate transfer mechanism is in place, such as an adequacy finding, the UK International Data Transfer Agreement, or standard contractual clauses.",
  },
  {
    icon: <Bot className="w-6 h-6 text-blue-600" />,
    title: "Automated Decision-Making and Profiling",
    description:
      "The Academy does not currently use automated decision-making or profiling that produces legal or similarly significant effects on individuals. If this changes, the Academy will assess the requirements of Articles 22A to 22D UK GDPR (introduced by the DUAA) before doing so, and will put in place appropriate safeguards, including the ability for individuals to obtain human review of significant decisions.",
  },
  {
    icon: <Database className="w-6 h-6 text-blue-600" />,
    title: "Cookies and Direct Marketing",
    description:
      "The Academy complies with PECR when using cookies and sending electronic marketing.",
    list: [
      "Strictly necessary and low-risk analytics/functionality cookies may be used without consent, in line with the exemptions introduced by the DUAA",
      "Cookies used for advertising or cross-site tracking (including social media advertising pixels) are only used with prior consent",
      "Electronic marketing is only sent with consent (or another valid basis under PECR), and every marketing communication provides a clear way to opt out",
    ],
  },
  {
    icon: <Baby className="w-6 h-6 text-blue-600" />,
    title: "Children's Data",
    description:
      "The Programme is directed at adults and is not a service likely to be accessed by children. The Academy does not knowingly collect personal data from children.",
  },
  {
    icon: <BookOpen className="w-6 h-6 text-blue-600" />,
    title: "Training and Awareness",
    description:
      "Anyone working on behalf of the Academy who handles personal data is made aware of this policy and given appropriate guidance on their data protection responsibilities before doing so.",
  },
];

const retentionTable: RetentionRow[] = [
  {
    category: "Client contracts and financial records",
    retention: "6 years after the relationship ends",
    disposal: "Secure deletion / confidential disposal",
  },
  {
    category: "CRM / Programme records (contact and progress data)",
    retention: "Duration of membership plus 2 years",
    disposal: "Secure deletion",
  },
  {
    category: "Meeting and webinar recordings",
    retention: "12 months, unless needed for a specific ongoing purpose",
    disposal: "Secure deletion",
  },
  {
    category: "Marketing images, video, and testimonials",
    retention: "While in active marketing use, or until consent is withdrawn",
    disposal: "Removed from marketing use; source files deleted where feasible",
  },
  {
    category: "Website / cookie data",
    retention: "As set out in the cookie banner/settings",
    disposal: "Automatic expiry per cookie settings",
  },
];

export default DataProtectionPolicy;
