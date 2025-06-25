'use client';

import { UserProfile } from '@/components/dashboard/user-profile';
import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { BottomNavigation } from '@/components/ui/bottom-navigation';

export default function ProfilePage() {
  const { user, loading, error } = useAuth();

  if (loading) {
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
        <UserProfile user={user} />
        <BottomNavigation />
    </div>
    ) 
  
  
}
