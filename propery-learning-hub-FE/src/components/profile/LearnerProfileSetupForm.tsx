'use client';

import React, { useState } from 'react';
import { 
  User, Briefcase, Upload,
  MapPin, Phone, Globe2
} from 'lucide-react';

interface LearnerProfileSetupFormProps {
  currentStep: number;
  formData: any;
  setFormData: (data: any) => void;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  userPhone: string;
}

const LearnerProfileSetupForm = ({ 
  currentStep, 
  formData, 
  setFormData,
  userFirstName,
  userLastName,
  userEmail,
  userPhone
}: LearnerProfileSetupFormProps) => {
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
      // Handle single checkbox (if any)
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

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200';

  const selectClass = (value: string) =>
    `w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 appearance-none cursor-pointer [&>option]:text-gray-900 [&>option]:bg-white ${
      value ? 'text-gray-900' : 'text-gray-500'
    }`;

  const readOnlyValueClass =
    'w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-sm font-medium text-slate-900 cursor-not-allowed';

  const inputWithIconClass =
    'w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200';

  // Step 1: Personal Information
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <User className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
          <p className="text-gray-600">Tell us about yourself as a learner</p>
        </div>
      </div>

      {/* Read-only user information */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">
          Account details from registration
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            First Name 
          </label>
          <div className={readOnlyValueClass}>
            {userFirstName || '—'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Last Name 
          </label>
          <div className={readOnlyValueClass}>
            {userLastName || '—'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Email
          </label>
          <div className={readOnlyValueClass}>
            {userEmail || '—'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Phone Number
          </label>
          <div className={readOnlyValueClass}>
            {userPhone || '—'}
          </div>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date of Birth <span className="font-normal text-gray-500">(Optional)</span>
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth || ''}
            onChange={handleInputChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Gender <span className="font-normal text-gray-500">(Optional)</span>
          </label>
          <select
            name="gender"
            value={formData.gender || ''}
            onChange={handleInputChange}
            className={`profile-setup-select ${selectClass(formData.gender || '')}`}
          >
            <option value="" disabled hidden>
              Select gender
            </option>
            <option value="male" className="text-gray-900">Male</option>
            <option value="female" className="text-gray-900">Female</option>
            <option value="other" className="text-gray-900">Other</option>
            <option value="prefer-not-to-say" className="text-gray-900">Prefer not to say</option>
          </select>
        </div>
      </div>

      {/* Profile Photo Upload */}
      <div className="mt-8">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Profile Photo
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
                      Click to upload profile photo
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      PNG, JPG up to 2MB
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

      {/* Bio */}
      <div className="mt-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Learning Goals & Bio
        </label>
        <textarea
          name="bio"
          value={formData.bio || ''}
          onChange={handleInputChange}
          rows={4}
          className={inputClass}
          placeholder="Tell us about your investment interests, learning goals, and what you hope to achieve..."
        />
      </div>
    </div>
  );

  // Step 2: Professional & Investment Information
  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Professional & Investment Profile</h2>
          <p className="text-gray-600">Tell us about your background and interests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Current Role / Job Title <span className="font-normal text-gray-500">(Optional)</span>
          </label>
          <input
            type="text"
            name="jobTitle"
            value={formData.jobTitle || ''}
            onChange={handleInputChange}
            className={inputClass}
            placeholder="e.g., Aspiring Real Estate Investor"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Company / Organization
          </label>
          <input
            type="text"
            name="company"
            value={formData.company || ''}
            onChange={handleInputChange}
            className={inputClass}
            placeholder="e.g., Self-employed, Student, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Years of Investment Experience <span className="font-normal text-gray-500">(Optional)</span>
          </label>
          <select
            name="yearsOfExperience"
            value={formData.yearsOfExperience || ''}
            onChange={handleInputChange}
            className={`profile-setup-select ${selectClass(formData.yearsOfExperience || '')}`}
          >
            <option value="" disabled hidden>
              Select experience level
            </option>
            <option value="beginner" className="text-gray-900">Beginner (0-2 years)</option>
            <option value="intermediate" className="text-gray-900">Intermediate (3-5 years)</option>
            <option value="advanced" className="text-gray-900">Advanced (6-10 years)</option>
            <option value="expert" className="text-gray-900">Expert (10+ years)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Investment Budget <span className="font-normal text-gray-500">(Optional)</span>
          </label>
          <select
            name="investmentBudget"
            value={formData.investmentBudget || ''}
            onChange={handleInputChange}
            className={`profile-setup-select ${selectClass(formData.investmentBudget || '')}`}
          >
            <option value="" disabled hidden>
              Select budget range
            </option>
            <option value="under-50k" className="text-gray-900">Under £50,000</option>
            <option value="50k-200k" className="text-gray-900">£50,000 - £200,000</option>
            <option value="200k-500k" className="text-gray-900">£200,000 - £500,000</option>
            <option value="500k-1m" className="text-gray-900">£500,000 - £1 Million</option>
            <option value="over-1m" className="text-gray-900">Over £1 Million</option>
          </select>
        </div>
      </div>

      {/* Investment Interests */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Interests</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'Residential Properties', 
            'Commercial Real Estate', 
            'REITs', 
            'Property Flipping',
            'Rental Properties', 
            'Real Estate Development', 
            'International Markets', 
            'Crowdfunding'
          ].map((interest) => (
            <label key={interest} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-blue-50 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={formData.investmentInterests?.includes(interest) || false}
                onChange={() => handleCheckboxChange('investmentInterests', interest)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700 text-sm">{interest}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Learning Preferences */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Preferences</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'Video Courses',
            'Live Webinars',
            'Case Studies',
            'One-on-One Mentoring',
            'Group Discussions',
            'Downloadable Resources',
            'Interactive Tools',
            'Certification Programs'
          ].map((preference) => (
            <label key={preference} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-blue-50 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={formData.learningPreferences?.includes(preference) || false}
                onChange={() => handleCheckboxChange('learningPreferences', preference)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700 text-sm">{preference}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Country <span className="font-normal text-gray-500">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <MapPin className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="country"
                value={formData.country || ''}
                onChange={handleInputChange}
                className={inputWithIconClass}
                placeholder="United Kingdom"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              City <span className="font-normal text-gray-500">(Optional)</span>
            </label>
            <input
              type="text"
              name="city"
              value={formData.city || ''}
              onChange={handleInputChange}
              className={inputClass}
              placeholder="London"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Alternate Phone
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Phone className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="tel"
                name="alternatePhone"
                value={formData.alternatePhone || ''}
                onChange={handleInputChange}
                className={inputWithIconClass}
                placeholder="+44 123 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              LinkedIn Profile (Optional)
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Globe2 className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl || ''}
                onChange={handleInputChange}
                className={inputWithIconClass}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}

      <style jsx global>{`
        select.profile-setup-select option {
          color: #111827;
          background-color: #ffffff;
        }
      `}</style>
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </>
  );
};

export default LearnerProfileSetupForm;