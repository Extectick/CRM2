import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramData } from '@/lib/telegram';

// ✅ GET-запрос: получение всех обращений для пользователя
export async function GET(request: Request) {
  try {
    console.log('GET /api/appeals - start');
    const initData = request.headers.get('x-telegram-init-data');
    if (!initData) {
      console.log('GET: Нет x-telegram-init-data');
      return NextResponse.json({ error: 'Необходима авторизация Telegram' }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramData = await validateTelegramData(initData, botToken);
    if (!telegramData) {
      console.log('GET: Неверные данные Telegram');
      return NextResponse.json({ error: 'Неверные данные Telegram' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: telegramData.user.id.toString() }
    });

    if (!user) {
      console.log('GET: Пользователь не найден:', telegramData.user.id);
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
        executor: true,
        creator: true,
        executors: {
          select: {
            id: true,
            fullName: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('GET: Обращения получены:', appeals.length);
    return NextResponse.json(appeals, { status: 200 });

  } catch (error) {
    console.error('Ошибка при получении обращений:', error);
    return NextResponse.json({ error: 'Ошибка при получении обращений' }, { status: 500 });
  }
}

// ✅ POST-запрос: создание обращения
export async function POST(request: Request) {
  try {
    console.log('POST /api/appeals - start');

    const initData = request.headers.get('x-telegram-init-data');
    if (!initData) {
      console.log('POST: Нет x-telegram-init-data');
      return NextResponse.json({ error: 'Необходима авторизация Telegram' }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramData = await validateTelegramData(initData, botToken);
    if (!telegramData) {
      console.log('POST: Неверные данные Telegram');
      return NextResponse.json({ error: 'Неверные данные Telegram' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: telegramData.user.id.toString() }
    });

    if (!user) {
      console.log('POST: Пользователь не найден:', telegramData.user.id);
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const body = await request.json();
    console.log('POST: Тело запроса:', body);

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
        connect: body.executors.map((id: string) => ({ id }))
      };
    }

    console.log('POST: Данные для создания обращения:', createData);

    const newAppeal = await prisma.appeal.create({
      data: createData,
      include: {
        department: true,
        creator: true,
        executors: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    console.log('POST: Обращение создано:', newAppeal.id);

    if (global.sseClients?.size) {
      console.log('POST: Рассылаем SSE сообщение (неблокирующая отправка)');
      const message = {
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
          executors: newAppeal.executors
        }
      };

      const messageStr = `data: ${JSON.stringify(message)}\n\n`;
      const clients = Array.from(global.sseClients);

      clients.forEach(client => {
        client.writer.write(messageStr).catch(error => {
          console.error('SSE write error:', error);
          client.close();
        });
      });
    }

    console.log('POST: Отправляем ответ');
    return NextResponse.json(newAppeal, { status: 201 });

  } catch (error) {
    console.error('Ошибка при создании обращения:', error);
    return NextResponse.json({ error: 'Ошибка при создании обращения' }, { status: 500 });
  }
}
