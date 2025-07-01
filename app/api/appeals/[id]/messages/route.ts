// 📁 D:\Extectick\CRM\app\api\appeals\[id]\messages\route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateTelegramData } from '@/lib/telegram';
import { promises as fs } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const appealId = formData.get('appealId') as string;
    const senderId = formData.get('senderId') as string;

    if (!file || !appealId || !senderId) {
      return NextResponse.json({ error: 'Необходимо заполнить все поля' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `Размер файла не должен превышать ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 });
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 400 });
    }

    const initData = request.headers.get('x-telegram-init-data');
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramData = await validateTelegramData(initData || '', botToken);
    if (!telegramData) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 401 });
    }

    const uploadDir = join(process.cwd(), 'public/uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = file.name.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    const filePath = join(uploadDir, filename);
    const fileUrl = `/uploads/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    await writeFile(filePath, buffer);

    const message = await prisma.appealMessage.create({
      data: {
        appealId,
        senderId,
        fileUrl,
        fileSize: file.size,
        fileType: file.type,
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
        type: 'file',
        appealId,
        data: message
      };
      for (const client of global.sseClients) {
        client.writer.write(`data: ${JSON.stringify(payload)}\n\n`).catch(() => client.close());
      }
    }

    return NextResponse.json({
      fileUrl: message.fileUrl,
      fileType: message.fileType,
      fileSize: message.fileSize
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }
}
