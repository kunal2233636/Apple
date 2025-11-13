// Real-Time Dashboard WebSocket Hook
// ===================================

"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface UseRealtimeDashboardOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  subscribedChannels?: string[];
}

interface UseRealtimeDashboardReturn {
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  requestUpdate: (channel?: string) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
}

export function useRealtimeDashboard(options: UseRealtimeDashboardOptions = {}): UseRealtimeDashboardReturn {
  const {
    url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || '/api/realtime/dashboard', // Use relative path as fallback
    autoConnect = true, // Enable auto-connect since we now have a proper WebSocket endpoint
    reconnectInterval = 5000,
    maxReconnectAttempts = 3,
    subscribedChannels = ['all']
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  // Refs for stable function references
  const optionsRef = useRef({ url, autoConnect, reconnectInterval, maxReconnectAttempts, subscribedChannels });
  
  // Debug counters
  const debugCounter = useRef({
    connectCalls: 0,
    useEffectRuns: 0,
    stateUpdates: 0,
    websocketCreations: 0
  });

  const connect = useCallback(() => {
    debugCounter.current.connectCalls++;
    console.log(`🔍 [DEBUG] connect() called - attempt #${debugCounter.current.connectCalls}`);
    console.log(`🔍 [DEBUG] Current state: isConnected=${isConnected}, isConnecting=${isConnecting}, status=${connectionStatus}`);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔍 [DEBUG] WebSocket already connected, skipping');
      return;
    }

    console.log('🔍 [DEBUG] Starting WebSocket connection process...');
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      // Check if WebSocket is supported in this environment
      if (typeof WebSocket === 'undefined') {
        console.error('WebSocket is not supported in this environment');
        setError('WebSocket not supported');
        setIsConnecting(false);
        return;
      }
      
      // Convert relative URL to proper WebSocket URL
      let wsUrl = optionsRef.current.url;
      if (wsUrl.startsWith('/')) {
        // Convert relative path to WebSocket URL only in browser environment
        if (typeof window !== 'undefined') {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}${wsUrl}`;
        } else {
          console.warn('Window object not available, using original URL for WebSocket');
          // For SSR, skip WebSocket creation or return early
          setError('WebSocket not available in server environment');
          setIsConnecting(false);
          return;
        }
      }
      
      // Validate WebSocket URL before connecting
      try {
        new URL(wsUrl); // This will throw if the URL is invalid
      } catch (urlError) {
        console.error('Invalid WebSocket URL:', wsUrl, urlError);
        setError('Invalid WebSocket URL configuration');
        setIsConnecting(false);
        return;
      }
      
      debugCounter.current.websocketCreations++;
      console.log(`🔍 [DEBUG] Creating WebSocket #${debugCounter.current.websocketCreations} to: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('📡 WebSocket connected');
        console.log(`🔍 [DEBUG] onopen fired - setting states: connected=true, connecting=false, status=connected`);
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        debugCounter.current.stateUpdates++;

        // Subscribe to channels
        console.log(`🔍 [DEBUG] Subscribing to channels:`, optionsRef.current.subscribedChannels);
        optionsRef.current.subscribedChannels.forEach(channel => {
          ws.send(JSON.stringify({ type: 'subscribe', channel }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle different message types
          switch (message.type) {
            case 'pong':
              // Handle heartbeat response
              break;
            case 'error':
              setError(message.data?.message || 'WebSocket error');
              setConnectionStatus('error');
              break;
            default:
              // Handle data messages
              break;
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('📡 WebSocket disconnected:', event.code, event.reason);
        console.log(`🔍 [DEBUG] onclose fired - code: ${event.code}, reason: ${event.reason}`);
        console.log(`🔍 [DEBUG] Auto-connect: ${optionsRef.current.autoConnect}, attempts: ${reconnectAttemptsRef.current}/${optionsRef.current.maxReconnectAttempts}`);
        
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionStatus('disconnected');
        debugCounter.current.stateUpdates++;
        
        // Auto-reconnect if not at max attempts
        const { autoConnect, reconnectInterval, maxReconnectAttempts } = optionsRef.current;
        if (autoConnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
          console.log(`🔍 [DEBUG] Scheduling reconnect in ${reconnectInterval}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔍 [DEBUG] Reconnect timeout fired, calling connect()...`);
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log(`🔍 [DEBUG] Max reconnection attempts reached, setting error state`);
          const errorMessage = event.reason ? `Max reconnection attempts reached: ${event.reason}` : 'Max reconnection attempts reached';
          setError(errorMessage);
          setConnectionStatus('error');
          debugCounter.current.stateUpdates++;
        }
      };

      ws.onerror = (event: Event) => {
        // Note: The event here is a generic Event, not a specific error event with detailed properties
        console.log(`🔍 [DEBUG] WebSocket onerror event triggered`);
        
        // Enhanced error logging with more details
        let errorMessage = 'WebSocket connection error';
        if (event && typeof event === 'object') {
          // Try to get more specific information from the event
          if ('type' in event) {
            console.log(`🔍 [DEBUG] WebSocket error event type: ${event.type}`);
          }
          if ('target' in event && event.target) {
            const target = event.target as WebSocket;
            console.log(`🔍 [DEBUG] WebSocket error on URL: ${target.url}`);
            console.log(`🔍 [DEBUG] WebSocket readyState: ${target.readyState}`);
          }
        }
        
        // Additional error details from WebSocket connection if available
        if (wsRef.current) {
          console.log(`🔍 [DEBUG] Current WebSocket URL: ${wsRef.current.url}`);
          console.log(`🔍 [DEBUG] Current WebSocket readyState: ${wsRef.current.readyState}`);
        }
        
        console.log(`🔍 [DEBUG] Current error state before update:`, error);
        
        // Log a meaningful error message instead of an empty object
        console.error('📡 WebSocket connection error - detailed info logged above');
        
        setError(errorMessage);
        setConnectionStatus('error');
        debugCounter.current.stateUpdates++;
        console.log(`🔍 [DEBUG] State updates triggered by error: total=${debugCounter.current.stateUpdates}`);
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create WebSocket connection';
      setError(`Failed to create WebSocket connection: ${errorMessage}`);
      setConnectionStatus('error');
      setIsConnecting(false);
    }
  }, []); // No dependencies - stable function reference

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const subscribe = useCallback((channel: string) => {
    sendMessage({ type: 'subscribe', channel });
  }, [sendMessage]);

  const unsubscribe = useCallback((channel: string) => {
    sendMessage({ type: 'unsubscribe', channel });
  }, [sendMessage]);

  const requestUpdate = useCallback((channel?: string) => {
    sendMessage({ type: 'request_update', channel: channel || 'all' });
  }, [sendMessage]);

  // Auto-connect on mount
  useEffect(() => {
    debugCounter.current.useEffectRuns++;
    console.log(`🔍 [DEBUG] useEffect #${debugCounter.current.useEffectRuns} running`);
    console.log(`🔍 [DEBUG] connect function ref is stable - no infinite loop!`);
    console.log(`🔍 [DEBUG] Total connect calls so far: ${debugCounter.current.connectCalls}`);
    
    if (optionsRef.current.autoConnect) {
      console.log(`🔍 [DEBUG] Auto-connect enabled, calling connect()...`);
      connect();
    }

    return () => {
      console.log(`🔍 [DEBUG] useEffect cleanup running for #${debugCounter.current.useEffectRuns}`);
      disconnect();
    };
  }, [connect, disconnect]); // Only stable dependencies

  // Ping to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected, sendMessage]);

  // Log debug info on every render
  console.log(`🔍 [DEBUG] Hook render - isConnected: ${isConnected}, isConnecting: ${isConnecting}, status: ${connectionStatus}, error: ${error}`);
  console.log(`🔍 [DEBUG] Debug counters:`, debugCounter.current);
  
  return {
    isConnected,
    isConnecting,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
    requestUpdate,
    connectionStatus,
    error
  };
}

// Specialized hooks for different dashboard components

export function useProviderStatus() {
  const { lastMessage, subscribe, unsubscribe } = useRealtimeDashboard({
    subscribedChannels: ['provider_status']
  });

  const [providerStatus, setProviderStatus] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage?.type === 'provider_status') {
      setProviderStatus(lastMessage.data);
    } else if (lastMessage?.type === 'initial_data') {
      setProviderStatus(lastMessage.data.providerStatus || []);
    }
  }, [lastMessage]);

  return {
    providerStatus,
    subscribe: () => subscribe('provider_status'),
    unsubscribe: () => unsubscribe('provider_status')
  };
}

export function useSystemHealth() {
  const { lastMessage, subscribe, unsubscribe } = useRealtimeDashboard({
    subscribedChannels: ['system_health']
  });

  const [systemHealth, setSystemHealth] = useState<any>(null);

  useEffect(() => {
    if (lastMessage?.type === 'system_health') {
      setSystemHealth(lastMessage.data);
    } else if (lastMessage?.type === 'initial_data') {
      setSystemHealth(lastMessage.data.systemHealth || null);
    }
  }, [lastMessage]);

  return {
    systemHealth,
    subscribe: () => subscribe('system_health'),
    unsubscribe: () => unsubscribe('system_health')
  };
}

export function useRateLimits() {
  const { lastMessage, subscribe, unsubscribe } = useRealtimeDashboard({
    subscribedChannels: ['rate_limits']
  });

  const [rateLimitWarnings, setRateLimitWarnings] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage?.type === 'rate_limits') {
      setRateLimitWarnings(lastMessage.data || []);
    } else if (lastMessage?.type === 'initial_data') {
      setRateLimitWarnings(lastMessage.data.rateLimitData || []);
    }
  }, [lastMessage]);

  return {
    rateLimitWarnings,
    subscribe: () => subscribe('rate_limits'),
    unsubscribe: () => unsubscribe('rate_limits')
  };
}

export function useFallbackEvents() {
  const { lastMessage, subscribe, unsubscribe } = useRealtimeDashboard({
    subscribedChannels: ['fallback']
  });

  const [fallbackEvents, setFallbackEvents] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage?.type === 'fallback') {
      setFallbackEvents(lastMessage.data || []);
    } else if (lastMessage?.type === 'initial_data') {
      setFallbackEvents(lastMessage.data.fallbackEvents || []);
    }
  }, [lastMessage]);

  return {
    fallbackEvents,
    subscribe: () => subscribe('fallback'),
    unsubscribe: () => unsubscribe('fallback')
  };
}

export function useRealtimeAPICalls() {
  const { lastMessage } = useRealtimeDashboard();
  
  const [apiCallStats, setApiCallStats] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage?.type === 'api_calls') {
      setApiCallStats(prev => [...prev.slice(-50), lastMessage.data]); // Keep last 50 calls
    }
  }, [lastMessage]);

  return { apiCallStats };
}
