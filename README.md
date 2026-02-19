# 🍽️ Offline Restaurant POS System

A comprehensive, offline-first restaurant management solution featuring a robust Spring Boot backend and a high-performance React frontend. Designed for seamless operations with or without internet connectivity.

> Developed by **Khana Book**

---

## ✨ Key Features

### 🖥️ Frontend & Invoicing

- **Offline Synchronization** — Orders and payments are stored locally in IndexedDB via Dexie.js and automatically sync with the server when the connection is restored.
- **Dynamic Branding & Identity** — Customize your Shop Name, Logo, Address, and Tagline from the Dashboard. Browser tab title and favicon update dynamically to reflect your configuration.
- **Advanced Invoicing**
  - Identical layouts for 80mm Thermal Prints and WhatsApp PDF sharing.
  - Global and item-specific GST support with automatic GSTIN display.
  - Character-level privacy masking for customer names and phone numbers on all receipts.
  - Robust multi-line text wrapping for long item names in digital invoices.
- **Role-Based Interfaces** — Optimized workflows for Waiters (Ordering), Cashiers (Billing), Kitchen Staff (KDS), and Managers.

### ⚙️ Backend & Management

- **Inventory & Stock Tracking** — Real-time tracking with automated low-stock and expiry alerts via WebSockets.
- **Centralized Configuration** — Full control over shop details, tax settings, and system branding.
- **Financial Analytics** — Comprehensive sales reports with GST reconciliation and operational expense tracking.
- **Secure Access** — JWT-based authentication with forced password reset for new accounts.

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Java 17 + Spring Boot 3.x | Core application framework |
| Spring Data JPA + MySQL | Data persistence |
| Spring Security + JWT | Authentication & authorization |
| WebSockets (STOMP) | Real-time KDS & stock alerts |

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite | UI framework & build tool |
| Context API | State management |
| Dexie.js (IndexedDB) | Offline data storage |
| Axios + StompJS | API & WebSocket communication |
| jsPDF + Canvas | Digital invoice generation |
| Vanilla CSS | Modern, variable-based styling |

---

## 🆕 Recent Updates

- **Invoice Synchronization** — Thermal prints and WhatsApp PDF invoices now share a perfectly aligned layout.
- **Robust Logo Rendering** — Canvas-based normalization ensures shop logos render correctly across all PDF formats.
- **Privacy Masking** — Character-level masking applied to customer names and phone numbers on all receipts.
- **Dynamic Metadata** — Browser tab titles, favicons, and meta descriptions sync with dashboard configuration.
- **Enhanced Validation** — Customer Name is now a mandatory field on all orders for better record-keeping.
- **Branding Lock** — "Software by Khana Book" footer standardized across all system views.

---

## 🚀 Setup & Installation

### Prerequisites

- JDK 17+
- Node.js v18+
- MySQL Server

### Backend

```bash
cd Backend
# Update src/main/resources/application.properties with your DB credentials
mvn spring-boot:run
```

### Frontend

```bash
cd Frontend
npm install

# Create a .env file based on .env.example and point to your backend API
cp .env.example .env

npm run dev          # Development server
npm run build        # Production build
```

### Automated (Windows)

Run both systems with a single command from the project root:

```bash
start_pos.bat
```

> **Note:** For local payment testing, use [Ngrok](https://ngrok.com/) to expose your local backend.

---

## 👥 Roles & Access

| Role | Interface |
|---|---|
| **Waiter** | Order placement & table management |
| **Cashier** | Billing, payments & invoice generation |
| **Kitchen Staff** | Kitchen Display System (KDS) |
| **Manager** | Full dashboard, reports & configuration |

---

## 📄 License

Proprietary — © Khana Book. All rights reserved.