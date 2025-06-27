'use client';

import { useEffect, useState } from 'react';
import { Appeal } from '@prisma/client';
import Link from 'next/link';
import { FilePlus } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AppealPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppeals() {
      try {
        const response = await fetch('/api/appeals');
        const data = await response.json();
        setAppeals(data);
      } catch (error) {
        console.error('Error fetching appeals:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAppeals();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка обращения..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Обращения</h1>
        <Link 
          href="/appeal/create"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          <FilePlus />
        </Link>
      </div>

      <div className="space-y-4">
        {appeals.map((appeal) => (
          <Link 
            key={appeal.id} 
            href={`/appeal/${appeal.id}`}
            className="block p-4 border rounded hover:bg-gray-50"
          >
            <h3 className="text-xs font-sans"># {appeal.number}</h3>
            <h2 className="text-lg font-semibold">{appeal.subject}</h2>
            <p className="text-gray-600">Статус: {
              appeal.status === 'PENDING' ? 'Отправлено' :
              appeal.status === 'IN_PROGRESS' ? 'В работе' :
              appeal.status === 'IN_CONFIRMATION' ? 'На подтверждении' :
              appeal.status === 'COMPLETED' ? 'Завершено' :
              appeal.status === 'REJECTED' ? 'Отклонено' :
              appeal.status
            }</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
