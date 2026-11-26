// components/landing/Footer.tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  FileText,
  Cookie,
  Activity,
  Users,
  Scale,
  Megaphone,
  Headphones,
  AlertCircle,
  BookOpen,
  FileCheck,
  Globe,
  Lock,
  Award,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto shrink-0 bg-blue-950 text-white pt-16 pb-8">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Brand - Same as Header */}
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-3 group mb-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-md transition-transform group-hover:scale-105 flex-shrink-0">
                  <Image
                    src="/landingImages/logo.jpeg"
                    alt="Freedom Property Academy"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="leading-tight">
                  <span className="block font-bold text-xl tracking-tight text-white">
                    Freedom Property
                  </span>
                  <span className="block text-sm font-medium text-blue-300">
                    Academy
                  </span>
                </div>
              </Link>
              <p className="text-sm text-blue-200/70 max-w-md">
                The UK's premium property investment education platform.
                Building the next generation of financially free property
                investors.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-blue-300 mb-4">
                Quick Links
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/demo"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors"
                  >
                    Demo
                  </Link>
                </li>
                <li>
                  <Link
                    href="/freesby"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors"
                  >
                    Freesby
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors"
                  >
                    About
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-blue-300 mb-4">
                Legal
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy-policy"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Shield size={14} className="flex-shrink-0" /> Privacy
                    Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <FileText size={14} className="flex-shrink-0" /> Terms &
                    Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cookies-policy"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Cookie size={14} className="flex-shrink-0" /> Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/data-protection-policy"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Lock size={14} className="flex-shrink-0" /> Data Protection
                    Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/community-guide-lines"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Users size={14} className="flex-shrink-0" /> Community
                    Guidelines
                  </Link>
                </li>
                <li>
                  <Link
                    href="/website-terms"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Globe size={14} className="flex-shrink-0" /> Website Terms
                  </Link>
                </li>
                <li>
                  <Link
                    href="/marketing-compliance-policy"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Megaphone size={14} className="flex-shrink-0" /> Marketing
                    Compliance Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/complaints-policy"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Headphones size={14} className="flex-shrink-0" />{" "}
                    Complaints Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/disclaimer"
                    className="text-sm text-blue-200/70 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <AlertCircle size={14} className="flex-shrink-0" />{" "}
                    Disclaimers
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-blue-800/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-blue-300/50">
              © 2025 Freedom Property Academy. All rights reserved.
            </p>
            <p className="text-xs text-blue-300/50">Built with excellence.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
