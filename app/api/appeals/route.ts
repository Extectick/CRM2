import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const appeals = await prisma.appeal.findMany({
      include: {
        department: true,
        executor: true,
        creator: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(appeals);
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при поиске обращения' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newAppeal = await prisma.appeal.create({
      data: {
        subject: body.subject,
        description: body.description,
        departmentId: body.departmentId,
        ...(body.executorId ? { executorId: body.executorId } : {}),
        creatorId: body.creatorId
      }
    });
    return NextResponse.json(newAppeal, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при создании обращения' },
      { status: 500 }
    );
  }
}
