// components/sections/BookingData.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

export default function BookingData() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  // Only 8 images as requested
  const images = [
    "/bookings/bookings (0).jpg",
    "/bookings/bookings (1).jpg",
    "/landingImages/booking.png",
    "/bookings/bookings (3).jpg",
    "/landingImages/Bookings (5).jpg",
    "/bookings/bookings (11).jpg",
    "/bookings/bookings (10).jpg",
    "/bookings/bookings (8).jpg",
  ];

  // Tiny placeholder for blur effect
  const tinyPlaceholder =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PC9zdmc+";

  const openImage = (img: string, index: number) => {
    setCurrentImageIndex(index);
    setSelectedImage(img);
  };

  const goToPrevious = () => {
    const newIndex =
      currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
    setCurrentImageIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const goToNext = () => {
    const newIndex =
      currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1;
    setCurrentImageIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedImage) return;

      if (event.key === "ArrowLeft") {
        goToPrevious();
      } else if (event.key === "ArrowRight") {
        goToNext();
      } else if (event.key === "Escape") {
        setSelectedImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, currentImageIndex]);

  return (
    <section className="py-2 sm:py-6 bg-gray-50/50 dark:bg-gray-900/30">
      {/* Using exact same container structure as header */}
      <div className="container mx-auto px-6 sm:px-4 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider">
              Real Results
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-4">
              Real Booking Data
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Actual booking performance and income reports from our mentorship
              students
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center shadow-lg dark:shadow-gray-800/30">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                £1K-3K+
              </div>
              <div className="text-gray-700 dark:text-gray-300 font-medium">
                Avg Monthly Profit Per Property
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center shadow-lg dark:shadow-gray-800/30">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                85%+
              </div>
              <div className="text-gray-700 dark:text-gray-300 font-medium">
                Average Occupancy Rate
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center shadow-lg dark:shadow-gray-800/30">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                4-8
              </div>
              <div className="text-gray-700 dark:text-gray-300 font-medium">
                Weeks to First Booking
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center shadow-lg dark:shadow-gray-800/30">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                100%
              </div>
              <div className="text-gray-700 dark:text-gray-300 font-medium">
                Hands-On Implementation Support
              </div>
            </div>
          </div>

          {/* Booking Screenshots Grid - 4 per row, 2 rows = 8 items */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-900 cursor-pointer"
                onClick={() => openImage(img, idx)}
              >
                <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={img}
                    alt={`Student booking performance ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    placeholder="blur"
                    blurDataURL={tinyPlaceholder}
                    priority={idx < 4}
                    loading={idx >= 4 ? "lazy" : "eager"}
                  />
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <div className="text-white">
                    <div className="text-xs font-semibold bg-blue-600 inline-block px-2 py-1 rounded-full mb-2">
                      Guest Paid
                    </div>
                    <h3 className="text-sm font-bold mb-1">
                      Booking Performance
                    </h3>
                    <p className="text-xs opacity-90">Click to zoom</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Lightbox Modal */}
          {selectedImage && (
            <div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={(e) =>
                e.target === e.currentTarget && setSelectedImage(null)
              }
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-20 bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Navigation Buttons */}
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-20 bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
                aria-label="Previous image"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-20 bg-black/50 rounded-full w-10 h-10 flex items-center justify-center"
                aria-label="Next image"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {/* Image Counter */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/70 rounded-full px-4 py-2 text-sm font-medium z-20">
                Booking {currentImageIndex + 1} of {images.length}
              </div>

              {/* Optimized Image Display */}
              <div className="relative w-full max-w-4xl max-h-[80vh]">
                <Image
                  src={selectedImage}
                  alt={`Student booking performance ${currentImageIndex + 1}`}
                  width={1200}
                  height={800}
                  className="w-full h-auto object-contain rounded-lg"
                  priority
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
