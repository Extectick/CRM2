import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateTelegramData } from '@/lib/telegram';

// SSE broadcast helper
async function broadcastAppealChange(data: any) {
  if (!global.sseClients?.size) return;

  const message = `data: ${JSON.stringify(data)}\n\n`;
  const clients = Array.from(global.sseClients);

  for (const client of clients) {
    try {
      await client.writer.write(message);
    } catch (error) {
      console.error("SSE write error:", error);
      client.close();
    }
  }
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const initData = request.headers.get('x-telegram-init-data');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramData = await validateTelegramData(initData || '', botToken);
    if (!telegramData) {
      return NextResponse.json({ error: 'Неверные данные Telegram' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop() || '';
    const body = await request.json();

    const user = await prisma.user.findUnique({
      where: { telegramId: telegramData.user.id.toString() }
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const updateData: any = {
      status: body.status
    };

    if (body.executors) {
      updateData.executors = {
        set: body.executors.map((id: string) => ({ id }))
      };
    } else if (body.status === 'IN_PROGRESS') {
      updateData.executorId = user.id;
      updateData.executors = {
        connect: { id: user.id }
      };
    }

    const updatedAppeal = await prisma.appeal.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        executor: true,
        creator: true,
        executors: {
          select: { id: true, fullName: true }
        }
      }
    });

    // SSE event
    await broadcastAppealChange({
      type: 'appeal_change',
      operation: 'update',
      id: updatedAppeal.id,
      departmentId: updatedAppeal.departmentId,
      creatorId: updatedAppeal.creatorId,
      executorId: updatedAppeal.executorId,
      data: {
        status: updatedAppeal.status,
        executorId: updatedAppeal.executorId,
        executors: updatedAppeal.executors
      }
    });

    return NextResponse.json(updatedAppeal);
  } catch (error) {
    console.error("[APPEAL_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Ошибка при обновлении обращения" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const initData = request.headers.get('x-telegram-init-data');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramData = await validateTelegramData(initData || '', botToken);
    if (!telegramData) {
      return NextResponse.json({ error: 'Неверные данные Telegram' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop() || '';

    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: {
        department: true,
        executor: true,
        creator: true
      }
    });

    if (!appeal) {
      return NextResponse.json({ error: 'Обращение не найдено' }, { status: 404 });
    }

    await prisma.appeal.delete({ where: { id } });

    // SSE event
    await broadcastAppealChange({
      type: 'appeal_change',
      operation: 'delete',
      id: appeal.id,
      departmentId: appeal.departmentId,
      creatorId: appeal.creatorId,
      executorId: appeal.executorId
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[APPEAL_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Ошибка при удалении обращения" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Извлекаем id из URL вручную для совместимости
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop() || '';

    const appeal = await prisma.appeal.findUnique({
      where: { id },
      include: {
        department: true,
        executor: true,
        creator: true,
        executors: {
          select: { id: true, fullName: true }
        },
        messages: {
          include: {
            sender: {
              select: { id: true, fullName: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!appeal) {
      return NextResponse.json({ error: "Обращение не найдено" }, { status: 404 });
    }

    return NextResponse.json(appeal);
  } catch (error) {
    console.error("[APPEAL_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
