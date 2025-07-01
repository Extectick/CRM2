import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramData } from '@/lib/telegram';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { content, senderId } = body;
    const appealId = params.id;

    if (!content || !senderId || !appealId) {
      return NextResponse.json({ error: 'Данные неполные' }, { status: 400 });
    }

    const initData = request.headers.get('x-telegram-init-data');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramData = await validateTelegramData(initData || '', botToken);
    if (!telegramData) {
      return NextResponse.json({ error: 'Недействительные данные Telegram' }, { status: 401 });
    }

    const message = await prisma.appealMessage.create({
      data: {
        appealId,
        senderId,
        content
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    if (global.sseClients) {
      const payload = {
        type: 'message',
        appealId,
        data: message
      };
      for (const client of global.sseClients) {
        client.writer.write(`data: ${JSON.stringify(payload)}\n\n`).catch(() => client.close());
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при создании текстового сообщения:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}