'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlayCircle,
  Lock,
  School,
  VideoLibrary,
  Search,
  FilterList,
  Sort,
  Collections,
  CheckCircle,
  TrendingUp,
  People,
  PlayArrow,
  Description,
  ArrowBack,
  Dashboard,
  OndemandVideo,
  InsertDriveFile
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { learnerService, type Course } from '../../services/learnerService';
import { courseThumbnailSrc } from '../../utils/mediaUrl';
import { toast } from 'react-toastify';
import CourseDetailPage from './CourseDetailPage';

interface EducationLibraryProps {
  // Optional prop to determine if we're in a nested view
  isNestedView?: boolean;
  onBackToDashboard?: () => void;
}

const EducationLibrary: React.FC<EducationLibraryProps> = ({ 
  isNestedView = false,
  onBackToDashboard 
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'alphabetical'>('newest');
  const [viewMode, setViewMode] = useState<'mycourses' | 'browse'>('mycourses');
  const [filterMode, setFilterMode] = useState<'all' | 'enrolled' | 'available'>('all');
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [failedThumbnailIds, setFailedThumbnailIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (viewMode === 'mycourses') {
      fetchEnrolledCourses();
    } else {
      fetchAllCourses();
    }
  }, [viewMode, filterMode, searchQuery, sortBy]);

  const fetchEnrolledCourses = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await learnerService.getMyEnrollments(params);
      
      if (response.success && response.data) {
        let filtered = response.data;
        
        // Apply sorting
        filtered = filtered.sort((a: Course, b: Course) => {
          if (sortBy === 'newest') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          } else {
            return a.title.localeCompare(b.title);
          }
        });
        
        setEnrolledCourses(filtered);
      } else if (response.message) {
        toast.error(response.message);
      }
    } catch (error: any) {
      console.error('Error fetching enrolled courses:', error);
      toast.error(error.message || 'Failed to load your courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCourses = async () => {
    setLoading(true);

    try {
      const params: any = {};
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      // Map filterMode to API filter
      if (filterMode === 'enrolled') {
        params.filter = 'enrolled';
      } else if (filterMode === 'available') {
        params.filter = 'available';
      }

      const response = await learnerService.browseCourses(params);
      
      if (response.success && response.data) {
        let filtered = response.data;
        
        // Apply sorting
        filtered = filtered.sort((a: Course, b: Course) => {
          if (sortBy === 'newest') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          } else {
            return a.title.localeCompare(b.title);
          }
        });
        
        setCourses(filtered);
      } else if (response.message) {
        toast.error(response.message);
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast.error(error.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEnrollingCourseId(courseId);
    
    try {
      const response = await learnerService.enrollInCourse(courseId);
      
      if (response.success) {
        toast.success('Successfully enrolled in course!');
        // Refresh data
        if (viewMode === 'browse') {
          fetchAllCourses();
        } else {
          fetchEnrolledCourses();
        }
      } else if (response.message) {
        toast.error(response.message);
      }
    } catch (error: any) {
      console.error('Error enrolling:', error);
      toast.error(error.message || 'Failed to enroll in course');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleCourseClick = async (course: Course) => {
    try {
      if (!course.isEnrolled) {
        const response = await learnerService.enrollInCourse(course.id);
        if (!response.success) {
          toast.error(response.message || 'Please enroll to open this course');
          return;
        }
      }
      router.push(`/learn/courses/${course.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to open course');
    }
  };

  const handleBackToDashboard = () => {
    // Navigate back to /learn page
    router.push('/learn');
  };

  const getStatusBadge = (course: Course) => {
    if (!course.enrollment) return null;

    const { status, progress } = course.enrollment;

    if (status === 'completed') {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">
          <CheckCircle className="w-3 h-3" />
          Completed
        </span>
      );
    }

    if (progress && progress > 0) {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
          <TrendingUp className="w-3 h-3" />
          {progress}% Complete
        </span>
      );
    }

    return (
      <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
        Not Started
      </span>
    );
  };

  // FIX: Only show enrolled courses in "My Courses" view
  // Filter enrolledCourses to ensure only enrolled courses are shown
  const getFilteredEnrolledCourses = () => {
    return enrolledCourses.filter(course => course.isEnrolled === true);
  };

  // Determine which courses to display based on view mode
  const getDisplayedCourses = () => {
    if (viewMode === 'mycourses') {
      return getFilteredEnrolledCourses();
    } else {
      return courses;
    }
  };

  const displayedCourses = getDisplayedCourses();
  const filteredEnrolledCourses = getFilteredEnrolledCourses();
  const singleEnrolledCourse =
    viewMode === 'mycourses' && !searchQuery && filteredEnrolledCourses.length === 1
      ? filteredEnrolledCourses[0]
      : null;

  const renderLibraryHeader = () => (
    <div className="mb-8">
      {isNestedView && (
        <button
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowBack className="w-5 h-5" />
          Back to Dashboard
        </button>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Education Library</h1>
          <p className="text-gray-600 mt-2">
            {viewMode === 'mycourses'
              ? 'Your enrolled courses and learning progress'
              : 'Master real estate investing with our comprehensive courses'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg p-1 flex gap-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setViewMode('mycourses')}
              className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${
                viewMode === 'mycourses'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <Dashboard className="w-4 h-4" />
                My Courses
              </span>
            </button>
            <button
              onClick={() => setViewMode('browse')}
              className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${
                viewMode === 'browse'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Browse All
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSearchBar = () => (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${viewMode === 'mycourses' ? 'your courses' : 'courses'}...`}
              className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3">
          {viewMode === 'browse' && (
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-3.5 border-2 border-gray-200 rounded-xl bg-white">
                <FilterList className="text-gray-400 w-5 h-5" />
                <select
                  className="focus:outline-none focus:ring-0 bg-transparent appearance-none"
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as any)}
                >
                  <option value="all">All Courses</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="available">Available</option>
                </select>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="flex items-center gap-2 px-4 py-3.5 border-2 border-gray-200 rounded-xl bg-white">
              <Sort className="text-gray-400 w-5 h-5" />
              <select
                className="focus:outline-none focus:ring-0 bg-transparent appearance-none"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">Newest First</option>
                <option value="alphabetical">A to Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      {renderLibraryHeader()}
      {renderSearchBar()}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 md:py-24">
          <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-3">
            Loading {viewMode === 'mycourses' ? 'your courses' : 'courses'}...
          </h3>
          <p className="text-gray-500">Please wait while we fetch your content</p>
        </div>
      ) : singleEnrolledCourse ? (
        <CourseDetailPage
          courseId={singleEnrolledCourse.id}
          modulesOnly
          embedded
        />
      ) : displayedCourses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <VideoLibrary className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {viewMode === 'mycourses' ? 'No Enrolled Courses' : 'No Courses Found'}
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {viewMode === 'mycourses'
              ? "You haven't enrolled in any courses yet. Browse available courses to start learning!"
              : searchQuery
                ? 'No courses match your search. Try different keywords.'
                : 'No courses are currently available.'}
          </p>
          {viewMode === 'mycourses' ? (
            <button
              onClick={() => setViewMode('browse')}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all transform hover:-translate-y-0.5"
            >
              Browse Courses
              <PlayArrow className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterMode('all');
                fetchAllCourses();
              }}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all transform hover:-translate-y-0.5"
            >
              Clear Search
              <Search className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {displayedCourses.map((course) => {
            const thumbSrc = courseThumbnailSrc(course);
            return (
            <div 
              key={course.id}
              onClick={() => void handleCourseClick(course)}
              className={`bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer hover:border-blue-300`}
            >
              {/* Course Thumbnail */}
              <div className="relative h-48 md:h-52 bg-gradient-to-br from-blue-500 to-purple-600">
                {thumbSrc && !failedThumbnailIds.has(course.id) ? (
                  <img
                    src={thumbSrc}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    onError={() => {
                      setFailedThumbnailIds((prev) => new Set(prev).add(course.id));
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Collections className="w-16 h-16 text-white opacity-80" />
                  </div>
                )}
                
                {/* Progress Bar */}
                {course.isEnrolled && course.progress !== undefined && course.progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                )}

                {/* Status Badge */}
                {course.isEnrolled ? (
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(course)}
                  </div>
                ) : (
                  <div className="absolute top-4 left-4">
                    <span className="flex items-center gap-1 text-xs font-semibold bg-white/90 text-gray-700 px-3 py-1.5 rounded-full shadow-sm">
                      <Lock className="w-3 h-3" />
                      Enrollment Required
                    </span>
                  </div>
                )}

                {/* Lesson Counts */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-black/60 text-white px-2 py-1 rounded-full text-xs">
                    <OndemandVideo className="w-3 h-3" />
                    <span>{course.stats?.videoCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/60 text-white px-2 py-1 rounded-full text-xs">
                    <InsertDriveFile className="w-3 h-3" />
                    <span>{course.stats?.documentCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Course Info */}
              <div className="p-5 md:p-6">
                <h3 className="font-bold text-gray-900 text-lg md:text-xl mb-3 line-clamp-2">
                  {course.title}
                </h3>
                
                <p className="text-gray-600 text-sm md:text-base mb-4 line-clamp-3 leading-relaxed">
                  {course.description}
                </p>

                {/* Instructor */}
                {course.instructor?.name && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <School className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Instructor: {course.instructor.name}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-5 pb-5 border-b border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <VideoLibrary className="w-4 h-4" />
                    <span>{course.stats?.totalLessons || 0} lessons</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <People className="w-4 h-4" />
                    <span>{course.stats?.totalEnrollments || 0} enrolled</span>
                  </div>
                </div>

                {/* Action Button */}
                {course.isEnrolled ? (
                  <div className="space-y-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCourseClick(course);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <PlayArrow className="w-5 h-5" />
                      {(course.progress ?? 0) > 0 ? 'Continue Learning' : 'Start Learning'}
                    </button>
                    <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      Enrolled
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleEnroll(course.id, e)}
                    disabled={enrollingCourseId === course.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-base font-semibold text-blue-600 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {enrollingCourseId === course.id ? (
                      <>
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Enrolling...
                      </>
                    ) : (
                      <>
                        Enroll Now
                        <PlayCircle className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!loading && (singleEnrolledCourse || displayedCourses.length > 0) && (
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-gray-500 text-sm">
            {singleEnrolledCourse
              ? 'Showing modules for your enrolled course'
              : `Showing ${displayedCourses.length} ${viewMode === 'mycourses' ? 'enrolled' : ''} courses`}
          </p>
        </div>
      )}
    </div>
  );
};

export default EducationLibrary;