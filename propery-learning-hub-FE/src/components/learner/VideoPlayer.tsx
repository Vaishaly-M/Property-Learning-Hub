// pages/VideoPlayer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  PlayCircle,
  Pause,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  Settings,
  SkipNext,
  SkipPrevious,
  ArrowBack,
  Bookmark,
  Share,
  Download,
  AccessTime,
  Person,
  School,
  Description,
  CheckCircle,
  ThumbUp,
  Message,
  Star,
  Lock
} from '@mui/icons-material';

// Create axios instance with auth token
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface Course {
  id: number;
  title: string;
  description: string;
  mentor: string;
  mentorPhoto: string;
  mentorBio: string;
  duration: string;
  lessons: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  level: string;
  thumbnail?: string;
  videoUrl?: string;
  published_at: string;
  views: number;
  relatedCourses?: Course[];
}

const VideoPlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Video player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Related content
  const [relatedCourses, setRelatedCourses] = useState<Course[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [notes, setNotes] = useState<string>('');
  const [bookmarked, setBookmarked] = useState(false);
  const [liked, setLiked] = useState(false);

  // Fetch course data
  const fetchCourseData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch course details
      const response = await apiClient.get(`/learner/content/${id}`);
      
      if (response.data.success) {
        const data = response.data.data;
        const courseData: Course = {
          id: data.id,
          title: data.title,
          description: data.description,
          mentor: data.mentor?.name || 'Unknown Mentor',
          mentorPhoto: data.mentor?.photo || 'https://i.pravatar.cc/150?img=1',
          mentorBio: data.mentor?.bio || 'Experienced real estate investor and mentor',
          duration: data.duration || '1h 30m',
          lessons: data.lessons || 1,
          difficulty: data.difficulty as 'Beginner' | 'Intermediate' | 'Advanced' || 'Beginner',
          category: data.category?.name || 'Foundation',
          level: data.difficulty?.toLowerCase() || 'beginner',
          thumbnail: data.thumbnail,
          videoUrl: data.video_url,
          published_at: data.published_at || new Date().toISOString(),
          views: data.views || 0
        };
        
        setCourse(courseData);
        
        // Record view
        await apiClient.post(`/learner/content/${id}/view`);
        
        // Fetch related courses
        fetchRelatedCourses(data.category?.id);
      }
    } catch (err: any) {
      console.error('Error fetching course:', err);
      setError(err.response?.data?.message || 'Failed to load course');
      
      // Fallback to static data
      setCourse(getStaticCourse());
      setRelatedCourses(getStaticRelatedCourses());
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedCourses = async (categoryId?: number) => {
    try {
      const params: any = { per_page: 4 };
      if (categoryId) params.category = categoryId;
      
      const response = await apiClient.get('/learner/content', { params });
      
      if (response.data.success) {
        const courses = response.data.data
          .filter((item: any) => item.id !== Number(id) && item.type === 'video')
          .slice(0, 4)
          .map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            mentor: item.mentor?.name || 'Unknown Mentor',
            mentorPhoto: item.mentor?.photo || 'https://i.pravatar.cc/150?img=1',
            duration: item.duration || '30m',
            lessons: item.lessons || 1,
            difficulty: item.difficulty as 'Beginner' | 'Intermediate' | 'Advanced' || 'Beginner',
            category: item.category?.name || 'Foundation',
            level: item.difficulty?.toLowerCase() || 'beginner',
            thumbnail: item.thumbnail,
            views: item.views || 0
          }));
        
        setRelatedCourses(courses);
      }
    } catch (err) {
      console.error('Error fetching related courses:', err);
      setRelatedCourses(getStaticRelatedCourses());
    }
  };

  // Static fallback data
  const getStaticCourse = (): Course => ({
    id: Number(id) || 1,
    title: 'Real Estate Fundamentals',
    description: 'Learn the basics of property investment from industry experts. This comprehensive course covers everything from market analysis to deal structuring.',
    mentor: 'John Smith',
    mentorPhoto: 'https://i.pravatar.cc/150?img=1',
    mentorBio: 'John has over 15 years of experience in real estate investment and has completed over 200 property transactions. He specializes in residential and commercial properties.',
    duration: '2h 30m',
    lessons: 12,
    difficulty: 'Beginner',
    category: 'Foundation',
    level: 'beginner',
    thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=450&fit=crop',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    published_at: '2024-01-15',
    views: 1245
  });

  const getStaticRelatedCourses = (): Course[] => [
    {
      id: 2,
      title: 'Advanced Deal Analysis',
      description: 'Master financial modeling and investment analysis',
      mentor: 'Sarah Johnson',
      mentorPhoto: 'https://i.pravatar.cc/150?img=5',
      mentorBio: '',
      duration: '4h 15m',
      lessons: 18,
      difficulty: 'Advanced',
      category: 'Analysis',
      level: 'advanced',
      thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop',
      videoUrl: '',
      published_at: '2024-01-10',
      views: 890
    },
    {
      id: 3,
      title: 'Property Management 101',
      description: 'Essential skills for managing rental properties',
      mentor: 'Mike Chen',
      mentorPhoto: 'https://i.pravatar.cc/150?img=8',
      mentorBio: '',
      duration: '1h 45m',
      lessons: 8,
      difficulty: 'Intermediate',
      category: 'Management',
      level: 'intermediate',
      thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w-400&h=225&fit=crop',
      videoUrl: '',
      published_at: '2024-01-05',
      views: 1560
    },
    {
      id: 4,
      title: 'Commercial Real Estate',
      description: 'Dive into commercial property investment',
      mentor: 'Robert Davis',
      mentorPhoto: 'https://i.pravatar.cc/150?img=12',
      mentorBio: '',
      duration: '3h 20m',
      lessons: 15,
      difficulty: 'Advanced',
      category: 'Commercial',
      level: 'advanced',
      thumbnail: 'https://images.unsplash.com/photo-1487956382158-bb926046304a?w=400&h=225&fit=crop',
      videoUrl: '',
      published_at: '2024-01-20',
      views: 670
    },
    {
      id: 5,
      title: 'Real Estate Tax Strategies',
      description: 'Optimize your tax situation as an investor',
      mentor: 'Lisa Wang',
      mentorPhoto: 'https://i.pravatar.cc/150?img=15',
      mentorBio: '',
      duration: '2h 10m',
      lessons: 10,
      difficulty: 'Intermediate',
      category: 'Tax',
      level: 'intermediate',
      thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop',
      videoUrl: '',
      published_at: '2024-01-25',
      views: 920
    }
  ];

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id]);

  // Video player controls
  const togglePlay = () => {
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
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBookmark = async () => {
    setBookmarked(!bookmarked);
    if (course) {
      try {
        await apiClient.post(`/learner/content/${course.id}/favorite`);
      } catch (err) {
        console.error('Error bookmarking:', err);
      }
    }
  };

  const handleLike = async () => {
    setLiked(!liked);
    if (course) {
      try {
        await apiClient.post(`/learner/content/${course.id}/like`);
      } catch (err) {
        console.error('Error liking:', err);
      }
    }
  };

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    document.addEventListener('mousemove', resetTimer);
    document.addEventListener('keydown', resetTimer);

    return () => {
      document.removeEventListener('mousemove', resetTimer);
      document.removeEventListener('keydown', resetTimer);
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-white mt-4">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Video</h2>
          <p className="text-gray-300 mb-6">{error || 'Course not found'}</p>
          <button
            onClick={() => navigate('/education')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Back to Education Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => navigate('/education')}
          className="flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-gray-700/90 transition"
        >
          <ArrowBack className="w-5 h-5" />
          Back to Library
        </button>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Video Player */}
          <div className="lg:w-2/3">
            {/* Video Container */}
            <div className="relative bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                src={course.videoUrl}
                className="w-full h-auto max-h-[70vh]"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={togglePlay}
              />
              
              {/* Video Controls Overlay */}
              {showControls && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300">
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                    />
                    <div className="flex justify-between text-sm text-gray-300 mt-1">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                  
                  {/* Control Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={togglePlay}
                        className="p-2 hover:bg-gray-700/50 rounded-full transition"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6" />
                        ) : (
                          <PlayCircle className="w-6 h-6" />
                        )}
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleMute}
                          className="p-2 hover:bg-gray-700/50 rounded-full transition"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeOff className="w-5 h-5" />
                          ) : (
                            <VolumeUp className="w-5 h-5" />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                        />
                      </div>
                      
                      <div className="relative">
                        <button
                          onClick={() => setShowSettings(!showSettings)}
                          className="p-2 hover:bg-gray-700/50 rounded-full transition"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                        
                        {showSettings && (
                          <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-lg shadow-xl p-3 min-w-[120px]">
                            <div className="space-y-2">
                              <p className="text-sm text-gray-400 mb-2">Playback Speed</p>
                              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                <button
                                  key={rate}
                                  onClick={() => changePlaybackRate(rate)}
                                  className={`block w-full text-left px-3 py-1 rounded text-sm hover:bg-gray-700 ${playbackRate === rate ? 'text-blue-400' : 'text-gray-300'}`}
                                >
                                  {rate}x
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleBookmark}
                        className={`p-2 hover:bg-gray-700/50 rounded-full transition ${bookmarked ? 'text-yellow-500' : ''}`}
                      >
                        <Bookmark className="w-5 h-5" />
                      </button>
                      
                      <button className="p-2 hover:bg-gray-700/50 rounded-full transition">
                        <Share className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-gray-700/50 rounded-full transition"
                      >
                        <Fullscreen className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Course Info */}
            <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
              <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-4">
                <span className="flex items-center gap-1">
                  <AccessTime className="w-4 h-4" />
                  {course.duration}
                </span>
                <span>{course.lessons} lesson{course.lessons !== 1 ? 's' : ''}</span>
                <span>{course.views.toLocaleString()} views</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  course.difficulty === 'Beginner' ? 'bg-green-900/30 text-green-400' :
                  course.difficulty === 'Intermediate' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-red-900/30 text-red-400'
                }`}>
                  {course.difficulty}
                </span>
              </div>
              
              <p className="text-gray-300 mb-6">{course.description}</p>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    liked ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <ThumbUp className="w-5 h-5" />
                  Like
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
                  <Message className="w-5 h-5" />
                  Add Comment
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
                  <Download className="w-5 h-5" />
                  Download Resources
                </button>
              </div>
            </div>
            
            {/* Mentor Info */}
            <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-start gap-4">
                <img
                  src={course.mentorPhoto}
                  alt={course.mentor}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="text-xl font-bold mb-1">Instructor: {course.mentor}</h3>
                  <p className="text-gray-300 mb-3">{course.mentorBio}</p>
                  <button className="text-blue-400 hover:text-blue-300 transition">
                    View Profile →
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:w-1/3">
            {/* Course Details */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <School className="w-5 h-5" />
                Course Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Category:</span>
                  <span className="font-medium">{course.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Level:</span>
                  <span className="font-medium capitalize">{course.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Published:</span>
                  <span className="font-medium">{new Date(course.published_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              {/* Transcript Toggle */}
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full mt-6 flex items-center justify-between px-4 py-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition"
              >
                <span className="flex items-center gap-2">
                  <Description className="w-5 h-5" />
                  Video Transcript
                </span>
                <span>{showTranscript ? 'Hide' : 'Show'}</span>
              </button>
              
              {/* Transcript Content */}
              {showTranscript && (
                <div className="mt-4 p-4 bg-gray-900/50 rounded-lg max-h-60 overflow-y-auto">
                  <p className="text-sm text-gray-300">
                    Welcome to this course on real estate fundamentals. In this lesson, we'll cover the basics of property investment...
                    {/* Add more transcript content here */}
                  </p>
                </div>
              )}
              
              {/* Notes Section */}
              <div className="mt-6">
                <h4 className="text-lg font-bold mb-3">My Notes</h4>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Take notes while watching..."
                  className="w-full h-32 bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-500"
                />
                <button className="mt-2 w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg transition">
                  Save Notes
                </button>
              </div>
            </div>
            
            {/* Related Courses */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">Related Courses</h3>
              <div className="space-y-4">
                {relatedCourses.map((relatedCourse) => (
                  <div
                    key={relatedCourse.id}
                    className="flex gap-3 p-3 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 transition cursor-pointer"
                    onClick={() => navigate(`/education/video/${relatedCourse.id}`)}
                  >
                    <div className="relative w-20 h-12 rounded overflow-hidden flex-shrink-0">
                      {relatedCourse.thumbnail ? (
                        <img
                          src={relatedCourse.thumbnail}
                          alt={relatedCourse.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-900/30 to-blue-700/30 flex items-center justify-center">
                          <PlayCircle className="w-6 h-6 text-blue-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1">{relatedCourse.title}</h4>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{relatedCourse.mentor}</span>
                        <span>{relatedCourse.duration}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/education')}
                className="w-full mt-4 text-center text-blue-400 hover:text-blue-300 transition"
              >
                View All Courses →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;