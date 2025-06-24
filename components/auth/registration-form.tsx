'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, Building2 } from 'lucide-react';
import { useTelegram } from '@/hooks/use-telegram';

interface Department {
  id: string;
  name: string;
}

interface RegistrationFormProps {
  departments: Department[];
  onRegister: (fullName: string, departmentId: string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

export function RegistrationForm({ departments, onRegister, loading }: RegistrationFormProps) {
  const [fullName, setFullName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; departmentId?: string }>({});
  const { user: telegramUser, hapticFeedback } = useTelegram();

  const validateForm = () => {
    const newErrors: { fullName?: string; departmentId?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Полное имя обязательно';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Полное имя должно содержать минимум 2 символа';
    }

    if (!departmentId) {
      newErrors.departmentId = 'Выберите отдел';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      hapticFeedback.notification('error');
      return;
    }

    hapticFeedback.impact('light');
    const result = await onRegister(fullName.trim(), departmentId);
    
    if (result.success) {
      hapticFeedback.notification('success');
    } else {
      hapticFeedback.notification('error');
    }
  };

  // Auto-fill name from Telegram if available
  useState(() => {
    if (telegramUser && !fullName) {
      const suggestedName = `${telegramUser.first_name}${telegramUser.last_name ? ' ' + telegramUser.last_name : ''}`;
      setFullName(suggestedName);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Добро пожаловать!
          </CardTitle>
          <CardDescription className="text-gray-600">
            Пожалуйста, заполните информацию для регистрации
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                Полное имя *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) {
                      setErrors(prev => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  placeholder="Введите ваше полное имя"
                  className={`pl-10 transition-colors ${errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}
                  disabled={loading}
                />
              </div>
              {errors.fullName && (
                <p className="text-sm text-red-600 font-medium">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                Отдел *
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400 z-10" />
                <Select 
                  value={departmentId} 
                  onValueChange={(value) => {
                    setDepartmentId(value);
                    if (errors.departmentId) {
                      setErrors(prev => ({ ...prev, departmentId: undefined }));
                    }
                  }}
                  disabled={loading}
                >
                  <SelectTrigger className={`pl-10 transition-colors ${errors.departmentId ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}`}>
                    <SelectValue placeholder="Выберите отдел" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.departmentId && (
                <p className="text-sm text-red-600 font-medium">{errors.departmentId}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 h-auto transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Регистрация...
                </>
              ) : (
                'Завершить регистрацию'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}