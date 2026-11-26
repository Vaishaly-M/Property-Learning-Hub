'use client';

import { resolveStorageUrl } from '../../utils/mediaUrl';
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS } from '../../services/mediaUploadService';

import React, { useState, useEffect } from 'react';
import {
  Person,
  Work,
  School,
  Language,
  Link,
  LocationOn,
  Email,
  Phone,
  CloudUpload,
  Save,
  Edit,
  Cancel,
  VerifiedUser,
  Lock,
  CheckCircle,
  VideoCameraBack,
  TrendingUp,
  LibraryBooks,
  CastForEducation,
  CreditCard,
  CalendarMonth,
  WorkspacePremium,
  YouTube as YouTubeIcon,
  LinkedIn as LinkedInIcon,
  Language as LanguageIcon,
  EmojiEvents,
  Public,
} from '@mui/icons-material';
import axios from 'axios';

// Type definitions
interface InstructorProfile {
  professional_title: string;
  bio: string;
  industry_experience: string;
  primary_expertise: string;
  teaching_experience: string | null;
  course_output: string | null;
  qualifications: string;
  languages: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  portfolio_url: string | null;
  instructor_plan: string;
  billing_cycle: string;
  country: string | null;
  city: string | null;
  profile_photo_url: string | null;
  display_expertise: string;
  teaching_specializations: string[] | null;
  course_formats: string[] | null;
  profile_completed: boolean;
  profile_completed_at: string | null;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  profile_completed: boolean;
}

interface ProfileData {
  user: User;
  profile: InstructorProfile;
}

const InstructorProfilePanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<any>({
    // Default empty form
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    professional_title: '',
    bio: '',
    industry_experience: '',
    primary_expertise: '',
    teaching_experience: '',
    course_output: '',
    qualifications: '',
    languages: '',
    linkedin_url: '',
    youtube_url: '',
    portfolio_url: '',
    instructor_plan: 'free',
    billing_cycle: 'monthly',
    country: '',
    city: '',
    display_expertise: '',
    teaching_specializations: [],
    course_formats: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Base URL for API calls
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  // Fetch profile data on component mount
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      // Get token from storage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        setFetchError('No authentication token found. Please login.');
        setLoading(false);
        return;
      }

      console.log('Fetching instructor profile data...');
      
      // Try BOTH endpoints since your routes are inconsistent
      let response;
      let endpointUsed = '';
      
      try {
        // First try the complete profile endpoint (from InstructorMyProfileController)
        endpointUsed = 'instructor/my-profile';
        response = await axios.get(`${API_BASE_URL}/instructor/my-profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
      } catch (firstError: any) {
        if (firstError.response?.status === 404) {
          // Try the other endpoint (from InstructorProfileController)
          console.log('Trying alternative endpoint...');
          endpointUsed = 'instructor/profile';
          response = await axios.get(`${API_BASE_URL}/instructor/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
        } else {
          throw firstError;
        }
      }
      
      console.log(`API Response from ${endpointUsed}:`, response.data);
      
      if (response.data?.success) {
        // Handle different response structures
        let profileResponse;
        
        if (response.data.data?.profile) {
          // Structure from getCompleteProfile
          profileResponse = response.data.data;
        } else if (response.data.data) {
          // Structure from show method
          profileResponse = {
            user: {
              id: '',
              first_name: '',
              last_name: '',
              email: '',
              phone_number: '',
              role: 'instructor',
              profile_completed: false,
            },
            profile: response.data.data.profile || response.data.data,
          };
        } else {
          setFetchError('Invalid response structure');
          return;
        }
        
        const { user, profile } = profileResponse;
        
        // Create a proper ProfileData object
        const fullProfileData: ProfileData = {
          user: {
            id: user?.id || '',
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            email: user?.email || '',
            phone_number: user?.phone_number || '',
            role: user?.role || 'instructor',
            profile_completed: user?.profile_completed || profile?.profile_completed || false,
          },
          profile: {
            professional_title: profile?.professional_title || '',
            bio: profile?.bio || '',
            industry_experience: profile?.industry_experience || '',
            primary_expertise: profile?.primary_expertise || '',
            teaching_experience: profile?.teaching_experience || null,
            course_output: profile?.course_output || null,
            qualifications: profile?.qualifications || '',
            languages: profile?.languages || null,
            linkedin_url: profile?.linkedin_url || null,
            youtube_url: profile?.youtube_url || null,
            portfolio_url: profile?.portfolio_url || null,
            instructor_plan: profile?.instructor_plan || 'free',
            billing_cycle: profile?.billing_cycle || 'monthly',
            country: profile?.country || null,
            city: profile?.city || null,
            profile_photo_url: profile?.profile_photo_url || null,
            display_expertise: profile?.display_expertise || '',
            teaching_specializations: Array.isArray(profile?.teaching_specializations) 
              ? profile.teaching_specializations 
              : (profile?.teaching_specializations ? JSON.parse(profile.teaching_specializations) : []),
            course_formats: Array.isArray(profile?.course_formats) 
              ? profile.course_formats 
              : (profile?.course_formats ? JSON.parse(profile.course_formats) : []),
            profile_completed: profile?.profile_completed || false,
            profile_completed_at: profile?.profile_completed_at || null,
          },
        };
        
        setProfileData(fullProfileData);
        
        // Prepare form data structure
        const combinedFormData = {
          first_name: fullProfileData.user.first_name || '',
          last_name: fullProfileData.user.last_name || '',
          email: fullProfileData.user.email || '',
          phone_number: fullProfileData.user.phone_number || '',
          professional_title: fullProfileData.profile.professional_title || '',
          bio: fullProfileData.profile.bio || '',
          industry_experience: fullProfileData.profile.industry_experience || '',
          primary_expertise: fullProfileData.profile.primary_expertise || '',
          teaching_experience: fullProfileData.profile.teaching_experience || '',
          course_output: fullProfileData.profile.course_output || '',
          qualifications: fullProfileData.profile.qualifications || '',
          languages: fullProfileData.profile.languages || '',
          linkedin_url: fullProfileData.profile.linkedin_url || '',
          youtube_url: fullProfileData.profile.youtube_url || '',
          portfolio_url: fullProfileData.profile.portfolio_url || '',
          instructor_plan: fullProfileData.profile.instructor_plan || 'free',
          billing_cycle: fullProfileData.profile.billing_cycle || 'monthly',
          country: fullProfileData.profile.country || '',
          city: fullProfileData.profile.city || '',
          display_expertise: fullProfileData.profile.display_expertise || '',
          teaching_specializations: fullProfileData.profile.teaching_specializations || [],
          course_formats: fullProfileData.profile.course_formats || [],
        };
        
        setFormData(combinedFormData);
        
        // Set profile photo preview
        if (fullProfileData.profile.profile_photo_url) {
          setProfilePhotoPreview(
            resolveStorageUrl(fullProfileData.profile.profile_photo_url) ??
              fullProfileData.profile.profile_photo_url
          );
        }
        
      } else {
        setFetchError(response.data?.message || 'Failed to fetch profile data');
      }
    } catch (error: any) {
      console.error('Error fetching instructor profile:', error);
      
      // Set error message
      if (error.response?.status === 401) {
        setFetchError('Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        setFetchError('Access denied. Instructor access required.');
      } else if (error.response?.status === 404) {
        setFetchError('Profile endpoint not found. Please check API routes.');
      } else if (error.response?.data?.message) {
        setFetchError(error.response.data.message);
      } else if (error.message === 'Network Error') {
        setFetchError('Unable to connect to server. Please check your connection.');
      } else {
        setFetchError('Failed to load profile data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (fieldName: string, value: string) => {
    const currentArray = formData[fieldName] || [];
    const updatedArray = currentArray.includes(value)
      ? currentArray.filter((item: string) => item !== value)
      : [...currentArray, value];
    
    setFormData({ ...formData, [fieldName]: updatedArray });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.first_name?.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name?.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.professional_title?.trim()) newErrors.professional_title = 'Professional title is required';
    if (!formData.bio?.trim()) newErrors.bio = 'Bio is required';
    if (!formData.industry_experience) newErrors.industry_experience = 'Industry experience is required';
    if (!formData.primary_expertise) newErrors.primary_expertise = 'Primary expertise is required';
    if (!formData.qualifications?.trim()) newErrors.qualifications = 'Qualifications are required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        alert('Session expired. Please login again.');
        return;
      }

      // Prepare data for update
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        professional_title: formData.professional_title,
        bio: formData.bio,
        industry_experience: formData.industry_experience,
        primary_expertise: formData.primary_expertise,
        teaching_experience: formData.teaching_experience || null,
        course_output: formData.course_output || null,
        qualifications: formData.qualifications,
        languages: formData.languages || null,
        linkedin_url: formData.linkedin_url || null,
        youtube_url: formData.youtube_url || null,
        portfolio_url: formData.portfolio_url || null,
        instructor_plan: formData.instructor_plan,
        billing_cycle: formData.billing_cycle,
        country: formData.country || null,
        city: formData.city || null,
        display_expertise: formData.display_expertise,
        teaching_specializations: formData.teaching_specializations,
        course_formats: formData.course_formats,
      };

      // Try to update using the complete profile endpoint first
      let response;
      try {
        response = await axios.put(`${API_BASE_URL}/instructor/my-profile`, updateData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (updateError: any) {
        // Fallback to the other endpoint
        console.log('Trying alternative update endpoint...');
        response = await axios.put(`${API_BASE_URL}/instructor/profile`, updateData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }

      // Handle profile photo upload if changed
      if (profilePhoto) {
        const photoFormData = new FormData();
        await appendMediaToFormData(photoFormData, profilePhoto, MEDIA_UPLOAD_PRESETS.profilePhoto);
        
        try {
          await axios.put(`${API_BASE_URL}/instructor/my-profile/picture`, photoFormData, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          });
        } catch (photoError: any) {
          // Try alternative endpoint for photo upload
          try {
            await axios.post(`${API_BASE_URL}/instructor/profile`, photoFormData, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              },
            });
          } catch (secondPhotoError) {
            console.warn('Failed to upload profile photo:', secondPhotoError);
            // Continue without photo upload error
          }
        }
      }
      
      // Refresh profile data
      await fetchProfileData();
      setIsEditing(false);
      alert('Profile updated successfully!');
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        const firstError = Object.values(error.response.data.errors)[0];
        if (firstError) {
          alert(`Error: ${firstError}`);
        }
      } else if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profileData) {
      // Reset form data from fetched profile data
      setFormData({
        first_name: profileData.user.first_name || '',
        last_name: profileData.user.last_name || '',
        email: profileData.user.email || '',
        phone_number: profileData.user.phone_number || '',
        professional_title: profileData.profile.professional_title || '',
        bio: profileData.profile.bio || '',
        industry_experience: profileData.profile.industry_experience || '',
        primary_expertise: profileData.profile.primary_expertise || '',
        teaching_experience: profileData.profile.teaching_experience || '',
        course_output: profileData.profile.course_output || '',
        qualifications: profileData.profile.qualifications || '',
        languages: profileData.profile.languages || '',
        linkedin_url: profileData.profile.linkedin_url || '',
        youtube_url: profileData.profile.youtube_url || '',
        portfolio_url: profileData.profile.portfolio_url || '',
        instructor_plan: profileData.profile.instructor_plan || 'free',
        billing_cycle: profileData.profile.billing_cycle || 'monthly',
        country: profileData.profile.country || '',
        city: profileData.profile.city || '',
        display_expertise: profileData.profile.display_expertise || '',
        teaching_specializations: profileData.profile.teaching_specializations || [],
        course_formats: profileData.profile.course_formats || [],
      });
      
      if (profileData.profile.profile_photo_url) {
        setProfilePhotoPreview(
          resolveStorageUrl(profileData.profile.profile_photo_url) ??
            profileData.profile.profile_photo_url
        );
      }
    }
    setErrors({});
    setProfilePhoto(null);
  };

  // Helper functions to render data
  const getExperienceLabel = (value: string) => {
    const options = [
      { value: '0-2', label: '0-2 years' },
      { value: '3-5', label: '3-5 years' },
      { value: '6-10', label: '6-10 years' },
      { value: '10+', label: '10+ years' },
    ];
    return options.find(opt => opt.value === value)?.label || 'Not specified';
  };

  const getExpertiseLabel = (value: string) => {
    const expertiseMap: Record<string, string> = {
      'residential': 'Residential Real Estate',
      'commercial': 'Commercial Real Estate',
      'reits': 'REITs & Real Estate Funds',
      'flipping': 'Property Flipping',
      'rentals': 'Rental Property Management',
      'development': 'Real Estate Development',
      'finance': 'Real Estate Finance',
      'law': 'Real Estate Law',
      'tax': 'Real Estate Tax Strategies',
      'international': 'International Real Estate',
    };
    return expertiseMap[value] || value || 'Not specified';
  };

  const getPlanLabel = (value: string) => {
    const planMap: Record<string, string> = {
      'free': 'Free Tier',
      'professional': 'Professional',
      'enterprise': 'Enterprise',
    };
    return planMap[value] || value || 'Free Tier';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-center items-center py-16 sm:py-20">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-900"></div>
            <span className="mt-3 sm:mt-0 sm:ml-3 text-sm sm:text-base text-gray-600">Loading profile...</span>
          </div>
        </div>
      </div>
    );
  }

  // Determine display values - use profileData if available, otherwise use formData
  const displayData = profileData || {
    user: {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone_number: formData.phone_number,
      role: 'instructor',
      profile_completed: false,
    },
    profile: {
      professional_title: formData.professional_title,
      bio: formData.bio,
      industry_experience: formData.industry_experience,
      primary_expertise: formData.primary_expertise,
      teaching_experience: formData.teaching_experience,
      course_output: formData.course_output,
      qualifications: formData.qualifications,
      languages: formData.languages,
      linkedin_url: formData.linkedin_url,
      youtube_url: formData.youtube_url,
      portfolio_url: formData.portfolio_url,
      instructor_plan: formData.instructor_plan,
      billing_cycle: formData.billing_cycle,
      country: formData.country,
      city: formData.city,
      profile_photo_url: profilePhotoPreview,
      display_expertise: formData.display_expertise,
      teaching_specializations: formData.teaching_specializations,
      course_formats: formData.course_formats,
      profile_completed: false,
      profile_completed_at: null,
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-900 rounded-lg flex items-center justify-center">
                <Person className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Instructor Profile</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  Manage your teaching profile and preferences
                </p>
              </div>
            </div>
            
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-900 border border-blue-800 rounded-lg hover:bg-blue-800 transition-colors w-full sm:w-auto"
              >
                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
          
          {/* Error banner if fetch failed */}
          {fetchError && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-red-600 font-medium break-words">{fetchError}</span>
                </div>
                <button
                  onClick={fetchProfileData}
                  className="text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium text-right sm:text-left mt-1 sm:mt-0"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Content - ALWAYS SHOW THIS */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="relative flex justify-center sm:justify-start w-full sm:w-auto">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                {profilePhotoPreview ? (
                  <img 
                    src={resolveStorageUrl(profilePhotoPreview) ?? profilePhotoPreview} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-gray-400">
                          <svg class="w-12 h-12 sm:w-16 sm:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      `;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Person className="w-12 h-12 sm:w-16 sm:h-16" />
                  </div>
                )}
              </div>
              {isEditing && (
                <label className="absolute bottom-0 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-0 transform sm:relative sm:left-2 bg-blue-900 text-white p-2 sm:p-3 rounded-full cursor-pointer hover:bg-blue-800 transition-colors shadow-lg">
                  <CloudUpload className="w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            
            <div className="flex-1 w-full sm:w-auto">
              {isEditing ? (
                <div className="space-y-3 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name || ''}
                        onChange={handleInputChange}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors ${
                          errors.first_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.first_name && (
                        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600">{errors.first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name || ''}
                        onChange={handleInputChange}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors ${
                          errors.last_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.last_name && (
                        <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600">{errors.last_name}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Professional Title *
                    </label>
                    <input
                      type="text"
                      name="professional_title"
                      value={formData.professional_title || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., Senior Real Estate Analyst"
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors ${
                        errors.professional_title ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.professional_title && (
                      <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600">{errors.professional_title}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                    {displayData.user.first_name} {displayData.user.last_name}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">{displayData.profile.professional_title || 'No title set'}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Bio */}
          <div className="mt-4 sm:mt-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
              Instructor Bio & Teaching Philosophy *
            </label>
            {isEditing ? (
              <textarea
                name="bio"
                value={formData.bio || ''}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors ${
                  errors.bio ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Share your expertise, teaching philosophy, and what students can expect from your courses..."
              />
            ) : (
              <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                {displayData.profile.bio || 'No bio provided'}
              </p>
            )}
            {errors.bio && isEditing && (
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600">{errors.bio}</p>
            )}
          </div>
        </div>

        {/* Contact & Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900/10 rounded-lg flex items-center justify-center">
                <Email className="w-4 h-4 sm:w-5 sm:h-5 text-blue-900" />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Contact Information</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Email
                </label>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                  <Email className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="break-all">{displayData.user.email}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="phone_number"
                    value={formData.phone_number || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors"
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="break-all">{displayData.user.phone_number || 'Not provided'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Experience Overview */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900/10 rounded-lg flex items-center justify-center">
                <Work className="w-4 h-4 sm:w-5 sm:h-5 text-blue-900" />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Experience</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Industry Experience
                </label>
                {isEditing ? (
                  <select
                    name="industry_experience"
                    value={formData.industry_experience || ''}
                    onChange={handleInputChange}
                    className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none cursor-pointer ${
                      errors.industry_experience ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select experience</option>
                    <option value="0-2">0-2 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="6-10">6-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{getExperienceLabel(displayData.profile.industry_experience)}</span>
                  </div>
                )}
                {errors.industry_experience && isEditing && (
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600">{errors.industry_experience}</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Teaching Experience
                </label>
                {isEditing ? (
                  <select
                    name="teaching_experience"
                    value={formData.teaching_experience || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none cursor-pointer"
                  >
                    <option value="">Select experience</option>
                    <option value="0-2">0-2 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="6-10">6-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <CastForEducation className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{getExperienceLabel(displayData.profile.teaching_experience || '')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Social Links */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900/10 rounded-lg flex items-center justify-center">
                <Link className="w-4 h-4 sm:w-5 sm:h-5 text-blue-900" />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Social & Portfolio Links</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  LinkedIn Profile
                </label>
                {isEditing ? (
                  <input
                    type="url"
                    name="linkedin_url"
                    value={formData.linkedin_url || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <LinkedInIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    {displayData.profile.linkedin_url ? (
                      <a 
                        href={displayData.profile.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-blue-900 hover:underline truncate"
                      >
                        {displayData.profile.linkedin_url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  YouTube Channel
                </label>
                {isEditing ? (
                  <input
                    type="url"
                    name="youtube_url"
                    value={formData.youtube_url || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors"
                    placeholder="https://youtube.com/@yourchannel"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <YouTubeIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    {displayData.profile.youtube_url ? (
                      <a 
                        href={displayData.profile.youtube_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-red-600 hover:underline truncate"
                      >
                        {displayData.profile.youtube_url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Teaching Specializations */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900/10 rounded-lg flex items-center justify-center">
                  <LibraryBooks className="w-4 h-4 sm:w-5 sm:h-5 text-blue-900" />
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Teaching Specializations</h3>
              </div>
              
              <div>
                {isEditing ? (
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      'Beginner Courses', 'Advanced Analysis', 'Market Research', 'Deal Structuring',
                      'Portfolio Management', 'Tax Strategies', 'Legal Aspects', 'Risk Management',
                      'Case Studies', 'Technical Analysis', 'Fundamental Analysis', 'Investment Strategies'
                    ].map((specialization) => (
                      <label key={specialization} className="flex items-center gap-1.5 sm:gap-2 cursor-pointer p-1.5 sm:p-2 hover:bg-blue-50 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.teaching_specializations?.includes(specialization) || false}
                          onChange={() => handleCheckboxChange('teaching_specializations', specialization)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-900 rounded focus:ring-blue-900"
                        />
                        <span className="text-xs sm:text-sm text-gray-700">{specialization}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {displayData.profile.teaching_specializations?.map((spec: string, index: number) => (
                      <span key={index} className="px-2 sm:px-3 py-1 text-xs font-semibold bg-blue-900/10 text-blue-900 border border-blue-900/20 rounded">
                        {spec}
                      </span>
                    )) || (
                      <p className="text-xs sm:text-sm text-gray-500 italic">No specializations added</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Course Format Preferences */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900/10 rounded-lg flex items-center justify-center">
                  <VideoCameraBack className="w-4 h-4 sm:w-5 sm:h-5 text-blue-900" />
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Preferred Course Formats</h3>
              </div>
              
              <div>
                {isEditing ? (
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      'Video Lectures', 'Live Webinars', 'Downloadable PDFs', 'Interactive Quizzes',
                      'Case Studies', 'Assignments', 'One-on-One Sessions', 'Group Workshops', 'Discussion Forums'
                    ].map((format) => (
                      <label key={format} className="flex items-center gap-1.5 sm:gap-2 cursor-pointer p-1.5 sm:p-2 hover:bg-blue-50 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.course_formats?.includes(format) || false}
                          onChange={() => handleCheckboxChange('course_formats', format)}
                          className="w-3 h-3 sm:w-4 sm:h-4 text-blue-900 rounded focus:ring-blue-900"
                        />
                        <span className="text-xs sm:text-sm text-gray-700">{format}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {displayData.profile.course_formats?.map((format: string, index: number) => (
                      <div key={index} className="flex items-center gap-1.5 sm:gap-2">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-gray-600">{format}</span>
                      </div>
                    )) || (
                      <p className="text-xs sm:text-sm text-gray-500 italic">No format preferences set</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Qualifications & Certifications */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900/10 rounded-lg flex items-center justify-center">
              <EmojiEvents className="w-4 h-4 sm:w-5 sm:h-5 text-blue-900" />
            </div>
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Qualifications & Certifications</h3>
          </div>
          
          <div>
            {isEditing ? (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Degrees, Certifications, Licenses & Awards *
                </label>
                <textarea
                  name="qualifications"
                  value={formData.qualifications || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors ${
                    errors.qualifications ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="List your degrees, certifications, licenses, awards, and relevant qualifications..."
                />
                {errors.qualifications && (
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600">{errors.qualifications}</p>
                )}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-wrap">
                {displayData.profile.qualifications || 'No qualifications provided'}
              </p>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Languages & Location */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900/10 rounded-lg flex items-center justify-center">
                <LanguageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-900" />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Languages & Location</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                  Languages You Teach In
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="languages"
                    value={formData.languages || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors"
                    placeholder="English, Spanish, French, etc."
                  />
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                    <Language className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{displayData.profile.languages || 'Not specified'}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Country
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="country"
                      value={formData.country || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors"
                      placeholder="e.g., United States"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                      <LocationOn className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{displayData.profile.country || 'Not specified'}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    City
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="city"
                      value={formData.city || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors"
                      placeholder="e.g., New York"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                      <LocationOn className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{displayData.profile.city || 'Not specified'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Password Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-900/10 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-900" />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">Security Settings</h3>
            </div>
            
            {showPasswordChange ? (
              <form onSubmit={(e) => e.preventDefault()} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                    Current Password *
                  </label>
                  <input
                    type="password"
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors"
                    placeholder="Enter your current password"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      New Password *
                    </label>
                    <input
                      type="password"
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors"
                      placeholder="At least 8 characters"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      name="new_password_confirmation"
                      value={passwordData.new_password_confirmation}
                      onChange={(e) => setPasswordData({...passwordData, new_password_confirmation: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-colors"
                      placeholder="Confirm your new password"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end pt-3 sm:pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(false)}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Add password change logic here
                      setShowPasswordChange(false);
                      setPasswordSuccess(true);
                      setTimeout(() => setPasswordSuccess(false), 3000);
                    }}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 gap-2 sm:gap-0">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-800">Password</h4>
                  <p className="text-xs text-gray-500">Last changed: Recently</p>
                </div>
                <button
                  onClick={() => setShowPasswordChange(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors mt-1 sm:mt-0"
                >
                  Change Password
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Only show in edit mode */}
        {isEditing && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end mt-6 sm:mt-8 pt-4 sm:pt-8 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
              disabled={saving}
            >
              <Cancel className="w-3 h-3 sm:w-4 sm:h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorProfilePanel;