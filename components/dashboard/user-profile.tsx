'use client';

import { useState } from 'react';
import { useTelegram } from '@/hooks/use-telegram';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Building2, Shield, Calendar, Hash, Edit } from 'lucide-react';

interface UserProfileProps {
  user: {
    id: string;
    telegramId: string;
    fullName: string;
    role: 'USER' | 'DEPARTMENT_HEAD' | 'ADMIN';
    department: {
      id: string;
      name: string;
    };
    createdAt: string;
  };
  departments?: Array<{
    id: string;
    name: string;
  }>;
}

const roleLabels = {
  USER: 'Пользователь',
  DEPARTMENT_HEAD: 'Начальник отдела',
  ADMIN: 'Администратор',
};

const roleColors = {
  USER: 'bg-gray-100 text-gray-800 border-gray-200',
  DEPARTMENT_HEAD: 'bg-blue-100 text-blue-800 border-blue-200',
  ADMIN: 'bg-red-100 text-red-800 border-red-200',
};

export function UserProfile({ user, departments }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { webApp } = useTelegram();

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      if (!webApp) {
        throw new Error('Telegram WebApp not initialized');
      }
      const initData = webApp.initData || '';
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData,
        },
        body: JSON.stringify({
          fullName: editedUser.fullName,
          departmentId: editedUser.department.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      setEditedUser({
        ...updatedUser,
        department: {
          id: updatedUser.department.id,
          name: updatedUser.department.name
        }
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedUser(user);
    setIsEditing(false);
    setError(null);
  };
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Профиль пользователя
          </h1>
          <p className="text-gray-600">
            Информация о вашем аккаунте
          </p>
        </div>

        {/* Main Profile Card */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Avatar className="w-20 h-20 bg-blue-500 text-white text-xl font-bold">
                <AvatarFallback className="bg-blue-500 text-white text-xl">
                  {getInitials(user.fullName)}
                </AvatarFallback>
              </Avatar>
            </div>
            {isEditing ? (
              <div className="w-full">
                <input
                  type="text"
                  value={editedUser.fullName}
                  onChange={(e) => setEditedUser({
                    ...editedUser,
                    fullName: e.target.value
                  })}
                  className="w-full p-2 border border-gray-300 rounded-md mb-4"
                />
                {departments && (
                  <select
                    value={editedUser.department.id}
                    onChange={(e) => setEditedUser({
                      ...editedUser,
                      department: {
                        ...editedUser.department,
                        id: e.target.value,
                        name: departments.find(d => d.id === e.target.value)?.name || ''
                      }
                    })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <CardTitle className="text-2xl font-bold text-gray-900">
                {editedUser.fullName}
              </CardTitle>
            )}
            <div className="flex justify-center mt-2 space-x-2">
              <Badge className={`${roleColors[user.role]} font-medium`}>
                <Shield className="w-3 h-3 mr-1" />
                {roleLabels[user.role]}
              </Badge>
              {!isEditing ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Редактировать
                </Button>
              ) : (
                <>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Отмена
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
        {/* Department Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Building2 className="w-5 h-5 text-blue-500 mr-2" />
            <span className="font-medium text-gray-700">Отдел</span>
          </div>
          <p className="text-gray-900 font-semibold">
            {isEditing ? editedUser.department.name : editedUser.department.name}
          </p>
        </div>

            {/* Telegram ID */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Hash className="w-5 h-5 text-blue-500 mr-2" />
                <span className="font-medium text-gray-700">Telegram ID</span>
              </div>
              <p className="text-gray-900 font-mono">{user.telegramId}</p>
            </div>

            {/* Registration Date */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 text-blue-500 mr-2" />
                <span className="font-medium text-gray-700">Дата регистрации</span>
              </div>
              <p className="text-gray-900">{formatDate(user.createdAt)}</p>
            </div>

            {/* Additional Info for Admins and Department Heads */}
            {(user.role === 'ADMIN' || user.role === 'DEPARTMENT_HEAD') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <User className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-700">Права доступа</span>
                </div>
                <p className="text-blue-800 text-sm">
                  {user.role === 'ADMIN' 
                    ? 'У вас есть полные права администратора системы'
                    : 'У вас есть права начальника отдела'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* System Info Card */}
        <Card className="bg-white/90 backdrop-blur border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-700">Системная информация</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <div className="flex justify-between">
              <span>ID пользователя:</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span>ID отдела:</span>
              <span className="font-mono text-xs">{user.department.id}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
