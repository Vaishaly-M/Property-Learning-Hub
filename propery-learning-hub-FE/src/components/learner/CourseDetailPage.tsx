'use client';

import React, { useState, useEffect } from 'react';
import {
  PlayArrow,
  Lock,
  CheckCircle,
  ChevronLeft,
  School,
  VideoLibrary,
  AccessTime,
  EmojiEvents,
  Replay,
  People,
  BarChart,
  Download,
  Description,
  InsertDriveFile,
  PictureAsPdf,
  Folder,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { learnerService, type CourseDetails, type CourseModule, type Lesson } from '../../services/learnerService';
import { courseThumbnailSrc, resolveStorageUrl } from '../../utils/mediaUrl';
import { toast } from 'react-toastify';

interface CourseDetailPageProps {
  courseId: string;
  moduleId?: string;
  onBack?: () => void;
  previewMode?: boolean;
  /** When true, show module grid only (no back to library). Used for single-enrollment learners. */
  modulesOnly?: boolean;
  /** When true, render inline inside Education Library (no full-page wrapper). */
  embedded?: boolean;
}

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({
  courseId,
  moduleId: initialModuleId,
  onBack,
  previewMode = false,
  modulesOnly = false,
  embedded = false,
}) => {
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolledCourseCount, setEnrolledCourseCount] = useState<number | null>(null);
  const [enrollmentChecked, setEnrollmentChecked] = useState(previewMode);
  const [activeTab, setActiveTab] = useState<'overview' | 'modules'>(initialModuleId ? 'modules' : 'modules');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(initialModuleId ?? null);
  const [moduleContentTab, setModuleContentTab] = useState<'videos' | 'documents'>('videos');

  useEffect(() => {
    if (initialModuleId) {
      setSelectedModuleId(String(initialModuleId));
      setActiveTab('modules');
    }
  }, [initialModuleId]);

  useEffect(() => {
    loadCourse();
  }, [courseId]);

  useEffect(() => {
    if (previewMode) return;

    learnerService
      .getMyEnrollments()
      .then((response) => {
        if (response.success && response.data) {
          const enrolled = response.data.filter((c) => c.isEnrolled !== false);
          setEnrolledCourseCount(enrolled.length);
        }
      })
      .catch(() => setEnrolledCourseCount(null))
      .finally(() => setEnrollmentChecked(true));
  }, [previewMode]);

  const loadCourse = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await learnerService.getCourseDetails(courseId);
      
      if (response.success && response.data) {
        const rawModules = Array.isArray(response.data.modules) ? response.data.modules : [];

        const normalizeVideo = (video: any, moduleMeta?: { id: string; title: string; order: number }, index = 0) => {
          const isCompleted = previewMode
            ? false
            : Boolean(video.isCompleted ?? video.is_completed);
          const isUnlocked = previewMode
            ? true
            : isCompleted || Boolean(video.isUnlocked ?? video.is_unlocked);

          return {
          ...video,
          type: 'video' as const,
          isUnlocked,
          isCompleted,
          resourceUrl: resolveStorageUrl(video.video_url) ?? undefined,
          videoUrl: resolveStorageUrl(video.video_url) ?? undefined,
          thumbnail: resolveStorageUrl(video.thumbnailUrl || video.thumbnail) ?? video.thumbnail,
          thumbnailUrl: resolveStorageUrl(video.thumbnailUrl || video.thumbnail) ?? video.thumbnailUrl,
          moduleId: moduleMeta?.id ?? video.moduleId ?? video.module_id,
          moduleTitle: moduleMeta?.title ?? video.moduleTitle,
          moduleOrder: moduleMeta?.order ?? video.moduleOrder,
        };
        };

        const normalizeDocument = (doc: any, moduleMeta?: { id: string; title: string; order: number }) => ({
          ...doc,
          type: (doc.type === 'image' ? 'image' : 'document') as 'document' | 'image',
          isUnlocked: true,
          isCompleted: previewMode ? false : (doc.isCompleted || false),
          has_file: doc.has_file ?? Boolean(doc.file_name),
          thumbnailUrl: resolveStorageUrl(doc.thumbnailUrl || doc.thumbnail) ?? doc.thumbnailUrl,
          moduleId: moduleMeta?.id ?? doc.moduleId ?? doc.module_id,
          moduleTitle: moduleMeta?.title ?? doc.moduleTitle,
          moduleOrder: moduleMeta?.order ?? doc.moduleOrder,
        });

        const modules: CourseModule[] = rawModules
          .slice()
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((m: any) => {
            const moduleMeta = { id: String(m.id), title: m.title, order: m.order };
            const moduleVideos = (
              Array.isArray(m.videos)
                ? m.videos
                : Array.isArray(m.contents)
                  ? m.contents.filter((c: any) => c.type === 'video')
                  : []
            ).map((video: any, index: number) => normalizeVideo(video, moduleMeta, index));

            const moduleDocuments = (
              Array.isArray(m.documents)
                ? m.documents
                : Array.isArray(m.contents)
                  ? m.contents.filter((c: any) => c.type === 'document' || c.type === 'image')
                  : []
            ).map((doc: any) => normalizeDocument(doc, moduleMeta));

            return {
              ...m,
              id: String(m.id),
              thumbnailUrl: resolveStorageUrl(m.thumbnailUrl) ?? m.thumbnailUrl,
              videos: moduleVideos,
              documents: moduleDocuments,
              videoCount: moduleVideos.length,
              documentCount: moduleDocuments.length,
            };
          });

        const videosFromModules = modules.flatMap((m) => m.videos || []);
        const docsFromModules = modules.flatMap((m) => m.documents || []);

        const videos = (Array.isArray(response.data.videos) && response.data.videos.length > 0
          ? response.data.videos.map((video: any, index: number) => {
              const matchedModule = modules.find((m) =>
                (m.videos || []).some((v) => String(v.id) === String(video.id))
              );
              return normalizeVideo(
                video,
                matchedModule
                  ? { id: matchedModule.id, title: matchedModule.title, order: matchedModule.order }
                  : undefined,
                index
              );
            })
          : videosFromModules);

        const documents = (Array.isArray(response.data.documents) && response.data.documents.length > 0
          ? response.data.documents.map((doc: any) => {
              const matchedModule = modules.find((m) =>
                (m.documents || []).some((d) => String(d.id) === String(doc.id))
              );
              return normalizeDocument(
                doc,
                matchedModule
                  ? { id: matchedModule.id, title: matchedModule.title, order: matchedModule.order }
                  : undefined
              );
            })
          : docsFromModules);

        const allLessons = [...videos, ...documents].sort((a, b) => (a.order || 0) - (b.order || 0));

        const courseData = {
          ...response.data,
          isEnrolled: previewMode ? true : response.data.isEnrolled,
          modules,
          lessons: allLessons,
          videos,
          documents,
        };

        setCourse(courseData);
        if (initialModuleId) {
          setSelectedModuleId(String(initialModuleId));
          setActiveTab('modules');
        }
      } else {
        const errorMessage = response.message || 'Failed to load course';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error loading course:', error);
      const errorMessage = error.message || 'Failed to load course';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get videos from the normalized structure
  const getVideoLessons = () => {
    if (!course?.videos || !Array.isArray(course.videos)) {
      return [];
    }
    return course.videos;
  };

  // Get documents from the normalized structure
  const getDocumentLessons = () => {
    if (!course?.documents || !Array.isArray(course.documents)) {
      return [];
    }
    return course.documents;
  };

  const getModules = (): CourseModule[] => {
    if (!course?.modules || !Array.isArray(course.modules)) return [];
    return course.modules;
  };

  const getSelectedModule = (): CourseModule | null => {
    if (!selectedModuleId) return null;
    return getModules().find((m) => String(m.id) === String(selectedModuleId)) || null;
  };

  const openModule = (moduleId: string, contentTab: 'videos' | 'documents' = 'videos') => {
    if (previewMode) {
      setSelectedModuleId(String(moduleId));
      setModuleContentTab(contentTab);
      setActiveTab('modules');
      return;
    }
    router.push(`/learn/courses/${courseId}/modules/${moduleId}`);
  };

  const closeModule = () => {
    if (previewMode) {
      setSelectedModuleId(null);
      setModuleContentTab('videos');
      return;
    }
    if (modulesOnly || enrolledCourseCount === 1) {
      router.push('/learn/education');
      return;
    }
    router.push(`/learn/courses/${courseId}`);
  };

  const getCompletedLessons = () => {
    const lessons = course?.lessons || [...getVideoLessons(), ...getDocumentLessons()];
    return lessons.filter((l: any) => l.isCompleted).length || 0;
  };

  const getTotalLessons = () => {
    const lessons = course?.lessons || [...getVideoLessons(), ...getDocumentLessons()];
    return lessons.length || 0;
  };

  const calculateProgress = () => {
    const completedVideos = getCompletedLessons();
    const totalVideos = getTotalLessons();
    
    if (totalVideos === 0) return 0;
    
    return Math.round((completedVideos / totalVideos) * 100);
  };

  const handleLessonClick = (lesson: Lesson) => {
    const isUnlocked = Boolean(lesson.isCompleted || lesson.isUnlocked);
    if (!isUnlocked) {
      toast.warning('Please complete the previous lesson first');
      return;
    }

    if (lesson.type === 'document' || lesson.type === 'image') {
      handleViewResource(lesson);
      return;
    }
    
    if (previewMode) {
      router.push(`/admin/content/${courseId}/preview/lessons/${lesson.id}`);
    } else {
      router.push(`/learn/courses/${courseId}/lessons/${lesson.id}`);
    }
  };

  const handleViewResource = async (lesson: Lesson) => {
    try {
      if (!previewMode && course && !course.isEnrolled) {
        const enrollResponse = await learnerService.enrollInCourse(courseId);
        if (enrollResponse.success) {
          setCourse((prev) => (prev ? { ...prev, isEnrolled: true } : prev));
        }
      }

      await learnerService.viewDocument(String(lesson.id));

      // Auto-complete the document lesson
      await learnerService.completeLesson(courseId, String(lesson.id));
      void loadCourse();
    } catch (error: any) {
      console.error('View error:', error);
      toast.error(error.message || 'Failed to open document');
    }
  };

  const handleDownloadResource = async (lesson: Lesson) => {
    const fileName = (lesson as any).file_name || lesson.title;

    try {
      if (!previewMode && course && !course.isEnrolled) {
        const enrollResponse = await learnerService.enrollInCourse(courseId);
        if (enrollResponse.success) {
          setCourse((prev) => (prev ? { ...prev, isEnrolled: true } : prev));
        }
      }

      await learnerService.downloadDocument(String(lesson.id), fileName);
      toast.success('Download started');

      // Auto-complete the document lesson
      await learnerService.completeLesson(courseId, String(lesson.id));
      void loadCourse();
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download resource');
    }
  };

  const handleBackToLibrary = () => {
    if (onBack) {
      onBack();
    } else {
      router.push(previewMode ? '/admin/content' : '/learn/education');
    }
  };

  const handleContinueCourse = () => {
    if (!course) return;

    const courseModules = getModules();
    if (courseModules.length > 0) {
      const nextModule =
        courseModules.find((m) => !m.isCompleted) || courseModules[0];
      openModule(nextModule.id);
      return;
    }

    const videos = getVideoLessons();
    const nextVideo = videos.find((l: Lesson) => l.isUnlocked && !l.isCompleted) || videos[0];
    if (nextVideo) {
      handleLessonClick(nextVideo);
    } else {
      toast.warning('No modules or lessons are available yet');
    }
  };

  const handleStartCourse = () => {
    if (!course) return;

    const courseModules = getModules();
    if (courseModules.length > 0) {
      openModule(courseModules[0].id);
      return;
    }

    const videos = getVideoLessons();
    const firstUnlocked = videos.find((l: Lesson) => l.isUnlocked);
    if (firstUnlocked) {
      handleLessonClick(firstUnlocked);
    } else if (videos.length === 0) {
      toast.warning('No modules or lessons are available yet');
    } else {
      toast.warning('No lessons are currently unlocked');
    }
  };

  const handleStartModule = () => {
    const module = getSelectedModule();
    const videos = module?.videos || [];
    const documents = module?.documents || [];
    const next =
      videos.find((l) => l.isUnlocked && !l.isCompleted) ||
      videos.find((l) => l.isUnlocked) ||
      videos[0];
    if (next) {
      handleLessonClick(next);
      return;
    }
    if (documents.length > 0) {
      setModuleContentTab('documents');
      toast.info('This module has documents only — open one below.');
      return;
    }
    toast.warning('This module has no content yet');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds?: number | string) => {
    if (!seconds) return '0:00';
    if (typeof seconds === 'string' && (seconds.includes(':') || seconds.includes('h') || seconds.includes('m'))) {
      return seconds;
    }
    let secNum = Number(seconds);
    if (isNaN(secNum) || secNum <= 0) return typeof seconds === 'string' ? seconds : '0:00';

    if (secNum < 180) {
      secNum = secNum * 60;
    }

    const hours = Math.floor(secNum / 3600);
    const minutes = Math.floor((secNum % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    if (embedded) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Loading modules...</h3>
          <p className="text-sm text-gray-500">Fetching course details</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading course...</h3>
          <p className="text-gray-500">Fetching course details and lessons</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    if (embedded) {
      return (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <Lock className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Course</h2>
          <p className="text-gray-600 mb-4">{error || 'Unable to load course details'}</p>
          <button
            onClick={loadCourse}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Error Loading Course</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load course details'}</p>
          <div className="space-y-3">
            <button
              onClick={loadCourse}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={handleBackToLibrary}
              className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Back to Library
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = course.enrollment?.status === 'completed';
  const hasStarted = (course.enrollment?.progress || 0) > 0;
  const completedLessons = getCompletedLessons();
  const totalLessons = getTotalLessons();
  const calculatedProgress =
    course.enrollment?.progress ?? course.progress ?? calculateProgress();
  const videoLessons = getVideoLessons();
  const documentLessons = getDocumentLessons();
  const modules = getModules();
  const selectedModule = getSelectedModule();
  const moduleVideos = selectedModule?.videos || [];
  const moduleDocuments = selectedModule?.documents || [];

  const renderVideoCard = (lesson: any, index: number) => {
    const completed = Boolean(lesson.isCompleted);
    // Completed lessons are always playable for review — never treat as locked.
    const unlocked = completed || Boolean(lesson.isUnlocked);
    const status: 'completed' | 'unlocked' | 'locked' = completed
      ? 'completed'
      : unlocked
        ? 'unlocked'
        : 'locked';

    return (
    <div
      key={lesson.id}
      className={`bg-white rounded-2xl border-2 ${
        status !== 'locked'
          ? 'border-gray-200 hover:border-blue-200 hover:shadow-md'
          : 'border-gray-100 bg-gray-50'
      } transition-all duration-300`}
    >
      <button
        onClick={() => handleLessonClick({ ...lesson, isUnlocked: unlocked, isCompleted: completed })}
        disabled={status === 'locked'}
        className={`w-full p-5 text-left transition-all ${
          status !== 'locked' ? 'hover:bg-blue-50/30 cursor-pointer' : 'cursor-not-allowed'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
              status === 'completed'
                ? 'bg-green-100'
                : status === 'unlocked'
                  ? 'bg-blue-100'
                  : 'bg-gray-100'
            }`}
          >
            {status === 'completed' ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : status === 'locked' ? (
              <Lock className="w-6 h-6 text-gray-400" />
            ) : (
              <span className="text-lg font-bold text-blue-600">{index + 1}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className={`font-semibold text-lg ${status !== 'locked' ? 'text-gray-900' : 'text-gray-500'}`}>
                {lesson.title}
              </h3>
              {lesson.duration && (
                <span className="flex-shrink-0 text-sm text-gray-500 flex items-center gap-1 whitespace-nowrap">
                  <AccessTime className="w-4 h-4" />
                  {formatDuration(lesson.duration)}
                </span>
              )}
            </div>
            {lesson.moduleTitle && !selectedModule && (
              <p className="text-xs text-blue-600 font-medium mb-1">
                Module {lesson.moduleOrder ?? ''}: {lesson.moduleTitle}
              </p>
            )}
            {lesson.description && (
              <p className="text-gray-600 mb-3 line-clamp-2 text-sm">{lesson.description}</p>
            )}
            {lesson.progress && lesson.progress.percentage > 0 && status === 'unlocked' && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span className="font-medium">In Progress</span>
                  <span>{Math.floor(lesson.progress.percentage)}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${lesson.progress.percentage}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <VideoLibrary className="w-4 h-4" />
                Video Lesson
              </span>
              {status === 'completed' && (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </span>
              )}
              {status === 'locked' && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Lock className="w-4 h-4" />
                  Complete previous video to unlock
                </span>
              )}
            </div>
          </div>
          {status !== 'locked' && (
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                status === 'completed' ? 'bg-green-500' : 'bg-blue-600'
              }`}
            >
              <PlayArrow className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      </button>
    </div>
    );
  };

  const renderDocumentCard = (lesson: any) => (
    <div
      key={lesson.id}
      className="bg-white rounded-2xl border-2 border-gray-200 hover:border-amber-200 hover:shadow-md transition-all duration-300"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <Description className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">{lesson.title}</h3>
            {lesson.moduleTitle && !selectedModule && (
              <p className="text-xs text-blue-600 font-medium mb-1">
                Module {lesson.moduleOrder ?? ''}: {lesson.moduleTitle}
              </p>
            )}
            {lesson.description && (
              <p className="text-gray-600 mb-3 line-clamp-2 text-sm">{lesson.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="flex items-center gap-1 text-amber-700 font-medium">
                <Description className="w-4 h-4" />
                {lesson.type === 'image' ? 'Image' : 'Document / PDF'}
              </span>
              {lesson.isCompleted && (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Viewed
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-col gap-2">
            <button
              onClick={() => handleViewResource(lesson)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-all"
            >
              View
            </button>
            <button
              onClick={() => handleDownloadResource(lesson)}
              className="px-4 py-2 border border-amber-200 text-amber-700 rounded-lg font-medium hover:bg-amber-50 transition-all"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModuleCard = (module: CourseModule) => {
    const videoCount = module.videoCount ?? module.videos?.length ?? 0;
    const documentCount = module.documentCount ?? module.documents?.length ?? 0;
    const progress = module.progress ?? 0;

    return (
      <button
        key={module.id}
        type="button"
        onClick={() => openModule(module.id)}
        className="text-left bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-blue-300 w-full"
      >
        <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
          {module.thumbnailUrl ? (
            <img src={module.thumbnailUrl} alt={module.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Folder className="w-16 h-16 text-white opacity-80" />
            </div>
          )}
          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20">
              <div
                className={`h-full transition-all duration-500 ${
                  module.isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-green-400 to-emerald-500'
                }`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          )}
          {module.isCompleted && (
            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
              <CheckCircle className="w-3.5 h-3.5" /> Completed
            </div>
          )}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/60 text-white px-2 py-1 rounded-full text-xs">
              <VideoLibrary className="w-3 h-3" />
              <span>{videoCount}</span>
            </div>
            <div className="flex items-center gap-1 bg-black/60 text-white px-2 py-1 rounded-full text-xs">
              <Description className="w-3 h-3" />
              <span>{documentCount}</span>
            </div>
          </div>
        </div>
        <div className="p-5 md:p-6">
          <div className="text-xs font-semibold text-blue-600 mb-1">Module {module.order}</div>
          <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2">{module.title}</h3>
          {module.description ? (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{module.description}</p>
          ) : (
            <p className="text-sm text-gray-400 mb-4">No description</p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-4 pb-4 border-b border-gray-200">
            <span>{progress}% complete</span>
            <span>{videoCount + documentCount} lessons</span>
          </div>
          <div className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all">
            <PlayArrow className="w-5 h-5" />
            {(module.progress ?? 0) > 0 ? 'Continue Learning' : 'Start Learning'}
          </div>
        </div>
      </button>
    );
  };

  const renderModuleContentTabs = () => (
    <>
      <div className="mb-5 bg-slate-100 rounded-lg p-1 inline-flex gap-1">
        <button
          type="button"
          onClick={() => setModuleContentTab('videos')}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
            moduleContentTab === 'videos'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Videos ({moduleVideos.length})
        </button>
        <button
          type="button"
          onClick={() => setModuleContentTab('documents')}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
            moduleContentTab === 'documents'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Documents / PDFs ({moduleDocuments.length})
        </button>
      </div>

      {moduleContentTab === 'videos' && (
        <div className="space-y-4">
          {moduleVideos.length > 0 ? (
            moduleVideos.map((lesson, index) => renderVideoCard(lesson, index))
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <VideoLibrary className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No videos in this module</h3>
              <p className="text-sm text-gray-500">Videos will appear here when added.</p>
            </div>
          )}
        </div>
      )}

      {moduleContentTab === 'documents' && (
        <div className="space-y-4">
          {moduleDocuments.length > 0 ? (
            moduleDocuments.map((lesson) => renderDocumentCard(lesson))
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <Description className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No documents in this module</h3>
              <p className="text-sm text-gray-500">PDFs and resources will appear here when added.</p>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Learner: module detail page
  if (!previewMode && initialModuleId) {
    if (!selectedModule) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Module Not Found</h2>
            <p className="text-gray-600 mb-6">This module does not exist or is not available.</p>
            <button
              onClick={closeModule}
              className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Back to Modules
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            type="button"
            onClick={closeModule}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Modules
          </button>

          <div className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-lg p-5 md:p-6">
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-full sm:w-48 h-32 sm:h-36 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                {selectedModule.thumbnailUrl ? (
                  <img
                    src={selectedModule.thumbnailUrl}
                    alt={selectedModule.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)' }}
                  >
                    <Folder className="w-10 h-10 text-white/80" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-600 mb-1">
                  {course.title} · Module {selectedModule.order}
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{selectedModule.title}</h1>
                {selectedModule.description && (
                  <p className="text-gray-600 mb-4">{selectedModule.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs mb-5">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold">
                    {moduleVideos.length} videos
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-semibold">
                    {moduleDocuments.length} documents
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-md font-semibold ${
                      selectedModule.isCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    {selectedModule.progress ?? 0}% complete
                  </span>
                </div>
                {(moduleVideos.length > 0 || moduleDocuments.length > 0) && (
                  <button
                    type="button"
                    onClick={handleStartModule}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all"
                  >
                    <PlayArrow className="w-5 h-5" />
                    {selectedModule.isCompleted
                      ? 'Review Module'
                      : (selectedModule.progress ?? 0) > 0
                        ? 'Continue Module'
                        : 'Start Module'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {renderModuleContentTabs()}
        </div>
      </div>
    );
  }

  // Learner: course page — show module list (like education library)
  if (!previewMode) {
    const showModulesOnly = modulesOnly || enrolledCourseCount === 1;

    const pageWrapperClass = embedded ? '' : 'min-h-screen bg-gradient-to-b from-blue-50 to-white';
    const contentWrapperClass = embedded ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6';

    return (
      <div className={pageWrapperClass}>
        <div className={contentWrapperClass}>
          {!showModulesOnly && enrollmentChecked && (
            <button
              onClick={handleBackToLibrary}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back to Library
            </button>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-72 lg:w-80 shrink-0">
                {courseThumbnailSrc(course) ? (
                  <img
                    src={courseThumbnailSrc(course) ?? undefined}
                    alt={course.title}
                    className="w-full h-48 md:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-48 md:h-full min-h-[12rem] bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <VideoLibrary className="w-16 h-16 text-white opacity-80" />
                  </div>
                )}
              </div>
              <div className="flex-1 p-5 md:p-6">
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full mb-3">
                    <CheckCircle className="w-4 h-4" />
                    Course Completed
                  </span>
                )}
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
                {course.description && (
                  <p className="text-gray-600 mb-4 line-clamp-3">{course.description}</p>
                )}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="font-medium text-gray-700">Course Progress</span>
                    <span className="font-bold text-blue-600">{calculatedProgress}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${calculatedProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {completedLessons} of {totalLessons} lessons completed · {modules.length} modules
                  </p>
                </div>
                {course.instructor?.name && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <School className="w-4 h-4" />
                    <span>Instructor: {course.instructor.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Modules</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a module to view videos, PDFs, and start learning.
            </p>
          </div>

          {modules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {modules.map((module) => renderModuleCard(module))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
              <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No modules yet</h3>
              <p className="text-sm text-gray-500">Modules will appear here when the course is organized.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={handleBackToLibrary}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 transition-colors group"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Library
          </button>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Thumbnail */}
            <div className="lg:w-1/3">
              <div className="rounded-2xl overflow-hidden shadow-lg">
                {courseThumbnailSrc(course) ? (
                  <img
                    src={courseThumbnailSrc(course) ?? undefined}
                    alt={course.title}
                    className="w-full h-64 lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-64 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <VideoLibrary className="w-20 h-20 text-white opacity-80" />
                  </div>
                )}
              </div>
            </div>

            {/* Course Info */}
            <div className="lg:w-2/3">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  {isCompleted && (
                    <span className="flex items-center gap-1 text-sm font-semibold bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      <CheckCircle className="w-4 h-4" />
                      Course Completed
                    </span>
                  )}
                  <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {course.stats?.totalEnrollments || 0} enrolled
                  </span>
                </div>
                
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  {course.title}
                </h1>
                
                <p className="text-gray-600 text-lg mb-6">
                  {course.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Folder className="w-5 h-5 text-slate-600" />
                      <span className="text-sm font-medium text-slate-600">Modules</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{modules.length}</div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <VideoLibrary className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Videos</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{videoLessons.length}</div>
                  </div>
                  
                  <div className="bg-amber-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Description className="w-5 h-5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-600">Documents</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{documentLessons.length}</div>
                  </div>
                  
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Progress</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{calculatedProgress}%</div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mb-6">
                  {selectedModule ? (
                    <button
                      onClick={handleStartModule}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:-translate-y-0.5"
                    >
                      <PlayArrow className="w-6 h-6" />
                      {selectedModule.isCompleted
                        ? 'Review Module'
                        : (selectedModule.progress ?? 0) > 0
                          ? 'Continue Module'
                          : 'Start Module'}
                    </button>
                  ) : isCompleted ? (
                    <button
                      onClick={handleContinueCourse}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:-translate-y-0.5"
                    >
                      <Replay className="w-6 h-6" />
                      Review Course
                    </button>
                  ) : hasStarted ? (
                    <button
                      onClick={handleContinueCourse}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:-translate-y-0.5"
                    >
                      <PlayArrow className="w-6 h-6" />
                      Continue Learning
                    </button>
                  ) : (
                    <button
                      onClick={handleStartCourse}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:-translate-y-0.5"
                    >
                      <PlayArrow className="w-6 h-6" />
                      Start Course
                    </button>
                  )}
                </div>
              </div>

              {/* Instructor */}
              {course.instructor?.name && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <School className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Instructor</p>
                    <p className="font-semibold text-gray-900">{course.instructor.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('overview');
                  closeModule();
                }}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => {
                  setActiveTab('modules');
                  if (!selectedModuleId) closeModule();
                }}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'modules'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Modules ({modules.length})
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Overview</h2>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Your Progress</h3>
                <span className="font-bold text-blue-600">{calculatedProgress}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${calculatedProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>{completedLessons} of {totalLessons} lessons completed</span>
                <span>{totalLessons - completedLessons} remaining</span>
              </div>
            </div>

            {modules.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Modules</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('modules')}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    View all modules
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modules.slice(0, 3).map((module) => renderModuleCard(module))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <VideoLibrary className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Video Lessons</h3>
                    <p className="text-sm text-gray-600">{videoLessons.length} videos across modules</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm">
                  Open a module to watch its videos in order and track your progress.
                </p>
              </div>
              <div className="bg-amber-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center">
                    <Description className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Documents</h3>
                    <p className="text-sm text-gray-600">{documentLessons.length} PDFs and resources</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm">
                  Each module can include downloadable PDFs and reading materials.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'modules' && !selectedModule && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Course Modules</h2>
              <p className="text-sm text-gray-500 mt-1">
                Open a module to watch videos and view PDFs for that section.
              </p>
            </div>
            {modules.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {modules.map((module) => renderModuleCard(module))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No modules yet</h3>
                <p className="text-sm text-gray-500">Modules will appear here when the course is organized.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'modules' && selectedModule && (
          <div>
            <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-5">
              <button
                type="button"
                onClick={closeModule}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Modules
              </button>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-40 h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  {selectedModule.thumbnailUrl ? (
                    <img
                      src={selectedModule.thumbnailUrl}
                      alt={selectedModule.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)' }}
                    >
                      <Folder className="w-10 h-10 text-white/80" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-blue-600 mb-1">Module {selectedModule.order}</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedModule.title}</h2>
                  {selectedModule.description && (
                    <p className="text-sm text-gray-600 mb-3">{selectedModule.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs mb-4">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-semibold">
                      {moduleVideos.length} videos
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-semibold">
                      {moduleDocuments.length} documents
                    </span>
                    <span className={`px-2.5 py-1 rounded-md font-semibold ${
                      selectedModule.isCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'
                    }`}>
                      {selectedModule.progress ?? 0}% complete
                    </span>
                  </div>
                  {(moduleVideos.length > 0 || moduleDocuments.length > 0) && (
                    <button
                      type="button"
                      onClick={handleStartModule}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                    >
                      <PlayArrow className="w-5 h-5" />
                      {selectedModule.isCompleted
                        ? 'Review Module'
                        : (selectedModule.progress ?? 0) > 0
                          ? 'Continue Module'
                          : 'Start Module'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-5 bg-slate-100 rounded-lg p-1 inline-flex gap-1">
              <button
                type="button"
                onClick={() => setModuleContentTab('videos')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  moduleContentTab === 'videos'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Videos ({moduleVideos.length})
              </button>
              <button
                type="button"
                onClick={() => setModuleContentTab('documents')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  moduleContentTab === 'documents'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Documents / PDFs ({moduleDocuments.length})
              </button>
            </div>

            {moduleContentTab === 'videos' && (
              <div className="space-y-4">
                {moduleVideos.length > 0 ? (
                  moduleVideos.map((lesson, index) => renderVideoCard(lesson, index))
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <VideoLibrary className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No videos in this module</h3>
                    <p className="text-sm text-gray-500">Videos will appear here when added.</p>
                  </div>
                )}
              </div>
            )}

            {moduleContentTab === 'documents' && (
              <div className="space-y-4">
                {moduleDocuments.length > 0 ? (
                  moduleDocuments.map((lesson) => renderDocumentCard(lesson))
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                    <Description className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-1">No documents in this module</h3>
                    <p className="text-sm text-gray-500">PDFs and resources will appear here when added.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetailPage;
