"use client";

import Image from "next/image";

export default function FirstPropertyProjects() {
  // Array of property project photos - update with your actual image paths
  const propertyPhotos = [
    { id: 1, src: "/campaign/firstp1.jpg", alt: "First property purchase" },
    { id: 2, src: "/campaign/firstp2.jpg", alt: "Renovation in progress" },
    { id: 3, src: "/campaign/firstp3.jpg", alt: "Construction work" },
    { id: 4, src: "/campaign/firstp4.jpg", alt: "Interior finishing" },
    { id: 5, src: "/campaign/firstp5.jpg", alt: "Completed bedroom" },
    { id: 6, src: "/campaign/firstp6.jpg", alt: "Living area transformation" },
    { id: 7, src: "/campaign/firstp7.jpg", alt: "Final project completion" },
  ];

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-10 shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-full -translate-x-12 -translate-y-12 opacity-60"></div>
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-full translate-x-20 translate-y-20 opacity-60"></div>

      {/* Corner Accents */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-blue-300 dark:border-blue-700 rounded-tl-3xl"></div>
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-green-300 dark:border-green-700 rounded-br-3xl"></div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-500 dark:to-blue-700 rounded-xl flex items-center justify-center mb-6 shadow-lg">
            <div className="text-white text-2xl font-bold">1st</div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-center mb-2">
            First Property Projects
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mt-2"></div>
        </div>

        {/* Photo Grid Section */}
        <div className="mb-10">
          <div className="backdrop-blur-xl bg-gradient-to-br from-blue-400/10 via-green-400/10 to-blue-400/5 dark:from-blue-400/5 dark:via-green-400/5 dark:to-blue-400/5 p-4 md:p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg">
            {/* Responsive Photo Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
              {/* First Photo - Enlarged */}
              <div className="lg:col-span-4 row-span-2">
                <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-300 dark:border-gray-700 aspect-square lg:aspect-auto lg:h-full w-full">
                  <Image
                    src={propertyPhotos[0].src}
                    alt={propertyPhotos[0].alt}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 57vw"
                    priority={true}
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/20">
                      First Purchase
                    </span>
                  </div>
                </div>
              </div>

              {/* Second and Third Photos */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-300 dark:border-gray-700 aspect-square">
                    <Image
                      src={propertyPhotos[1].src}
                      alt={propertyPhotos[1].alt}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 21.5vw"
                    />
                  </div>
                  <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-300 dark:border-gray-700 aspect-square">
                    <Image
                      src={propertyPhotos[2].src}
                      alt={propertyPhotos[2].alt}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 21.5vw"
                    />
                  </div>
                </div>
              </div>

              {/* Fourth, Fifth, Sixth, Seventh Photos - 2x2 Grid */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-300 dark:border-gray-700 aspect-square">
                    <Image
                      src={propertyPhotos[3].src}
                      alt={propertyPhotos[3].alt}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 21.5vw"
                    />
                  </div>
                  <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-300 dark:border-gray-700 aspect-square">
                    <Image
                      src={propertyPhotos[4].src}
                      alt={propertyPhotos[4].alt}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 21.5vw"
                    />
                  </div>
                  <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-300 dark:border-gray-700 aspect-square">
                    <Image
                      src={propertyPhotos[5].src}
                      alt={propertyPhotos[5].alt}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 21.5vw"
                    />
                  </div>
                  <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-300 dark:border-gray-700 aspect-square">
                    <Image
                      src={propertyPhotos[6].src}
                      alt={propertyPhotos[6].alt}
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-105"
                      sizes="(max-width: 1024px) 50vw, 21.5vw"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="relative">
          {/* Decorative Side Elements */}
          <div className="absolute -left-8 top-0 bottom-0 w-6 flex flex-col items-center">
            <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
            <div className="flex-1 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200 dark:from-blue-600 dark:to-blue-800"></div>
          </div>

          <div className="absolute -right-8 top-0 bottom-0 w-6 flex flex-col items-center">
            <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded-full"></div>
            <div className="flex-1 w-0.5 bg-gradient-to-b from-green-400 to-green-200 dark:from-green-600 dark:to-green-800"></div>
          </div>

          {/* Content Paragraph */}
          <div className="px-4 md:px-8">
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
              During this time, I began investing personally. I purchased my
              first property and later converted a one-bedroom apartment into a
              two-bedroom unit, carrying out a full strip-out and full
              refurbishment. These projects taught me how to add value, manage
              risk, and execute properly — not just theorise.
            </p>
          </div>
        </div>

        {/* Bottom Decorative Elements */}
        <div className="flex justify-center mt-10 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 rounded-full"></div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                First Purchase
              </div>
            </div>

            <div className="w-1 h-8 bg-gradient-to-b from-blue-400 to-green-400 dark:from-blue-600 dark:to-green-600"></div>

            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-green-500 dark:border-green-400 rounded-full"></div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Full Renovation
              </div>
            </div>

            <div className="w-1 h-8 bg-gradient-to-b from-green-400 to-blue-400 dark:from-green-600 dark:to-blue-600"></div>

            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 rounded-full"></div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Value Creation
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
