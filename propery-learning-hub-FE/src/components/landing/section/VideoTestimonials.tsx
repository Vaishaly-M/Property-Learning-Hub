// components/sections/VideoTestimonials.tsx
"use client";

import {
  Play,
  Pause,
  X,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface Video {
  id: number;
  title: string;
  description: string;
  vimeoId: string;
  vimeoHash: string;
  customThumbnail?: string;
}

export default function VideoTestimonials() {
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<Record<number, boolean>>({});
  const [currentTime, setCurrentTime] = useState<Record<number, number>>({});
  const [duration, setDuration] = useState<Record<number, number>>({});
  const [playerReady, setPlayerReady] = useState<Record<number, boolean>>({});
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAllMobile, setShowAllMobile] = useState(false);
  const iframeRefs = useRef<Record<number, HTMLIFrameElement | null>>({});
  const playerRefs = useRef<Record<number, any>>({});
  const [modalPlayerReady, setModalPlayerReady] = useState(false);
  const modalIframeRef = useRef<HTMLIFrameElement | null>(null);
  const modalPlayerRef = useRef<any>(null);

  const videos: Video[] = [
    // Row 1 - Three videos
    {
      id: 1,
      title: "Bertand's Success Story",
      description: "From corporate to property investor",
      vimeoId: "1208429566",
      vimeoHash: "916e8a23fe",
      customThumbnail: "/landingImages/14.png",
    },
    {
      id: 2,
      title: "Michael's Journey",
      description: "Building a profitable portfolio",
      vimeoId: "1206193408",
      vimeoHash: "822d453ea5",
      customThumbnail: "/landingImages/16.png",
    },
    {
      id: 3,
      title: "Vlad's Transformation",
      description: "Scaling to multiple properties",
      vimeoId: "1206193464",
      vimeoHash: "2977106634",
      customThumbnail: "/landingImages/15.png",
    },
    // Row 2 - Three videos
    {
      id: 4,
      title: "Hussain's Property Journey",
      description: "Achieving financial freedom",
      vimeoId: "1206193406",
      vimeoHash: "48f7537232",
      customThumbnail: "/landingImages/11.png",
    },
    {
      id: 5,
      title: "Bogdan's Success Story",
      description: "Building a profitable property portfolio",
      vimeoId: "1206505484",
      vimeoHash: "b5d76e0dc3",
      customThumbnail: "/landingImages/12.png",
    },
    {
      id: 6,
      title: "Fathima's Story",
      description: "Creating a passive income stream",
      vimeoId: "1206193407",
      vimeoHash: "4ceecdb094",
      customThumbnail: "/landingImages/13.png",
    },
  ];

  // Function to get thumbnail URL
  const getThumbnail = (video: Video) => {
    if (video.customThumbnail) {
      return video.customThumbnail;
    }
    return `https://vumbnail.com/${video.vimeoId}.jpg`;
  };

  // Initialize Vimeo players
  useEffect(() => {
    const loadVimeoScript = () => {
      const script = document.createElement("script");
      script.src = "https://player.vimeo.com/api/player.js";
      script.async = true;
      script.onload = initializePlayers;
      document.body.appendChild(script);
    };

    const initializePlayers = () => {
      videos.forEach((video) => {
        if (iframeRefs.current[video.id] && !playerRefs.current[video.id]) {
          const Player = (window as any).Vimeo.Player;
          const player = new Player(iframeRefs.current[video.id]!);
          playerRefs.current[video.id] = player;

          player.on("play", () => {
            setIsPlaying((prev) => ({ ...prev, [video.id]: true }));
            setActiveVideoId(video.id);
          });

          player.on("pause", () => {
            setIsPlaying((prev) => ({ ...prev, [video.id]: false }));
          });

          player.on("timeupdate", (data: any) => {
            setCurrentTime((prev) => ({ ...prev, [video.id]: data.seconds }));
          });

          player.on("loaded", async () => {
            const totalDuration = await player.getDuration();
            setDuration((prev) => ({ ...prev, [video.id]: totalDuration }));
            setPlayerReady((prev) => ({ ...prev, [video.id]: true }));
          });

          player.on("ended", () => {
            setIsPlaying((prev) => ({ ...prev, [video.id]: false }));
          });
        }
      });
    };

    if (!(window as any).Vimeo) {
      const script = document.createElement("script");
      script.src = "https://player.vimeo.com/api/player.js";
      script.async = true;
      script.onload = initializePlayers;
      document.body.appendChild(script);
    } else {
      initializePlayers();
    }

    return () => {
      Object.values(playerRefs.current).forEach((player) => {
        if (player) {
          player.destroy();
        }
      });
      if (modalPlayerRef.current) {
        modalPlayerRef.current.destroy();
      }
    };
  }, []);

  // Initialize modal player when opened
  useEffect(() => {
    if (isModalOpen && selectedVideo && modalIframeRef.current) {
      const initModalPlayer = async () => {
        if (!(window as any).Vimeo) {
          const script = document.createElement("script");
          script.src = "https://player.vimeo.com/api/player.js";
          script.async = true;
          document.body.appendChild(script);
          script.onload = () => {
            const Player = (window as any).Vimeo.Player;
            modalPlayerRef.current = new Player(modalIframeRef.current!);
            modalPlayerRef.current.on("loaded", () => {
              setModalPlayerReady(true);
            });
            modalPlayerRef.current.play();
          };
        } else {
          const Player = (window as any).Vimeo.Player;
          modalPlayerRef.current = new Player(modalIframeRef.current!);
          modalPlayerRef.current.on("loaded", () => {
            setModalPlayerReady(true);
          });
          modalPlayerRef.current.play();
        }
      };
      initModalPlayer();
    }
  }, [isModalOpen, selectedVideo]);

  const handlePlayPause = async (videoId: number) => {
    const player = playerRefs.current[videoId];
    if (!player) return;

    if (isPlaying[videoId]) {
      await player.pause();
    } else {
      Object.keys(playerRefs.current).forEach((id) => {
        const idNum = Number(id);
        if (idNum !== videoId && isPlaying[idNum]) {
          playerRefs.current[idNum].pause();
        }
      });
      await player.play();
    }
  };

  const handleProgressClick = async (
    videoId: number,
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    const player = playerRefs.current[videoId];
    if (!player || !playerReady[videoId]) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const videoDuration = duration[videoId] || 0;
    const newTime = clickPosition * videoDuration;

    await player.setCurrentTime(newTime);
    setCurrentTime((prev) => ({ ...prev, [videoId]: newTime }));
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const openVideoModal = (video: Video) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeVideoModal = () => {
    setIsModalOpen(false);
    setSelectedVideo(null);
    setModalPlayerReady(false);
    if (modalPlayerRef.current) {
      modalPlayerRef.current.pause();
    }
    document.body.style.overflow = "unset";
  };

  // Render a video player
  const renderVideoPlayer = (video: Video, isFeatured: boolean = false) => {
    const progressPercentage =
      ((currentTime[video.id] || 0) / (duration[video.id] || 1)) * 100;
    const isVideoPlaying = isPlaying[video.id];
    const isReady = playerReady[video.id];

    return (
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-800 to-blue-950 aspect-video cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-300">
        {/* Video Player */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            activeVideoId === video.id ? "opacity-100" : "opacity-0"
          }`}
        >
          <iframe
            ref={(el) => {
              if (el) {
                iframeRefs.current[video.id] = el;
              }
            }}
            src={`https://player.vimeo.com/video/${video.vimeoId}?h=${video.vimeoHash}&api=1&background=0&autopause=1&loop=0&byline=0&title=0&portrait=0`}
            className="absolute top-0 left-0 w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={video.title}
          />

          {/* Custom Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 sm:p-3">
            <div className="mb-1.5 sm:mb-2">
              <div
                className="h-1 sm:h-1.5 w-full bg-gray-700/80 rounded-full overflow-hidden cursor-pointer group/progress"
                onClick={(e) => handleProgressClick(video.id, e)}
              >
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-200 relative group-hover/progress:bg-blue-300"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg"></div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    onClick={() => handlePlayPause(video.id)}
                    className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                    aria-label={isVideoPlaying ? "Pause video" : "Play video"}
                    disabled={!isReady}
                  >
                    {isVideoPlaying ? (
                      <Pause className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 ml-0.5" />
                    )}
                  </button>
                  <span className="text-[10px] sm:text-xs text-gray-300 font-medium">
                    {formatTime(currentTime[video.id] || 0)} /{" "}
                    {formatTime(duration[video.id] || 0)}
                  </span>
                </div>
                <button
                  onClick={() => openVideoModal(video)}
                  className="text-white/70 hover:text-white transition-colors"
                  aria-label="Full screen"
                >
                  <Maximize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Thumbnail Overlay */}
        <div
          className={`absolute inset-0 transition-all duration-300 ${
            activeVideoId === video.id
              ? "opacity-0 pointer-events-none"
              : "opacity-100"
          }`}
          onClick={() => openVideoModal(video)}
        >
          {video.customThumbnail ? (
            <Image
              src={video.customThumbnail}
              alt={video.title}
              fill
              className="object-cover"
              sizes={isFeatured ? "(max-width: 768px) 100vw, 50vw" : "100vw"}
              priority={isFeatured}
              style={{
                objectPosition: video.id === 1 ? "center top" : "center center",
              }}
            />
          ) : (
            <img
              src={getThumbnail(video)}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transform group-hover:scale-110 group-hover:bg-blue-600/80 transition-all duration-300 ${
                isFeatured
                  ? "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
                  : "w-16 h-16 sm:w-20 sm:h-20"
              }`}
            >
              <Play
                className={`ml-1 text-white ${
                  isFeatured
                    ? "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                    : "w-5 h-5 sm:w-6 sm:h-6"
                }`}
              />
            </div>
          </div>

          {/* Title and Description */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent ${
              isFeatured ? "p-4 sm:p-6" : "p-2 sm:p-3"
            }`}
          >
            <h3
              className={`font-bold text-white ${
                isFeatured
                  ? "text-base sm:text-sm md:text-2xl mb-1"
                  : "text-base sm:text-sm md:text-2xl mb-1"
              } line-clamp-1`}
            >
              {video.title}
            </h3>
            <p
              className={`text-white/80 ${
                isFeatured ? "text-[10px] sm:text-xs" : "text-[10px] sm:text-xs"
              } line-clamp-1`}
            >
              {video.description}
            </p>
          </div>

          <div
            className={`absolute top-2 right-2 ${
              isFeatured ? "sm:top-3 sm:right-3" : ""
            }`}
          >
            <span
              className={`inline-block bg-white/20 backdrop-blur-sm text-white rounded-full ${
                isFeatured
                  ? "text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1"
                  : "text-[10px] px-1.5 py-0.5"
              }`}
            >
              Watch
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="py-12 sm:py-16 bg-white dark:bg-gray-950 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs sm:text-sm uppercase tracking-wider">
            Success Stories
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mt-2 sm:mt-3 mb-2 sm:mb-4">
            How We Transform Lives
          </h2>
          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            See how Freedom Property Academy helps aspiring investors build
            profitable property portfolios from scratch
          </p>
        </div>

        {/*
          Responsive layout:
          - Mobile (< sm): 1 column. Only the first 3 videos show by default;
            the rest are revealed with the "View more" button.
          - Tablet (sm - lg): 2 columns x 3 rows (all 6 videos always visible).
          - Desktop (lg+): 3 columns x 2 rows (all 6 videos always visible).
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className={`group ${
                index >= 3 && !showAllMobile ? "hidden sm:block" : "block"
              }`}
            >
              {renderVideoPlayer(video, index === 0)}
              <div className="mt-2 sm:mt-3">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-1">
                  {video.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-0.5 line-clamp-1">
                  {video.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* View More / View Less - mobile only */}
        <div className="flex justify-center mt-6 sm:hidden">
          <button
            onClick={() => setShowAllMobile((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 font-semibold text-sm hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 dark:hover:text-white transition-colors duration-200"
          >
            {showAllMobile ? (
              <>
                View Less
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                View More
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Full Screen Modal */}
      {isModalOpen && selectedVideo && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300"
          onClick={(e) => e.target === e.currentTarget && closeVideoModal()}
        >
          <button
            onClick={closeVideoModal}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 hover:bg-black/70 rounded-full p-2 sm:p-3"
            aria-label="Close video"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10 max-w-[70%]">
            <h3 className="text-white text-base sm:text-2xl font-bold">
              {selectedVideo.title}
            </h3>
            <p className="text-gray-300 text-xs sm:text-sm">
              {selectedVideo.description}
            </p>
          </div>

          <div className="relative w-full max-w-6xl aspect-video">
            <iframe
              ref={(el) => {
                if (el) {
                  modalIframeRef.current = el;
                }
              }}
              src={`https://player.vimeo.com/video/${selectedVideo.vimeoId}?h=${selectedVideo.vimeoHash}&api=1&background=0&autopause=0&loop=0&byline=0&title=0&portrait=0&autoplay=1`}
              className="w-full h-full rounded-lg shadow-2xl"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={selectedVideo.title}
            />

            {!modalPlayerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="flex flex-col items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 border-3 sm:border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-white text-xs sm:text-sm font-medium">
                    Loading video...
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-xs sm:text-sm opacity-50">
            Press{" "}
            <kbd className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white/10 rounded text-white">
              ESC
            </kbd>{" "}
            to close
          </div>
        </div>
      )}
    </section>
  );
}
