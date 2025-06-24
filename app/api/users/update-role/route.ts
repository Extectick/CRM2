import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramData } from '@/lib/telegram';
import { z } from 'zod';

const updateRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['USER', 'DEPARTMENT_HEAD', 'ADMIN']),
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

    const telegramData = validateTelegramData(initData, process.env.TELEGRAM_BOT_TOKEN);
    
    if (!telegramData) {
      return NextResponse.json(
        { error: 'Invalid Telegram data' },
        { status: 401 }
      );
    }

    // Check if current user is admin
    const currentUser = await prisma.user.findUnique({
      where: {
        telegramId: telegramData.user.id.toString(),
      },
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = updateRoleSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { userId, role } = validation.data;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      include: {
        department: true,
      },
    });

    console.log(`✅ User role updated: ${updatedUser.fullName} -> ${role}`);

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        telegramId: updatedUser.telegramId,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        department: updatedUser.department,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error in /api/users/update-role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}