import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramData } from '@/lib/telegram';

export async function GET(request: Request) {
  try {
    // Telegram auth
    const initData = request.headers.get('x-telegram-init-data');
    console.log('Received initData:', initData?.slice(0, 50) + '...');
    
    if (!initData) {
      console.error('No initData provided in headers');
      return NextResponse.json(
        { error: 'Требуется авторизация через Telegram' },
        { status: 401 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured');
      return NextResponse.json(
        { error: 'Ошибка конфигурации сервера' },
        { status: 500 }
      );
    }

    const telegramData = await validateTelegramData(initData, botToken);
    console.log('Telegram validation result:', telegramData ? 'success' : 'failed');
    
    if (!telegramData) {
      return NextResponse.json(
        { error: 'Неверные данные Telegram. Пожалуйста, обновите страницу.' },
        { status: 401 }
      );
    }

    // Get user from DB
    const user = await prisma.user.findUnique({
      where: { telegramId: telegramData.user?.id.toString() },
      include: {
        department: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (!user.department) {
      console.error('User has no department:', user.id);
      return NextResponse.json(
        { error: 'Пользователь не привязан к отделу' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        fullName: user.fullName,
        role: user.role,
        department: {
          id: user.department.id,
          name: user.department.name
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
