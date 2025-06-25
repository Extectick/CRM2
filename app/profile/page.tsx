'use client';

import { UserProfile } from '@/components/dashboard/user-profile';
import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { useEffect, useState } from 'react';
import { Department } from '@prisma/client';

export default function ProfilePage() {
  const { user, loading, error } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch('/api/departments')
        .then(res => res.json())
        .then(({ departments }) => {
          setDepartments(departments);
          setDepartmentsLoading(false);
        })
        .catch(() => setDepartmentsLoading(false));
    }
  }, [user]);

  if (loading || departmentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка профиля..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <ErrorMessage message="Пользователь не авторизован" />
      </div>
    );
  }

  return (
    <div>
      <UserProfile user={user} departments={departments} />
      <BottomNavigation />
    </div>
  );
}
