"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Star,
  Users,
  TrendingUp,
  Target,
  Clock,
  Building2,
  Zap,
  Crown,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, inView } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}

const steps = [
  {
    n: "01",
    title: "Find & Secure",
    desc: "Identify landlords open to Rent-to-SA agreements and lock in legal permission to sublet.",
    icon: Building2,
    color: "blue",
  },
  {
    n: "02",
    title: "Furnish & List",
    desc: "Set up a guest-ready space and publish high-converting listings across booking platforms.",
    icon: Target,
    color: "blue",
  },
  {
    n: "03",
    title: "Automate & Scale",
    desc: "Hand off operations to your systems and repeat the playbook across new units.",
    icon: Zap,
    color: "green",
  },
];

const stats = [
  { num: "1,200+", lbl: "Students Trained", icon: Users },
  { num: "£3.4M+", lbl: "Student Revenue Generated", icon: TrendingUp },
  { num: "90", lbl: "Days to Launch", icon: Clock },
  { num: "50", lbl: "Properties Required", icon: Building2 },
];

export default function DemoPage() {
  const [playing, setPlaying] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  const scrollToDemo = () => {
    if (demoRef.current) {
      demoRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      // Auto-play the video after scrolling
      setTimeout(() => {
        setPlaying(true);
      }, 800);
    }
  };

  return (
    <main className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-x-hidden">
      {/* ---------- HERO SECTION ---------- */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Gradients - Separate Blue and Green */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-green-500/20 dark:bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 dark:bg-blue-400/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge - Blue */}
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-6 py-3 rounded-full mb-8 shadow-lg border border-blue-200 dark:border-blue-800">
              <Sparkles
                size={18}
                className="text-blue-600 dark:text-blue-400"
              />
              <span className="font-semibold text-sm">Watch it in action</span>
            </div>

            {/* Heading - Blue only */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 dark:text-white mb-4">
              See How You'll Launch Your
            </h1>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-blue-600 dark:text-blue-400 mb-6">
              6-Figure Airbnb Business
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
              A guided walkthrough of the exact Serviced Accommodation system
              our students use to go from zero to high-yield short-lets without
              buying a single property.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
            
              <Link
                href="/discovery-call"
                className="inline-flex items-center gap-2  bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                Book a Discovery Call
                <ArrowRight size={20} />
              </Link>
            </div>

            {/* Hero Stats */}
            {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-4 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <stat.icon className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {stat.num}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {stat.lbl}
                  </div>
                </div>
              ))}
            </div> */}
          </div>
        </div>

        {/* Scroll indicator 
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-gray-400 dark:border-gray-600 flex justify-center">
            <div className="w-1 h-2 bg-gray-400 dark:bg-gray-600 rounded-full mt-2 animate-pulse" />
          </div>
        </div> */}
      </section>

      {/* ---------- DEMO PREVIEW WINDOW ---------- 
      <section
        ref={demoRef}
        className="px-4 sm:px-6 lg:px-8 pb-20 scroll-mt-8"
        id="demo-preview"
      >
        <div className="max-w-6xl mx-auto h-full">
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="flex items-center gap-2 bg-gray-900 dark:bg-gray-950 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-gray-400 font-medium">
                Demo Preview
              </span>
            </div>

            <div className="relative flex h-[450px] items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-900">
              {!playing ? (
                <div className="text-center">
                  <button
                    aria-label="Play demo video"
                    onClick={() => setPlaying(true)}
                    className="relative flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 shadow-2xl transition-all duration-300 hover:scale-110 group"
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-600/40" />
                    <Play className="relative ml-1 h-10 w-10 text-white fill-white" />
                  </button>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Click to watch the demo
                  </p>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <video
                    className="h-full w-full object-cover"
                    src="/demo.mp4"
                    controls
                    autoPlay
                  />
                </div>
              )}

              {/* Floating feature chips
              <div className="absolute left-[5%] top-[12%] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Rent-to-SA Strategy
                </div>
              </div>
              <div className="absolute bottom-[14%] right-[5%] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-xl animate-[float_6s_ease-in-out_infinite_0.7s]">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  £3,200 avg. monthly profit
                </div>
              </div>
              <div className="absolute right-[8%] top-[16%] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-xl animate-[float_6s_ease-in-out_infinite_1.2s]">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />0
                  properties owned
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      */}

      {/* ---------- STEPS ---------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mt-4">
            Three steps inside the demo
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto mt-4">
            Every module is built around a single repeatable system — here's the
            shape of it.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, idx) => (
            <Reveal key={s.n}>
              <div className="h-full bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-black text-white ${
                    s.color === "blue" ? "bg-blue-600" : "bg-green-600"
                  }`}
                >
                  {s.n}
                </div>
                <s.icon
                  className={`w-6 h-6 mb-3 ${
                    s.color === "blue"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {s.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- STATS ---------- */}
      {/* <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Reveal>
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 overflow-hidden rounded-3xl bg-blue-600 px-8 py-14 shadow-2xl">
            <div
              className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)",
              }}
            />
            {stats.map((s) => (
              <div key={s.lbl} className="relative z-10 text-center text-white">
                <s.icon className="w-6 h-6 mx-auto mb-2 opacity-80" />
                <div className="text-3xl font-black sm:text-4xl">{s.num}</div>
                <div className="mt-1 text-sm font-medium text-blue-100">
                  {s.lbl}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section> */}

      {/* ---------- TESTIMONIAL ---------- */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Reveal>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 border border-gray-200 dark:border-gray-800 shadow-2xl text-center">
            <div className="flex justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <p className="text-lg font-semibold leading-relaxed text-gray-900 dark:text-white">
              &ldquo;I replaced my 9-to-5 income in 11 weeks using exactly
              what's shown in this demo. No property purchase, no huge capital —
              just the system.&rdquo;
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-600" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                — Academy Student, Cohort 6
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- FINAL CTA - Blue Only ---------- */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <Reveal>
          <div className="relative rounded-3xl p-12 text-center overflow-hidden bg-blue-600">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to see your own 90-day plan?
              </h2>
              <p className="text-white/90 text-lg max-w-md mx-auto mb-8">
                Book a free discovery call and we'll map your path to your first
                Serviced Accommodation unit.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/agreement?next=payment"
                  className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-8 py-4 rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  Join the Academy
                  <ArrowRight size={20} />
                </Link>
                <Link
                  href="/discovery-call"
                  className="inline-flex items-center gap-2 bg-white/20 text-white font-bold px-8 py-4 rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-300"
                >
                  Book Discovery Call
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}
