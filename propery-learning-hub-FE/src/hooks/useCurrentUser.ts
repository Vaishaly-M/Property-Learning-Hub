// hooks/useCurrentUser.ts
import { useState, useEffect, useCallback } from 'react';
import { profileAPI } from '../services/profileApi';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

let cachedUser: CurrentUser | null = null;
let listeners: ((user: CurrentUser | null) => void)[] = [];

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  const fetchUser = useCallback(async () => {
    try {
      const response = await profileAPI.getUser();
      const userData = response.user || response;
      
      let firstName = '';
      let lastName = '';
      let fullName = '';
      
      if (userData.full_name) {
        fullName = userData.full_name;
        const nameParts = userData.full_name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      } else if (userData.first_name || userData.last_name) {
        firstName = userData.first_name || '';
        lastName = userData.last_name || '';
        fullName = `${firstName} ${lastName}`.trim();
      } else if (userData.name) {
        fullName = userData.name;
        const nameParts = userData.name.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      } else if (userData.email) {
        fullName = userData.email.split('@')[0];
        firstName = fullName;
      }
      
      const currentUser: CurrentUser = {
        id: userData.id?.toString() || '',
        name: fullName || 'User',
        email: userData.email || '',
        firstName: firstName || fullName,
        lastName: lastName || '',
        avatar: userData.avatar || null,
      };
      
      cachedUser = currentUser;
      setUser(currentUser);
      listeners.forEach(listener => listener(currentUser));
      return currentUser;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedUser) {
      fetchUser();
    }
  }, [fetchUser]);

  // Listen for user updates
  useEffect(() => {
    const handleUserUpdate = (updatedUser: CurrentUser | null) => {
      if (updatedUser) {
        cachedUser = updatedUser;
        setUser(updatedUser);
      }
    };
    
    listeners.push(handleUserUpdate);
    return () => {
      listeners = listeners.filter(l => l !== handleUserUpdate);
    };
  }, []);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    await fetchUser();
  }, [fetchUser]);

  return { user, loading, refreshUser };
};

// Function to update user globally
export const updateCurrentUser = (userData: CurrentUser) => {
  cachedUser = userData;
  listeners.forEach(listener => listener(userData));
  
  // Dispatch custom event for components to listen to
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: userData }));
  }
};