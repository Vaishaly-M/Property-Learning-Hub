// components/TermsAndConditions.tsx
import React from 'react';
import { FileCheck, Scale, Users, Shield, AlertTriangle, BookOpen, Video, Download, Calendar, CheckCircle } from 'lucide-react';

const TermsAndConditions = () => {
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
              <Scale className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-xl text-blue-50 max-w-3xl mx-auto">
              Understand the terms that govern your use of Freedom Property's online learning platform.
            </p>
            <div className="mt-6 flex items-center gap-2 text-blue-200">
              <span>Last Updated: July 2026</span>
              <span className="w-1 h-1 rounded-full bg-blue-300"></span>
              <span>Version 3.1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl shadow-xl border border-blue-100 p-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">2</div>
            <div className="text-sm text-gray-600">User Types</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">24/7</div>
            <div className="text-sm text-gray-600">Platform Access</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">Secure</div>
            <div className="text-sm text-gray-600">Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">Fair</div>
            <div className="text-sm text-gray-600">Usage Policy</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Introduction */}
        <div className="bg-blue-50 rounded-2xl p-8 mb-12 border border-blue-100">
          <p className="text-gray-700 text-lg leading-relaxed">
            These Terms & Conditions govern your use of the <span className="font-semibold text-blue-700">Freedom Property</span> 
            online education platform. By using our platform, you agree to these terms. Please read them carefully.
          </p>
        </div>

        {/* Terms Sections */}
        <div className="space-y-10">
          {termsSections.map((section, index) => (
            <div key={index} className="group">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">{section.title}</h2>
                  <p className="text-gray-600 leading-relaxed mb-3">{section.description}</p>
                  {section.list && (
                    <ul className="space-y-2">
                      {section.list.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-600">
                          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* User Responsibilities Table */}
        <div className="mt-16 bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
            <h3 className="text-lg font-semibold text-gray-800">User Responsibilities</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsibilities</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prohibited Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Learner</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    Complete courses, respect intellectual property, participate in webinars ethically
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    No sharing of course materials, no unauthorized recording
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Instructor</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    Provide quality content, honor contracts, conduct professional webinars
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    No plagiarism, no false advertising, maintain confidentiality
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Acceptance */}
        <div className="mt-16 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 border border-green-200">
          <div className="flex items-start gap-3">
            <FileCheck className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Acceptance of Terms</h3>
              <p className="text-gray-600">
                By creating an account and using Freedom Property, you acknowledge that you have read, understood, 
                and agree to be bound by these Terms & Conditions. If you do not agree, please do not use our platform.
              </p>
            </div>
          </div>
        </div>

    

       
      </div>
    </div>
  );
};

const termsSections = [
  {
    icon: <Users className="w-6 h-6 text-blue-600" />,
    title: "Account Registration",
    description: "Both learners and instructors must create accounts to access platform features.",
    list: [
      "Provide accurate and complete registration information",
      "Maintain the security of your account credentials",
      "Notify us immediately of unauthorized account access",
      "You are responsible for all activities under your account"
    ]
  },
  {
    icon: <BookOpen className="w-6 h-6 text-blue-600" />,
    title: "Course Access & Content",
    description: "Access to courses and content is subject to these terms.",
    list: [
      "Courses are for personal learning purposes only",
      "Content is protected by intellectual property rights",
      "Download materials for offline access as permitted",
      "Course completion certificates are earned through participation"
    ]
  },
  {
    icon: <Video className="w-6 h-6 text-blue-600" />,
    title: "Webinar & Meeting Conduct",
    description: "Professional behavior is expected during all live sessions.",
    list: [
      "Respect fellow participants and instructors",
      "No disruptive behavior during webinars",
      "Recordings are for educational purposes only",
      "Follow the instructor's guidelines during sessions"
    ]
  },
  {
    icon: <Download className="w-6 h-6 text-blue-600" />,
    title: "Content Usage & Downloads",
    description: "Course materials are provided for educational use.",
    list: [
      "Download materials for personal offline study",
      "Do not redistribute or share course content",
      "Instructors retain rights to their course materials",
      "Commercial use of content is prohibited"
    ]
  },
  {
    icon: <Calendar className="w-6 h-6 text-blue-600" />,
    title: "Instructor Contracts & Deals",
    description: "Instructors agree to specific terms for content creation and compensation.",
    list: [
      "Contracts govern content creation and delivery",
      "Deal terms include revenue sharing agreements",
      "Scheduled webinars must be delivered as promised",
      "Quality standards apply to all course content"
    ]
  },
  {
    icon: <AlertTriangle className="w-6 h-6 text-blue-600" />,
    title: "Limitation of Liability",
    description: "Freedom Property provides educational content in good faith.",
    list: [
      "Content is for educational purposes only",
      "We are not responsible for investment decisions",
      "Platform availability may have occasional disruptions",
      "User's reliance on content is at their own risk"
    ]
  }
];



export default TermsAndConditions;