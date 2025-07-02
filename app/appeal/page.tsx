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
  const [confirmDialog, setConfirmDialog] = useState({ open: false, taskId: '', taskSubject: '' });
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

  const fetchAllData = async () => {
    if (!user?.id) return;

    try {
      const headers = { 'x-telegram-init-data': window.Telegram?.WebApp?.initData || '' };

      // Мои обращения
      const myRes = await fetch('/api/appeals', { headers });
      setMyAppeals(await myRes.json());

      // Задачи отдела
      if (user.department?.id) {
        const depRes = await fetch(`/api/appeals?department=${user.department.id}`, { headers });
        setDepartmentTasks(await depRes.json());
      }

      // Мои задачи
      const execRes = await fetch(`/api/appeals?executor=${user.id}`, { headers });
      setMyTasks(await execRes.json());
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      return;
    }

    fetchAllData();

    let eventSource: EventSource | null = null;
    let interval: NodeJS.Timeout | null = null;

    const handleSSE = () => {
      eventSource = new EventSource('/api/sse');

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const raw = event.data;

          if (!raw.startsWith('{')) return;

          const data = JSON.parse(raw);

          if (data.type === 'appeal_change') {
            console.log('[SSE] appeal_change received:', data);
            console.log('[SSE] User departmentId:', user?.department?.id);
            console.log('[SSE] Data departmentId:', data.departmentId);

            if (data.operation === 'create') {
              if (data.creatorId === user?.id) {
                setMyAppeals(prev => [data.data, ...prev]);
              }

              if (String(data.departmentId) === String(user?.department?.id)) {
                setDepartmentTasks(prev => [data.data, ...prev]);
              }

              if (data.data.executorId === user?.id) {
                setMyTasks(prev => [data.data, ...prev]);
              }
            }

            if (data.operation === 'update') {
              const updated = (list: Appeal[]) =>
                list.map(task => task.id === data.id ? { ...task, ...data.data } : task);

              setMyAppeals(prev => updated(prev));
              setDepartmentTasks(prev => updated(prev));
              setMyTasks(prev => updated(prev));
            }

            if (data.operation === 'delete') {
              const filtered = (list: Appeal[]) => list.filter(task => task.id !== data.id);
              setMyAppeals(prev => filtered(prev));
              setDepartmentTasks(prev => filtered(prev));
              setMyTasks(prev => filtered(prev));
            }
          }
        } catch (e) {
          console.error('Ошибка SSE:', e);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[SSE] Ошибка соединения', err);
        eventSource?.close();
        // Можно добавить повторное подключение, если нужно
      };
    };

    if (window.EventSource) {
      handleSSE();
    } else {
      interval = setInterval(fetchAllData, 30000);
    }

    return () => {
      eventSource?.close();
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const updateTaskStatus = async (taskId: string, status: 'IN_PROGRESS' | 'IN_CONFIRMATION' | 'COMPLETED' | 'REJECTED') => {
    try {
      const target = departmentTasks.find(t => t.id === taskId) || myTasks.find(t => t.id === taskId);
      if (!target) return;

      const updatedTask = {
        ...target,
        status,
        executorId:
          status === 'IN_PROGRESS'
            ? user?.id ?? null
            : status === 'REJECTED'
              ? null
              : target.executorId ?? null,
      };

      setDepartmentTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      setMyTasks(prev =>
        status === 'COMPLETED' || status === 'REJECTED'
          ? prev.filter(t => t.id !== taskId)
          : [...prev.filter(t => t.id !== taskId), updatedTask]
      );

      await fetch(`/api/appeals/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || ''
        },
        body: JSON.stringify({ status, userId: user?.id })
      });
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
    }
  };

  if (!isAuthorized && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white shadow p-6 rounded">
          <h2 className="text-lg font-semibold mb-2">Требуется авторизация</h2>
          <p className="text-sm mb-4">Пожалуйста, войдите через Telegram</p>
          <button onClick={() => window.location.reload()} className="bg-blue-500 text-white px-4 py-2 rounded">
            Обновить
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка данных..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Обращения и задачи</h1>
        <Link
          href="/appeal/create?returnTab=myAppeals"
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          <FilePlus size={18} />
          <span>Новое обращение</span>
        </Link>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="myAppeals">Мои обращения</TabsTrigger>
          <TabsTrigger value="departmentTasks">Задачи отдела</TabsTrigger>
          <TabsTrigger value="myTasks">Мои задачи</TabsTrigger>
        </TabsList>

        <TabsContent value="myAppeals">
          <div className="mt-4 space-y-4">
            {myAppeals.length === 0 ? (
              <div className="text-center text-gray-500">У вас пока нет обращений</div>
            ) : (
              myAppeals.map(appeal => (
                <Link
                  key={appeal.id}
                  href={`/appeal/${appeal.id}`}
                  className="block p-4 border rounded hover:shadow bg-white"
                >
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>#{appeal.number}</span>
                    <span>{getStatusText(appeal.status)}</span>
                  </div>
                  <div className="text-lg font-semibold text-gray-800">{appeal.subject}</div>
                </Link>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="departmentTasks">
          <div className="mt-4 space-y-4">
            {departmentTasks.length === 0 ? (
              <div className="text-center text-gray-500">Нет задач в вашем отделе</div>
            ) : (
              departmentTasks.map(task => (
                <div key={task.id} className="p-4 border rounded bg-white shadow-sm">
                  <div className="font-semibold">#{task.number} — {task.subject}</div>
                  <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                  <div className="text-sm text-gray-500 mt-1">Статус: {getStatusText(task.status)}</div>
                  {task.status === 'PENDING' && (
                    <div className="mt-2 text-right">
                      <button
                        onClick={() => setConfirmDialog({ open: true, taskId: task.id, taskSubject: task.subject })}
                        className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-600"
                      >
                        Принять задачу
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="myTasks">
          <div className="mt-4 space-y-4">
            {myTasks.length === 0 ? (
              <div className="text-center text-gray-500">У вас пока нет задач</div>
            ) : (
              myTasks.map(task => (
                <div key={task.id} className="p-4 border rounded bg-white shadow-sm">
                  <div className="font-semibold">#{task.number} — {task.subject}</div>
                  <div className="text-sm text-gray-600 mt-1">{task.description}</div>
                  <div className="text-sm text-gray-500 mt-1">Статус: {getStatusText(task.status)}</div>
                  {task.status === 'IN_PROGRESS' && (
                    <div className="mt-2 text-right">
                      <button
                        onClick={() => updateTaskStatus(task.id, 'IN_CONFIRMATION')}
                        className="bg-green-500 text-white px-3 py-1.5 rounded text-sm hover:bg-green-600"
                      >
                        На подтверждение
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDialog.open} onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Принять задачу</AlertDialogTitle>
            <AlertDialogDescription>
              Вы действительно хотите принять задачу &quot;{confirmDialog.taskSubject}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => updateTaskStatus(confirmDialog.taskId, 'IN_PROGRESS')}>
              Принять
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
