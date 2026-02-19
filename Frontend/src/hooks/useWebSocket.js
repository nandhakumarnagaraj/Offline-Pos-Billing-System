import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const SOCKET_URL = `http://${window.location.hostname}:8080/ws`;

export const useWebSocket = (callbacks = {}) => {
  const clientRef = useRef(null);
  const { onOrder, onTable, onStock } = callbacks;

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(SOCKET_URL),
      onConnect: () => {
        console.log('Connected to WebSocket');
        
        if (onOrder) {
          client.subscribe('/topic/orders', (msg) => onOrder(JSON.parse(msg.body)));
          client.subscribe('/topic/orders/update', (msg) => onOrder(JSON.parse(msg.body)));
        }
        
        if (onTable) {
          client.subscribe('/topic/tables', (msg) => onTable(msg.body));
        }
        
        if (onStock) {
          client.subscribe('/topic/stock/alerts', (msg) => onStock(msg.body));
        }
      },
      onStompError: (frame) => {
        console.error('Broker error: ' + frame.headers['message']);
      },
      reconnectDelay: 5000,
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [onOrder, onTable, onStock]); // Re-connect if callbacks change (ensure they are stable/memoized in consumer)

  return clientRef.current;
};
