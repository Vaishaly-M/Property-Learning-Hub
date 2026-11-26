// components/Disclaimer.tsx
import React from 'react';
import { AlertTriangle, Shield, Info, Users, Building2, TrendingUp, Award, Heart, Quote } from 'lucide-react';

const Disclaimer = () => {
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
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Disclaimer
            </h1>
            <p className="text-xl text-blue-50 max-w-3xl mx-auto">
              Important information about the educational nature of Freedom Property and our commitment to transparency.
            </p>
            <div className="mt-6 flex items-center gap-2 text-blue-200">
              <span>Last Updated: July 2026</span>
              <span className="w-1 h-1 rounded-full bg-blue-300"></span>
              <span>Version 1.3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-2xl shadow-xl border border-blue-100 p-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">10+</div>
            <div className="text-sm text-gray-600">Years Experience</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">100%</div>
            <div className="text-sm text-gray-600">Educational Focus</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">Real</div>
            <div className="text-sm text-gray-600">Industry Experience</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">Trusted</div>
            <div className="text-sm text-gray-600">Community</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Founder's Note - Special Section */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100/70 rounded-2xl p-8 mb-12 border-2 border-blue-200 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 rounded-full filter blur-2xl"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Quote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">A Note From Our Founder</h3>
                <p className="text-sm text-blue-600">John Anderson • CEO, Freedom Property</p>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-gray-700 leading-relaxed mb-4 italic text-lg">
                    "With over 20 years of hands-on experience in the service accommodation industry, 
                    I've built Freedom Property to share real-world knowledge and practical insights. 
                    This platform is not about giving financial advice—it's about teaching the strategies, 
                    systems, and lessons I've learned through years of navigating this industry. 
                    Every course, webinar, and resource is created from actual experience in managing 
                    properties, serving guests, and building successful accommodation businesses."
                  </p>
                  <div className="flex items-center gap-6 text-sm text-gray-600 mt-2">
                    <span className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-blue-500" />
                      Award-winning operator
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      500+ properties managed
                    </span>
                    <span className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-blue-500" />
                      Passionate educator
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* General Disclaimer */}
        <div className="bg-amber-50 rounded-2xl p-8 mb-12 border border-amber-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Educational Purpose Only</h2>
              <p className="text-gray-700 leading-relaxed">
                All content, courses, and materials provided on Freedom Property are for <span className="font-semibold">educational and informational purposes only</span>. 
                This platform is designed to share knowledge and experience in the service accommodation industry.
              </p>
              <div className="mt-4 bg-white/70 rounded-lg p-4 border border-amber-200">
                <p className="text-sm text-gray-600">
                  <strong className="text-amber-700">Important:</strong> The information provided does not constitute financial, legal, or investment advice. 
                  Always consult with qualified professionals for specific advice tailored to your situation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer Sections */}
        <div className="space-y-8">
          {disclaimerSections.map((section, index) => (
            <div key={index} className="bg-white rounded-xl border border-blue-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  {section.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{section.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{section.description}</p>
                  {section.list && (
                    <ul className="mt-3 space-y-1">
                      {section.list.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5"></div>
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

        {/* Key Principles */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-2xl p-8 border border-blue-200">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <Award className="w-6 h-6 text-blue-600" />
            Our Commitment to You
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {commitments.map((item, idx) => (
              <div key={idx} className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-blue-100 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  {item.icon}
                </div>
                <h4 className="font-semibold text-gray-800 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final Note */}
        <div className="mt-12 bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <p className="text-gray-600 text-center">
            Freedom Property is a learning community built on <span className="font-semibold">real experience, practical knowledge, and a passion for education</span>. 
            We're here to help you learn and grow in the service accommodation industry.
          </p>
        </div>

      </div>
    </div>
  );
};

const disclaimerSections = [
  {
    icon: <TrendingUp className="w-6 h-6 text-blue-600" />,
    title: "No Financial Advice",
    description: "Our content is educational and based on industry experience, not financial advisory services.",
    list: [
      "Course materials are for learning purposes only",
      "Investment decisions should be made with professional advice",
      "Past performance does not guarantee future results",
      "Individual results may vary based on circumstances"
    ]
  },
  {
    icon: <Users className="w-6 h-6 text-blue-600" />,
    title: "Personal Responsibility",
    description: "Users are responsible for their own learning outcomes and applications of knowledge.",
    list: [
      "Apply learned concepts at your own discretion",
      "Verify information independently",
      "Seek professional advice when needed",
      "Understand that results depend on individual effort"
    ]
  },
  {
    icon: <Building2 className="w-6 h-6 text-blue-600" />,
    title: "Industry Experience",
    description: "All content is derived from real-world experience in the service accommodation industry.",
    list: [
      "Based on actual operational experience",
      "Includes practical strategies used in real properties",
      "Reflects industry best practices and lessons learned",
      "Updated regularly to reflect industry changes"
    ]
  },
  {
    icon: <Info className="w-6 h-6 text-blue-600" />,
    title: "Accuracy of Information",
    description: "We strive for accuracy but recommend independent verification.",
    list: [
      "Information provided is general in nature",
      "Situations may change after publication",
      "Always check current industry standards",
      "Contact us with any questions or concerns"
    ]
  }
];

const commitments = [
  {
    icon: <Award className="w-6 h-6 text-blue-600" />,
    title: "Real Experience",
    description: "Content based on decades of hands-on industry experience"
  },
  {
    icon: <Heart className="w-6 h-6 text-blue-600" />,
    title: "Transparency",
    description: "Clear communication about the educational nature of our platform"
  },
  {
    icon: <Users className="w-6 h-6 text-blue-600" />,
    title: "Community First",
    description: "Building a supportive learning environment for all members"
  }
];


export default Disclaimer;