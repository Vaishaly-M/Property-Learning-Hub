// components/Profile.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS } from '../../services/mediaUploadService';
import { downloadAuthenticatedFile } from '../../utils/downloadFile';
import { resolveStorageUrl } from '../../utils/mediaUrl';
import { profileAPI } from '../../services/profileApi';
import { useQueryClient } from '@tanstack/react-query';
import {
  Person,
  Edit,
  Save,
  Cancel,
  CameraAlt,
  Security,
  History,
  School,
  ExitToApp,
  Delete,
  Star,
  WorkspacePremium,
  CheckCircle,
  Schedule,
  PlayCircle,
  CalendarToday,
  Download,
  Share,
  Email,
  Phone,
  LocationOn,
  Business,
  Link,
  Lock,
  ArrowUpward,
  VerifiedUser,
  TrendingUp,
  Receipt,
  EmojiEvents,
  DownloadForOffline,
  ContentCopy,
  Payment,
  CardMembership,
  Diamond,
  Warning,
  Language,
  Palette,
  Close,
  Settings,
  Cake,
  Work,
  BusinessCenter,
  AccountBalance,
  CurrencyPound,
  Translate,
  Public,
  PhoneAndroid,
  LinkedIn,
  LocalAtm,
  School as SchoolIcon,
  Psychology,
  Category,
  Visibility,
  VisibilityOff,
  UploadFile,
  Description,
  BadgeOutlined,
} from '@mui/icons-material';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  company: string;
  website: string;
  bio: string;
  avatar: string | null;
  avatarInitials: string;
  joinDate: string;
  
  // Learner Profile Fields
  dateOfBirth?: string;
  gender?: string;
  jobTitle?: string;
  yearsOfExperience?: string;
  investmentBudget?: string;
  country?: string;
  city?: string;
  alternatePhone?: string;
  linkedinUrl?: string;
  subscriptionPlan?: string;
  billingCycle?: string;
  investmentInterests?: string[];
  learningPreferences?: string[];
  proofOfAddress?: {
    uploaded: boolean;
    original_name?: string | null;
    mime?: string | null;
    size?: number | null;
    uploaded_at?: string | null;
  };
  
  subscription: {
    level: 'free' | 'basic' | 'pro' | 'elite' | 'mentor';
    status: 'active' | 'expired' | 'cancelled' | 'pending';
    renewalDate: string;
    features: string[];
    price: number;
    billingCycle: 'monthly' | 'yearly';
    nextPayment: string;
    paymentMethod: string;
  };
  stats: {
    videosWatched: number;
    meetingsAttended: number;
    certificatesEarned: number;
    hoursLearned: number;
    dealsAnalyzed: number;
    contactsAdded: number;
  };
  certificates: Certificate[];
  badges: Badge[];
  recentActivity: Activity[];
  paymentHistory: Payment[];
  settings: {
    emailNotifications: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
}

interface Certificate {
  id: string;
  title: string;
  issueDate: string;
  issuer: string;
  description: string;
  downloadUrl: string;
  verificationCode: string;
}

interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedDate: string;
  category: 'learning' | 'achievement' | 'community' | 'investment';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface Activity {
  id: string;
  type: 'video' | 'meeting' | 'course' | 'webinar' | 'deal' | 'contract';
  title: string;
  date: string;
  duration: string;
  progress?: number;
  action?: string;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  plan: string;
  status: 'completed' | 'pending' | 'failed';
  invoiceUrl: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  level: 'free' | 'basic' | 'pro' | 'elite' | 'mentor';
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: {
    name: string;
    included: boolean;
    limit?: string;
  }[];
  popular: boolean;
  description: string;
  buttonText: string;
  color: string;
}

// Toast Component
const Toast = ({ message, type = 'success', onClose }: { 
  message: string; 
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-green-100 border-green-400 text-green-800',
    error: 'bg-red-100 border-red-400 text-red-800',
    info: 'bg-blue-100 border-blue-400 text-blue-800',
  }[type];

  const iconColor = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  }[type];

  return (
    <div className={`fixed top-4 right-4 z-50 border rounded-lg shadow-lg ${bgColor} px-4 py-3 flex items-center gap-3 animate-slide-in`}>
      {type === 'success' && <CheckCircle className={iconColor} />}
      {type === 'error' && <Warning className={iconColor} />}
      {type === 'info' && <div className={`w-2 h-2 rounded-full ${iconColor}`} />}
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700">
        <Close className="w-4 h-4" />
      </button>
    </div>
  );
};

// Helper function to notify other components about user updates
const notifyUserUpdated = (userData: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: userData }));
  }
};

