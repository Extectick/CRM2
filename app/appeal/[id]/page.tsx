'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Appeal, User, AppealMessage } from '@prisma/client';

interface ExtendedAppeal extends Appeal {
  executors?: User[];
  department?: {
    id: string;
    name: string;
  };
  creator?: {
    id: string;
    fullName: string;
  };
  executor?: {
    id: string;
    fullName: string;
  } | null;
  messages?: (AppealMessage & {
    sender: {
      id: string;
      fullName: string;
    };
  })[];
}
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/use-auth';

export default function AppealDetailPage() {
  const { id } = useParams();
  const [appeal, setAppeal] = useState<ExtendedAppeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchAppeal() {
      try {
        const response = await fetch(`/api/appeals/${id}`, {
          headers: {
            'x-telegram-init-data': window.Telegram?.WebApp?.initData || ''
          }
        });
        const data = await response.json();
        setAppeal(data);
      } catch (error) {
        console.error('Error fetching appeal:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAppeal();

    // Connect to WebSocket
    if (user && id) {
      const wsUrl = new URL('/api/ws', window.location.href);
      wsUrl.protocol = wsUrl.protocol.replace('http', 'ws');
      wsUrl.searchParams.set('appealId', id as string);
      wsUrl.searchParams.set('userId', user.id);

      const socket = new WebSocket(wsUrl.toString());
      setWs(socket);

      socket.onopen = () => {
        console.log('WebSocket connected');
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setAppeal(prev => prev ? {
            ...prev,
            messages: [...(prev.messages || []), data.data]
          } : null);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
      };

      return () => {
        socket.close();
      };
    }
  }, [id, user]);

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

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Переписка</h2>
          
          <div className="space-y-4 mb-6">
            {appeal.messages?.map(msg => (
              <div key={msg.id} className={`p-4 rounded-lg ${msg.senderId === user?.id ? 'bg-blue-50 ml-auto max-w-[80%]' : 'bg-gray-50 mr-auto max-w-[80%]'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{msg.sender?.fullName}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-line">{msg.content}</p>
                {msg.fileUrl && (
                  <a 
                    href={msg.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline block mt-2"
                  >
                    Прикрепленный файл
                  </a>
                )}
              </div>
            ))}
          </div>

          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              if (!message.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

              // Create form data for file upload
              const formData = new FormData();
              formData.append('content', message);
              
              // Send message via WebSocket
              ws.send(JSON.stringify({
                type: 'message',
                content: message,
                appealId: id,
                senderId: user?.id
              }));
              setMessage('');
            }}
            className="flex gap-2"
          >
            <div className="flex-1 flex flex-col gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Введите сообщение..."
                className="p-2 border rounded"
              />
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !ws || ws.readyState !== WebSocket.OPEN) return;

                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('appealId', id as string);
                  formData.append('senderId', user?.id || '');

                  try {
                    const response = await fetch('/api/appeals/messages/upload', {
                      method: 'POST',
                      body: formData
                    });
                    const result = await response.json();
                    
                    if (response.ok) {
                      ws.send(JSON.stringify({
                        type: 'file',
                        fileUrl: result.fileUrl,
                        fileType: result.fileType,
                        fileSize: result.fileSize,
                        appealId: id,
                        senderId: user?.id
                      }));
                    }
                  } catch (error) {
                    console.error('Error uploading file:', error);
                  }
                }}
              />
              <label 
                htmlFor="file-upload"
                className="text-sm text-blue-500 hover:underline cursor-pointer"
              >
                Прикрепить файл
              </label>
            </div>
            <button 
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Отправить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
