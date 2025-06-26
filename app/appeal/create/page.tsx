'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

type Department = {
  id: string;
  name: string;
};

type User = {
  id: string;
  fullName: string;
};

export default function CreateAppealPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    departmentId: '',
    executorId: ''
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [deptsResponse, usersResponse] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/users')
        ]);
        
        const [deptsData, usersData] = await Promise.all([
          deptsResponse.json(),
          usersResponse.json()
        ]);
        
        setDepartments(deptsData.departments || []);
        setUsers(usersData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      alert('Please authenticate before creating an appeal');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/appeals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          creatorId: user?.id
        }),
      });

      if (response.ok) {
        router.push('/appeal');
      }
    } catch (error) {
      console.error('Error creating appeal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link 
          href="/appeal"
          className="text-blue-500 hover:underline"
        >
          &larr; Back to Appeals
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Создание нового обращения</h1>

      <form onSubmit={handleSubmit} className="max-w-lg">
        <div className="mb-4">
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Тема
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Описание
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={5}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-1">
            Отдел
          </label>
          <select
            id="departmentId"
            name="departmentId"
            value={formData.departmentId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md"
          >
            {/* <option value="">Выбор отдела</option> */}
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* <div className="mb-4">
          <label htmlFor="executorId" className="block text-sm font-medium text-gray-700 mb-1">
            Executor
          </label>
          <select
            id="executorId"
            name="executorId"
            value={formData.executorId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">Select Executor</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </div> */}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Создание...' : 'Создать обращение'}
        </button>
      </form>
    </div>
  );
}
