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
  department?: { id: string; name: string };
  creator?: { id: string; fullName: string };
  executor?: { id: string; fullName: string } | null;
  updated?: boolean;
  isClosing?: boolean;
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

function getStatusColor(status: string) {
  switch (status) {
    case 'PENDING': return 'text-gray-500 bg-gray-100';
    case 'IN_PROGRESS': return 'text-blue-500 bg-blue-100';
    case 'IN_CONFIRMATION': return 'text-yellow-500 bg-yellow-100';
    case 'COMPLETED': return 'text-green-500 bg-green-100';
    case 'REJECTED': return 'text-red-500 bg-red-100';
    default: return 'text-gray-500 bg-gray-100';
  }
}

export default function AppealPage() {
  const [myAppeals, setMyAppeals] = useState<ExtendedAppeal[]>([]);
  const [departmentTasks, setDepartmentTasks] = useState<ExtendedAppeal[]>([]);
  const [myTasks, setMyTasks] = useState<ExtendedAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; taskId: string; taskSubject: string; type: 'accept' | 'close' }>({
    open: false,
    taskId: '',
    taskSubject: '',
    type: 'accept',
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { user } = useAuth();
  const [defaultTab, setDefaultTab] = useState<'myAppeals' | 'departmentTasks' | 'myTasks'>('myAppeals');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('returnTab');
      if (tab === 'myAppeals' || tab === 'departmentTasks' || tab === 'myTasks') {
        setDefaultTab(tab);
      }
    }
  }, []);

  const fetchAllData = async () => {
    if (!user?.id) return;

    try {
      const headers = { 'x-telegram-init-data': window.Telegram?.WebApp?.initData || '' };

      const [myRes, depRes, execRes] = await Promise.all([
        fetch('/api/appeals', { headers }),
        user.department?.id ? fetch(`/api/appeals?department=${user.department.id}`, { headers }) : Promise.resolve(null),
        fetch(`/api/appeals?executor=${user.id}`, { headers }),
      ]);

      if (myRes.ok) setMyAppeals(await myRes.json());
      if (depRes && depRes.ok) setDepartmentTasks(await depRes.json());
      if (execRes.ok) setMyTasks(await execRes.json());
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
    let intervalId: NodeJS.Timeout | null = null;
    let checkConnectionInterval: NodeJS.Timeout | null = null;

    const handleSSE = () => {
      try {
        eventSource = new EventSource('/api/sse');

        eventSource.onopen = () => {
          // console.log('[SSE] Connection opened');
        };

        eventSource.onmessage = (event: MessageEvent) => {
          if (!event.data.startsWith('{')) return;

          try {
            const data = JSON.parse(event.data);

            if (data.type === 'appeal_change') {
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
              } else if (data.operation === 'update') {
                const updateList = (list: ExtendedAppeal[]) =>
                  list.map(item => (item.id === data.id ? { ...item, ...data.data, updated: true } : item));

                setMyAppeals(prev => updateList(prev));
                setDepartmentTasks(prev => updateList(prev));
                setMyTasks(prev => updateList(prev));
              } else if (data.operation === 'delete') {
                const filterList = (list: ExtendedAppeal[]) => list.filter(item => item.id !== data.id);

                setMyAppeals(prev => filterList(prev));
                setDepartmentTasks(prev => filterList(prev));
                setMyTasks(prev => filterList(prev));
              }
            }
          } catch (err) {
            console.error('Ошибка парсинга SSE данных:', err);
          }
        };

        eventSource.onerror = () => {
          eventSource?.close();
          setTimeout(() => handleSSE(), 5000);
        };

        checkConnectionInterval = setInterval(() => {
          if (eventSource?.readyState === EventSource.CLOSED) {
            clearInterval(checkConnectionInterval!);
            handleSSE();
          }
        }, 10000);
      } catch (error) {
        console.error('SSE ошибка:', error);
      }
    };

    // if (typeof EventSource !== 'undefined') {
    //   handleSSE();
    // } else {
    //   intervalId = setInterval(fetchAllData, 3000);
    // }
    intervalId = setInterval(fetchAllData, 10000);
    
    return () => {
      eventSource?.close();
      if (intervalId) clearInterval(intervalId);
      if (checkConnectionInterval) clearInterval(checkConnectionInterval);
    };
  }, [user]);

  const updateTaskStatus = async (
    taskId: string,
    status: 'IN_PROGRESS' | 'IN_CONFIRMATION' | 'COMPLETED' | 'REJECTED'
  ) => {
    try {
      const target =
        departmentTasks.find(t => t.id === taskId) ||
        myTasks.find(t => t.id === taskId) ||
        myAppeals.find(a => a.id === taskId);

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

      setMyAppeals(prev =>
        status === 'COMPLETED' || status === 'REJECTED'
          ? prev.map(a => (a.id === taskId ? { ...a, isClosing: true } : a))
          : prev.map(a => (a.id === taskId ? updatedTask : a))
      );

      setTimeout(() => {
        setMyAppeals(prev => (status === 'COMPLETED' || status === 'REJECTED' ? prev.filter(a => a.id !== taskId) : prev));
      }, 500);

      await fetch(`/api/appeals/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify({ status, userId: user?.id }),
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
        <h1 className="text-2xl font-bold">Мои обращения</h1>
        <Link
          href="/appeal/create?returnTab=myAppeals"
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          <FilePlus size={18} />
          <span>Новое обращение</span>
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {myAppeals.length === 0 ? (
          <div className="text-center text-gray-500">У вас пока нет обращений</div>
        ) : (
          [
            ...myAppeals.filter(a => a.status !== 'COMPLETED' && a.status !== 'REJECTED'),
            ...myAppeals.filter(a => a.status === 'COMPLETED' || a.status === 'REJECTED'),
          ].map(appeal => {
            return (
              <div
                key={appeal.id}
                className={`p-4 border rounded bg-white shadow-sm relative transition-all duration-500 ease-in-out ${
                  appeal.updated ? 'animate-pulse bg-yellow-50' : ''
                } ${appeal.isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                onAnimationEnd={e => {
                  if (e.animationName.includes('pulse')) {
                    setMyAppeals(prev => prev.map(a => (a.id === appeal.id ? { ...a, updated: false } : a)));
                  }
                }}
              >
                <div className="flex justify-between items-center mb-1">
                  <Link href={`/appeal/${appeal.id}`} className="flex-1">
                    <div className="flex justify-between text-sm mb-1 items-center">
                      <span className="text-gray-500">#{appeal.number}</span>
                      <div className="flex items-center h-[18px] gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(appeal.status)}`}>
                          {getStatusText(appeal.status)}
                        </span>
                        {appeal.status !== 'COMPLETED' && appeal.status !== 'REJECTED' && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              e.preventDefault();
                              setConfirmDialog({ open: true, taskId: appeal.id, taskSubject: appeal.subject, type: 'close' });
                            }}
                            className="w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-transform transform hover:scale-110 text-sm"
                            title="Закрыть обращение"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-gray-800">{appeal.subject}</div>
                    <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-2">
                      {appeal.department?.name && (
                        <span>
                          Отдел: 
                          <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                            {appeal.department.name}
                          </span>
                        </span>
                      )}
                      {appeal.executors?.length ? (
                        <span>
                          Исполнители:
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            {appeal.executors.map(e => e.fullName).filter(Boolean).join(', ')}
                          </span> 
                        </span>
                      ) : null}
                      {appeal.executor?.fullName && (
                        <span>
                          Исполнитель: 
                          <span className="px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800">
                            {appeal.executor.fullName}
                          </span>
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'accept' ? 'Подтвердите принятие задачи' : 'Подтвердите закрытие обращения'}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.taskSubject}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDialog.type === 'accept') {
                  await updateTaskStatus(confirmDialog.taskId, 'IN_PROGRESS');
                } else {
                  await updateTaskStatus(confirmDialog.taskId, 'COMPLETED');
                }
                setConfirmDialog({ ...confirmDialog, open: false });
              }}
              className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors duration-200 shadow-sm"
            >
              {confirmDialog.type === 'accept' ? 'Принять задачу' : 'Подтвердить завершение'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
