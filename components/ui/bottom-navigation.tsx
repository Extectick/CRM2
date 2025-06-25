'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, FileUser, ListTodo } from 'lucide-react';

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16">
      <Link href="/" className={`flex flex-col items-center ${pathname === '/' ? 'text-blue-500' : 'text-gray-500'}`}>
        <Home className="h-6 w-6" />
        <span className="text-xs mt-1">Главная</span>
      </Link>
      
      <Link href="/task" className={`flex flex-col items-center ${pathname === '/notifications' ? 'text-blue-500' : 'text-gray-500'}`}>
        <ListTodo className="h-6 w-6" />
        <span className="text-xs mt-1">Задачи</span>
      </Link>
      <Link href="/appeal" className={`flex flex-col items-center ${pathname === '/appeal' ? 'text-blue-500' : 'text-gray-500'}`}>
        <FileUser className="h-6 w-6"/>
        <span className="text-xs mt-1">Мои обращения</span>
      </Link>
      <Link href="/profile" className={`flex flex-col items-center ${pathname === '/profile' ? 'text-blue-500' : 'text-gray-500'}`}>
        <User className="h-6 w-6" />
        <span className="text-xs mt-1">Профиль</span>
      </Link>
      
    </div>
  );
}
