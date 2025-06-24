# Telegram Mini App - CRM System

Современное веб-приложение для управления сотрудниками компании, интегрированное с Telegram.

## 🚀 Возможности

- **Авторизация через Telegram WebApp** - безопасная аутентификация через initData
- **Система ролей** - Пользователь, Начальник отдела, Администратор
- **Управление отделами** - структурированная организация сотрудников
- **Адаптивный дизайн** - оптимизирован для мобильных устройств
- **TypeScript** - полная типизация для надежности кода
- **PostgreSQL + Prisma** - современная база данных с ORM

## 🛠 Технологии

- **Frontend**: Next.js 14+, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **UI Components**: Radix UI, shadcn/ui
- **Telegram Integration**: @tma.js/sdk

## 📦 Установка и запуск

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd telegram-mini-app
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка базы данных

Создайте файл `.env` в корне проекта:

```env
DATABASE_URL="postgresql://postgres:Ovogup73_@192.168.30.205:5433/CRM?schema=public"
TELEGRAM_BOT_TOKEN=your_bot_token_here
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Инициализация базы данных

```bash
# Генерация Prisma клиента
npm run db:generate

# Применение схемы к базе данных
npm run db:push

# Заполнение базы начальными данными
npm run db:seed
```

### 5. Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`

## 🐳 Docker

### Сборка Docker образа

```bash
docker build -t telegram-mini-app .
```

### Запуск контейнера

```bash
docker run -p 3000:3000 --env-file .env telegram-mini-app
```

## 📊 Структура базы данных

### Users (Пользователи)
- `id` - уникальный идентификатор
- `telegramId` - ID пользователя в Telegram
- `fullName` - полное имя
- `departmentId` - ID отдела
- `role` - роль пользователя (USER, DEPARTMENT_HEAD, ADMIN)

### Departments (Отделы)
- `id` - уникальный идентификатор
- `name` - название отдела

## 🔧 API Endpoints

### Аутентификация
- `GET /api/auth/me` - получение данных текущего пользователя
- `POST /api/auth/register` - регистрация нового пользователя

### Отделы
- `GET /api/departments` - получение списка всех отделов

### Управление пользователями
- `POST /api/users/update-role` - обновление роли пользователя (только для админов)

## 🔐 Безопасность

- Валидация Telegram initData с использованием HMAC-SHA256
- Проверка временных меток для предотвращения replay-атак
- Роль-основанный контроль доступа
- Валидация всех входящих данных с использованием Zod

## 📱 Интеграция с Telegram

### Настройка бота

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите токен бота
3. Настройте веб-приложение командой `/newapp`
4. Укажите URL вашего приложения

### Тестирование

В режиме разработки приложение работает с моковыми данными, что позволяет тестировать функциональность без реального Telegram бота.

## 🚀 Деплой

### Vercel (рекомендуется)

```bash
npm install -g vercel
vercel
```

### Heroku

```bash
# Установите Heroku CLI
heroku create your-app-name
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

## 📝 Логирование

Важные действия логируются в консоль:
- Регистрация новых пользователей
- Изменение ролей
- Ошибки аутентификации

## 🤝 Разработка

### Полезные команды

```bash
# Просмотр базы данных
npm run db:studio

# Сброс базы данных
npm run db:push --force-reset

# Линтинг
npm run lint

# Сборка для продакшена
npm run build
```

### Добавление новых функций

1. Создайте новые API endpoints в `app/api/`
2. Добавьте компоненты в `components/`
3. Обновите типы в `types/`
4. Обновите схему Prisma при необходимости

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи в консоли разработчика
2. Убедитесь в правильности настройки переменных окружения
3. Проверьте подключение к базе данных
4. Убедитесь, что Telegram WebApp SDK загружен

## 📄 Лицензия

MIT License - свободное использование и модификация.