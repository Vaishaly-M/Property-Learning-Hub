'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface SidebarBrandProps {
  /** Show text label beside logo (hide when sidebar collapsed) */
  showText?: boolean;
  /** Light text for dark sidebar backgrounds */
  variant?: 'light' | 'dark';
  /** Optional subtitle e.g. "Admin Portal" */
  subtitle?: string;
  href?: string;
  className?: string;
}

const SidebarBrand: React.FC<SidebarBrandProps> = ({
  showText = true,
  variant = 'dark',
  subtitle,
  href = '/',
  className = '',
}) => {
  const isLight = variant === 'light';

  const content = (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md flex-shrink-0 ring-1 ring-black/5">
        <Image
          src="/landingImages/logo.jpeg"
          alt="Freedom Property Academy"
          fill
          className="object-cover"
          sizes="40px"
          priority
        />
      </div>
      {showText && (
        <div className="min-w-0 leading-tight">
          <div
            className={`font-bold text-base tracking-tight truncate ${
              isLight ? 'text-white' : 'text-gray-900'
            }`}
          >
            Freedom Property
          </div>
          <div
            className={`text-xs font-medium truncate ${
              isLight ? 'text-blue-300' : 'text-blue-600'
            }`}
          >
            Academy
          </div>
          {subtitle && (
            <div
              className={`text-[10px] mt-0.5 truncate uppercase tracking-wide ${
                isLight ? 'text-blue-200/80' : 'text-slate-400'
              }`}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!showText) {
    return content;
  }

  return (
    <Link href={href} className="group block min-w-0 hover:opacity-90 transition-opacity">
      {content}
    </Link>
  );
};

export default SidebarBrand;
