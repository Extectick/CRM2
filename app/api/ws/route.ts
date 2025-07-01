import { WebSocketServer } from 'ws'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateTelegramData } from '@/lib/telegram'

declare global {
  var wss: WebSocketServer
  var wsClients: Map<string, any>
}

export async function GET(request: Request) {
  try {
    // Telegram auth
    const initData = request.headers.get('x-telegram-init-data')
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramData = await validateTelegramData(initData || '', botToken)
    if (!telegramData) {
      return NextResponse.json(
        { error: 'Неверные данные Telegram' },
        { status: 401 }
      )
    }

    // Initialize WebSocket server if not already created
    if (!global.wss) {
      global.wss = new WebSocketServer({ noServer: true })
      global.wsClients = new Map()
      console.log('WebSocket server initialized')
      
      // Handle new connections
      global.wss.on('connection', (ws, req) => {
        const url = new URL(req.url || '', `ws://${req.headers.host}`)
        const appealId = url.searchParams.get('appealId')
        const userId = url.searchParams.get('userId')

        if (!appealId || !userId) {
          ws.close(1008, 'Missing appealId or userId')
          return
        }

        // Store connection
        const clientId = `${appealId}_${userId}`
        global.wsClients.set(clientId, ws)
        console.log(`Client connected: ${clientId}`)

        // Handle messages
        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message.toString())
            
          if (data.type === 'message' || data.type === 'file') {
            // Save message to DB
            const newMessage = await prisma.appealMessage.create({
              data: {
                appealId,
                senderId: userId,
                content: data.type === 'message' ? data.content : null,
                fileUrl: data.fileUrl || null,
                fileSize: data.fileSize || null,
                fileType: data.fileType || null
              },
                include: {
                  sender: {
                    select: {
                      id: true,
                      fullName: true
                    }
                  }
                }
              })

              // Broadcast to all clients in this appeal
              global.wsClients.forEach((client, key) => {
                if (key.startsWith(appealId) && client.readyState === 1) {
                  client.send(JSON.stringify({
                type: data.type,
                data: {
                  ...newMessage,
                  createdAt: newMessage.createdAt.toISOString(),
                  sender: {
                    id: userId,
                    fullName: telegramData.user?.first_name || 'Аноним'
                  }
                }
                  }))
                }
              })
            }
          } catch (error) {
            console.error('Error handling message:', error)
          }
        })

        // Handle disconnection
        ws.on('close', () => {
          global.wsClients.delete(clientId)
          console.log(`Client disconnected: ${clientId}`)
        })

        ws.on('error', console.error)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WebSocket error:', error)
    return NextResponse.json(
      { error: 'Ошибка WebSocket соединения' },
      { status: 500 }
    )
  }
}
