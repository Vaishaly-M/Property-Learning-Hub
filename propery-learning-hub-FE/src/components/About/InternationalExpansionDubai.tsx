"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Play, Pause } from "lucide-react";

export default function InternationalExpansionDubai() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);

  // Vimeo video ID from the new link
  const vimeoId = "1161462354";

  // Initialize Vimeo player
  useEffect(() => {
    const loadVimeoScript = () => {
      const script = document.createElement("script");
      script.src = "https://player.vimeo.com/api/player.js";
      script.async = true;
      script.onload = () => {
        if (iframeRef.current) {
          const Player = (window as any).Vimeo.Player;
          playerRef.current = new Player(iframeRef.current);

          playerRef.current.on("play", () => setIsPlaying(true));
          playerRef.current.on("pause", () => setIsPlaying(false));
          playerRef.current.on("ended", () => setIsPlaying(false));

          playerRef.current.on("timeupdate", (data: any) => {
            setCurrentTime(data.seconds);
          });

          playerRef.current.on("loaded", async () => {
            const totalDuration = await playerRef.current.getDuration();
            setDuration(totalDuration);
            setIsPlayerReady(true);
          });
        }
      };
      document.body.appendChild(script);
    };

    if (!(window as any).Vimeo) {
      loadVimeoScript();
    } else if (iframeRef.current && !playerRef.current) {
      // If Vimeo is already loaded
      const Player = (window as any).Vimeo.Player;
      playerRef.current = new Player(iframeRef.current);

      playerRef.current.on("play", () => setIsPlaying(true));
      playerRef.current.on("pause", () => setIsPlaying(false));
      playerRef.current.on("ended", () => setIsPlaying(false));

      playerRef.current.on("timeupdate", (data: any) => {
        setCurrentTime(data.seconds);
      });

      playerRef.current.on("loaded", async () => {
        const totalDuration = await playerRef.current.getDuration();
        setDuration(totalDuration);
        setIsPlayerReady(true);
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      await playerRef.current.pause();
    } else {
      await playerRef.current.play();
    }
  };

  const handleProgressClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !isPlayerReady) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * duration;

    await playerRef.current.setCurrentTime(newTime);
    setCurrentTime(newTime);

    // If video was paused and we click on progress, don't auto-play
    if (!isPlaying) {
      await playerRef.current.pause();
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
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
            <div className="text-white text-3xl font-bold">DXB</div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-2">
            International Expansion – Dubai
          </h1>
          <div className="flex items-center space-x-4 mt-3">
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-300 dark:from-blue-400 dark:to-blue-600 rounded-full"></div>
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              Close to two years operating in Dubai
            </div>
            <div className="w-12 h-1 bg-gradient-to-l from-green-500 to-green-300 dark:from-green-400 dark:to-green-600 rounded-full"></div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-6xl mx-auto">
          {/* Image and First Paragraph in 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Dubai Property Photo */}
            <div className="relative h-[300px] rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 aspect-square lg:aspect-auto">
              <Image
                src="/campaign/dubai.jpg"
                alt="Dubai Luxury Serviced Accommodation"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 10vw, 50vw"
                priority={true}
                style={{ objectPosition: "center 30%" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                <div className="text-white">
                  <div className="text-sm font-medium text-blue-200 mb-1">
                    DUBAI LUXURY PROPERTIES
                  </div>
                  <div className="text-lg font-bold">
                    Directly managed multiple luxury units
                  </div>
                </div>
              </div>
            </div>

            {/* First Paragraph */}
            <div className="flex items-center">
              <div className="relative w-full">
                {/* Decorative Side Elements */}
                <div className="absolute -right-8 top-0 bottom-0 w-6 flex flex-col items-center">
                  <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full mb-2"></div>
                  <div className="flex-1 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200 dark:from-blue-600 dark:to-blue-800"></div>
                </div>

                <div className="pl-8">
                  <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                    As the UK business stabilised, I expanded internationally
                    and spent close to two years operating in Dubai. I was
                    directly involved in managing multiple luxury serviced
                    accommodation properties, overseeing operations, guest
                    experience, compliance, and performance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Video Section */}
          <div className="mb-10">
            <div className="backdrop-blur-xl bg-gradient-to-br from-blue-400/20 via-green-400/10 to-blue-400/5 dark:from-blue-400/10 dark:via-green-400/5 dark:to-blue-400/5 p-4 md:p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg overflow-hidden">
              {/* Video Header */}
              <div className="mb-6 text-center">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Behind the Scenes in Dubai
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Watch the full video showcasing the hands-on work behind
                  managing luxury serviced accommodation in Dubai
                </p>
              </div>

              {/* Video Player Container */}
              <div className="relative">
                {/* Vimeo Embed with API */}
                <div className="relative overflow-hidden rounded-xl md:rounded-2xl aspect-video bg-gradient-to-br from-blue-900/50 to-blue-950/50 dark:from-blue-900/30 dark:to-blue-950/30 backdrop-blur-sm border border-white/20 dark:border-white/10">
                  <iframe
                    ref={iframeRef}
                    src={`https://player.vimeo.com/video/${vimeoId}?api=1&background=0&autopause=1&loop=0&byline=0&title=0&portrait=0`}
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Dubai Property Operations - Behind the Scenes"
                  />

                  {/* Custom Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div
                        className="h-1.5 w-full bg-gray-700/80 rounded-full overflow-hidden cursor-pointer group/progress"
                        onClick={handleProgressClick}
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
                            onClick={handlePlayPause}
                            className="w-8 h-8 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                            aria-label={
                              isPlaying ? "Pause video" : "Play video"
                            }
                            disabled={!isPlayerReady}
                          >
                            {isPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
                          </button>
                          <span className="text-sm text-gray-300 font-medium">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPlayerReady && (
                            <span className="text-xs text-blue-300 bg-blue-900/50 px-2 py-1 rounded border border-blue-700/50">
                              Full Video
                            </span>
                          )}
                          {!isPlayerReady && (
                            <span className="text-xs text-blue-300 animate-pulse">
                              Loading...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="text-white">
                      <div className="font-medium text-sm">
                        Dubai Operations - Full Experience
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Second Paragraph */}
          <div className="relative">
            {/* Decorative Side Elements */}
            <div className="absolute -right-8 top-0 bottom-0 w-6 flex flex-col items-center">
              <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full mb-2"></div>
              <div className="flex-1 w-0.5 bg-gradient-to-b from-green-400 to-green-200 dark:from-green-600 dark:to-green-800"></div>
            </div>

            <div className="pr-8">
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                Dubai is a high-expectation market where standards are
                uncompromising. Managing luxury units there pushed my systems,
                attention to detail, and operational discipline to a new level
                and reinforced the importance of treating serviced accommodation
                as a serious hospitality business.
              </p>
            </div>
          </div>

          {/* Key Highlights - Glassmorphism Cards */}
          <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 backdrop-blur-xl bg-gradient-to-br from-blue-400/20 via-blue-500/10 to-blue-600/5 dark:from-blue-400/10 dark:via-blue-500/5 dark:to-blue-600/5 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg">
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-2">
                  2 Years
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  Operating in Dubai
                </div>
              </div>

              <div className="text-center p-6 backdrop-blur-xl bg-gradient-to-br from-green-400/20 via-green-500/10 to-green-600/5 dark:from-green-400/10 dark:via-green-500/5 dark:to-green-600/5 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg">
                <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">
                  Luxury
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  Serviced Accommodation
                </div>
              </div>

              <div className="text-center p-6 backdrop-blur-xl bg-gradient-to-br from-blue-400/20 via-blue-500/10 to-blue-600/5 dark:from-blue-400/10 dark:via-blue-500/5 dark:to-blue-600/5 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg">
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-2">
                  Direct
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  Hands-on Management
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
