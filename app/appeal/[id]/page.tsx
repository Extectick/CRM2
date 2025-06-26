'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Appeal } from '@prisma/client';
import Link from 'next/link';

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
    return <div>Загрузка данных обращения...</div>;
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
            <p className="text-lg">{appeal.status}</p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500">Созданно</h2>
            <p className="text-lg">{new Date(appeal.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500">Описание</h2>
          <p className="mt-1 text-lg whitespace-pre-line">{appeal.description}</p>
        </div>
      </div>
    </div>
  );
}
