'use client';

import { useAuth } from '@/hooks/use-auth';
import { useTelegram } from '@/hooks/use-telegram';
import { RegistrationForm } from '@/components/auth/registration-form';
import { UserProfile } from '@/components/dashboard/user-profile';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { BottomNavigation } from '@/components/ui/bottom-navigation';

export default function Home() {
  const { isReady: telegramReady } = useTelegram();
  const { user, departments, loading, error, register } = useAuth();

  if (!telegramReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Инициализация Telegram WebApp..." />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка..." />
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
      <RegistrationForm
        departments={departments}
        onRegister={register}
        loading={loading}
      />
    );
  }

  return (
    <div className="pb-16">
      <UserProfile user={user} />
      <BottomNavigation />
    </div>
  );
}
