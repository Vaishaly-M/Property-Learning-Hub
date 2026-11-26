'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from './LoadingSpinner';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string; 
  // other admin properties 
}

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    // Skip role checking entirely
    // This effectively disables the guard
    setHasAccess(true);
    setLoading(false);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!hasAccess) {
    return null; // This won't be reached since hasAccess is always true
  }

  return <>{children}</>;
};

export default RoleGuard;