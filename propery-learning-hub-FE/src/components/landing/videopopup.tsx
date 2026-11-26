//components/landing/videopopup.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Volume2, VolumeX } from "lucide-react";

// ---- Config -----------------------------------------------------------
const YOUTUBE_ID = "PixLJSuHPGo"; // from https://youtu.be/PixLJSuHPGo
const SHOW_DELAY_MS = 800; // delay before popup appears after page load (0 = instant)
const HOME_PATH = "/"; // only show on this route
// ------------------------------------------------------------------------

export default function VideoPopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // must start muted — browser requirement

  useEffect(() => {
    // Only ever show on the home / landing page
    if (pathname !== HOME_PATH) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [pathname]);

  const handleClose = () => setIsOpen(false);

  if (!isOpen) return null;

  const iframeSrc = `https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1&mute=${
    isMuted ? 1 : 0
  }&rel=0&modestbranding=1`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-yellow-500/30 bg-white p-5 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close popup"
          className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-[#0b1230] shadow-lg hover:opacity-90 transition"
        >
          <X size={20} strokeWidth={3} />
        </button>

        {/* Video — autoplays immediately, muted (browser requirement); tap speaker for sound */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={iframeSrc}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Freedom Property Academy - Success Stories"
          />

          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? "Unmute video" : "Mute video"}
            className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* Title */}
        <h3 className="mt-4 text-center font-sans text-lg font-semibold text-[#0b1230]">
          Watch how our learners hit success with Serviced Accommodation
        </h3>

        {/* CTA buttons */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <a
            href="/agreement?next=payment"
            className="flex-1 rounded-lg bg-green-600 px-5 py-3.5 text-center text-sm font-bold text-white transition hover:opacity-90"
          >
            Join the Academy →
          </a>
          <a
            href="/discovery-call"
            className="flex-1 rounded-lg bg-yellow-400 px-5 py-3.5 text-center text-sm font-bold text-[#0b1230] transition hover:opacity-90"
          >
            Book a Discovery Call
          </a>
        </div>
      </div>
    </div>
  );
}