import { NextResponse } from 'next/server';

declare global {
  var sseClients: Set<{
    writer: WritableStreamDefaultWriter<string>;
    close: () => void;
    closed: boolean;
  }>;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('New SSE connection request');

  if (!global.sseClients) {
    console.log('Initializing SSE clients set');
    global.sseClients = new Set();
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  console.log('Created new SSE writer');

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
      } catch (e) {
        console.error('Error closing SSE writer:', e);
      }
    }
  };

  global.sseClients.add(client);

  const keepAlive = setInterval(() => {
    if (!client.closed) {
      writer.write('data: keepalive\n\n').catch((error) => {
        console.error('Failed to send keepalive:', error);
        client.close();
      });
    }
  }, 30000);

  try {
    await writer.write('data: connected\n\n');
  } catch (error) {
    console.error('Failed to send initial SSE message:', error);
    client.close();
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
