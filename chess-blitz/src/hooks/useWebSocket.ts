// ==============================================
// Chess Blitz - WebSocket Hook
// Generic WebSocket connection management
// ==============================================

import { useState, useEffect, useRef, useCallback, useEffectEvent } from 'react';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  status: WebSocketStatus;
  sendMessage: (data: unknown) => void;
  connect: () => void;
  disconnect: () => void;
  lastMessage: unknown;
}

export function useWebSocket(
  url: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(reconnect);
  const urlRef = useRef(url);
  const isConnectingRef = useRef(false);

  // Use useEffectEvent to access latest callbacks without causing reconnection loops
  // These always see the latest props/state without triggering Effect re-runs
  const onMessageEvent = useEffectEvent((data: unknown) => {
    onMessage?.(data);
  });

  const onOpenEvent = useEffectEvent(() => {
    onOpen?.();
  });

  const onCloseEvent = useEffectEvent((event: CloseEvent) => {
    onClose?.(event);
  });

  const onErrorEvent = useEffectEvent((error: Event) => {
    onError?.(error);
  });

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;

      if (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'Client disconnect');
      }

      wsRef.current = null;
    }
    isConnectingRef.current = false;
  }, []);

  // Connect function - uses refs for callbacks to avoid dependency cycles
  const connect = useCallback(() => {
    const currentUrl = urlRef.current;
    if (!currentUrl) {
      return;
    }

    // Prevent concurrent connection attempts
    if (isConnectingRef.current) {
      return;
    }

    // Cleanup existing connection
    cleanup();
    isConnectingRef.current = true;

    setStatus('connecting');

    try {
      const ws = new WebSocket(currentUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        onOpenEvent();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessageEvent(data);
        } catch {
          // Handle non-JSON messages
          setLastMessage(event.data);
          onMessageEvent(event.data);
        }
      };

      ws.onerror = (error) => {
        isConnectingRef.current = false;
        setStatus('error');
        onErrorEvent(error);
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        setStatus('disconnected');
        onCloseEvent(event);

        // Attempt reconnection if enabled and not a clean close
        if (
          shouldReconnectRef.current &&
          event.code !== 1000 &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      setStatus('error');
      console.error('WebSocket connection error:', error);
    }
  }, [cleanup, maxReconnectAttempts, reconnectInterval]);

  // Disconnect function
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    cleanup();
    setStatus('disconnected');
  }, [cleanup]);

  // Send message function
  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Auto-connect when URL changes
  useEffect(() => {
    const previousUrl = urlRef.current;
    urlRef.current = url;
    shouldReconnectRef.current = reconnect;

    // Only connect if URL actually changed or is newly set
    if (url && url !== previousUrl) {
      reconnectAttemptsRef.current = 0;
      connect();
    } else if (!url && previousUrl) {
      cleanup();
      setStatus('disconnected');
    }

    return () => {
      shouldReconnectRef.current = false;
      cleanup();
    };
  }, [url, connect, cleanup, reconnect]);

  return {
    status,
    sendMessage,
    connect,
    disconnect,
    lastMessage,
  };
}
