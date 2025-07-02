import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramData } from '@/lib/telegram';

declare global {
  var sseClients: Set<{
    writer: WritableStreamDefaultWriter<string>;
    close: () => void;
    closed: boolean;
  }>;
}

// Тип для тела POST-запроса на создание обращения
type CreateAppealBody = {
  subject: string;
  description: string;
  departmentId?: string;
  executorId?: string;
};

 // SSE-рассылка события
function broadcastSseMessage(message: any) {
  if (!global.sseClients || global.sseClients.size === 0) {
    console.log('[SSE] Нет подключенных клиентов для рассылки события');
    return;
  }

  console.log(`[SSE] Отправка события ${message.type} (${message.operation}) для ${global.sseClients.size} клиентов`);
  const messageStr = `data: ${JSON.stringify(message)}\n\n`;

  global.sseClients.forEach(client => {
    client.writer.write(messageStr).catch(error => {
      console.error('[SSE] Ошибка записи для клиента:', error);
      client.close();
    });
  });
}

// GET — получить обращения (по параметрам: creator, department, executor)
export async function GET(request: Request) {
  try {
    const initData = request.headers.get('x-telegram-init-data');
    if (!initData) {
      return NextResponse.json({ error: 'Необходима авторизация Telegram' }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramData = await validateTelegramData(initData, botToken);
    if (!telegramData) {
      return NextResponse.json({ error: 'Неверные данные Telegram' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: telegramData.user.id.toString() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department');
    const executorId = searchParams.get('executor');

    const where: any = {};

    if (departmentId) {
      where.departmentId = departmentId;
    } else if (executorId) {
      where.executorId = executorId;
    } else {
      where.creatorId = user.id;
    }

    const appeals = await prisma.appeal.findMany({
      where,
      include: {
        department: true,
        creator: true,
        executors: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(appeals, { status: 200 });
  } catch (error) {
    console.error('Ошибка при получении обращений:', error);
    return NextResponse.json({ error: 'Ошибка при получении обращений' }, { status: 500 });
  }
}

// POST — создать обращение
export async function POST(req: Request) {
  try {
    const initData = req.headers.get('x-telegram-init-data') || '';
    const tgData = await validateTelegramData(initData);
    if (!tgData) return new NextResponse('Unauthorized', { status: 401 });

    const user = await prisma.user.findUnique({
      where: { telegramId: tgData.user.id.toString() },
      include: { department: true },
    });

    if (!user) return new NextResponse('User not found', { status: 404 });

    const body: CreateAppealBody = await req.json();

    // Запрет обычному пользователю указывать чужой отдел
    // if (
    //   user.role === 'USER' &&
    //   body.departmentId &&
    //   body.departmentId !== user.departmentId
    // ) {
    //   return new NextResponse('Вы не можете создавать обращения в другие отделы', { status: 403 });
    // }

    const appeal = await prisma.appeal.create({
      data: {
        subject: body.subject,
        description: body.description,
        departmentId: body.departmentId || user.departmentId,
        creatorId: user.id,
        executorId: body.executorId || null,
      },
    });

    broadcastSseMessage({
      type: 'appeal_change',
      operation: 'create',
      creatorId: appeal.creatorId,
      departmentId: appeal.departmentId,
      data: appeal,
    });

    return NextResponse.json(appeal);
  } catch (error) {
    console.error('Ошибка при создании обращения:', error);
    return new NextResponse('Ошибка сервера при создании обращения', { status: 500 });
  }
}
