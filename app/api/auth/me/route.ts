import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramData } from '@/lib/telegram';

export async function GET(req: NextRequest) {
  try {
    const initData = req.headers.get('x-telegram-init-data');
    
    if (!initData) {
      return NextResponse.json(
        { error: 'No Telegram data provided' },
        { status: 401 }
      );
    }

    const telegramData = validateTelegramData(initData, process.env.TELEGRAM_BOT_TOKEN);
    
    if (!telegramData) {
      return NextResponse.json(
        { error: 'Invalid Telegram data' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        telegramId: telegramData.user.id.toString(),
      },
      include: {
        department: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}