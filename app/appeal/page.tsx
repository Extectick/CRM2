'use client';

import { useEffect, useState } from 'react';
import { Appeal, User } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { FilePlus } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
}

function getStatusText(status: string) {
  switch (status) {
    case 'PENDING': return 'Отправлено';
    case 'IN_PROGRESS': return 'В работе';
    case 'IN_CONFIRMATION': return 'На подтверждении';
    case 'COMPLETED': return 'Завершено';
    case 'REJECTED': return 'Отклонено';
    default: return status;
  }
}

export default function AppealPage() {
  const [myAppeals, setMyAppeals] = useState<ExtendedAppeal[]>([]);
  const [departmentTasks, setDepartmentTasks] = useState<Appeal[]>([]);
  const [myTasks, setMyTasks] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    taskId: '',
    taskSubject: '',
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { user } = useAuth();
  const [defaultTab, setDefaultTab] = useState('myAppeals');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('returnTab');
      if (tab && ['myAppeals', 'departmentTasks', 'myTasks'].includes(tab)) {
        setDefaultTab(tab);
      }
    }
  }, []);

  // Общая функция загрузки данных
  const fetchAllData = async () => {
    if (!user?.id) return;

    try {
      // Загрузка моих обращений
      const appealsResponse = await fetch('/api/appeals', {
        headers: {
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || ''
        }
      });
      const appealsData = await appealsResponse.json();
      setMyAppeals(appealsData);

      // Загрузка задач отдела (если пользователь в отделе)
      if (user?.department?.id) {
        const deptResponse = await fetch(`/api/appeals?department=${user.department.id}`, {
          headers: {
            'x-telegram-init-data': window.Telegram?.WebApp?.initData || ''
          }
        });
        const deptData = await deptResponse.json();
        setDepartmentTasks(deptData);

        // Загрузка моих задач
        const myTasksResponse = await fetch(`/api/appeals?executor=${user.id}`, {
          headers: {
            'x-telegram-init-data': window.Telegram?.WebApp?.initData || ''
          }
        });
        const myTasksData = await myTasksResponse.json();
        setMyTasks(myTasksData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Общая логика SSE
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!window.Telegram?.WebApp?.initData) {
        console.error('Telegram auth data not found');
        setIsAuthorized(false);
        return;
      }
      setIsAuthorized(true);
    }

    if (!user?.id) return;

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const setupSSE = () => {
      eventSource = new EventSource('/api/sse');
      
      eventSource.onmessage = (event: MessageEvent) => {
        try {
          if (typeof event.data !== 'string') return;
          if (!event.data.startsWith('data: ')) return;
          
          const message = event.data.substring(6).trim();
          if (!message || message === 'keepalive' || message === 'connected') return;
          if (!message.startsWith('{') || !message.endsWith('}')) return;
          
          const data = JSON.parse(message);
          
          if (data?.type === 'appeal_change') {
            // Обновление моих обращений
            if (data.operation === 'create' && data.creatorId === user?.id) {
              setMyAppeals(prev => [...prev, {
                id: data.id,
                number: data.data.number,
                subject: data.data.subject,
                description: data.data.description || '',
                status: data.data.status,
                departmentId: data.departmentId,
                creatorId: data.creatorId,
                executorId: data.data.executorId || null,
                chatId: data.data.chatId || null,
                lastNotifiedAt: data.data.lastNotifiedAt ? new Date(data.data.lastNotifiedAt) : null,
                createdAt: new Date(data.createdAt),
                updatedAt: new Date(data.updatedAt || data.createdAt),
                executors: data.data.executors || []
              }]);
            }
            
            // Обновление задач отдела
            if (user?.department?.id && data.departmentId === user.department.id) {
              setDepartmentTasks(prev => {
                if (data.operation === 'create') {
                  return [...prev, {
                    id: data.id,
                    number: data.data.number,
                    subject: data.data.subject,
                    description: data.data.description || '',
                    status: data.data.status,
                    departmentId: data.departmentId,
                    creatorId: data.creatorId,
                    executorId: data.data.executorId || null,
                    chatId: data.data.chatId || null,
                    lastNotifiedAt: data.data.lastNotifiedAt ? new Date(data.data.lastNotifiedAt) : null,
                    createdAt: new Date(data.createdAt),
                    updatedAt: new Date(data.updatedAt || data.createdAt)
                  }];
                }
                return prev.map(task => 
                  task.id === data.id ? { 
                    ...task, 
                    status: data.data.status,
                    executorId: data.data.executorId,
                    subject: data.data.subject,
                    number: data.data.number
                  } : task
                );
              });
            }
            
            // Обновление моих задач
            setMyTasks(prev => {
              if (data.operation === 'delete') {
                return prev.filter(task => task.id !== data.id);
              }
              if (data.operation === 'update') {
                if (data.data.status === 'COMPLETED' || data.data.status === 'REJECTED') {
                  return prev.filter(task => task.id !== data.id);
                }
                if (data.data.executorId === user?.id) {
                  const existing = prev.find(t => t.id === data.id);
                  if (existing) {
                    return prev.map(task => 
                      task.id === data.id ? {
                        ...task,
                        status: data.data.status,
                        executorId: data.data.executorId,
                        subject: data.data.subject,
                        number: data.data.number
                      } : task
                    );
                  }
                  return [...prev, {
                    id: data.id,
                    number: data.data.number,
                    subject: data.data.subject,
                    description: data.data.description || '',
                    status: data.data.status,
                    departmentId: data.departmentId,
                    creatorId: data.creatorId,
                    executorId: data.data.executorId || null,
                    chatId: data.data.chatId || null,
                    lastNotifiedAt: data.data.lastNotifiedAt ? new Date(data.data.lastNotifiedAt) : null,
                    createdAt: new Date(data.createdAt),
                    updatedAt: new Date(data.updatedAt || data.createdAt)
                  }];
                }
                return prev.filter(task => task.id !== data.id);
              }
              return prev;
            });
          }
        } catch (error) {
          console.error('Error processing SSE event:', error);
        }
      };
    };

    fetchAllData();
    if (window.EventSource) {
      setupSSE();
    } else {
      pollInterval = setInterval(fetchAllData, 30000);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user]);

  const updateTaskStatus = async (taskId: string, status: 'IN_PROGRESS' | 'IN_CONFIRMATION' | 'COMPLETED' | 'REJECTED') => {
    try {
      const updatedTask = {
        ...departmentTasks.find(t => t.id === taskId) || myTasks.find(t => t.id === taskId),
        status,
        ...(status === 'IN_PROGRESS' ? { executorId: user?.id } : {}),
        ...(status === 'REJECTED' ? { executorId: null } : {})
      } as Appeal;

      setDepartmentTasks(prev => 
        prev.map(task => task.id === taskId ? updatedTask : task)
      );

      if (status === 'COMPLETED' || status === 'REJECTED') {
        setMyTasks(prev => prev.filter(task => task.id !== taskId));
      } else if (status === 'IN_PROGRESS') {
        setMyTasks(prev => [...prev, updatedTask]);
      } else {
        setMyTasks(prev => 
          prev.map(task => task.id === taskId ? updatedTask : task)
        );
      }

      await fetch(`/api/appeals/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || ''
        },
        body: JSON.stringify({ 
          status: status,
          userId: user?.id
        })
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  if (!isAuthorized && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Требуется авторизация</h2>
          <p className="mb-4">Пожалуйста, войдите через Telegram</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка данных..." />
      </div>
    );
  }

return (
  <div className="container mx-auto p-4 pb-20">
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold text-gray-800">Обращения и задачи</h1>
      <Link
        href="/appeal/create?returnTab=myAppeals"
        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
      >
        <FilePlus className="w-5 h-5" />
        <span className="text-sm">Новое обращение</span>
      </Link>
    </div>

    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-lg">
        <TabsTrigger value="myAppeals">Мои обращения</TabsTrigger>
        <TabsTrigger value="departmentTasks">Задачи отдела</TabsTrigger>
        <TabsTrigger value="myTasks">Мои задачи</TabsTrigger>
      </TabsList>

      <TabsContent value="myAppeals">
        <div className="space-y-4 mt-4">
          {myAppeals.length === 0 ? (
            <div className="p-4 border rounded text-center text-gray-500 bg-white shadow-sm">
              У вас пока нет обращений
            </div>
          ) : (
            myAppeals.map((appeal) => (
              <Link
                key={appeal.id}
                href={`/appeal/${appeal.id}`}
                className="block p-4 border rounded-lg bg-white hover:shadow transition"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-sm text-gray-400 font-mono">#{appeal.number}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {getStatusText(appeal.status)}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-800 mt-1">{appeal.subject}</h2>
                {appeal.executors?.length ? (
                  <p className="text-sm text-gray-500 mt-1">
                    Исполнители: {appeal.executors.map(e => e.fullName).join(', ')}
                  </p>
                ) : null}
              </Link>
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="departmentTasks">
        <div className="space-y-4 mt-4">
          {departmentTasks.map(task => (
            <div key={task.id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow transition">
              <h3 className="text-md font-semibold text-gray-800">
                #{task.number} - {task.subject}
              </h3>
              <p className="text-gray-600 text-sm mt-1">{task.description}</p>
              <p className="text-sm mt-1 text-gray-500">
                Статус: <span className="font-medium">{getStatusText(task.status)}</span>
              </p>
              {task.status === 'PENDING' && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => setConfirmDialog({ open: true, taskId: task.id, taskSubject: task.subject })}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 text-sm"
                  >
                    Принять задачу
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="myTasks">
        <div className="space-y-4 mt-4">
          {myTasks.map(task => (
            <div key={task.id} className="p-4 border rounded-lg bg-white shadow-sm hover:shadow transition">
              <h3 className="text-md font-semibold text-gray-800">
                #{task.number} - {task.subject}
              </h3>
              <p className="text-gray-600 text-sm mt-1">{task.description}</p>
              <p className="text-sm mt-1 text-gray-500">
                Статус: <span className="font-medium">{getStatusText(task.status)}</span>
              </p>
              {task.status === 'IN_PROGRESS' && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => updateTaskStatus(task.id, 'IN_CONFIRMATION')}
                    className="bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 text-sm"
                  >
                    На подтверждение
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>

    <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Подтверждение</AlertDialogTitle>
          <AlertDialogDescription>
            Вы действительно хотите принять задачу &quot;{confirmDialog.taskSubject}&quot;?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => updateTaskStatus(confirmDialog.taskId, 'IN_PROGRESS')}
          >
            Принять
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);

}
