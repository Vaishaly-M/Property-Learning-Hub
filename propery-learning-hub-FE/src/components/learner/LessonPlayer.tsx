'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PlayArrow,
  CheckCircle,
  Lock,
  ChevronLeft,
  Download,
  Menu as MenuIcon,
  Close,
  EmojiEvents,
  SkipNext,
  SkipPrevious,
  Pause,
  PlayCircle,
  AccessTime,
  Speed,
  Fullscreen,
  FullscreenExit,
  VolumeUp,
  VolumeOff,
  BugReport,
} from '@mui/icons-material';
import { learnerService } from '../../services/learnerService';
import { getVideoStreamUrl, resolveStorageUrl, isDirectS3PlaybackUrl } from '../../utils/mediaUrl';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface LessonPlayerProps {
  courseId: string;
  lessonId: string;
  previewMode?: boolean;
}

const LessonPlayer: React.FC<LessonPlayerProps> = ({ courseId, lessonId, previewMode = false }) => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressReportRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [course, setCourse] = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [videoLessons, setVideoLessons] = useState<any[]>([]); // Filtered videos only
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const blockRestrictedAction = (event: React.SyntheticEvent) => {
    event.preventDefault();
  };

  const handleSecurityKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    const isSaveAttempt = (event.ctrlKey || event.metaKey) && key === 's';
    const isPrintAttempt = (event.ctrlKey || event.metaKey) && key === 'p';
    const isPrintScreen = event.key === 'PrintScreen';

    if (isSaveAttempt || isPrintAttempt || isPrintScreen) {
      event.preventDefault();
    }
  };

  const lessonPosterUrl = (lesson: { thumbnailUrl?: string; thumbnail?: string }) => {
    const thumb = lesson.thumbnailUrl || resolveStorageUrl(lesson.thumbnail) || undefined;
    return thumb || undefined;
  };

  useEffect(() => {
    console.log('=== LESSON PLAYER MOUNTED ===');
    console.log('Course ID:', courseId);
    console.log('Lesson ID:', lessonId);
    loadCourseAndLesson();
    return () => {
      if (videoRef.current && videoRef.current.currentTime > 0) {
        const time = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        void learnerService.updateLessonProgress(courseId, lessonId, {
          watch_time: Math.floor(time),
          total_duration: dur > 0 ? Math.floor(dur) : undefined,
        });
      }
      stopProgressTracking();
    };
  }, [courseId, lessonId]);

  const loadCourseAndLesson = async () => {
    console.log('=== STARTING LOAD COURSE AND LESSON ===');
    setIsLoading(true);
    setError(null);
    setVideoSrc(null);
    setVideoReady(false);
    
    try {
      console.log('Fetching course details for courseId:', courseId);
      const courseResponse = await learnerService.getCourseDetails(courseId);
      
      console.log('=== COURSE RESPONSE ===');
      console.log('Success:', courseResponse.success);
      console.log('Full Response:', JSON.stringify(courseResponse, null, 2));
      
      if (courseResponse.success && courseResponse.data) {
        const courseData = courseResponse.data;
        const modules = Array.isArray(courseData.modules) ? courseData.modules : [];

        // Prefer module-nested videos so we keep module titles; fall back to flat list
        let videos: any[] = [];
        if (modules.length > 0) {
          videos = modules
            .slice()
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .flatMap((m: any) => {
              const moduleVideos = Array.isArray(m.videos)
                ? m.videos
                : Array.isArray(m.contents)
                  ? m.contents.filter((c: any) => c.type === 'video')
                  : [];
              return moduleVideos.map((video: any) => ({
                ...video,
                moduleId: m.id,
                moduleTitle: m.title,
                moduleOrder: m.order,
              }));
            });
        }
        if (videos.length === 0) {
          videos = Array.isArray(courseData.videos) ? courseData.videos : [];
        }

        const normalizedVideos = videos.map((video: any) => {
          const isCompleted = previewMode
            ? false
            : Boolean(video.isCompleted ?? video.is_completed);
          const isUnlocked = previewMode
            ? true
            : isCompleted || Boolean(video.isUnlocked ?? video.is_unlocked);

          return {
          ...video,
          type: 'video',
          isUnlocked,
          isCompleted,
          fileUrl: resolveStorageUrl(video.video_url) ?? undefined,
          thumbnailUrl:
            video.thumbnailUrl || video.thumbnail
              ? (resolveStorageUrl(video.thumbnailUrl || video.thumbnail) ?? (video.thumbnailUrl || video.thumbnail))
              : undefined,
          moduleId: video.moduleId ?? video.module_id,
          moduleTitle: video.moduleTitle,
          moduleOrder: video.moduleOrder,
        };
        });

        const allLessons = [...normalizedVideos].sort((a, b) => {
          const moduleDiff = (a.moduleOrder || 0) - (b.moduleOrder || 0);
          if (moduleDiff !== 0) return moduleDiff;
          return (a.order || 0) - (b.order || 0);
        });

        setAllLessons(allLessons);
        setVideoLessons(allLessons);
        setCourse({ ...courseData, lessons: allLessons, modules });

        const lesson = allLessons.find((l: any) => l.id.toString() === lessonId.toString());

        if (lesson) {
          const playbackUrl = await resolveLessonVideoUrl(lesson, lessonId);
          if (!playbackUrl) {
            setError('Unable to load video file. Please try again.');
            toast.error('Unable to load video file. Please try again.');
            return;
          }

          setVideoSrc(playbackUrl);
          setCurrentLesson({ ...lesson, fileUrl: playbackUrl });
          setHasMarkedComplete(previewMode ? false : (lesson.isCompleted || false));

          setDebugInfo({
            courseId,
            lessonId,
            totalVideoLessons: allLessons.length,
            lessonFound: true,
            lessonType: lesson.type,
            lessonTitle: lesson.title,
            moduleTitle: lesson.moduleTitle,
            videoUrl: lesson.video_url,
            fileUrl: playbackUrl,
          });

          if (!previewMode) {
            try {
              const viewKey = `content_view_recorded:${lessonId}`;
              if (!sessionStorage.getItem(viewKey)) {
                await learnerService.recordView(lessonId);
                sessionStorage.setItem(viewKey, '1');
              }
            } catch (error) {
              console.error('Error recording view:', error);
            }
          }
        } else {
          const errorMsg = `Video lesson ${lessonId} not found in course`;
          setError(errorMsg);
          setDebugInfo({
            courseId,
            lessonId,
            totalVideoLessons: allLessons.length,
            lessonFound: false,
            availableVideoLessonIds: allLessons.map((l: any) => l.id),
          });
          toast.error('Video lesson not found');
          setTimeout(() => {
            router.push(`/learn/courses/${courseId}`);
          }, 3000);
        }
      } else {
        const errorMsg = courseResponse.message || 'Failed to load course';
        console.error('Course load failed:', errorMsg);
        setError(errorMsg);
        toast.error(errorMsg);
        
        setDebugInfo({
          error: errorMsg,
          response: courseResponse,
        });
      }
    } catch (error: any) {
      console.error('=== ERROR IN LOAD COURSE AND LESSON ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      const errorMessage = error.message || 'Failed to load lesson';
      setError(errorMessage);
      toast.error(errorMessage);
      
      setDebugInfo({
        error: errorMessage,
        errorObject: error.toString(),
        stack: error.stack,
      });
    } finally {
      console.log('=== LOAD COMPLETE ===');
      setIsLoading(false);
    }
  };

  const resolveLessonVideoUrl = async (lesson: any, id: string): Promise<string | null> => {
    try {
      const urlResponse = await learnerService.getVideoUrl(id);
      if (urlResponse.success && urlResponse.data?.video_url) {
        return urlResponse.data.video_url;
      }
    } catch (error) {
      console.error('Error resolving video URL from API:', error);
    }

    const streamUrl = getVideoStreamUrl(id);
    if (streamUrl) {
      return streamUrl;
    }

    const fromLesson =
      resolveStorageUrl(lesson.file_path ?? lesson.video_url ?? lesson.videoUrl) ?? null;
    if (fromLesson && !fromLesson.includes('/media/inline')) {
      return fromLesson;
    }

    return null;
  };

  const startProgressTracking = () => {
    stopProgressTracking();
    
    if (currentLesson?.type !== 'video') return;
    
    progressIntervalRef.current = setInterval(async () => {
      if (videoRef.current && currentLesson && !hasMarkedComplete) {
        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        
        if (duration > 0) {
          const percentage = (currentTime / duration) * 100;
          setVideoProgress(percentage);

          if (!previewMode) {
            if (Math.floor(currentTime) % 30 === 0 && Math.floor(currentTime) !== lastProgressReportRef.current) {
              lastProgressReportRef.current = Math.floor(currentTime);
              await updateLessonProgress(Math.floor(currentTime), Math.floor(duration));
            }

            if (percentage >= 90 && !hasMarkedComplete) {
              handleCompleteLesson(true);
            }
          }
        }
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const updateLessonProgress = async (watchTime: number, totalDuration: number) => {
    if (!currentLesson || hasMarkedComplete) return;

    try {
      await learnerService.updateLessonProgress(courseId, lessonId, {
        watch_time: watchTime,
        total_duration: totalDuration,
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleCompleteLesson = async (autoCompleted: boolean = false) => {
    if (!currentLesson || hasMarkedComplete) return;

    if (previewMode) {
      setHasMarkedComplete(true);
      stopProgressTracking();
      if (autoCompleted) {
        setShowCompletionModal(true);
      }
      toast.success('Lesson marked as complete (preview only)!');
      return;
    }

    try {
      const response = await learnerService.completeLesson(courseId, lessonId);
      if (!response.success) {
        throw new Error(response.message || 'Failed to complete lesson');
      }

      setHasMarkedComplete(true);
      stopProgressTracking();
      
      if (autoCompleted) {
        setShowCompletionModal(true);
      }
      
      toast.success('Lesson marked as complete!');
      
      const courseResponse = await learnerService.getCourseDetails(courseId);
      if (courseResponse.success && courseResponse.data) {
        const courseData = courseResponse.data;
        const videos = Array.isArray(courseData.videos) ? courseData.videos : [];
        
        const allLessons = [...videos]
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setCourse({ ...courseData, lessons: allLessons });
        setAllLessons(allLessons);
        setVideoLessons(allLessons);
      }
    } catch (error: any) {
      console.error('Error completing lesson:', error);
      toast.error(error.message || 'Failed to complete lesson');
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.volume = volume;
      setVideoReady(true);
    }
    startProgressTracking();
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (!hasMarkedComplete) {
      handleCompleteLesson(true);
    }
  };

  const getNavigationInfo = () => {
    const currentIndex = videoLessons.findIndex((l: any) => l.id.toString() === lessonId.toString());
    
    return {
      previous: currentIndex > 0 ? videoLessons[currentIndex - 1] : null,
      next: currentIndex < videoLessons.length - 1 ? videoLessons[currentIndex + 1] : null,
    };
  };

  const handleNextLesson = () => {
    const nav = getNavigationInfo();
    if (nav.next) {
      setShowCompletionModal(false);
      if (previewMode) {
        router.push(`/admin/content/${courseId}/preview/lessons/${nav.next.id}`);
      } else {
        router.push(`/learn/courses/${courseId}/lessons/${nav.next.id}`);
      }
    } else {
      if (previewMode) {
        router.push(`/admin/content/${courseId}/preview`);
      } else {
        router.push(`/learn/courses/${courseId}`);
      }
    }
  };

  const handlePreviousLesson = () => {
    const nav = getNavigationInfo();
    if (nav.previous) {
      if (previewMode) {
        router.push(`/admin/content/${courseId}/preview/lessons/${nav.previous.id}`);
      } else {
        router.push(`/learn/courses/${courseId}/lessons/${nav.previous.id}`);
      }
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration > 0) {
        setVideoProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-2xl px-4">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-800 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading video lesson...</h3>
          <p className="text-sm text-gray-600 mb-4">
            Course: {courseId} | Lesson: {lessonId}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !currentLesson) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl p-8 text-center border border-blue-200 shadow-lg">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-blue-800" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Video Lesson</h2>
            <p className="text-gray-600 mb-6">{error || 'Unable to load video lesson'}</p>
           
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={loadCourseAndLesson}
                className="flex-1 px-6 py-3 bg-blue-800 text-white rounded-xl font-semibold hover:bg-blue-900 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push(previewMode ? `/admin/content/${courseId}/preview` : `/learn/courses/${courseId}`)}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Back to Course
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navigation = getNavigationInfo();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(previewMode ? `/admin/content/${courseId}/preview` : `/learn/courses/${courseId}`)}
              className="p-2 text-gray-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 line-clamp-1">{course?.title || 'Course'}</h1>
              <p className="text-sm text-gray-600">
                {currentLesson.moduleTitle
                  ? `Module ${currentLesson.moduleOrder ?? ''}: ${currentLesson.moduleTitle}`
                  : 'Video lesson'}
                {' · '}
                {videoLessons.findIndex((l: any) => String(l.id) === String(lessonId)) + 1} of {videoLessons.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 text-gray-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg lg:hidden"
            >
              {showSidebar ? <Close className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-blue-800 to-blue-600 transition-all duration-500"
            style={{ width: `${course?.enrollment?.progress || course?.progress || 0}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Video Player Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Player */}
          <div
            ref={containerRef}
            className="bg-gray-900 relative group"
            onContextMenu={blockRestrictedAction}
            onDragStart={blockRestrictedAction}
            onKeyDown={handleSecurityKeyDown}
            tabIndex={0}
          >
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <video
              key={videoSrc}
              ref={videoRef}
              src={videoSrc ?? undefined}
              poster={videoReady ? undefined : lessonPosterUrl(currentLesson)}
              className="w-full aspect-video bg-black"
              onLoadedMetadata={handleVideoLoaded}
              onCanPlay={() => setVideoReady(true)}
              onEnded={handleVideoEnded}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => {
                setVideoReady(false);
                const msg = 'Unable to load video file. Please try again.';
                setError(msg);
                toast.error(msg);
              }}
              onContextMenu={blockRestrictedAction}
              playsInline
              controls
              preload="auto"
            />
            {videoReady && !isPlaying && (
              <button
                type="button"
                onClick={handlePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Play video"
              >
                <span className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <PlayArrow className="w-10 h-10 text-blue-900" />
                </span>
              </button>
            )}
          </div>

          {/* Lesson Info */}
          <div className="flex-1 bg-white p-4 sm:p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
                   {/* Navigation */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handlePreviousLesson}
                  disabled={!navigation.previous}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                >
                  <SkipPrevious className="w-5 h-5" />
                  Previous Video
                </button>

                {!hasMarkedComplete && (
                  <button
                    onClick={() => handleCompleteLesson(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-800 to-blue-700 rounded-lg hover:from-blue-900 hover:to-blue-800 transition-all flex-1"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Mark as Complete
                  </button>
                )}

                <button
                  onClick={handleNextLesson}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-800 to-blue-700 rounded-lg hover:from-blue-900 hover:to-blue-800 transition-all flex-1"
                >
                  {navigation.next ? 'Next Video' : 'Back to Course'}
                  <SkipNext className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentLesson.title}</h2>
                <p className="text-gray-600">{currentLesson.description}</p>
              </div>

         
            </div>
          </div>
        </div>

      {/* Sidebar - Videos grouped by module, starting from current video */}
<div className={`w-full lg:w-80 bg-white border-l border-gray-200 overflow-auto ${showSidebar ? '' : 'hidden lg:block'}`}>
  <div className="p-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Course Videos</h3>
      <span className="text-sm text-blue-800 bg-blue-50 px-3 py-1 rounded-full">
        {videoLessons.length} videos
      </span>
    </div>
    <div className="space-y-4">
      {(() => {
        // Find current lesson index
        const currentIndex = videoLessons.findIndex((l: any) => l.id.toString() === lessonId.toString());
        
        // Reorder videos: current video first, then next videos, then previous videos
        const orderedVideos = [...videoLessons];
        if (currentIndex > 0) {
          // Move current and subsequent videos to the front
          const currentAndNext = orderedVideos.slice(currentIndex);
          const previous = orderedVideos.slice(0, currentIndex);
          orderedVideos.splice(0, orderedVideos.length, ...currentAndNext, ...previous);
        }
        
        // Group the reordered videos by module
        const groups: Array<{ key: string; title: string; order: number; lessons: any[] }> = [];
        orderedVideos.forEach((lesson: any) => {
          const key = String(lesson.moduleId ?? 'general');
          let group = groups.find((g) => g.key === key);
          if (!group) {
            group = {
              key,
              title: lesson.moduleTitle || 'Course Videos',
              order: lesson.moduleOrder ?? 999,
              lessons: [],
            };
            groups.push(group);
          }
          group.lessons.push(lesson);
        });
        groups.sort((a, b) => a.order - b.order);

        // Reorder groups to put the current group first
        const currentGroupIndex = groups.findIndex(g => 
          g.lessons.some((l: any) => l.id.toString() === lessonId.toString())
        );
        
        if (currentGroupIndex > 0) {
          const currentGroup = groups.splice(currentGroupIndex, 1)[0];
          groups.unshift(currentGroup);
        }

        let globalIndex = 0;
        return groups.map((group) => (
          <div key={group.key}>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 px-1">
              {group.order < 999 ? `Module ${group.order}: ${group.title}` : group.title}
            </div>
            <div className="space-y-2">
              {group.lessons.map((lesson: any) => {
                globalIndex += 1;
                const index = globalIndex;
                const isActive = lesson.id.toString() === lessonId.toString();
                const isCurrentVideo = isActive;
                
                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      if (previewMode) {
                        router.push(`/admin/content/${courseId}/preview/lessons/${lesson.id}`);
                      } else {
                        router.push(`/learn/courses/${courseId}/lessons/${lesson.id}`);
                      }
                    }}
                    className={`w-full p-3 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-800 to-blue-700 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-800 border border-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isCurrentVideo ? '▶' : index}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <PlayCircle className="w-4 h-4 flex-shrink-0" />
                          <p className="text-sm font-medium truncate">{lesson.title}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {isCurrentVideo && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isActive ? 'bg-white/20 text-white' : 'text-blue-600 bg-blue-50'
                              }`}
                            >
                              <PlayArrow className="w-3 h-3" />
                              Playing Now
                            </span>
                          )}
                          {lesson.isCompleted && !isCurrentVideo ? (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isActive ? 'bg-white/20 text-white' : 'text-green-600 bg-green-50'
                              }`}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Completed
                            </span>
                          ) : null}
                          {!lesson.isCompleted && !isCurrentVideo && (
                            <span className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                              Not started
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ));
      })()}
    </div>
  </div>
</div>
      </div>
    </div>
  );
};

export default LessonPlayer;