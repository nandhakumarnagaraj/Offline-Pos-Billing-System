Design a fully offline LAN-based Point of Sale (POS) system for a small Biryani restaurant using a Windows PC Mobile Hotspot instead of a WiFi router.

The system should include:

A Windows PC acting as:

Spring Boot Backend Server

Database Host (H2 or PostgreSQL)

Bill Counter UI

WiFi Hotspot Provider

Android Waiter Devices:

Connected to the PC Mobile Hotspot

Accessing the system via browser

URL format: http://192.168.137.1:5173/waiter

Can create and update orders

Kitchen Display System (KDS):

Connected to same PC hotspot

Access via: http://192.168.137.1:5173/kitchen

Receives real-time order updates via WebSocket

Can update order status (NEW → COOKING → READY)

Network Architecture:

Windows PC Mobile Hotspot IP: 192.168.137.1

All devices connect via LAN only

No internet dependency

Communication via STOMP over WebSocket

WebSocket Channels:

/app/order/create

/app/order/update-status

/topic/orders/kitchen

/topic/orders/updates

Database Tables:

orders

order_items

menu_items

Stability Requirements:

Auto WebSocket reconnect

Firewall ports 8080 & 5173 allowed

Manual daily DB backup

PC sleep mode disabled

The system must operate completely offline and remain stable within a small restaurant environment.