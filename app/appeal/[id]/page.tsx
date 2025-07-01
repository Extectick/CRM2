'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Appeal, AppealMessage, User } from '@prisma/client';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/use-auth';

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

export default function AppealDetailPage() {
  const { id } = useParams();
  const [appeal, setAppeal] = useState<ExtendedAppeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAppeal = async () => {
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
    };

    fetchAppeal();

    const eventSource = new EventSource('/api/sse');
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if ((parsed.type === 'message' || parsed.type === 'file') && parsed.appealId === id) {
          setAppeal((prev) =>
            prev ? { ...prev, messages: [...(prev.messages || []), parsed.data] } : prev
          );
        }
      } catch (err) {
        console.error('Ошибка обработки SSE:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [id]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [appeal?.messages]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка обращения..." />
      </div>
    );
  }

  if (!appeal) {
    return <div>Обращение не найдено</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b shadow-sm p-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/appeal" className="text-blue-500 hover:underline text-sm">&larr; Назад</Link>
          <h1 className="text-xl font-semibold mt-2">{appeal.subject}</h1>
          <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">{appeal.description}</p>
          <div className="text-xs text-gray-500 mt-1">Статус: {appeal.status}</div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div ref={chatRef} className="max-w-3xl mx-auto px-4 py-6 space-y-4 overflow-y-auto h-full">
          {appeal.messages?.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg max-w-[80%] text-sm shadow-sm whitespace-pre-wrap ${msg.senderId === user?.id ? 'bg-blue-100 ml-auto text-right' : 'bg-gray-100 mr-auto'}`}
            >
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span>{msg.sender.fullName}</span>
                <span>{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <p>{msg.content}</p>
              {msg.fileUrl && (
                <a
                  href={msg.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline block mt-1"
                >
                  📎 Прикрепленный файл
                </a>
              )}
            </div>
          ))}
        </div>
      </main>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!message.trim()) return;

          try {
            await fetch(`/api/appeals/${id}/messages/text`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-telegram-init-data': window.Telegram?.WebApp?.initData || ''
              },
              body: JSON.stringify({
                content: message,
                senderId: user?.id
              })
            });
            setMessage('');
          } catch (err) {
            console.error('Ошибка отправки:', err);
          }
        }}
        className="border-t bg-white p-4 flex gap-2"
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Введите сообщение..."
          className="flex-1 border px-3 py-2 rounded focus:outline-none focus:ring focus:border-blue-300"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Отправить
        </button>
      </form>
    </div>
  );
}
