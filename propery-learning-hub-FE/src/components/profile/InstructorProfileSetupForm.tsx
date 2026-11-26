'use client';

import React, { useState } from 'react';
import { 
  User, GraduationCap, Award, CreditCard, Upload, 
  Linkedin, Youtube, Globe2, BookOpen, Users, TrendingUp,
  Briefcase
} from 'lucide-react';

interface InstructorProfileSetupFormProps {
  currentStep: number;
  formData: any;
  setFormData: (data: any) => void;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  userPhone: string;
}

const InstructorProfileSetupForm = ({ 
  currentStep, 
  formData, 
  setFormData,
  userFirstName,
  userLastName,
  userEmail,
  userPhone
}: InstructorProfileSetupFormProps) => {
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  // Fixed checkbox handler
  const handleCheckboxChange = (fieldName: string, value: string) => {
    const currentArray = formData[fieldName] || [];
    const updatedArray = currentArray.includes(value)
      ? currentArray.filter((item: string) => item !== value)
      : [...currentArray, value];
    
    setFormData({ ...formData, [fieldName]: updatedArray });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      // Handle single checkbox (like acceptTerms)
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      // Handle all other inputs
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, profilePhoto: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const instructorPlans = [
    {
      id: 'free',
      name: 'Free Tier',
      price: { monthly: 0, yearly: 0 },
      features: [
        'Create up to 2 free courses',
        'Basic analytics dashboard',
        'Community access',
        'Standard revenue share (70/30)',
        'Email support',
        'Course completion certificates',
      ],
      recommended: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      price: { monthly: 99, yearly: 990 },
      features: [
        'Create unlimited courses',
        'Advanced analytics dashboard',
        'Custom branding',
        'Better revenue share (80/20)',
        'Marketing tools',
        'Student engagement features',
        'Priority support',
        'Custom certificates',
        'Affiliate program access',
      ],
      recommended: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: { monthly: 249, yearly: 2490 },
      features: [
        'All Professional features',
        'White-label solution',
        'Custom integrations',
        'Best revenue share (85/15)',
        'Dedicated account manager',
        'Team management',
        'API access',
        'Advanced security features',
        'Premium placement',
      ],
      recommended: false,
    },
  ];

  // Step 1: Personal & Professional Information
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <User className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Instructor Profile</h2>
          <p className="text-gray-600">Tell us about yourself and your expertise</p>
        </div>
      </div>

      {/* Read-only user information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            First Name
          </label>
          <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-600">
            {userFirstName}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Last Name
          </label>
          <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-600">
            {userLastName}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email
          </label>
          <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-600">
            {userEmail}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Phone Number
          </label>
          <div className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-600">
            {userPhone}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Professional Title
          </label>
          <input
            type="text"
            name="professionalTitle"
            value={formData.professionalTitle || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 placeholder-gray-600"
            placeholder="e.g., Senior Real Estate Analyst"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Years of Industry Experience
          </label>
          <select
            name="industryExperience"
            value={formData.industryExperience || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-gray-900"
          >
            <option value="" className="text-gray-600">Select experience</option>
            <option value="0-2">0-2 years</option>
            <option value="3-5">3-5 years</option>
            <option value="6-10">6-10 years</option>
            <option value="10+">10+ years</option>
          </select>
        </div>
      </div>

      {/* Profile Photo Upload */}
      <div className="mt-8">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Professional Photo
        </label>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
            {profilePreview ? (
              <img src={profilePreview} alt="Profile preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <User className="w-12 h-12" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <label className="cursor-pointer">
              <div className="px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 group">
                <div className="flex items-center justify-center gap-3">
                  <Upload className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-700 group-hover:text-blue-500">
                      Click to upload professional photo
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Professional headshot recommended (Max 2MB)
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Instructor Bio */}
      <div className="mt-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Instructor Bio & Teaching Philosophy
        </label>
        <textarea
          name="bio"
          value={formData.bio || ''}
          onChange={handleInputChange}
          rows={4}
          className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 placeholder-gray-600"
          placeholder="Share your expertise, teaching philosophy, and what students can expect from your courses..."
        />
      </div>

      {/* Primary Expertise */}
      <div className="mt-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Primary Area of Expertise
        </label>
        <select
          name="primaryExpertise"
          value={formData.primaryExpertise || ''}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-gray-900"
        >
          <option value="" className="text-gray-600">Select your main expertise</option>
          <option value="residential">Residential Real Estate</option>
          <option value="commercial">Commercial Real Estate</option>
          <option value="reits">REITs & Real Estate Funds</option>
          <option value="flipping">Property Flipping</option>
          <option value="rentals">Rental Property Management</option>
          <option value="development">Real Estate Development</option>
          <option value="finance">Real Estate Finance</option>
          <option value="law">Real Estate Law</option>
          <option value="tax">Real Estate Tax Strategies</option>
          <option value="international">International Real Estate</option>
        </select>
      </div>
    </div>
  );

  // Step 2: Teaching Profile & Credentials
  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Teaching Profile</h2>
          <p className="text-gray-600">Tell us about your teaching experience and credentials</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Years of Teaching Experience
          </label>
          <select
            name="teachingExperience"
            value={formData.teachingExperience || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-gray-900"
          >
            <option value="" className="text-gray-600">Select teaching experience</option>
            <option value="0-2">0-2 years</option>
            <option value="3-5">3-5 years</option>
            <option value="6-10">6-10 years</option>
            <option value="10+">10+ years</option>
          </select>
        </div>
    
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Languages You Teach In
              </label>
              <input
                type="text"
                name="languages"
                value={formData.languages || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-gray-600  border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 placeholder-gray-600"
                placeholder="English, Spanish, French, etc."
              />
            </div>
        
      </div>

      {/* Teaching Specializations */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Teaching Specializations</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'Beginner Courses', 
            'Advanced Analysis', 
            'Market Research', 
            'Deal Structuring',
            'Portfolio Management', 
            'Tax Strategies', 
            'Legal Aspects', 
            'Risk Management',
            'Case Studies', 
            'Technical Analysis', 
            'Fundamental Analysis',
            'Investment Strategies'
          ].map((specialization) => (
            <label key={specialization} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-blue-50 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={formData.teachingSpecializations?.includes(specialization) || false}
                onChange={() => handleCheckboxChange('teachingSpecializations', specialization)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700 text-sm">{specialization}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Qualifications & Certifications */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Qualifications & Certifications</h3>
        <div className="space-y-4">
          <textarea
            name="qualifications"
            value={formData.qualifications || ''}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 placeholder-gray-600"
            placeholder="List your degrees, certifications, licenses, awards, and relevant qualifications..."
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                LinkedIn Profile
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Linkedin className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  name="linkedinUrl"
                  value={formData.linkedinUrl || ''}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 text-gray-600 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 placeholder-gray-600"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                YouTube Channel (Optional)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Youtube className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="url"
                  name="youtubeUrl"
                  value={formData.youtubeUrl || ''}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 text-gray-600  border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 placeholder-gray-600"
                  placeholder="https://youtube.com/yourchannel"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Format Preferences */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferred Course Formats</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'Video Lectures',
            'Live Webinars',
            'Downloadable PDFs',
            'Interactive Quizzes',
            'Case Studies',
            'Assignments',
            'One-on-One Sessions',
            'Group Workshops',
            'Discussion Forums'
          ].map((format) => (
            <label key={format} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-blue-50 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={formData.courseFormats?.includes(format) || false}
                onChange={() => handleCheckboxChange('courseFormats', format)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700 text-sm">{format}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  // Step 3: Instructor Plan Selection (Free by default)
  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Choose Your Instructor Plan</h2>
          <p className="text-gray-600">Start with Free tier, upgrade for more features</p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {instructorPlans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => setFormData({ ...formData, instructorPlan: plan.id })}
            className={`relative p-6 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
              formData.instructorPlan === plan.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-blue-500'
            } ${plan.recommended ? 'border-blue-600 shadow-lg' : ''}`}
          >
            

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="mb-3">
                {plan.price[formData.billingCycle as keyof typeof plan.price] === 0 ? (
                  <div>
                    <span className="text-3xl font-bold text-gray-900">Free</span>
                    <span className="text-gray-600 block">Start Teaching</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-3xl font-bold text-gray-900">
                      ${plan.price[formData.billingCycle as keyof typeof plan.price]}
                    </span>
                    <span className="text-gray-600">
                      /{formData.billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                )}
              </div>
              {formData.billingCycle === 'yearly' && plan.price.yearly > 0 && (
                <p className="text-green-600 font-semibold text-sm">
                  Save ${(plan.price.monthly * 12 - plan.price.yearly)} yearly
                </p>
              )}
            </div>

            <div className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                formData.instructorPlan === plan.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white'
                  : plan.id === 'free'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              {formData.instructorPlan === plan.id ? 'Selected' : 
               plan.id === 'free' ? 'Start Free' : 'Select Plan'}
            </button>
          </div>
        ))}
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center mt-8">
        <div className="bg-gray-100 rounded-xl p-1 inline-flex">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, billingCycle: 'monthly' })}
            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
              formData.billingCycle === 'monthly'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, billingCycle: 'yearly' })}
            className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
              formData.billingCycle === 'yearly'
                ? 'bg-white text-blue-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly (Save 20%)
          </button>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        /* Apply placeholder color globally */
        input::placeholder,
        textarea::placeholder {
          color: #718096 !important; /* gray-600 */
          opacity: 1;
        }
        
        select:invalid {
          color: #718096;
        }
      `}</style>
    </>
  );
};

export default InstructorProfileSetupForm;