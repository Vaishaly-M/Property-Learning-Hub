"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, House } from "lucide-react";

export default function BusinessAutopilot() {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );

  // Array of family photos - update these with your actual image paths
  const familyPhotos = [
    {
      id: 1,
      src: "/campaign/fam1.jpg",
      alt: "Family time - Quality moments together",
    },
    {
      id: 2,
      src: "/campaign/fam2.jpg",
      alt: "Travel adventures - Exploring new places",
    },
    {
      id: 3,
      src: "/campaign/fam3.jpg",
      alt: "Work-life balance - Enjoying freedom",
    },
    {
      id: 4,
      src: "/campaign/fam5.jpg",
      alt: "Special moments - Celebrating life",
    },
  ];

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeModal = () => {
    setSelectedImageIndex(null);
  };

  const goToPrevious = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(
        selectedImageIndex === 0
          ? familyPhotos.length - 1
          : selectedImageIndex - 1,
      );
    }
  };

  const goToNext = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(
        selectedImageIndex === familyPhotos.length - 1
          ? 0
          : selectedImageIndex + 1,
      );
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeModal();
    } else if (e.key === "ArrowLeft") {
      goToPrevious();
    } else if (e.key === "ArrowRight") {
      goToNext();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
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
              <House size={32} />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Business Autopilot & Life Balance
          </h1>
          <div className="flex items-center space-x-4 mt-3">
            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-blue-300 dark:from-blue-400 dark:to-blue-600 rounded-full"></div>
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              From daily involvement to time freedom
            </div>
            <div className="w-12 h-1 bg-gradient-to-l from-green-500 to-green-300 dark:from-green-400 dark:to-green-600 rounded-full"></div>
          </div>
        </div>

        {/* Modern Photo Grid */}
        <div className="mb-10">
          <div className="backdrop-blur-xl bg-gradient-to-br from-blue-400/20 via-green-400/10 to-blue-400/5 dark:from-blue-400/10 dark:via-green-400/5 dark:to-blue-400/5 p-6 md:p-8 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg">
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                The Rewards of Success
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                When business runs on autopilot, you gain the most valuable
                asset — time for what truly matters
              </p>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {familyPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="group cursor-pointer relative overflow-hidden rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                  onClick={() => handleImageClick(index)}
                >
                  <div className="aspect-square relative">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {/* Click Indicator */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-800 dark:text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20 dark:border-gray-700/50">
                        Click to view
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Decorative Side Elements */}
            <div className="absolute -left-8 top-0 bottom-0 w-6 flex flex-col items-center">
              <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full mb-2"></div>
              <div className="flex-1 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200 dark:from-blue-600 dark:to-blue-800"></div>
            </div>

            <div className="absolute -right-8 top-0 bottom-0 w-6 flex flex-col items-center">
              <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full mb-2"></div>
              <div className="flex-1 w-0.5 bg-gradient-to-b from-green-400 to-green-200 dark:from-green-600 dark:to-green-800"></div>
            </div>

            {/* Content Paragraph */}
            <div className="px-4 md:px-8">
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                As systems matured and teams were put in place, the business
                became less dependent on my daily involvement. This created
                something more valuable than income — time. Property allowed me
                to travel, be present with my family, and focus on what matters
                beyond work.
              </p>
            </div>
          </div>

          {/* Bottom Decorative Elements */}
          <div className="flex flex-wrap justify-center items-center gap-4 mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 rounded-full"></div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Systems
              </div>
            </div>

            <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-green-400 dark:from-blue-600 dark:to-green-600"></div>

            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-green-500 dark:border-green-400 rounded-full"></div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Teams
              </div>
            </div>

            <div className="w-1 h-6 bg-gradient-to-b from-green-400 to-blue-400 dark:from-green-600 dark:to-blue-600"></div>

            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 rounded-full"></div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Time
              </div>
            </div>

            <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-green-400 dark:from-blue-600 dark:to-green-600"></div>

            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-green-500 dark:border-green-400 rounded-full"></div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Family
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal/Lightbox */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={handleBackdropClick}
          onKeyDown={(e) => handleKeyDown(e as any)}
          tabIndex={-1}
        >
          {/* Close Button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close image viewer"
            autoFocus
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation Buttons */}
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Image Container */}
          <div className="relative w-full max-w-6xl max-h-[85vh]">
            <div className="relative w-full h-full">
              <Image
                src={familyPhotos[selectedImageIndex].src}
                alt={familyPhotos[selectedImageIndex].alt}
                fill
                className="object-contain"
                sizes="100vw"
                priority={true}
              />
            </div>
          </div>

          {/* Navigation Dots */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-2">
            {familyPhotos.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === selectedImageIndex
                    ? "bg-white scale-125"
                    : "bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>

          {/* Keyboard Navigation Hint */}
          <div className="absolute bottom-4 right-4 text-gray-400 text-sm">
            <span className="hidden md:inline">
              ← → to navigate • ESC to close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
