import { NextResponse } from 'next/server';

declare global {
  // Глобальное множество клиентов SSE
  var sseClients: Set<{
    writer: WritableStreamDefaultWriter<string>;
    close: () => void;
    closed: boolean;
  }>;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[SSE] New client connected');

  if (!global.sseClients) {
    global.sseClients = new Set();
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const client = {
    writer,
    closed: false,
    close() {
      if (this.closed) return;
      this.closed = true;
      clearInterval(keepAlive);
      global.sseClients.delete(this);
      try {
        if (!writer.closed) {
          writer.close().catch(() => {});
        }
      } catch (err) {
        console.error('[SSE] Error closing client:', err);
      }
    },
  };

  global.sseClients.add(client);

  const keepAlive = setInterval(() => {
    if (!client.closed) {
      writer.write('data: keepalive\n\n').catch((err) => {
        console.error('[SSE] Keepalive failed:', err);
        client.close();
      });
    }
  }, 25000);

  try {
    await writer.write('data: connected\n\n');
  } catch (err) {
    console.error('[SSE] Initial write failed:', err);
    client.close();
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(stream.readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export async function broadcastAppealEvent(data: object) {
  if (!global.sseClients || global.sseClients.size === 0) return;

  const payload = `data: ${JSON.stringify(data)}\n\n`;
  const deadClients: typeof global.sseClients = new Set();

  for (const client of global.sseClients) {
    try {
      await client.writer.write(payload);
    } catch (err) {
      console.warn('[SSE] Failed to write to a client. Marking as closed.');
      client.close();
      deadClients.add(client);
    }
  }

  for (const dead of deadClients) {
    global.sseClients.delete(dead);
  }
}
