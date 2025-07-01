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

function broadcastSseMessage(message: any) {
  if (!global.sseClients || global.sseClients.size === 0) return;

  const messageStr = `data: ${JSON.stringify(message)}\n\n`;

  global.sseClients.forEach(client => {
    client.writer.write(messageStr).catch(error => {
      console.error('SSE write error:', error);
      client.close();
    });
  });
}

// GET — получить обращения (пример упрощённый)
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

    const appeals = await prisma.appeal.findMany({
      where: { creatorId: user.id },
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
export async function POST(request: Request) {
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

    const body = await request.json();

    const createData: any = {
      subject: body.subject,
      description: body.description,
      departmentId: body.departmentId,
      creatorId: user.id,
      status: 'PENDING',
    };

    if (body.executorId) {
      createData.executorId = body.executorId;
    }

    if (body.executors) {
      createData.executors = {
        connect: body.executors.map((id: string) => ({ id })),
      };
    }

    const newAppeal = await prisma.appeal.create({
      data: createData,
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
    });

    // Отправляем уведомление всем SSE клиентам
    broadcastSseMessage({
      type: 'appeal_change',
      operation: 'create',
      id: newAppeal.id,
      departmentId: newAppeal.departmentId,
      creatorId: newAppeal.creatorId,
      createdAt: newAppeal.createdAt.toISOString(),
      data: {
        subject: newAppeal.subject,
        status: newAppeal.status,
        number: newAppeal.number,
        executorId: newAppeal.executorId,
        executors: newAppeal.executors,
      },
    });

    return NextResponse.json(newAppeal, { status: 201 });
  } catch (error) {
    console.error('Ошибка при создании обращения:', error);
    return NextResponse.json({ error: 'Ошибка при создании обращения' }, { status: 500 });
  }
}
