import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramData, getTelegramUserFullName } from '@/lib/telegram';
import { z } from 'zod';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  departmentId: z.string().min(1, 'Department is required'),
});

export async function POST(req: NextRequest) {
  try {
    const initData = req.headers.get('x-telegram-init-data');
    
    if (!initData) {
      return NextResponse.json(
        { error: 'No Telegram data provided' },
        { status: 401 }
      );
    }

    const telegramData = await validateTelegramData(initData, process.env.TELEGRAM_BOT_TOKEN);
    
    if (!telegramData || !telegramData.user?.id) {
      console.error('Invalid Telegram data or missing user ID:', telegramData);
      return NextResponse.json(
        { error: 'Invalid Telegram data' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { fullName, departmentId } = validation.data;

    const telegramId = telegramData.user.id.toString();
    console.log('Registering user with Telegram ID:', telegramId);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        telegramId,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already registered' },
        { status: 409 }
      );
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 400 }
      );
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        telegramId: telegramData.user.id.toString(),
        fullName,
        departmentId,
        role: 'USER', // Default role
      },
      include: {
        department: true,
      },
    });

    console.log(`✅ New user registered: ${user.fullName} (${user.telegramId})`);

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
    console.error('Error in /api/auth/register:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