const Profile: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingInvestment, setIsEditingInvestment] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState<Certificate | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPasswordFields, setShowPasswordFields] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [deletePassword, setDeletePassword] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingProofOfAddress, setUploadingProofOfAddress] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Editing name data state
  const [editingNameData, setEditingNameData] = useState({
    firstName: '',
    lastName: '',
    jobTitle: '',
    company: '',
    bio: '',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    email: '',
    phone: '',
    location: '',
    company: '',
    website: '',
    bio: '',
    avatar: null,
    avatarInitials: '',
    joinDate: '',
    dateOfBirth: '',
    gender: '',
    jobTitle: '',
    yearsOfExperience: '',
    investmentBudget: '',
    country: '',
    city: '',
    alternatePhone: '',
    linkedinUrl: '',
    subscriptionPlan: 'free',
    billingCycle: 'monthly',
    investmentInterests: [],
    learningPreferences: [],
    proofOfAddress: { uploaded: false },
    subscription: {
      level: 'free',
      status: 'active',
      renewalDate: '',
      features: [],
      price: 0,
      billingCycle: 'monthly',
      nextPayment: '',
      paymentMethod: ''
    },
    stats: {
      videosWatched: 0,
      meetingsAttended: 0,
      certificatesEarned: 0,
      hoursLearned: 0,
      dealsAnalyzed: 0,
      contactsAdded: 0
    },
    certificates: [],
    badges: [],
    recentActivity: [],
    paymentHistory: [],
    settings: {
      emailNotifications: true,
      theme: 'light',
      language: 'English'
    }
  });

  // Helper function to refresh meetings data
  const refreshMeetingsData = useCallback(() => {
    // Invalidate all meeting-related queries
    queryClient.invalidateQueries({ queryKey: ['my-meetings'] });
    queryClient.invalidateQueries({ queryKey: ['platform-meetings'] });
    queryClient.invalidateQueries({ queryKey: ['learner-meetings'] });
  }, [queryClient]);

  // Fetch complete profile data on component mount only
  useEffect(() => {
    fetchCompleteProfileData();
  }, []);

  const fetchCompleteProfileData = async () => {
    try {
      setLoading(true);
      
      // First, get user data
      const userResponse = await profileAPI.getUser();
      console.log('User API Response:', userResponse);
      
      // Then, get complete profile data
      const response = await profileAPI.getCompleteProfile();
      console.log('Complete Profile API Response:', response);
      
      // Extract data based on backend response structure
      let profileData, userData, statsData, certificatesData, badgesData, activitiesData, paymentsData, subscriptionData, settingsData;
      
      if (response.data) {
        profileData = response.data.profile;
        userData = response.data.user || userResponse.user || userResponse;
        statsData = response.data.stats;
        certificatesData = response.data.certificates;
        badgesData = response.data.badges;
        activitiesData = response.data.recent_activity;
        paymentsData = response.data.payment_history;
        subscriptionData = response.data.subscription;
        settingsData = response.data.settings || userData?.settings;
      } else {
        profileData = response.profile;
        userData = response.user || userResponse.user || userResponse;
        statsData = response.stats;
        certificatesData = response.certificates;
        badgesData = response.badges;
        activitiesData = response.recent_activity;
        paymentsData = response.payment_history;
        subscriptionData = response.subscription;
        settingsData = response.settings || userData?.settings;
      }
      
      console.log('Profile data extracted:', profileData);
      console.log('User data extracted:', userData);
      
      if (!userData) {
        console.error('No user data found');
        showToast('No user data found', 'error');
        return;
      }
      
      // Extract name from various possible fields
      let fullName = '';
      if (userData.full_name) {
        fullName = userData.full_name;
      } else if (userData.first_name || userData.last_name) {
        fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
      } else if (userData.name) {
        fullName = userData.name;
      } else if (userData.email) {
        fullName = userData.email.split('@')[0];
      } else {
        fullName = 'User';
      }
      
      // Build avatar initials
      let avatarInitials = 'U';
      if (userData.avatar_initials) {
        avatarInitials = userData.avatar_initials;
      } else if (userData.first_name || userData.last_name) {
        const firstInitial = userData.first_name?.charAt(0) || '';
        const lastInitial = userData.last_name?.charAt(0) || '';
        avatarInitials = (firstInitial + lastInitial).toUpperCase() || 'U';
      } else if (fullName) {
        const nameParts = fullName.split(' ');
        if (nameParts.length >= 2) {
          avatarInitials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
        } else {
          avatarInitials = fullName.charAt(0).toUpperCase();
        }
      }
      
      // Build location string
      let location = '';
      if (profileData?.city || profileData?.country) {
        location = `${profileData.city || ''}, ${profileData.country || ''}`.trim();
        if (location.endsWith(',')) {
          location = location.slice(0, -1).trim();
        }
      }
      
      // Prepare subscription data
      const subscriptionLevel = subscriptionData?.level || profileData?.subscription_plan || 'free';
      
      const newProfile: UserProfile = {
        id: userData.id?.toString() || profileData?.id?.toString() || '',
        name: fullName,
        email: userData.email || profileData?.email || '',
        phone: (userData.phone_number || userData.phone || '').trim(),
        location: location,
        company: profileData?.company || '',
        website: profileData?.linkedin_url || '',
        bio: profileData?.bio || '',
        avatar: resolveStorageUrl(
          userData?.avatar || 
          profileData?.profile_photo_url || 
          profileData?.profile_photo_path || 
          null
        ),
        avatarInitials: avatarInitials,
        joinDate: userData.join_date || userData.created_at || new Date().toISOString().split('T')[0],
        dateOfBirth: profileData?.date_of_birth || '',
        gender: profileData?.gender || '',
        jobTitle: profileData?.job_title || '',
        yearsOfExperience: profileData?.years_of_experience || '',
        investmentBudget: profileData?.investment_budget || '',
        country: profileData?.country || '',
        city: profileData?.city || '',
        alternatePhone: (profileData?.alternate_phone || '').trim(),
        linkedinUrl: profileData?.linkedin_url || '',
        subscriptionPlan: profileData?.subscription_plan || 'free',
        billingCycle: profileData?.billing_cycle || 'monthly',
        investmentInterests: profileData?.investment_interests || [],
        learningPreferences: profileData?.learning_preferences || [],
        proofOfAddress: profileData?.proof_of_address || { uploaded: false },
        subscription: {
          level: subscriptionLevel,
          status: subscriptionData?.status || 'active',
          renewalDate: subscriptionData?.renewal_date || '',
          features: subscriptionData?.features || [],
          price: subscriptionData?.price || 0,
          billingCycle: subscriptionData?.billing_cycle || 'monthly',
          nextPayment: subscriptionData?.next_payment || '',
          paymentMethod: subscriptionData?.payment_method || ''
        },
        stats: statsData || {
          videosWatched: 0,
          meetingsAttended: 0,
          certificatesEarned: 0,
          hoursLearned: 0,
          dealsAnalyzed: 0,
          contactsAdded: 0
        },
        certificates: certificatesData || [],
        badges: badgesData || [],
        recentActivity: activitiesData || [],
        paymentHistory: paymentsData || [],
        settings: {
          emailNotifications: settingsData?.emailNotifications ?? true,
          theme: settingsData?.theme ?? 'light',
          language: settingsData?.language ?? userData?.language ?? 'English'
        }
      };
      
      console.log('Final profile data:', newProfile);
      setAvatarLoadFailed(false);
      setProfile(newProfile);
      
      // Initialize editing data
      const nameParts = fullName.split(' ');
      setEditingNameData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        jobTitle: profileData?.job_title || '',
        company: profileData?.company || '',
        bio: profileData?.bio || '',
      });
      
      // Notify other components about user data
      notifyUserUpdated({
        id: userData.id?.toString() || '',
        name: fullName,
        email: userData.email || '',
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        avatar: userData?.avatar || null,
      });
      
    } catch (error: any) {
      console.error('Error fetching profile data:', error);
      
      // Try to get basic user data as fallback
      try {
        const userResponse = await profileAPI.getUser();
        const user = userResponse.user || userResponse;
        
        if (user) {
          let fullName = '';
          if (user.full_name) {
            fullName = user.full_name;
          } else if (user.first_name || user.last_name) {
            fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
          } else if (user.name) {
            fullName = user.name;
          } else if (user.email) {
            fullName = user.email.split('@')[0];
          } else {
            fullName = 'User';
          }
          
          setProfile(prev => ({
            ...prev,
            id: user.id?.toString() || '',
            name: fullName,
            email: user.email || '',
            phone: user.phone_number || '',
            avatar: user.avatar || null,
            avatarInitials: user.avatar_initials || 
              (user.first_name?.charAt(0) + user.last_name?.charAt(0)).toUpperCase() || 
              user.email?.charAt(0).toUpperCase() || 'U',
            joinDate: user.created_at || new Date().toISOString().split('T')[0]
          }));
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
      
      showToast(error.message || 'Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Save name, job title, company, and bio
  const handleSaveNameAndJob = async () => {
    try {
      const profileData = {
        first_name: editingNameData.firstName.trim(),
        last_name: editingNameData.lastName.trim(),
        job_title: editingNameData.jobTitle.trim(),
        company: editingNameData.company.trim(),
        bio: editingNameData.bio.trim(),
      };
      
      const response = await profileAPI.updateProfile(profileData);
      
      if (response.success) {
        setIsEditingName(false);
        
        const fullName = `${editingNameData.firstName.trim()} ${editingNameData.lastName.trim()}`.trim();
        
        // Update the profile state with the new values
        setProfile(prev => ({
          ...prev,
          name: fullName,
          jobTitle: editingNameData.jobTitle.trim(),
          company: editingNameData.company.trim(),
          bio: editingNameData.bio.trim(),
        }));
        
        // Notify other components about user update
        notifyUserUpdated({
          id: profile.id,
          name: fullName,
          email: profile.email,
          firstName: editingNameData.firstName.trim(),
          lastName: editingNameData.lastName.trim(),
          avatar: profile.avatar,
        });
        
        // Invalidate meetings cache
        refreshMeetingsData();
        
        showToast('Profile updated successfully!', 'success');
        fetchCompleteProfileData(); // Refresh data
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile', 'error');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const profileData = {
        first_name: profile.name.split(' ')[0],
        last_name: profile.name.split(' ').slice(1).join(' '),
        phone_number: profile.phone?.trim() || null,
        phone: profile.phone?.trim() || null,
        bio: profile.bio,
        date_of_birth: profile.dateOfBirth || null,
        gender: profile.gender,
        job_title: profile.jobTitle,
        company: profile.company,
        years_of_experience: profile.yearsOfExperience,
        investment_budget: profile.investmentBudget,
        country: profile.country,
        city: profile.city,
        alternate_phone: profile.alternatePhone?.trim() || null,
        linkedin_url: profile.linkedinUrl,
        investment_interests: profile.investmentInterests,
        learning_preferences: profile.learningPreferences,
      };
      
      const response = await profileAPI.updateProfile(profileData);
      
      if (response.success) {
        setIsEditing(false);
        setIsEditingContact(false);
        setIsEditingInvestment(false);
        
        // Notify other components about user update
        const nameParts = profile.name.split(' ');
        notifyUserUpdated({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          avatar: profile.avatar,
        });
        
        refreshMeetingsData();
        showToast('Profile updated successfully!', 'success');
        fetchCompleteProfileData();
      }
    } catch (error: any) {
      showToast('Failed to update profile', 'error');
    }
  };

  const handleSaveContactInfo = async () => {
    try {
      const contactData = {
        phone_number: profile.phone?.trim() || null,
        phone: profile.phone?.trim() || null,
        alternate_phone: profile.alternatePhone?.trim() || null,
        linkedin_url: profile.linkedinUrl?.trim() || null,
        company: profile.company?.trim() || null,
        country: profile.country?.trim() || null,
        city: profile.city?.trim() || null,
      };
      
      const response = await profileAPI.updateProfile(contactData);
      
      if (response.success) {
        setIsEditingContact(false);
        refreshMeetingsData();
        showToast('Contact information updated successfully!', 'success');

        const updatedProfile = response.data?.profile;
        const updatedUser = response.data?.user;
        if (updatedProfile || updatedUser) {
          const primaryPhone = (updatedUser?.phone_number || updatedUser?.phone || profile.phone || '').trim();
          setProfile((prev) => ({
            ...prev,
            phone: primaryPhone,
            alternatePhone: (updatedProfile?.alternate_phone || prev.alternatePhone || '').trim(),
            linkedinUrl: updatedProfile?.linkedin_url ?? prev.linkedinUrl,
            company: updatedProfile?.company ?? prev.company,
            country: updatedProfile?.country ?? prev.country,
            city: updatedProfile?.city ?? prev.city,
          }));
        } else {
          fetchCompleteProfileData();
        }
      } else {
        showToast(response.message || 'Failed to update contact information', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update contact information', 'error');
    }
  };

  const handleSaveInvestmentInfo = async () => {
    try {
      const investmentData = {
        years_of_experience: profile.yearsOfExperience || null,
        investment_budget: profile.investmentBudget || null,
        investment_interests: profile.investmentInterests || [],
        learning_preferences: profile.learningPreferences || [],
        job_title: profile.jobTitle || null,
        company: profile.company || null,
        date_of_birth: profile.dateOfBirth || null,
      };
      
      const response = await profileAPI.updateProfile(investmentData);
      
      if (response.success) {
        setIsEditingInvestment(false);
        refreshMeetingsData();
        showToast('Investment information updated successfully!', 'success');
        fetchCompleteProfileData();
      } else {
        showToast(response.message || 'Failed to update investment information', 'error');
      }
    } catch (error: any) {
      console.error('Error saving investment info:', error);
      showToast(error?.message || 'Failed to update investment information', 'error');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsEditingContact(false);
    setIsEditingInvestment(false);
    setIsEditingName(false);
    fetchCompleteProfileData(); // Reload original data
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    localStorage.removeItem('token');
    showToast('Logged out successfully', 'success');
    window.location.href = '/login';
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showToast('Please enter your password to delete account', 'error');
      return;
    }

    try {
      await profileAPI.deleteAccount(deletePassword);
      showToast('Account deleted successfully. Redirecting to homepage...', 'success');
      localStorage.removeItem('token');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      showToast('Failed to delete account. Please check your password.', 'error');
    }
  };

  const handleUpgradePlan = (planId: string) => {
    if (planId === profile.subscriptionPlan) {
      showToast('This is your current plan!', 'info');
      return;
    }

    const plan = subscriptionPlans.find((p) => p.id === planId);
    if (!plan) return;

    if (plan.price > 0) {
      setShowUpgradeModal(false);
      showToast('Please complete payment to upgrade your plan.', 'info');
      router.push('/payment');
      return;
    }

    showToast('Please contact support to change your subscription plan.', 'info');
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size should be less than 2MB', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      const response = await profileAPI.updateProfilePicture(file);
      
      if (response.success) {
        setAvatarLoadFailed(false);
        setProfile(prev => ({
          ...prev,
          avatar: resolveStorageUrl(response.image_url),
        }));
        
        // Notify other components about avatar update
        notifyUserUpdated({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          firstName: profile.name.split(' ')[0] || '',
          lastName: profile.name.split(' ').slice(1).join(' ') || '',
          avatar: resolveStorageUrl(response.image_url),
        });
        
        showToast('Profile picture updated successfully!', 'success');
      }
    } catch (error) {
      showToast('Failed to update profile picture', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProofOfAddressUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowed.includes(file.type) && !/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) {
      showToast('Please upload a PDF or image (JPG, PNG, WEBP).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size should be less than 10MB.', 'error');
      return;
    }

    try {
      setUploadingProofOfAddress(true);
      const response = await profileAPI.uploadProofOfAddress(file);
      if (response.success) {
        setProfile((prev) => ({
          ...prev,
          proofOfAddress: response.data || {
            uploaded: true,
            original_name: file.name,
            mime: file.type,
            size: file.size,
            uploaded_at: new Date().toISOString(),
          },
        }));
        showToast('Proof of address uploaded successfully.', 'success');
      } else {
        showToast(response.message || 'Upload failed.', 'error');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to upload proof of address.', 'error');
    } finally {
      setUploadingProofOfAddress(false);
    }
  };

  const handleDownloadProofOfAddress = async () => {
    try {
      await profileAPI.downloadProofOfAddress(
        profile.proofOfAddress?.original_name || 'proof-of-address',
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to download document.', 'error');
    }
  };

  const handleDeleteProofOfAddress = async () => {
    if (!window.confirm('Remove your uploaded proof of address document?')) return;
    try {
      const response = await profileAPI.deleteProofOfAddress();
      if (response.success) {
        setProfile((prev) => ({
          ...prev,
          proofOfAddress: response.data || { uploaded: false },
        }));
        showToast('Proof of address removed.', 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to remove document.', 'error');
    }
  };

  const handleDownloadCertificate = (certificate: Certificate) => {
    showToast(`Downloading certificate: ${certificate.title}`, 'info');
  };

  const handleShareCertificate = (certificate: Certificate) => {
    setShowCertificateModal(certificate);
  };

  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const handleChangePassword = async () => {
    if (!passwordData.current.trim()) {
      showToast('Please enter your current password', 'error');
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      showToast('New passwords do not match!', 'error');
      return;
    }
    
    if (passwordData.new.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    if (passwordData.current === passwordData.new) {
      showToast('New password must be different from your current password', 'error');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await profileAPI.changePassword({
        current_password: passwordData.current,
        new_password: passwordData.new,
        new_password_confirmation: passwordData.confirm
      });
      
      showToast('Password changed successfully!', 'success');
      setPasswordData({ current: '', new: '', confirm: '' });
      setShowChangePassword(false);
    } catch (error: any) {
      showToast(error?.message || 'Failed to change password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleSetting = async (setting: keyof typeof profile.settings) => {
    const newSettings = {
      ...profile.settings,
      [setting]: !profile.settings[setting]
    };
    
    try {
      await profileAPI.updateSettings(newSettings);
      setProfile({
        ...profile,
        settings: newSettings
      });
      showToast('Settings updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleSettingChange = async (key: string, value: any) => {
    const newSettings = {
      ...profile.settings,
      [key]: value
    };
    
    try {
      await profileAPI.updateSettings(newSettings);
      setProfile({
        ...profile,
        settings: newSettings
      });
      showToast('Settings updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast('Failed to update settings', 'error');
    }
  };

  const handleDownloadInvoice = (payment: Payment) => {
    showToast(`Downloading invoice: ${payment.id}`, 'info');
  };

  const getSubscriptionStyle = (level: string) => {
    switch (level) {
      case 'pro': return 'bg-purple-50 text-purple-800';
      case 'basic': return 'bg-blue-50 text-blue-800';
      case 'free': return 'bg-gray-100 text-gray-600';
      case 'mentor': return 'bg-amber-50 text-amber-800';
      case 'elite': return 'bg-indigo-50 text-indigo-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getActivityIcon = (type: string) => {
    const baseClasses = "w-10 h-10 rounded-lg flex items-center justify-center text-lg";
    switch (type) {
      case 'video': return `${baseClasses} bg-blue-100 text-blue-600`;
      case 'meeting': return `${baseClasses} bg-green-100 text-green-600`;
      case 'course': return `${baseClasses} bg-amber-100 text-amber-600`;
      case 'webinar': return `${baseClasses} bg-purple-100 text-purple-600`;
      case 'deal': return `${baseClasses} bg-pink-100 text-pink-600`;
      case 'contract': return `${baseClasses} bg-indigo-100 text-indigo-600`;
      default: return `${baseClasses} bg-blue-100 text-blue-600`;
    }
  };

  const getTierStyle = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-amber-100 text-amber-900';
      case 'silver': return 'bg-gray-200 text-gray-800';
      case 'gold': return 'bg-yellow-100 text-yellow-900';
      case 'platinum': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-amber-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPaymentStatusBg = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100';
      case 'pending': return 'bg-amber-100';
      case 'failed': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'Not set') return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return dateString;
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'Male';
      case 'female': return 'Female';
      case 'other': return 'Other';
      case 'prefer-not-to-say': return 'Prefer not to say';
      default: return 'Not set';
    }
  };

  const getExperienceLabel = (experience: string) => {
    switch (experience) {
      case 'beginner': return 'Beginner (< 1 year)';
      case 'intermediate': return 'Intermediate (1-3 years)';
      case 'advanced': return 'Advanced (3-5 years)';
      case 'expert': return 'Expert (5+ years)';
      default: return 'Not set';
    }
  };

  const getBudgetLabel = (budget: string) => {
    switch (budget) {
      case 'under-50k': return 'Under £50K';
      case '50k-200k': return '£50K - £200K';
      case '200k-500k': return '£200K - £500K';
      case '500k-1m': return '£500K - £1M';
      case 'over-1m': return 'Over £1M';
      default: return 'Not set';
    }
  };

  const subscriptionPlans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      level: 'free',
      price: 0,
      billingCycle: 'monthly',
      features: [
        { name: 'Basic Deal Analysis', included: true, limit: '5 deals/month' },
        { name: 'Standard Contracts', included: true, limit: '3 templates' },
        { name: 'Community Access', included: true },
        { name: 'Basic Analytics', included: true },
        { name: 'Email Support', included: true },
        { name: 'Advanced Analytics', included: false },
        { name: 'Market Reports', included: false },
        { name: 'Deal Vetting', included: false },
        { name: 'Premium Templates', included: false }
      ],
      popular: false,
      description: 'Perfect for getting started with real estate investing',
      buttonText: 'Current Plan',
      color: '#64748b'
    },
    {
      id: 'basic',
      name: 'Basic',
      level: 'basic',
      price: 29.99,
      billingCycle: 'monthly',
      features: [
        { name: 'Advanced Deal Analysis', included: true, limit: '20 deals/month' },
        { name: 'Premium Contracts', included: true, limit: '10 templates' },
        { name: 'Community Access', included: true },
        { name: 'Advanced Analytics', included: true },
        { name: 'Market Reports', included: true },
        { name: 'Deal Vetting', included: true, limit: '5 deals/month' },
        { name: 'Portfolio Tracking', included: true },
        { name: 'API Access', included: false },
        { name: 'Custom Solutions', included: false }
      ],
      popular: true,
      description: 'For serious investors wanting to scale',
      buttonText: profile.subscriptionPlan === 'basic' ? 'Current Plan' : 'Continue to Checkout',
      color: '#1e3a8a'
    },
    {
      id: 'pro',
      name: 'Pro',
      level: 'pro',
      price: 99.99,
      billingCycle: 'monthly',
      features: [
        { name: 'Advanced Deal Analysis', included: true, limit: 'Unlimited' },
        { name: 'All Contract Templates', included: true, limit: 'Unlimited' },
        { name: 'Community Access', included: true },
        { name: 'Advanced Analytics', included: true },
        { name: '24/7 Priority Support', included: true },
        { name: 'Unlimited Mentor Access', included: true },
        { name: 'Real-time Market Reports', included: true },
        { name: 'Premium Deal Vetting', included: true, limit: 'Unlimited' },
        { name: 'Full API Access', included: true }
      ],
      popular: false,
      description: 'For professional investors and funds',
      buttonText: profile.subscriptionPlan === 'pro' ? 'Current Plan' : 'Continue to Checkout',
      color: '#7c3aed'
    }
  ];

  // Get profile URL for sharing
  const getProfileUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const profileId = profile.id || 'profile';
    return `${baseUrl}/profile/${profileId}`;
  };

   function renderProfileView() {
    // Get avatar initials from the already loaded profile data
    const getAvatarInitials = () => {
      if (profile.avatarInitials && profile.avatarInitials !== 'U') {
        return profile.avatarInitials;
      }
      const nameParts = profile.name.split(' ');
      if (nameParts.length >= 2) {
        const firstInitial = nameParts[0].charAt(0);
        const lastInitial = nameParts[nameParts.length - 1].charAt(0);
        return (firstInitial + lastInitial).toUpperCase();
      } else if (profile.name) {
        return profile.name.charAt(0).toUpperCase();
      } else if (profile.email) {
        return profile.email.charAt(0).toUpperCase();
      }
      return 'U';
    };

    // Helper function to format date for input[type="date"]
    const formatDateForInput = (dateString: string | undefined) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      } catch {
        return '';
      }
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card with Personal Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
                <div className="relative">
                  {profile.avatar && !avatarLoadFailed ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name || 'Profile'}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg bg-gray-100"
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-blue-900 flex items-center justify-center text-4xl font-semibold text-white border-4 border-white shadow-lg">
                      {getAvatarInitials()}
                    </div>
                  )}
                  <label htmlFor="avatar-upload" className="absolute bottom-2 right-2 bg-blue-900 text-white rounded-full w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-blue-800 transition-colors">
                    <CameraAlt className="text-lg" />
                  </label>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageUpload}
                    disabled={uploadingImage}
                  />
                </div>
                <div className="flex-1">
                  {/* Name - Now Editable */}
                  <div className="flex items-baseline gap-2 mb-2">
                    {isEditingName ? (
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={editingNameData.firstName}
                            onChange={(e) => setEditingNameData({...editingNameData, firstName: e.target.value})}
                            placeholder="First Name"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                          />
                          <input
                            type="text"
                            value={editingNameData.lastName}
                            onChange={(e) => setEditingNameData({...editingNameData, lastName: e.target.value})}
                            placeholder="Last Name"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                          />
                        </div>
                        <input
                          type="text"
                          value={editingNameData.jobTitle}
                          onChange={(e) => setEditingNameData({...editingNameData, jobTitle: e.target.value})}
                          placeholder="Job Title"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                        <input
                          type="text"
                          value={editingNameData.company}
                          onChange={(e) => setEditingNameData({...editingNameData, company: e.target.value})}
                          placeholder="Company"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                        <textarea
                          value={editingNameData.bio}
                          onChange={(e) => setEditingNameData({...editingNameData, bio: e.target.value})}
                          placeholder="Bio / Description"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSaveNameAndJob}
                            className="flex items-center gap-1 bg-blue-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors text-sm"
                          >
                            <Save className="text-base" />
                            Save
                          </button>
                          <button 
                            onClick={() => {
                              setIsEditingName(false);
                              // Reset editing data to current profile values
                              const nameParts = profile.name.split(' ');
                              setEditingNameData({
                                firstName: nameParts[0] || '',
                                lastName: nameParts.slice(1).join(' ') || '',
                                jobTitle: profile.jobTitle || '',
                                company: profile.company || '',
                                bio: profile.bio || '',
                              });
                            }}
                            className="flex items-center gap-1 bg-white text-blue-900 border border-blue-900 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
                          >
                            <Cancel className="text-base" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-3xl font-bold text-gray-900">
                          {profile.name || 'User'}
                        </h1>
                        <button 
                          onClick={() => {
                            const nameParts = profile.name.split(' ');
                            setEditingNameData({
                              firstName: nameParts[0] || '',
                              lastName: nameParts.slice(1).join(' ') || '',
                              jobTitle: profile.jobTitle || '',
                              company: profile.company || '',
                              bio: profile.bio || '',
                            });
                            setIsEditingName(true);
                          }}
                          className="text-blue-900 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition-colors"
                          aria-label="Edit name and job details"
                        >
                          <Edit className="text-base" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Company and Job Title - Only show when not editing */}
                  {!isEditingName && profile.jobTitle && profile.company && (
                    <div className="flex flex-wrap items-center gap-3 text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Work className="text-lg text-gray-500" />
                        <span className="text-lg">
                          {profile.jobTitle} at {profile.company}
                        </span>
                      </div>
                    </div>
                  )}
                  {!isEditingName && profile.jobTitle && !profile.company && (
                    <div className="flex flex-wrap items-center gap-3 text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Work className="text-lg text-gray-500" />
                        <span className="text-lg">{profile.jobTitle}</span>
                      </div>
                    </div>
                  )}
                  {!isEditingName && !profile.jobTitle && profile.company && (
                    <div className="flex flex-wrap items-center gap-3 text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Business className="text-lg text-gray-500" />
                        <span className="text-lg">{profile.company}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Bio - Only show when not editing */}
                  {!isEditingName && profile.bio && (
                    <p className="text-gray-700 leading-relaxed mb-6">{profile.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Investment Information with Date of Birth - FIXED */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <AccountBalance className="text-blue-900" />
                  Investment Information
                </h3>
                <button 
                  onClick={() => {
                    setIsEditingInvestment(!isEditingInvestment);
                    // When entering edit mode, ensure dateOfBirth is preserved
                    if (!isEditingInvestment && profile.dateOfBirth) {
                      // The dateOfBirth value will be used from profile state
                      console.log('Entering edit mode with DOB:', profile.dateOfBirth);
                    }
                  }}
                  className="flex items-center gap-1 bg-white text-blue-900 border border-blue-900 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
                >
                  <Edit className="text-base" />
                  Edit
                </button>
              </div>
              
              {isEditingInvestment ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Job Title</label>
                    <input
                      type="text"
                      value={profile.jobTitle || ''}
                      onChange={(e) => setProfile({...profile, jobTitle: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      value={formatDateForInput(profile.dateOfBirth)}
                      onChange={(e) => setProfile({...profile, dateOfBirth: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter your date of birth</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Years of Experience</label>
                    <select
                      value={profile.yearsOfExperience || ''}
                      onChange={(e) => setProfile({...profile, yearsOfExperience: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Select Experience Level</option>
                      <option value="beginner">Beginner (&lt; 1 year)</option>
                      <option value="intermediate">Intermediate (1-3 years)</option>
                      <option value="advanced">Advanced (3-5 years)</option>
                      <option value="expert">Expert (5+ years)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Investment Budget</label>
                    <select
                      value={profile.investmentBudget || ''}
                      onChange={(e) => setProfile({...profile, investmentBudget: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Select Investment Budget</option>
                      <option value="under-50k">Under £50K</option>
                      <option value="50k-200k">£50K - £200K</option>
                      <option value="200k-500k">£200K - £500K</option>
                      <option value="500k-1m">£500K - £1M</option>
                      <option value="over-1m">Over £1M</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Investment Interests</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['Residential', 'Commercial', 'Industrial', 'Land', 'REITs', 'Fix & Flip', 'Rentals', 'Airbnb'].map(interest => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => {
                            const current = profile.investmentInterests || [];
                            if (current.includes(interest)) {
                              setProfile({
                                ...profile,
                                investmentInterests: current.filter(i => i !== interest)
                              });
                            } else {
                              setProfile({
                                ...profile,
                                investmentInterests: [...current, interest]
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            (profile.investmentInterests || []).includes(interest)
                              ? 'bg-blue-900 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add custom interest and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          const interest = e.currentTarget.value.trim();
                          const current = profile.investmentInterests || [];
                          if (!current.includes(interest)) {
                            setProfile({
                              ...profile,
                              investmentInterests: [...current, interest]
                            });
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Learning Preferences</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['Video Courses', 'Live Webinars', 'One-on-One Mentoring', 'Group Discussions', 'Case Studies', 'Hands-on Projects'].map(pref => (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => {
                            const current = profile.learningPreferences || [];
                            if (current.includes(pref)) {
                              setProfile({
                                ...profile,
                                learningPreferences: current.filter(p => p !== pref)
                              });
                            } else {
                              setProfile({
                                ...profile,
                                learningPreferences: [...current, pref]
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            (profile.learningPreferences || []).includes(pref)
                              ? 'bg-green-900 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add custom preference and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          const pref = e.currentTarget.value.trim();
                          const current = profile.learningPreferences || [];
                          if (!current.includes(pref)) {
                            setProfile({
                              ...profile,
                              learningPreferences: [...current, pref]
                            });
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={handleSaveInvestmentInfo}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-900 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
                    >
                      <Save className="text-lg" />
                      Save
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-900 border border-blue-900 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                    >
                      <Cancel className="text-lg" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Work className="text-gray-500 mt-1" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Job Title</div>
                        <div className="text-gray-700">{profile.jobTitle || 'Not set'}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Cake className="text-gray-500 mt-1" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Date of Birth</div>
                        <div className="text-gray-700">{profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Not set'}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <BusinessCenter className="text-gray-500 mt-1" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Experience Level</div>
                        <div className="text-gray-700">{getExperienceLabel(profile.yearsOfExperience || '')}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <CurrencyPound className="text-gray-500 mt-1" />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Investment Budget</div>
                        <div className="text-gray-700">{getBudgetLabel(profile.investmentBudget || '')}</div>
                      </div>
                    </div>
                  </div>
                  
                  {(profile.investmentInterests && profile.investmentInterests.length > 0) && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-start gap-3 mb-2">
                        <Category className="text-gray-500 mt-1" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-2">Investment Interests</div>
                          <div className="flex flex-wrap gap-2">
                            {profile.investmentInterests.map((interest, index) => (
                              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                {interest}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(profile.learningPreferences && profile.learningPreferences.length > 0) && (
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-start gap-3 mb-2">
                        <SchoolIcon className="text-gray-500 mt-1" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-2">Learning Preferences</div>
                          <div className="flex flex-wrap gap-2">
                            {profile.learningPreferences.map((pref, index) => (
                              <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                {pref}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Contact Information & Subscription */}
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <Person className="text-blue-900" />
                  Contact Information
                </h3>
                <button 
                  onClick={() => setIsEditingContact(!isEditingContact)}
                  className="flex items-center gap-1 bg-white text-blue-900 border border-blue-900 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm whitespace-nowrap"
                >
                  <Edit className="text-base" />
                  Edit
                </button>
              </div>
              
              {isEditingContact ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Alternate Phone</label>
                    <input
                      type="tel"
                      value={profile.alternatePhone || ''}
                      onChange={(e) => setProfile({...profile, alternatePhone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Country</label>
                      <input
                        type="text"
                        value={profile.country || ''}
                        onChange={(e) => setProfile({...profile, country: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">City</label>
                      <input
                        type="text"
                        value={profile.city || ''}
                        onChange={(e) => setProfile({...profile, city: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Company</label>
                    <input
                      type="text"
                      value={profile.company || ''}
                      onChange={(e) => setProfile({...profile, company: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">LinkedIn URL</label>
                    <input
                      type="url"
                      value={profile.linkedinUrl || ''}
                      onChange={(e) => setProfile({...profile, linkedinUrl: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={handleSaveContactInfo}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-900 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
                    >
                      <Save className="text-lg" />
                      Save
                    </button>
                    <button 
                      onClick={handleCancelEdit}
                      className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-900 border border-blue-900 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                    >
                      <Cancel className="text-lg" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <Email className="text-gray-500 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">Email</div>
                      <div className="text-gray-700 break-all overflow-hidden">{profile.email || 'Not set'}</div>
                    </div>
                    {profile.email && (
                      <button 
                        onClick={() => handleCopyToClipboard(profile.email, 'Email')}
                        className="text-blue-900 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                      >
                        <ContentCopy className="text-lg" />
                      </button>
                    )}
                  </div>
                  
                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <Phone className="text-gray-500 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">Phone</div>
                      <div className="text-gray-700 break-all">{profile.phone || 'Not set'}</div>
                    </div>
                    {profile.phone && (
                      <button 
                        onClick={() => handleCopyToClipboard(profile.phone || '', 'Phone')}
                        className="text-blue-900 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                      >
                        <ContentCopy className="text-lg" />
                      </button>
                    )}
                  </div>
                  
                  {/* Alternate Phone */}
                  {profile.alternatePhone && (
                    <div className="flex items-start gap-3">
                      <PhoneAndroid className="text-gray-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">Alternate Phone</div>
                        <div className="text-gray-700 break-all">{profile.alternatePhone}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <LocationOn className="text-gray-500 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">Location</div>
                      <div className="text-gray-700 break-all">
                        {profile.city && profile.country ? `${profile.city}, ${profile.country}` : 'Not set'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Company */}
                  {profile.company && (
                    <div className="flex items-start gap-3">
                      <Business className="text-gray-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">Company</div>
                        <div className="text-gray-700 break-all">{profile.company}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* LinkedIn URL */}
                  {profile.linkedinUrl && (
                    <div className="flex items-start gap-3">
                      <LinkedIn className="text-gray-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">LinkedIn</div>
                        <div className="text-gray-700 truncate overflow-hidden" title={profile.linkedinUrl}>
                          {profile.linkedinUrl}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCopyToClipboard(profile.linkedinUrl || '', 'LinkedIn URL')}
                        className="text-blue-900 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                      >
                        <ContentCopy className="text-lg" />
                      </button>
                    </div>
                  )}

                  <div className="pt-6 mt-6 border-t border-gray-200">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-2 bg-white text-blue-900 border border-blue-900 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                      >
                        <Share className="text-lg" />
                        Share Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Proof of Address ID */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4 gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <BadgeOutlined className="text-blue-900" />
                    Proof of Address ID
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload a utility bill, bank statement, or government ID showing your address (PDF or image, max 10MB).
                  </p>
                </div>
              </div>

              {profile.proofOfAddress?.uploaded ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Description className="text-green-700 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">
                        {profile.proofOfAddress.original_name || 'Proof of address document'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Uploaded
                        {profile.proofOfAddress.uploaded_at
                          ? ` · ${new Date(profile.proofOfAddress.uploaded_at).toLocaleString()}`
                          : ''}
                        {profile.proofOfAddress.size
                          ? ` · ${(profile.proofOfAddress.size / 1024).toFixed(0)} KB`
                          : ''}
                      </p>
                    </div>
                    <CheckCircle className="text-green-600 shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadProofOfAddress}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white border border-green-300 text-green-800 hover:bg-green-100"
                    >
                      <Download className="text-base" />
                      Download
                    </button>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-900 text-white hover:bg-blue-800 cursor-pointer">
                      <UploadFile className="text-base" />
                      {uploadingProofOfAddress ? 'Uploading…' : 'Replace'}
                      <input
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploadingProofOfAddress}
                        onChange={handleProofOfAddressUpload}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleDeleteProofOfAddress}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-white border border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Delete className="text-base" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
                  <UploadFile className="text-blue-900 text-3xl" />
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">
                      {uploadingProofOfAddress ? 'Uploading…' : 'Click to upload proof of address'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG or WEBP up to 10MB</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingProofOfAddress}
                    onChange={handleProofOfAddressUpload}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderCertificatesView() {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-2">
              <School className="text-blue-900" />
              Certificates
            </h3>
            <p className="text-gray-600">Your earned certificates and accreditations</p>
          </div>
          <button 
            onClick={() => showToast('Viewing certificate verification portal', 'info')}
            className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
          >
            <VerifiedUser className="text-lg" />
            Verify Certificates
          </button>
        </div>
        
        <div className="space-y-4">
          {profile.certificates.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <School className="text-6xl text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">No Certificates Yet</h4>
              <p className="text-gray-600">Complete courses to earn certificates and showcase your achievements.</p>
            </div>
          ) : (
            profile.certificates.map((certificate) => (
              <div 
                key={certificate.id} 
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleShareCertificate(certificate)}
              >
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{certificate.title}</h4>
                    <p className="text-gray-600 text-sm mb-2">Issued by {certificate.issuer}</p>
                    <p className="text-gray-700 text-sm mb-3">{certificate.description}</p>
                    <div className="text-xs text-gray-500">
                      Verification Code: {certificate.verificationCode}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-sm text-gray-600">
                      {formatDate(certificate.issueDate)}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadCertificate(certificate);
                        }}
                        className="flex items-center gap-1 bg-white text-blue-900 border border-blue-900 px-3 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
                      >
                        <Download className="text-base" />
                        Download
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyToClipboard(certificate.verificationCode, 'Verification Code');
                        }}
                        className="flex items-center gap-1 bg-blue-900 text-white px-3 py-2 rounded-lg font-semibold hover:bg-blue-800 transition-colors text-sm"
                      >
                        <ContentCopy className="text-base" />
                        Copy Code
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderBadgesView() {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-2">
          <EmojiEvents className="text-blue-900" />
          Progress Badges
        </h3>
        <p className="text-gray-600 mb-6">Earn badges as you progress through your investment journey</p>
        
        {profile.badges.length === 0 ? (
          <div className="text-center py-12">
            <EmojiEvents className="text-6xl text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-900 mb-2">No Badges Earned Yet</h4>
            <p className="text-gray-600">Start completing lessons, courses, and activities to earn badges.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {profile.badges.map((badge) => (
              <div 
                key={badge.id} 
                className={`bg-white rounded-xl border p-5 text-center hover:shadow-md transition-all relative ${
                  badge.tier === 'gold' ? 'border-amber-300' : 
                  badge.tier === 'platinum' ? 'border-gray-300' : 
                  badge.tier === 'silver' ? 'border-gray-200' : 'border-amber-800'
                }`}
              >
                <div className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full ${getTierStyle(badge.tier)}`}>
                  {badge.tier.toUpperCase()}
                </div>
                <div className="text-4xl mb-3">{badge.icon}</div>
                <div className="font-semibold text-gray-900 mb-2">{badge.title}</div>
                <div className="text-sm text-gray-600 mb-3">{badge.description}</div>
                <div className="text-xs text-gray-500">
                  Earned {formatDate(badge.earnedDate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderSettingsView() {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-6">
          <Settings className="text-blue-900" />
          Settings
        </h3>
        
        <div className="space-y-8">
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Notifications</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <div className="font-semibold text-gray-900">Email Notifications</div>
                  <div className="text-sm text-gray-600">Receive updates and announcements via email</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={profile.settings.emailNotifications}
                    onChange={() => handleToggleSetting('emailNotifications')}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Appearance</h4>
            <div className="space-y-3">            
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <div className="font-semibold text-gray-900">Language</div>
                  <div className="text-sm text-gray-600">Interface language</div>
                </div>
                <select 
                  value={profile.settings.language || 'English'}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Security</h4>
            <button 
              onClick={() => setShowChangePassword(true)}
              className="flex items-center gap-2 bg-white text-blue-900 border border-blue-900 px-4 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors w-full"
            >
              <Lock className="text-lg" />
              Change Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderLogoutConfirmModal() {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={() => {
          if (!isLoggingOut) setShowLogoutConfirm(false);
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
      >
        <div
          className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3
              id="logout-confirm-title"
              className="flex items-center gap-3 text-2xl font-bold text-gray-900"
            >
              <ExitToApp className="text-blue-900 text-3xl" />
              Log out?
            </h3>
            <button
              type="button"
              disabled={isLoggingOut}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              onClick={() => setShowLogoutConfirm(false)}
            >
              <Close className="text-2xl" />
            </button>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">
            Are you sure you want to logout? You will need to sign in again to access your account.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={() => setShowLogoutConfirm(false)}
              className="flex items-center gap-2 bg-white text-blue-900 border border-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <Cancel className="text-lg" />
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={confirmLogout}
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              <ExitToApp className="text-lg" />
              {isLoggingOut ? 'Logging out…' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderDeleteConfirmModal() {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDeleteConfirm(false)}>
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
              <Warning className="text-red-600 text-3xl" />
              Delete Account
            </h3>
            <button 
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <Close className="text-2xl" />
            </button>
          </div>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.
          </p>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Enter your password to confirm:
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              placeholder="Your password"
            />
          </div>
          <div className="flex gap-3 justify-center">
            <button 
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              onClick={handleDeleteAccount}
            >
              <Delete className="text-lg" />
              Delete Account
            </button>
            <button 
              className="flex items-center gap-2 bg-white text-blue-900 border border-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <Cancel className="text-lg" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderUpgradeModal() {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowUpgradeModal(false)}>
        <div className="bg-white rounded-xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-lg" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
              <p className="text-gray-600 mt-1">Paid plans require secure checkout before your account is upgraded.</p>
            </div>
            <button 
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setShowUpgradeModal(false)}
            >
              <Close className="text-xl" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptionPlans.map((plan) => {
              const isCurrentPlan = plan.id === profile.subscriptionPlan;
              
              return (
                <div 
                  key={plan.id}
                  className={`border rounded-xl p-5 flex flex-col h-full ${
                    plan.popular 
                      ? 'border-blue-500 shadow-md' 
                      : isCurrentPlan 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200'
                  }`}
                >
                  <div className="mb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                      </div>
                      {plan.popular && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                          Popular
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold text-gray-900">£{plan.price}</span>
                        <span className="text-gray-600 ml-1">/{plan.billingCycle}</span>
                      </div>
                      {plan.price === 0 && (
                        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mt-1">
                          Free forever
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isCurrentPlan && (
                    <div className="mb-4 p-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium text-center">
                      ✓ Your current plan
                    </div>
                  )}
                  
                  <div className="flex-grow mb-6">
                    <ul className="space-y-3">
                      {plan.features.slice(0, 4).map((feature, index) => (
                        <li key={index} className="flex items-start">
                          {feature.included ? (
                            <CheckCircle className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          ) : (
                            <Close className="text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                            {feature.name}
                            {feature.limit && <span className="text-gray-500 text-xs ml-1">({feature.limit})</span>}
                          </span>
                        </li>
                      ))}
                      
                      {plan.features.length > 4 && (
                        <li className="text-gray-500 text-sm">
                          + {plan.features.length - 4} more features
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  <button 
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-700 cursor-default'
                        : plan.popular
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                    onClick={() => !isCurrentPlan && handleUpgradePlan(plan.id)}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? 'Current Plan' : plan.buttonText}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderPaymentHistoryModal() {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowPaymentHistory(false)}>
        <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
              <Receipt className="text-blue-900 text-3xl" />
              Payment History
            </h2>
            <button 
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setShowPaymentHistory(false)}
            >
              <Close className="text-2xl" />
            </button>
          </div>
          
          <div className="space-y-4 mb-8">
            {profile.paymentHistory.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="text-6xl text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Payment History</h4>
                <p className="text-gray-600">Your payment history will appear here once you make a purchase.</p>
              </div>
            ) : (
              profile.paymentHistory.map((payment) => (
                <div 
                  key={payment.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPaymentStatusBg(payment.status)} ${getPaymentStatusColor(payment.status)}`}>
                    <Payment className="text-xl" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{payment.plan}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span>{formatDate(payment.date)}</span>
                      <span>•</span>
                      <span>£{payment.amount}</span>
                      <span>•</span>
                      <span className={`font-semibold ${getPaymentStatusColor(payment.status)}`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownloadInvoice(payment)}
                    className="flex items-center gap-2 bg-white text-blue-900 border border-blue-900 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <Download className="text-lg" />
                    Invoice
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <button 
              onClick={() => showToast('Exporting all invoices...', 'info')}
              className="flex items-center gap-2 bg-white text-blue-900 border border-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              <DownloadForOffline className="text-lg" />
              Export All Invoices
            </button>
            <button 
              onClick={() => {
                setShowPaymentHistory(false);
                setShowUpgradeModal(true);
              }}
              className="flex items-center gap-2 bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
            >
              <ArrowUpward className="text-lg" />
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderCertificateModal() {
    return (
      showCertificateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowCertificateModal(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                <School className="text-blue-900 text-3xl" />
                Certificate Details
              </h2>
              <button 
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setShowCertificateModal(null)}
              >
                <Close className="text-2xl" />
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="text-xl font-bold text-gray-900 mb-2">{showCertificateModal.title}</div>
              <div className="text-gray-600 mb-4">Issued by {showCertificateModal.issuer}</div>
              <div className="text-gray-700 mb-6">{showCertificateModal.description}</div>
              <div className="text-sm text-gray-500">
                Verification Code: {showCertificateModal.verificationCode}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => handleDownloadCertificate(showCertificateModal)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
              >
                <Download className="text-lg" />
                Download PDF
              </button>
              <button 
                onClick={() => {
                  navigator.share?.({
                    title: showCertificateModal.title,
                    text: `Check out my certificate: ${showCertificateModal.title}`,
                    url: window.location.href
                  }).catch(() => {
                    handleCopyToClipboard(window.location.href, 'Certificate Link');
                  });
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-900 border border-blue-900 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                <Share className="text-lg" />
                Share
              </button>
            </div>
          </div>
        </div>
      )
    );
  }

  function renderChangePasswordModal() {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowChangePassword(false)}>
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
              <Lock className="text-blue-900 text-3xl" />
              Change Password
            </h2>
            <button 
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setShowChangePassword(false)}
            >
              <Close className="text-2xl" />
            </button>
          </div>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswordFields.current ? "text" : "password"}
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordFields({...showPasswordFields, current: !showPasswordFields.current})}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswordFields.current ? <VisibilityOff className="text-lg" /> : <Visibility className="text-lg" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showPasswordFields.new ? "text" : "password"}
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordFields({...showPasswordFields, new: !showPasswordFields.new})}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswordFields.new ? <VisibilityOff className="text-lg" /> : <Visibility className="text-lg" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPasswordFields.confirm ? "text" : "password"}
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordFields({...showPasswordFields, confirm: !showPasswordFields.confirm})}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswordFields.confirm ? <VisibilityOff className="text-lg" /> : <Visibility className="text-lg" />}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              type="button"
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save className="text-lg" />
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </button>
            <button 
              onClick={() => setShowChangePassword(false)}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-900 border border-blue-900 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              <Cancel className="text-lg" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderShareProfileModal() {
    const profileUrl = getProfileUrl();
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowShareModal(false)}>
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
              <Share className="text-blue-900 text-3xl" />
              Share Profile
            </h2>
            <button 
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setShowShareModal(false)}
            >
              <Close className="text-2xl" />
            </button>
          </div>
          
          <div className="mb-6">
            <div className="font-semibold text-gray-900 mb-3">Share your profile with others</div>
            <div className="text-gray-600 mb-6">
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                <Link className="text-blue-900 flex-shrink-0" />
                <span className="font-mono text-sm break-all">{profileUrl}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { 
                  icon: <ContentCopy className="text-2xl" />, 
                  label: 'Copy Link', 
                  action: () => handleCopyToClipboard(profileUrl, 'Profile Link') 
                },
                { 
                  icon: <Email className="text-2xl" />, 
                  label: 'Email', 
                  action: () => {
                    const subject = encodeURIComponent(`${profile.name}'s Profile`);
                    const body = encodeURIComponent(`Check out ${profile.name}'s profile: ${profileUrl}`);
                    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                  }
                },
                { 
                  icon: <Share className="text-2xl" />, 
                  label: 'Share', 
                  action: () => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${profile.name}'s Profile`,
                        text: `Check out ${profile.name}'s investment profile`,
                        url: profileUrl
                      }).catch((err) => {
                        if (err.name !== 'AbortError') {
                          handleCopyToClipboard(profileUrl, 'Profile Link');
                        }
                      });
                    } else {
                      handleCopyToClipboard(profileUrl, 'Profile Link');
                    }
                  }
                },
              ].map((item, index) => (
                <button
                  key={index}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-blue-900 transition-colors"
                  onClick={item.action}
                >
                  <div className="text-blue-900 mb-2">
                    {item.icon}
                  </div>
                  <div className="text-xs font-semibold text-gray-900">
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 bg-white text-blue-900 border border-blue-900 px-4 py-2 sm:px-5 sm:py-3 rounded-lg font-semibold hover:bg-red-50 hover:text-red-700 hover:border-red-700 transition-colors"
          >
            <Delete className="text-lg" />
            Delete Account
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 sm:px-5 sm:py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            <ExitToApp className="text-lg" />
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-gray-200">
        {[
          { id: 'profile', label: 'Profile', icon: <Person /> },
          { id: 'certificates', label: 'Certificates', icon: <School /> },
          { id: 'badges', label: 'Progress Badges', icon: <EmojiEvents /> },
          { id: 'settings', label: 'Settings', icon: <Settings /> }
        ].map(tab => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-3 rounded-lg font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-blue-50 text-blue-900' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'profile' && renderProfileView()}
        {activeTab === 'certificates' && renderCertificatesView()}
        {activeTab === 'badges' && renderBadgesView()}
        {activeTab === 'settings' && renderSettingsView()}
      </div>

      {/* Modals */}
      {showLogoutConfirm && renderLogoutConfirmModal()}
      {showDeleteConfirm && renderDeleteConfirmModal()}
      {showPaymentHistory && renderPaymentHistoryModal()}
      {showCertificateModal && renderCertificateModal()}
      {showChangePassword && renderChangePasswordModal()}
      {showShareModal && renderShareProfileModal()}
    </div>
  );
};

export default Profile;