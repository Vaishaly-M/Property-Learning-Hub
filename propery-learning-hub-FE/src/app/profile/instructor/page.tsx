'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InstructorProfileSetupForm from '../../../components/profile/InstructorProfileSetupForm';
import ProfileSetupProgress from '../../../components/profile/ProfileSetupProgress';
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS } from '../../../services/mediaUploadService';

const API_FIELD_MAP: Record<string, string> = {
  first_name: 'firstName',
  last_name: 'lastName',
  professional_title: 'professionalTitle',
  industry_experience: 'industryExperience',
  primary_expertise: 'primaryExpertise',
  teaching_experience: 'teachingExperience',
  qualifications: 'qualifications',
  linkedin_url: 'linkedinUrl',
  youtube_url: 'youtubeUrl',
  portfolio_url: 'portfolioUrl',
  instructor_plan: 'instructorPlan',
  bio: 'bio',
};

function mapApiErrors(errors: Record<string, string | string[]>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, msg] of Object.entries(errors)) {
    const message = Array.isArray(msg) ? msg[0] : msg;
    mapped[API_FIELD_MAP[key] || key] = message;
  }
  return mapped;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidOptionalUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  try {
    new URL(normalizeUrl(trimmed));
    return true;
  } catch {
    return false;
  }
}

export default function InstructorProfileSetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  
  const [formData, setFormData] = useState({
    // Personal Information (read-only from registration)
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    
    // Personal Information (editable)
    profilePhoto: null as File | null,
    professionalTitle: '',
    bio: '',
    industryExperience: '',
    primaryExpertise: '',
    
    // Teaching Profile
    teachingExperience: '',
    courseOutput: '',
    qualifications: '',
    languages: '',
    
    // Social Links
    linkedinUrl: '',
    youtubeUrl: '',
    portfolioUrl: '',
    
    // Contact Information
    country: '',
    city: '',
    
    // Preferences
    teachingSpecializations: [] as string[],
    courseFormats: [] as string[],
    
    // Plan & Terms
    instructorPlan: 'free',
    billingCycle: 'monthly',
    acceptTerms: false,
  });

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/user/profile-info`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const userData = data.data.user;
          setUser(userData);
          
          // Pre-fill form with user data
          setFormData(prev => ({
            ...prev,
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
            phoneNumber: userData.phone_number || '',
          }));
          
          // If profile already exists, pre-fill with existing data
          if (data.data.profile) {
            const profileData = data.data.profile;
            setFormData(prev => ({
              ...prev,
              professionalTitle: profileData.professional_title || '',
              industryExperience: profileData.industry_experience || '',
              primaryExpertise: profileData.primary_expertise || '',
              bio: profileData.bio || '',
              country: profileData.country || '',
              city: profileData.city || '',
              teachingExperience: profileData.teaching_experience || '',
              courseOutput: profileData.course_output || '',
              qualifications: profileData.qualifications || '',
              languages: profileData.languages || '',
              linkedinUrl: profileData.linkedin_url || '',
              youtubeUrl: profileData.youtube_url || '',
              portfolioUrl: profileData.portfolio_url || '',
              acceptTerms: profileData.accept_terms || false,
              instructorPlan: profileData.instructor_plan || 'free',
              billingCycle: profileData.billing_cycle || 'monthly',
              teachingSpecializations: profileData.teaching_specializations || [],
              courseFormats: profileData.course_formats || [],
            }));
          }
        } else {
          console.error('Failed to fetch user data:', data.message);
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const validateStep = (step: number): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (step === 2) {
      if (!isValidOptionalUrl(formData.linkedinUrl)) {
        errors.linkedinUrl = 'Please enter a valid LinkedIn URL';
      }
      if (!isValidOptionalUrl(formData.youtubeUrl)) {
        errors.youtubeUrl = 'Please enter a valid YouTube URL';
      }
      if (!isValidOptionalUrl(formData.portfolioUrl)) {
        errors.portfolioUrl = 'Please enter a valid portfolio URL';
      }
    }

    return errors;
  };

  const validateAllSteps = (): boolean => {
    const errors = {
      ...validateStep(1),
      ...validateStep(2),
      ...validateStep(3),
    };
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const appendIfPresent = (data: FormData, key: string, value: string) => {
    if (value && value.trim()) {
      data.append(key, value.trim());
    }
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) {
      setSubmitError('Please fix the highlighted fields before completing setup.');
      return;
    }

    setSubmitError('');
    setFieldErrors({});

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add user data
      submitData.append('first_name', formData.firstName);
      submitData.append('last_name', formData.lastName);
      
      // Instructor specific data
      submitData.append('professional_title', formData.professionalTitle.trim());
      appendIfPresent(submitData, 'bio', formData.bio);
      appendIfPresent(submitData, 'industry_experience', formData.industryExperience);
      appendIfPresent(submitData, 'primary_expertise', formData.primaryExpertise);
      appendIfPresent(submitData, 'teaching_experience', formData.teachingExperience);
      appendIfPresent(submitData, 'course_output', formData.courseOutput);
      appendIfPresent(submitData, 'qualifications', formData.qualifications);
      appendIfPresent(submitData, 'languages', formData.languages);
      appendIfPresent(submitData, 'linkedin_url', normalizeUrl(formData.linkedinUrl));
      appendIfPresent(submitData, 'youtube_url', normalizeUrl(formData.youtubeUrl));
      appendIfPresent(submitData, 'portfolio_url', normalizeUrl(formData.portfolioUrl));
      appendIfPresent(submitData, 'country', formData.country);
      appendIfPresent(submitData, 'city', formData.city);
      submitData.append('instructor_plan', formData.instructorPlan || 'free');
      submitData.append('billing_cycle', formData.billingCycle);
      
      // Array fields
      if (formData.teachingSpecializations.length > 0) {
        formData.teachingSpecializations.forEach(spec => {
          submitData.append('teaching_specializations[]', spec);
        });
      }
      
      if (formData.courseFormats.length > 0) {
        formData.courseFormats.forEach(format => {
          submitData.append('course_formats[]', format);
        });
      }
      
      // Profile photo
      if (formData.profilePhoto) {
        await appendMediaToFormData(submitData, formData.profilePhoto, MEDIA_UPLOAD_PRESETS.profilePhoto);
      }
      
      // Complete instructor profile
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/instructor/profile/complete`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update local storage user data
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userData = JSON.parse(userStr);
          userData.profile_completed = true;
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        router.push('/instructor/dashboard');
      } else {
        if (data.errors) {
          setFieldErrors(mapApiErrors(data.errors));
        }
        setSubmitError(data.message || 'Profile setup failed. Please check the required fields.');
      }
    } catch (error) {
      console.error('Error submitting profile:', error);
      setSubmitError('Error setting up profile. Please try again.');
    }
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
        setSubmitError('Please fix the highlighted fields before continuing.');
      return;
    }
    setFieldErrors({});
    setSubmitError('');
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading profile setup...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  // Check if user is actually an instructor
  if (user.role !== 'instructor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">This page is for instructors only.</p>
          <button
            onClick={() => {
              if (user.role === 'learner') {
                window.location.href = '/profile/learner';
              } else {
                window.location.href = '/';
              }
            }}
            className="mt-4 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Go to {user.role === 'learner' ? 'Learner Profile' : 'Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-900 to-blue-700 rounded-3xl shadow-xl shadow-blue-900/20 mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Complete Your Instructor Profile
            </h1>
            <p className="text-gray-600 text-lg">
              Set up your instructor profile to start teaching about property investment
            </p>
          </div>

          {/* Progress Bar */}
          <ProfileSetupProgress currentStep={currentStep} />

          {/* Main Form */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/10 p-6 md:p-10 border border-gray-100">
            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {submitError}
              </div>
            )}
            {Object.keys(fieldErrors).length > 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm space-y-1">
                {Object.entries(fieldErrors).map(([field, msg]) => (
                  <p key={field}>• {msg}</p>
                ))}
              </div>
            )}
            <InstructorProfileSetupForm
              currentStep={currentStep}
              formData={formData}
              setFormData={setFormData}
              userFirstName={user.first_name}
              userLastName={user.last_name}
              userEmail={user.email}
              userPhone={user.phone_number}
            />

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-12 pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="px-8 py-3.5 rounded-xl font-semibold text-gray-700 hover:text-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              
              <button
                type="button"
                onClick={handleNext}
                className="px-10 py-3.5 bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white rounded-xl font-semibold transition-all duration-300 hover:shadow-xl hover:shadow-blue-900/20 active:scale-[0.98] flex items-center gap-3 group"
              >
                {currentStep === 3 ? (
                  <>
                    <span>Complete Setup</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}