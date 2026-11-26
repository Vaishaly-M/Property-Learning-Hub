// app/learn/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardPage from './dashboard/page';

export default function LearnIndexPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we're at the exact /learn path
    if (window.location.pathname === '/learn') {
      // Check if there's a stored route
      const lastRoute = sessionStorage.getItem('lastLearnRoute');
      
      if (lastRoute && lastRoute !== '/learn') {
        // Redirect to the last visited page
        router.replace(lastRoute);
      } else {
        // Default to dashboard
        router.replace('/learn/dashboard');
      }
    } else {
      setIsLoading(false);
    }
  }, [router]);

  // Show loading while checking
  if (isLoading && window.location.pathname === '/learn') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If we're not at /learn, render dashboard directly
  return <DashboardPage />;
}