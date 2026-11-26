'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  PlayArrow,
  CheckCircle,
  Lock,
  People,
  VideoLibrary,
  Description,
  School,
  TrendingUp,
} from '@mui/icons-material';
import { learnerService, Course } from '../../services/learnerService';
import { courseThumbnailSrc } from '../../utils/mediaUrl';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';


const LearnerCourseBrowser: React.FC = () => {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'enrolled' | 'available'>('all');
  const [viewMode, setViewMode] = useState<'browse' | 'mycourses'>('mycourses');
  const [isLoading, setIsLoading] = useState(false);
  const [failedThumbnailIds, setFailedThumbnailIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (viewMode === 'mycourses') {
      fetchEnrolledCourses();
    } else {
      fetchAllCourses();
    }
  }, [viewMode, filterMode, searchQuery]);

  const fetchAllCourses = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      if (filterMode === 'enrolled') {
        params.filter = 'enrolled';
      } else if (filterMode === 'available') {
        params.filter = 'available';
      }

      const response = await learnerService.browseCourses(params);
      
      if (response.success && response.data) {
        setCourses(response.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEnrolledCourses = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await learnerService.getMyEnrollments(params);
      
      if (response.success && response.data) {
        setEnrolledCourses(response.data);
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      toast.error('Failed to load your courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const response = await learnerService.enrollInCourse(courseId);
      
      if (response.success) {
        toast.success('Successfully enrolled in course!');
        if (viewMode === 'browse') {
          fetchAllCourses();
        } else {
          fetchEnrolledCourses();
        }
      }
    } catch (error: any) {
      console.error('Error enrolling:', error);
      toast.error(error.message || 'Failed to enroll in course');
    }
  };

  const handleCourseClick = (courseId: string) => {
    router.push(`/learn/courses/${courseId}`);
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

    if (progress > 0) {
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

  const renderCourseCard = (course: Course) => {
    const thumbSrc = courseThumbnailSrc(course);

    return (
    <div
      key={course.id}
      className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
      onClick={() => handleCourseClick(course.id)}
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
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
            <VideoLibrary className="w-16 h-16 text-white opacity-50" />
          </div>
        )}
        
        {/* Progress Bar */}
       {course.isEnrolled && (course.progress ?? 0) > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-green-400 transition-all"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        )}

        {/* Status Badge */}
        {course.isEnrolled && (
          <div className="absolute top-3 right-3">
            {getStatusBadge(course)}
          </div>
        )}

        {/* Enrollment Required Badge */}
        {!course.isEnrolled && (
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1 text-xs font-semibold bg-white/90 text-slate-700 px-3 py-1 rounded-full">
              <Lock className="w-3 h-3" />
              Enrollment Required
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2">
          {course.title}
        </h3>
        
        <p className="text-sm text-slate-600 mb-4 line-clamp-3">
          {course.description}
        </p>

        {/* Instructor */}
        {course.instructor && (
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <School className="w-4 h-4" />
            <span>{course.instructor.name}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-1">
            <VideoLibrary className="w-4 h-4" />
            <span>{course.stats?.moduleCount ?? 0} modules</span>
          </div>
          <div className="flex items-center gap-1">
            <VideoLibrary className="w-4 h-4" />
            <span>{course.stats?.totalLessons ?? 0} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <People className="w-4 h-4" />
            <span>{course.stats?.totalEnrollments ?? 0} enrolled</span>
          </div>
        </div>

        {/* Action Button */}
        {course.isEnrolled ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCourseClick(course.id);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <PlayArrow className="w-5 h-5" />
            {(course.progress ?? 0) > 0 ? 'Continue Learning' : 'Open Course'}
          </button>
        ) : (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await handleEnroll(course.id);
              handleCourseClick(course.id);
            }}
            className="w-full px-4 py-3 text-sm font-semibold text-blue-600 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Enroll Now
          </button>
        )}
      </div>
    </div>
    );
  };

  const displayedCourses = viewMode === 'mycourses' ? enrolledCourses : courses;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Learning Library</h2>
          
          {/* View Mode Toggle */}
          <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
            <button
              onClick={() => setViewMode('mycourses')}
              className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${
                viewMode === 'mycourses'
                  ? 'bg-white text-blue-500 shadow-sm'
                  : 'bg-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              My Courses
            </button>
            <button
              onClick={() => setViewMode('browse')}
              className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${
                viewMode === 'browse'
                  ? 'bg-white text-blue-500 shadow-sm'
                  : 'bg-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Browse All
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search courses..."
              className="w-full pl-10 pr-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter for Browse Mode */}
          {viewMode === 'browse' && (
            <div className="flex gap-2">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterMode === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Courses
              </button>
              <button
                onClick={() => setFilterMode('enrolled')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterMode === 'enrolled'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Enrolled
              </button>
              <button
                onClick={() => setFilterMode('available')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterMode === 'available'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Available
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Loading courses...</h3>
          </div>
        ) : displayedCourses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <VideoLibrary className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-3">
              {viewMode === 'mycourses' ? 'No enrolled courses' : 'No courses found'}
            </h3>
            <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
              {viewMode === 'mycourses'
                ? "You haven't enrolled in any courses yet. Browse available courses to start learning!"
                : searchQuery
                  ? 'No courses match your search. Try different keywords.'
                  : 'No courses are currently available.'}
            </p>
            {viewMode === 'mycourses' && (
              <button
                onClick={() => setViewMode('browse')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Browse Courses
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedCourses.map(renderCourseCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnerCourseBrowser;