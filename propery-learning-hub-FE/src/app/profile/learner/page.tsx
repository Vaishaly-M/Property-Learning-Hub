'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LearnerProfileSetupForm from '../../../components/profile/LearnerProfileSetupForm';
import ProfileSetupProgress from '../../../components/profile/ProfileSetupProgress';
import paidInviteService from '@/services/paidInviteService';
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS } from '../../../services/mediaUploadService';

export default function LearnerProfileSetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    // Personal Information (read-only from registration)
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    
    // Personal Information (editable)
    profilePhoto: null as File | null,
    dateOfBirth: '',
    gender: '',
    bio: '',
    
    // Professional Information
    jobTitle: '',
    company: '',
    yearsOfExperience: '',
    investmentBudget: '',
    
    // Contact Information
    country: '',
    city: '',
    alternatePhone: '',
    linkedinUrl: '',
    
    // Learning Preferences
    investmentInterests: [] as string[],
    learningPreferences: [] as string[],
    
    // Subscription Plan
    subscriptionPlan: 'pro',
    billingCycle: 'yearly',
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

          if (userData.profile_completed) {
            router.replace('/learn');
            return;
          }

          if (userData.role === 'instructor') {
            router.replace('/profile/instructor');
            return;
          }

          if (userData.role === 'admin') {
            router.replace('/admin/dashboard');
            return;
          }

          if (userData.role !== 'learner') {
            router.replace('/login');
            return;
          }
          
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
              dateOfBirth: profileData.date_of_birth || '',
              gender: profileData.gender || '',
              jobTitle: profileData.job_title || '',
              company: profileData.company || '',
              yearsOfExperience: profileData.years_of_experience || '',
              investmentBudget: profileData.investment_budget || '',
              country: profileData.country || '',
              city: profileData.city || '',
              alternatePhone: profileData.alternate_phone || '',
              linkedinUrl: profileData.linkedin_url || '',
              bio: profileData.bio || '',
              investmentInterests: profileData.investment_interests || [],
              learningPreferences: profileData.learning_preferences || [],
              subscriptionPlan: profileData.subscription_plan || 'free',
              billingCycle: profileData.billing_cycle || 'monthly',
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

  const appendIfPresent = (data: FormData, key: string, value: string) => {
    if (value && value.trim() !== '') {
      data.append(key, value.trim());
    }
  };

  const handleSubmit = async () => {
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
      
      // Optional learner fields — only send when filled
      appendIfPresent(submitData, 'date_of_birth', formData.dateOfBirth);
      appendIfPresent(submitData, 'gender', formData.gender);
      appendIfPresent(submitData, 'bio', formData.bio);
      appendIfPresent(submitData, 'job_title', formData.jobTitle);
      appendIfPresent(submitData, 'company', formData.company);
      appendIfPresent(submitData, 'years_of_experience', formData.yearsOfExperience);
      appendIfPresent(submitData, 'investment_budget', formData.investmentBudget);
      appendIfPresent(submitData, 'country', formData.country);
      appendIfPresent(submitData, 'city', formData.city);
      appendIfPresent(submitData, 'alternate_phone', formData.alternatePhone);
      appendIfPresent(submitData, 'linkedin_url', formData.linkedinUrl);
      appendIfPresent(submitData, 'subscription_plan', formData.subscriptionPlan);
      appendIfPresent(submitData, 'billing_cycle', formData.billingCycle);
      
      // Array fields
      if (formData.investmentInterests.length > 0) {
        formData.investmentInterests.forEach(interest => {
          submitData.append('investment_interests[]', interest);
        });
      }
      
      if (formData.learningPreferences.length > 0) {
        formData.learningPreferences.forEach(preference => {
          submitData.append('learning_preferences[]', preference);
        });
      }
      
      // Profile photo
      if (formData.profilePhoto) {
        await appendMediaToFormData(submitData, formData.profilePhoto, MEDIA_UPLOAD_PRESETS.profilePhoto);
      }
      
      // Complete learner profile
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/learner/profile/complete`, {
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

        paidInviteService.finishOnboarding();
        router.push('/learn');
      } else {
        alert(data.message || 'Profile setup failed');
      }
    } catch (error) {
      console.error('Error submitting profile:', error);
      alert('Error setting up profile');
    }
  };

  const handleNext = () => {
    if (currentStep < 2) {
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
    return null;
  }

  if (user.role !== 'learner') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Redirecting...</p>
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
              Complete Your Learner Profile
            </h1>
            <p className="text-gray-600 text-lg">
              Set up your profile to get personalized property investment recommendations
            </p>
          </div>

          {/* Progress Bar */}
          <ProfileSetupProgress currentStep={currentStep} />

          {/* Main Form */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/10 p-6 md:p-10 border border-gray-100">
            <LearnerProfileSetupForm
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
                {currentStep === 2 ? (
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