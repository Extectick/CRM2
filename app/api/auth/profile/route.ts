import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramData } from '@/lib/telegram';

export async function GET(req: NextRequest) {
  return getProfile(req);
}

export async function PUT(req: NextRequest) {
  return updateProfile(req);
}

async function getProfile(req: NextRequest) {
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
      id: user.id,
      telegramId: user.telegramId,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateProfile(req: NextRequest) {
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

    const { fullName, departmentId } = await req.json();

    if (!fullName || !departmentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: {
        telegramId: telegramData.user.id.toString(),
      },
      data: {
        fullName,
        departmentId,
      },
      include: {
        department: true,
      },
    });

    return NextResponse.json({
      id: user.id,
      telegramId: user.telegramId,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
