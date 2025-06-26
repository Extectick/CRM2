'use client';

import { useState, useEffect } from 'react';
import { useTelegram } from './use-telegram';

interface User {
  id: string;
  telegramId: string;
  fullName: string;
  role: 'USER' | 'DEPARTMENT_HEAD' | 'ADMIN';
  department: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
}

export function useAuth() {
  const { webApp, isReady: telegramReady } = useTelegram();
  const [user, setUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-telegram-init-data': webApp?.initData || 'development-mock-data',
  });

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: getHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return { success: true, needsRegistration: false };
      } else if (response.status === 404) {
        // User not found - needs registration
        return { success: false, needsRegistration: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          response.statusText || 
          `Failed to fetch user (status ${response.status})`
        );
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(errorMessage);
      return { success: false, needsRegistration: false, error: errorMessage };
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments);
      } else {
        throw new Error('Failed to fetch departments');
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const register = async (fullName: string, departmentId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fullName, departmentId }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return { success: true };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: User['role']) => {
    try {
      const response = await fetch('/api/users/update-role', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userId, role }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, user: data.user };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update role';
      return { success: false, error: errorMessage };
    }
  };

  useEffect(() => {
    if (telegramReady) {
      const initAuth = async () => {
        setLoading(true);
        setError(null);

        try {
          await fetchDepartments();
          const userResult = await fetchUser();
          
          if (!userResult.success && !userResult.needsRegistration) {
            setError(userResult.error || 'Authentication failed');
          }
        } catch (err) {
          console.error('Error during auth initialization:', err);
          setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
        } finally {
          setLoading(false);
        }
      };

      initAuth();
    }
  }, [telegramReady]);

  return {
    user,
    departments,
    loading,
    error,
    register,
    updateUserRole,
    refetch: fetchUser,
  };
}
