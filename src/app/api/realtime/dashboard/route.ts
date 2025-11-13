// Real-time Dashboard WebSocket API Route Handler
// ===============================================
// This API route handles WebSocket connections for real-time dashboard updates

import { NextRequest } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { aiServiceManager } from '@/lib/ai/ai-service-manager-unified';

// Global WebSocket server instance
declare global {
  var wssInstance: WebSocketServer | undefined;
  var wsConnections: Map<string, WebSocket> | undefined;
}

// Store active WebSocket connections in global variable to persist across requests
if (!global.wsConnections) {
  global.wsConnections = new Map<string, WebSocket>();
}

const connections = global.wsConnections;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Function to broadcast messages to all connected clients
function broadcastMessage(message: any) {
  const messageStr = JSON.stringify(message);
  for (const [id, ws] of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    } else {
      connections.delete(id);
    }
  }
}

// Function to get real-time metrics
async function getRealTimeMetrics() {
  try {
    const providerHealth = await aiServiceManager.healthCheck();
    const systemStats = await aiServiceManager.getStatistics();
    
    return {
      timestamp: new Date().toISOString(),
      type: 'metrics_update',
      data: {
        providerHealth,
        systemStats,
        connectionCount: connections.size,
        activeProviders: systemStats.healthyCount,
        totalProviders: systemStats.totalProviders
      }
    };
  } catch (error) {
    console.error('Error getting metrics:', error);
    return {
      timestamp: new Date().toISOString(),
      type: 'error',
      data: { message: 'Failed to get metrics' }
    };
  }
}

// Initialize WebSocket server if it doesn't exist
if (!global.wssInstance) {
  global.wssInstance = new WebSocketServer({ noServer: true });

  global.wssInstance.on('connection', (ws: WebSocket, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📡 WebSocket client connected: ${clientId}`);
    
    connections.set(clientId, ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      timestamp: new Date().toISOString(),
      clientId
    }));

    // Send initial metrics
    getRealTimeMetrics().then(metrics => {
      ws.send(JSON.stringify(metrics));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 Received message from ${clientId}:`, message);

        // Handle different message types
        switch (message.type) {
          case 'subscribe':
            ws.send(JSON.stringify({
              type: 'subscription_confirmed',
              channel: message.channel,
              timestamp: new Date().toISOString()
            }));
            break;
            
          case 'unsubscribe':
            // Handle unsubscribe logic
            break;
            
          case 'request_update':
            getRealTimeMetrics().then(metrics => {
              ws.send(JSON.stringify(metrics));
            });
            break;
            
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;
            
          default:
            console.log(`❓ Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    ws.on('close', () => {
      console.log(`🔌 WebSocket client disconnected: ${clientId}`);
      connections.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for client ${clientId}:`, error);
      connections.delete(clientId);
    });
  });

  global.wssInstance.on('error', (error) => {
    console.error('❌ WebSocket server error:', error);
  });

  // Periodically broadcast metrics
  const interval = setInterval(async () => {
    if (connections.size > 0) {
      const metrics = await getRealTimeMetrics();
      broadcastMessage(metrics);
    }
  }, 5000); // Every 5 seconds

  // Clean up interval on shutdown
  process.on('SIGINT', () => {
    clearInterval(interval);
    global.wssInstance?.close();
    process.exit(0);
  });
}

// Handle server shutdown
process.on('SIGTERM', () => {
  global.wssInstance?.close();
});

// Next.js API Route Handlers
export async function GET(request: NextRequest) {
  // Upgrade HTTP connection to WebSocket if headers indicate upgrade request
  const upgradeHeader = request.headers.get('upgrade');
  const connectionHeader = request.headers.get('connection');
  
  if (upgradeHeader === 'websocket' && connectionHeader?.toLowerCase().includes('upgrade')) {
    // Return a response that will be handled by the WebSocket server
    // This will cause Next.js to pass the request to be upgraded
    const response = new Response(null, { status: 101 });
    return response;
  }

  // Regular GET request - return connection information
  return Response.json({
    success: true,
    connectedClients: connections.size,
    timestamp: new Date().toISOString(),
    message: 'Real-time dashboard WebSocket endpoint. Connect via WebSocket for live updates.'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'broadcast') {
      broadcastMessage(data);
      return Response.json({
        success: true,
        message: 'Broadcast sent to all clients'
      });
    }

    return Response.json({
      success: false,
      error: 'Invalid action'
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}