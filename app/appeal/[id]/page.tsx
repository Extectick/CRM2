'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Appeal } from '@prisma/client';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AppealDetailPage() {
  const { id } = useParams();
  const [appeal, setAppeal] = useState<Appeal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppeal() {
      try {
        const response = await fetch(`/api/appeals/${id}`);
        const data = await response.json();
        setAppeal(data);
      } catch (error) {
        console.error('Error fetching appeal:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAppeal();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка обращения..." />
      </div>
    );
  }

  if (!appeal) {
    return <div>Обращение не найдено</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link 
          href="/appeal"
          className="text-blue-500 hover:underline"
        >
          &larr; Назад к списку обращений
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">{appeal.subject}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h2 className="text-sm font-medium text-gray-500">Статус</h2>
            <p className="text-lg">{
              appeal.status === 'PENDING' ? 'Отправлено' :
              appeal.status === 'IN_PROGRESS' ? 'В работе' :
              appeal.status === 'IN_CONFIRMATION' ? 'На подтверждении' :
              appeal.status === 'COMPLETED' ? 'Завершено' :
              appeal.status === 'REJECTED' ? 'Отклонено' :
              appeal.status
            }</p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500">Созданно</h2>
            <p className="text-lg">{new Date(appeal.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500">Взял в работу</h2>
          <p className="mt-1 text-lg whitespace-pre-line">{appeal.executorId === null ? '-' : appeal.executorId}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500">Описание</h2>
          <p className="mt-1 text-lg whitespace-pre-line">{appeal.description}</p>
        </div>
      </div>
    </div>
  );
}
