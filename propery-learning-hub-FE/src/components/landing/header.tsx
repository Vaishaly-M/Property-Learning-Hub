// components/landing/Header.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  X,
  Users,
  GraduationCap,
  PlayCircle,
  Briefcase,
  User,
  LogIn,
  LayoutDashboard,
  House,
  CalendarDays,
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";

const navigation = [
  { name: "Home", href: "/", icon: House },
  // { name: "Academy", href: "#programs", icon: GraduationCap },
  { name: "Demo", href: "/demo", icon: PlayCircle },
  // { name: "Members", href: "/", icon: Users },
  { name: "Freesby", href: "/freesby", icon: Briefcase },
  { name: "About", href: "/about", icon: User },
];

interface DashboardUser {
  role: "admin" | "super_admin" | "instructor" | "learner";
  profile_completed?: boolean;
}

// Where the "Dashboard" button in the header sends a logged-in user.
function getDashboardPath(user: DashboardUser): string {
  if (user.role === "admin" || user.role === "super_admin") {
    return "/admin/dashboard";
  }
  if (user.role === "instructor") {
    return user.profile_completed ? "/instructor/dashboard" : "/profile/instructor";
  }
  if (user.role === "learner") {
    return user.profile_completed ? "/learn" : "/profile/learner";
  }
  return "/";
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { admin, isInitialized } = useAdminAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const dashboardHref = admin ? getDashboardPath(admin) : null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-sm border-b border-blue-100 dark:border-gray-800"
          : "bg-white dark:bg-gray-950 border-b border-blue-100/50 dark:border-gray-800/50"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Left Corner */}
          <Link
            href="/"
            className="flex items-center gap-3 group flex-shrink-0"
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md transition-transform group-hover:scale-105 flex-shrink-0">
              <Image
                src="/landingImages/logo.jpeg"
                alt="Freedom Property Academy"
                fill
                className="object-cover"
              />
            </div>
            <div className="leading-tight hidden sm:block">
              <span className="block font-bold text-xl tracking-tight text-gray-900 dark:text-white">
                Freedom Property
              </span>
              <span className="block text-sm font-medium text-blue-600 dark:text-blue-400">
                Academy
              </span>
            </div>
          </Link>

          {/* Desktop Navigation - Center Aligned */}
          <div className="hidden lg:flex lg:items-center lg:justify-center lg:flex-1 lg:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-1.5 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-blue-600 dark:after:bg-blue-400 after:transition-all hover:after:w-full"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop Actions - Right Corner */}
          <div className="hidden lg:flex lg:items-center lg:gap-3 flex-shrink-0">
            <Link
              href="/agreement?next=payment"
              className="inline-flex items-center gap-2 px-5 py-2 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-md hover:shadow-lg hover:shadow-green-200/50 hover:from-green-700 hover:to-green-800 hover:scale-105 transition-all duration-300 whitespace-nowrap"
            >
              Join the academy →
            </Link>
            <Link
              href="/discovery-call"
              className="inline-flex items-center gap-2 px-4 py-2 text-base font-semibold text-blue-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 whitespace-nowrap"
            >
              <CalendarDays size={18} />
              Discovery Call
            </Link>
            {isInitialized && dashboardHref ? (
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <LogIn size={18} />
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-blue-100 dark:border-gray-800 animate-in slide-in-from-top-5">
            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 flex flex-col gap-2">
                <Link
                  href="/discovery-call"
                  className="flex items-center justify-center gap-2.5 px-3 py-3 text-base font-semibold text-blue-900 bg-amber-400 rounded-md hover:bg-amber-300 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <CalendarDays size={18} />
                  Discovery Call
                </Link>
                <Link
                  href="/agreement?next=payment"
                  className="flex items-center justify-center gap-2.5 px-3 py-2 text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-md hover:shadow-lg hover:shadow-green-200/50 hover:from-green-700 hover:to-green-800 hover:scale-105 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Join the academy→
                </Link>
                {isInitialized && dashboardHref ? (
                  <Link
                    href={dashboardHref}
                    className="flex items-center gap-2.5 px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard size={18} />
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-2.5 px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LogIn size={18} />
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}