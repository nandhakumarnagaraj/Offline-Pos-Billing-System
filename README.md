# Offline PoS Billing System

A comprehensive, offline-first Point of Sale (PoS) system designed for restaurants, especially biryani outlets. This system features a robust Spring Boot backend and a modern React frontend, supporting offline synchronization, real-time updates via WebSockets, and integrated digital payments.

## 🚀 Features

-   **Offline-First Architecture:** Works seamlessly even with intermittent internet connectivity using local storage and synchronization.
-   **Multi-Role Access:** Dedicated interfaces for Counter (Admin), Waiters, Kitchen, and Managers.
-   **Order Management:** Real-time order tracking from placement to delivery.
-   **Integrated Payments:** Supports Easebuzz payment gateway for UPI and card payments.
-   **Receipt Printing:** Professional thermal receipt generation with customizable shop details.
-   **Inventory tracking:** Basic low-stock notifications and resource management.
-   **Intuitive UI:** Clean, responsive, and human-centric design built with React and Vanilla CSS.

## 🛠️ Tech Stack

### **Backend**
-   **Java 17+**
-   **Spring Boot 3.x**
-   **Spring Data JPA** (MySQL Connection)
-   **Spring Security** (JWT Authentication)
-   **WebSocket (STOMP)** for real-time notifications
-   **MySQL** (Central Database)

### **Frontend**
-   **React 19**
-   **Vite** (Build Tool)
-   **Dexie.js** (IndexedDB wrapper for offline storage)
-   **React Router Dom** (Navigation)
-   **SockJS & StompJS** (Real-time communication)

## 📦 Setting Up

### **Prerequisites**
-   Java DEVELOPMENT KIT (JDK) 17 or higher
-   Node.js (v18+) and npm
-   MySQL Server

### **Backend Setup**
1.  Navigate to the `Backend` directory.
2.  Configure your MySQL database in `src/main/resources/application.properties`:
    ```properties
    spring.datasource.url=jdbc:mysql://localhost:3306/biryanipos?createDatabaseIfNotExist=true
    spring.datasource.username=your_username
    spring.datasource.password=your_password
    ```
3.  Build and run the application:
    ```bash
    mvn spring-boot:run
    ```

### **Frontend Setup**
1.  Navigate to the `Frontend` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## 🚀 Running the Whole System
You can use the provided `start_pos.bat` script (Windows) in the root directory to start both the backend and frontend simultaneously.

## 📜 License
This project is private and for internal use.

---
Built with ❤️ for Biryani outlets.
