// app/profile/[id]/page.tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface ProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

interface ProfileData {
  name: string;
  bio?: string;
  avatar?: string;
  joined: string;
  email?: string;
  phone?: string;
  location?: string;
  company?: string;
  jobTitle?: string;
  subscriptionPlan?: string;
  experienceLevel?: string;
  investmentBudget?: string;
  linkedinUrl?: string;
  alternatePhone?: string;
  gender?: string;
  dateOfBirth?: string;
  website?: string;
  stats: {
    certificates: number;
    courses: number;
    hours: number;
    deals: number;
    videosWatched: number;
    meetingsAttended: number;
    contactsAdded: number;
  };
  interests?: string[];
  learningPreferences?: string[];
  badges?: Array<{
    title: string;
    icon: string;
    tier: string;
    description?: string;
    earnedDate?: string;
  }>;
  certificates?: Array<{
    title: string;
    issuer: string;
    issueDate: string;
    description?: string;
    verificationCode?: string;
  }>;
  recentActivity?: Array<{
    type: string;
    title: string;
    date: string;
    duration?: string;
    progress?: number;
  }>;
  paymentHistory?: Array<{
    id: string;
    date: string;
    amount: number;
    plan: string;
    status: string;
  }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  
  try {
    console.log(`Fetching profile from: ${apiUrl}/public/profile/${id}`);
    
    const response = await fetch(`${apiUrl}/public/profile/${id}`, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response: ${errorText}`);
      notFound();
    }

    const data = await response.json();
    console.log('Profile data received:', data);

    if (!data.success || !data.data) {
      console.error('Invalid response structure:', data);
      notFound();
    }

    const profile = data.data;

    // Helper functions
    const getTierColor = (tier?: string) => {
      switch (tier?.toLowerCase()) {
        case 'bronze': return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'silver': return 'bg-gray-200 text-gray-700 border-gray-300';
        case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-300';
        default: return 'bg-blue-100 text-blue-800 border-blue-200';
      }
    };

    const getPlanBadge = (plan?: string) => {
      switch (plan?.toLowerCase()) {
        case 'pro': return 'bg-purple-100 text-purple-800 border-purple-300';
        case 'elite': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
        case 'basic': return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'mentor': return 'bg-amber-100 text-amber-800 border-amber-300';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
      }
    };

    const getGenderLabel = (gender?: string) => {
      switch (gender) {
        case 'male': return 'Male';
        case 'female': return 'Female';
        case 'other': return 'Other';
        case 'prefer-not-to-say': return 'Prefer not to say';
        default: return 'Not specified';
      }
    };

    const formatDate = (dateString?: string) => {
      if (!dateString) return 'Not set';
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return dateString;
      }
    };

    const getActivityIcon = (type: string) => {
      const baseClasses = "w-10 h-10 rounded-lg flex items-center justify-center";
      switch (type?.toLowerCase()) {
        case 'video': return `${baseClasses} bg-blue-100 text-blue-600`;
        case 'meeting': return `${baseClasses} bg-green-100 text-green-600`;
        case 'course': return `${baseClasses} bg-amber-100 text-amber-600`;
        case 'webinar': return `${baseClasses} bg-purple-100 text-purple-600`;
        case 'deal': return `${baseClasses} bg-pink-100 text-pink-600`;
        case 'contract': return `${baseClasses} bg-indigo-100 text-indigo-600`;
        default: return `${baseClasses} bg-gray-100 text-gray-600`;
      }
    };

    const getPaymentStatusColor = (status: string) => {
      switch (status?.toLowerCase()) {
        case 'completed': return 'text-green-600';
        case 'pending': return 'text-amber-600';
        case 'failed': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link 
            href="/learn/dashboard" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-900 mb-6 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>

          {/* Main Profile Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Cover Image */}
            <div className="h-48 bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 relative">
              <div className="absolute inset-0 bg-black/20"></div>
              {profile.subscriptionPlan && profile.subscriptionPlan !== 'free' && (
                <div className="absolute top-4 right-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${getPlanBadge(profile.subscriptionPlan)} border-2`}>
                    {profile.subscriptionPlan} Plan
                  </span>
                </div>
              )}
            </div>
            
            <div className="px-6 md:px-8 pb-8">
              {/* Profile Header */}
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16">
                <div className="relative">
                  {profile.avatar ? (
                    <img 
                      src={profile.avatar} 
                      alt={profile.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg bg-gray-100"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-5xl font-bold text-white border-4 border-white shadow-lg">
                      {profile.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-2 border-white"></div>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    {profile.name || 'User'}
                  </h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                    <span className="text-gray-600">
                      Member since {profile.joined || 'Recently'}
                    </span>
                    {profile.jobTitle && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-700 font-medium">{profile.jobTitle}</span>
                      </>
                    )}
                    {profile.company && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-700">{profile.company}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Stats Grid - Expanded */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="text-center p-4 bg-blue-50 rounded-xl hover:shadow-md transition-shadow">
                  <div className="text-3xl font-bold text-blue-900">
                    {profile.stats?.certificates || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Certificates</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl hover:shadow-md transition-shadow">
                  <div className="text-3xl font-bold text-green-900">
                    {profile.stats?.courses || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Courses</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl hover:shadow-md transition-shadow">
                  <div className="text-3xl font-bold text-purple-900">
                    {profile.stats?.hours || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Hours Learned</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl hover:shadow-md transition-shadow">
                  <div className="text-3xl font-bold text-amber-900">
                    {profile.stats?.deals || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Deals Analyzed</div>
                </div>
              </div>

              {/* Extended Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-indigo-50 rounded-xl">
                  <div className="text-xl font-bold text-indigo-900">
                    {profile.stats?.videosWatched || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Videos</div>
                </div>
                <div className="text-center p-3 bg-rose-50 rounded-xl">
                  <div className="text-xl font-bold text-rose-900">
                    {profile.stats?.meetingsAttended || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Meetings</div>
                </div>
                <div className="text-center p-3 bg-teal-50 rounded-xl">
                  <div className="text-xl font-bold text-teal-900">
                    {profile.stats?.contactsAdded || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Contacts</div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.email && (
                    <div className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">Email</div>
                        <div className="font-medium">{profile.email}</div>
                      </div>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">Phone</div>
                        <div className="font-medium">{profile.phone}</div>
                      </div>
                    </div>
                  )}
                  {profile.alternatePhone && (
                    <div className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">Alternate Phone</div>
                        <div className="font-medium">{profile.alternatePhone}</div>
                      </div>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">Location</div>
                        <div className="font-medium">{profile.location}</div>
                      </div>
                    </div>
                  )}
                  {profile.gender && (
                    <div className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">Gender</div>
                        <div className="font-medium">{getGenderLabel(profile.gender)}</div>
                      </div>
                    </div>
                  )}
                  {profile.dateOfBirth && (
                    <div className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">Date of Birth</div>
                        <div className="font-medium">{formatDate(profile.dateOfBirth)}</div>
                      </div>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">Website</div>
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                          {profile.website}
                        </a>
                      </div>
                    </div>
                  )}
                  {profile.linkedinUrl && (
                    <div className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">LinkedIn</div>
                        <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                          View Profile
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Investment Details */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.experienceLevel && (
                    <div className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">Experience Level</div>
                        <div className="font-medium">{profile.experienceLevel}</div>
                      </div>
                    </div>
                  )}
                  {profile.investmentBudget && (
                    <div className="flex items-center gap-3 text-gray-700 p-3 bg-gray-50 rounded-lg">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <div className="text-xs text-gray-500">Investment Budget</div>
                        <div className="font-medium">{profile.investmentBudget}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Investment Interests */}
                {profile.interests && profile.interests.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-600 mb-3">Investment Interests</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest: string, index: number) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Learning Preferences */}
                {profile.learningPreferences && profile.learningPreferences.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-600 mb-3">Learning Preferences</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.learningPreferences.map((pref: string, index: number) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                        >
                          {pref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Badges Section */}
              {profile.badges && profile.badges.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements & Badges</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {profile.badges.map((badge: any, index: number) => (
                      <div 
                        key={index}
                        className={`p-4 rounded-xl border-2 text-center ${getTierColor(badge.tier)} transition-transform hover:scale-105`}
                      >
                        <div className="text-3xl mb-2">{badge.icon || '🏆'}</div>
                        <div className="font-semibold text-sm">{badge.title}</div>
                        {badge.description && (
                          <div className="text-xs mt-1 opacity-75">{badge.description}</div>
                        )}
                        {badge.earnedDate && (
                          <div className="text-xs mt-1 opacity-50">{formatDate(badge.earnedDate)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certificates Section */}
              {profile.certificates && profile.certificates.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificates</h3>
                  <div className="space-y-4">
                    {profile.certificates.map((cert: any, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{cert.title}</h4>
                            <p className="text-sm text-gray-600">Issued by {cert.issuer}</p>
                            {cert.description && (
                              <p className="text-sm text-gray-700 mt-1">{cert.description}</p>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              Issued: {formatDate(cert.issueDate)}
                              {cert.verificationCode && (
                                <> • Code: <span className="font-mono">{cert.verificationCode}</span></>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-3 py-1 bg-blue-900 text-white rounded-lg text-sm hover:bg-blue-800 transition-colors">
                              Download
                            </button>
                            <button className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                              Verify
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {profile.recentActivity && profile.recentActivity.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {profile.recentActivity.map((activity: any, index: number) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                        <div className={getActivityIcon(activity.type)}>
                          {activity.type === 'video' && '🎬'}
                          {activity.type === 'meeting' && '🤝'}
                          {activity.type === 'course' && '📚'}
                          {activity.type === 'webinar' && '💻'}
                          {activity.type === 'deal' && '💰'}
                          {activity.type === 'contract' && '📄'}
                          {!['video','meeting','course','webinar','deal','contract'].includes(activity.type?.toLowerCase()) && '📌'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{activity.title}</div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <span>{formatDate(activity.date)}</span>
                            {activity.duration && (
                              <>
                                <span>•</span>
                                <span>{activity.duration}</span>
                              </>
                            )}
                            {activity.progress !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600">{activity.progress}% complete</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment History */}
              {profile.paymentHistory && profile.paymentHistory.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-sm font-semibold text-gray-600">Date</th>
                          <th className="text-left py-2 text-sm font-semibold text-gray-600">Plan</th>
                          <th className="text-left py-2 text-sm font-semibold text-gray-600">Amount</th>
                          <th className="text-left py-2 text-sm font-semibold text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.paymentHistory.map((payment: any, index: number) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2 text-sm text-gray-700">{formatDate(payment.date)}</td>
                            <td className="py-2 text-sm text-gray-700">{payment.plan}</td>
                            <td className="py-2 text-sm text-gray-700">£{payment.amount}</td>
                            <td className={`py-2 text-sm font-medium ${getPaymentStatusColor(payment.status)}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Profile ID: {id} • Member since {profile.joined || 'Recently'}</p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    notFound();
  }
}