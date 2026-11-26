"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, User } from "lucide-react";
import Image from "next/image";

declare global {
  interface Window {
    Vimeo?: any;
  }
}

export default function MentorshipGivingBack() {
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<Record<number, boolean>>({});
  const [currentTime, setCurrentTime] = useState<Record<number, number>>({});
  const [duration, setDuration] = useState<Record<number, number>>({});
  const [playerReady, setPlayerReady] = useState<Record<number, boolean>>({});
  const [thumbnailsLoaded, setThumbnailsLoaded] = useState<
    Record<number, boolean>
  >({});
  const iframeRefs = useRef<Record<number, HTMLIFrameElement | null>>({});
  const playerRefs = useRef<Record<number, any>>({});

  const vimeoVideos = [
    {
      id: 1,
      vimeoId: "1161163972",
      title: "Home Staging Transformation",
      description: "From empty to perfectly staged",
      thumbnail: "/campaign/Thumbnail7.png",
    },
    {
      id: 2,
      vimeoId: "1161122529",
      title: "Daily Grind",
      description: "Productivity & hard work",
      thumbnail: "/campaign/Thumbnail6.png",
    },
  ];

  // Get thumbnail URL - use custom thumbnail if available, otherwise use Vimeo thumbnail
  const getThumbnailUrl = (video: (typeof vimeoVideos)[0]) => {
    return video.thumbnail || `https://vumbnail.com/${video.vimeoId}.jpg`;
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
      vimeoVideos.forEach((video) => {
        if (iframeRefs.current[video.id] && !playerRefs.current[video.id]) {
          const Player = window.Vimeo.Player;
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

    if (!window.Vimeo) {
      loadVimeoScript();
    } else {
      initializePlayers();
    }

    return () => {
      // Cleanup players
      Object.values(playerRefs.current).forEach((player) => {
        if (player) {
          player.destroy();
        }
      });
    };
  }, []);

  const handlePlayPause = async (videoId: number) => {
    const player = playerRefs.current[videoId];
    if (!player) return;

    if (isPlaying[videoId]) {
      await player.pause();
    } else {
      // Pause any other playing video
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

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-10 shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-36 h-36 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-full -translate-x-16 -translate-y-16 opacity-60"></div>
      <div className="absolute bottom-0 right-0 w-44 h-44 bg-gradient-to-tl from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-full translate-x-22 translate-y-22 opacity-60"></div>

      {/* Corner Accents */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-blue-300 dark:border-blue-700 rounded-tl-3xl"></div>
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-green-300 dark:border-green-700 rounded-br-3xl"></div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-500 dark:to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <div className="text-white text-3xl font-bold">
              <User size={32} />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Mentorship & Giving Back
          </h1>
          <div className="flex items-center space-x-4 mt-3">
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-300 dark:from-blue-400 dark:to-blue-600 rounded-full"></div>
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              15+ years of experience shared
            </div>
            <div className="w-12 h-1 bg-gradient-to-l from-green-500 to-green-300 dark:from-green-400 dark:to-green-600 rounded-full"></div>
          </div>
        </div>

        {/* Portrait Videos Grid */}
        <div className="mb-10">
          <div className="backdrop-blur-xl bg-gradient-to-br from-blue-400/20 via-green-400/10 to-blue-400/5 dark:from-blue-400/10 dark:via-green-400/5 dark:to-blue-400/5 p-4 md:p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {vimeoVideos.map((video) => {
                const progressPercentage =
                  ((currentTime[video.id] || 0) / (duration[video.id] || 1)) *
                  100;
                const isVideoPlaying = isPlaying[video.id];
                const isReady = playerReady[video.id];

                return (
                  <div key={video.id} className="group">
                    {/* Portrait Video Container */}
                    <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-900/50 to-blue-950/50 dark:from-blue-900/30 dark:to-blue-950/30 backdrop-blur-sm border border-white/20 dark:border-white/10 aspect-[9/16] max-w-sm mx-auto">
                      {/* Video Player */}
                      <div
                        className={`absolute inset-0 transition-opacity duration-300 ${activeVideoId === video.id ? "opacity-100" : "opacity-0"}`}
                      >
                        <iframe
                          ref={(el) => {
                            if (el) {
                              iframeRefs.current[video.id] = el;
                            }
                          }}
                          src={`https://player.vimeo.com/video/${video.vimeoId}?api=1&background=0&autopause=1&loop=0&byline=0&title=0&portrait=0`}
                          className="absolute top-0 left-0 w-full h-full"
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                          title={video.title}
                        />

                        {/* Custom Controls Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div
                              className="h-1.5 w-full bg-gray-700/80 rounded-full overflow-hidden cursor-pointer group/progress"
                              onClick={(e) => handleProgressClick(video.id, e)}
                            >
                              <div
                                className="h-full bg-blue-400 rounded-full transition-all duration-200 relative group-hover/progress:bg-blue-300"
                                style={{ width: `${progressPercentage}%` }}
                              >
                                {/* Progress Handle */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg"></div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handlePlayPause(video.id)}
                                  className="w-8 h-8 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                                  aria-label={
                                    isVideoPlaying
                                      ? "Pause video"
                                      : "Play video"
                                  }
                                  disabled={!isReady}
                                >
                                  {isVideoPlaying ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4 ml-0.5" />
                                  )}
                                </button>
                                <span className="text-sm text-gray-300 font-medium">
                                  {formatTime(currentTime[video.id] || 0)} /{" "}
                                  {formatTime(duration[video.id] || 0)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {!isReady && (
                                  <span className="text-xs text-blue-300 animate-pulse">
                                    Loading...
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Thumbnail Preview */}
                      <div
                        className={`absolute inset-0 transition-all duration-300 ${activeVideoId === video.id ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                        onClick={() => {
                          setActiveVideoId(video.id);
                          setTimeout(() => handlePlayPause(video.id), 100);
                        }}
                      >
                        {/* Video Thumbnail Image */}
                        <div className="absolute inset-0">
                          {video.thumbnail ? (
                            <Image
                              src={video.thumbnail}
                              alt={`${video.title} preview`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              priority={video.id === 1}
                              onLoad={() =>
                                setThumbnailsLoaded((prev) => ({
                                  ...prev,
                                  [video.id]: true,
                                }))
                              }
                              onError={(e) => {
                                console.error(
                                  `Failed to load thumbnail for video ${video.id}:`,
                                  e,
                                );
                                setThumbnailsLoaded((prev) => ({
                                  ...prev,
                                  [video.id]: true,
                                }));
                              }}
                            />
                          ) : (
                            <img
                              src={getThumbnailUrl(video)}
                              alt={`${video.title} preview`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onLoad={() =>
                                setThumbnailsLoaded((prev) => ({
                                  ...prev,
                                  [video.id]: true,
                                }))
                              }
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                setThumbnailsLoaded((prev) => ({
                                  ...prev,
                                  [video.id]: true,
                                }));
                              }}
                            />
                          )}
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                        </div>

                        {/* Video Info at Bottom */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                          <h3 className="font-bold text-lg text-white mb-1">
                            {video.title}
                          </h3>
                          <p className="text-white/80 text-xs">
                            {video.description}
                          </p>
                        </div>

                        {/* Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transform group-hover:scale-110 group-hover:bg-blue-600/80 transition-all duration-300">
                            <Play className="w-8 h-8 ml-1 text-white" />
                          </div>
                        </div>

                        {/* Hover Indicator */}
                        <div className="absolute top-4 right-4">
                          <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full border border-white/20">
                            Click to play
                          </span>
                        </div>

                        {/* Loading indicator for thumbnail */}
                        {!thumbnailsLoaded[video.id] && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rest of content */}
        <div className="max-w-3xl mx-auto space-y-8">
          {/* First Paragraph */}
          <div className="relative">
            <div className="absolute -left-8 top-0 bottom-0 w-6 flex flex-col items-center">
              <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full mb-2"></div>
              <div className="flex-1 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200 dark:from-blue-600 dark:to-blue-800"></div>
            </div>

            <div className="pl-8">
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                After years of building, scaling, and systemising my businesses,
                I chose to share my experience with others. I mentor based on
                real-world experience — the wins, the mistakes, and the lessons
                learned over 15+ years in property and business.
              </p>
            </div>
          </div>

          {/* Second Paragraph */}
          <div className="relative">
            <div className="absolute -right-8 top-0 bottom-0 w-6 flex flex-col items-center">
              <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full mb-2"></div>
              <div className="flex-1 w-0.5 bg-gradient-to-b from-green-400 to-green-200 dark:from-green-600 dark:to-green-800"></div>
            </div>

            <div className="pr-8">
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                Today, my focus is on helping others build Serviced
                Accommodation the right way — with structure, compliance,
                sustainability, and long-term thinking — so they can succeed
                without repeating the costly mistakes I made.
              </p>
            </div>
          </div>
        </div>

        {/* Mentorship Focus Areas - Glassmorphism Cards */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 backdrop-blur-xl bg-gradient-to-br from-blue-400/20 via-blue-500/10 to-blue-600/5 dark:from-blue-400/10 dark:via-blue-500/5 dark:to-blue-600/5 rounded-xl border border-white/20 dark:border-white/10 shadow-lg">
                <div className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-1">
                  Structure
                </div>
              </div>

              <div className="text-center p-4 backdrop-blur-xl bg-gradient-to-br from-green-400/20 via-green-500/10 to-green-600/5 dark:from-green-400/10 dark:via-green-500/5 dark:to-green-600/5 rounded-xl border border-white/20 dark:border-white/10 shadow-lg">
                <div className="text-lg font-bold text-green-700 dark:text-green-400 mb-1">
                  Compliance
                </div>
              </div>

              <div className="text-center p-4 backdrop-blur-xl bg-gradient-to-br from-blue-400/20 via-blue-500/10 to-blue-600/5 dark:from-blue-400/10 dark:via-blue-500/5 dark:to-blue-600/5 rounded-xl border border-white/20 dark:border-white/10 shadow-lg">
                <div className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-1">
                  Sustainability
                </div>
              </div>

              <div className="text-center p-4 backdrop-blur-xl bg-gradient-to-br from-green-400/20 via-green-500/10 to-green-600/5 dark:from-green-400/10 dark:via-green-500/5 dark:to-green-600/5 rounded-xl border border-white/20 dark:border-white/10 shadow-lg">
                <div className="text-lg font-bold text-green-700 dark:text-green-400 mb-1">
                  Long-term
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
