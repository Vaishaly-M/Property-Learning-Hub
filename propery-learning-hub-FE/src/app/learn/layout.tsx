// app/learn/layout.tsx
'use client';

import Sidebar from '../../components/learner/Sidebar';
import { useAuthRedirect } from '../../hooks/useAuthRedirect';
import { usePathname } from 'next/navigation';

function LearnLayoutFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600">Loading your learning dashboard...</p>
      </div>
    </div>
  );
}

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuthRedirect();
  const pathname = usePathname();
  const isFullHeightPage = pathname?.includes('/deal-analyzer');

  // If auth is loading, show fallback
  if (isLoading) {
    return <LearnLayoutFallback />;
  }

  // If user exists but is not a learner, show access denied
  if (user && user.role !== 'learner') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">This learning dashboard is for learners only.</p>
          <button
            onClick={() => {
              if (user.role === 'instructor') {
                window.location.href = '/admin/dashboard';
              }
            }}
            className="mt-4 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors"
          >
            Go to Instructor Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render the layout with sidebar and content
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-gray-50">
      <Sidebar />
      <main
        className={`flex-1 min-h-0 p-4 md:p-6 ${
          isFullHeightPage ? 'overflow-hidden flex flex-col' : 'overflow-auto'
        }`}
      >
        {children}
      </main>
    </div>
  );
}