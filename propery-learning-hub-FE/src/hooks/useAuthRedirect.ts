import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const useAuthRedirect = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        router.push('/login');
        return;
      }

      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        
        // After login, always check if profile is completed
        if (!userData.profile_completed) {
          // Profile not completed - redirect to profile setup
          if (userData.role === 'learner') {
            router.push('/profile/learner');
          } else if (userData.role === 'instructor') {
            router.push('/profile/instructor');
          }
        } else {
          // Profile is completed - redirect based on role
          if (userData.role === 'learner') {
            // For learners, redirect to /learn (not /learner)
            router.push('/learn');
          } else if (userData.role === 'instructor') {
            router.push('/admin/dashboard');
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return { isLoading, user };
};