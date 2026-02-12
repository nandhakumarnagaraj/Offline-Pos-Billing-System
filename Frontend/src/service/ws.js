import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const SOCKET_URL = `http://${window.location.hostname}:8080/ws`;

export const connectWebSocket = (onMessageReceived) => {
  const client = new Client({
    webSocketFactory: () => new SockJS(SOCKET_URL),
    onConnect: () => {
      console.log('Connected to WebSocket');
      client.subscribe('/topic/orders', (message) => {
        onMessageReceived(JSON.parse(message.body));
      });
      client.subscribe('/topic/orders/update', (message) => {
        onMessageReceived(JSON.parse(message.body));
      });
    },
    onStompError: (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    },
    reconnectDelay: 5000,
  });

  client.activate();

  return client;
};
