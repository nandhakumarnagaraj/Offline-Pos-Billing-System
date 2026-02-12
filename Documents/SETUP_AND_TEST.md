# Real-Time POS Setup & Testing Guide

This guide explains how to configure your Windows PC as a server and test the real-time synchronization between the Waiter App, Kitchen Display, and Billing Counter.

## 1. Network Configuration (One-Time Setup)

Since this is an offline system, we will use the Windows **Mobile Hotspot** feature.

1.  **Turn on Mobile Hotspot**:
    *   Go to **Settings** > **Network & Internet** > **Mobile Hotspot**.
    *   Toggle **On**.
    *   Set **Share over** to **Wi-Fi**.
    *   Click **Edit** to set a Network Name (SSID) and Password (e.g., `BiryaniPOS` / `password123`).

2.  **Verify IP Address**:
    *   Open Command Prompt (`cmd`) and type `ipconfig`.
    *   Look for the **Wireless LAN adapter Local Area Connection*...** section.
    *   The **IPv4 Address** should normally be `192.168.137.1`.
    *   *Note: If it is different, you must update the `start_pos.bat` and Frontend `api.js` / `ws.js` files.*

3.  **Firewall Settings (Important)**:
    *   Ensure Windows Firewall allows connections on ports **8080** (Backend) and **5173** (Frontend).
    *   If devices cannot connect, try temporarily disabling the firewall for "Private networks" to test.

## 2. Starting the System

We have created a simple startup script to run everything.

1.  Go to your Desktop folder `Offline PoS`.
2.  Double-click **`start_pos.bat`**.
3.  Two windows will open:
    *   **Backend Server**: Wait until you see `Started BackendApplication`.
    *   **Frontend**: Wait until you see `Network: http://192.168.137.1:5173/`.

## 3. Connecting Devices (Real-Time Test)

To test the real-time features, you need at least one extra device (phone or tablet), or you can simulate it using multiple browser tabs/windows.

### Device URLs
Connect your phone/tablet to the `BiryaniPOS` Wi-Fi network.

| Role | URL |
|------|-----|
| **Waiter** | `http://192.168.137.1:5173/waiter` |
| **Kitchen** | `http://192.168.137.1:5173/kitchen` |
| **Counter** | `http://192.168.137.1:5173/counter` |

## 4. Testing Scenario

Follow these steps to verify real-time data sync:

### Step 1: Place an Order (Waiter)
1.  Open the **Waiter App** on your **Phone**.
2.  Enter Table Number (e.g., `T1`) and Customer Name.
3.  Tap on **Chicken Biryani** (x2) and **Coke** (x1).
4.  Tab **Place Order**.
5.  *Result*: You should see "Order Placed Successfully".

### Step 2: Receive Order (Kitchen)
1.  Open the **Kitchen Display** on your **PC Screen**.
2.  *Result*: The order for Table `T1` should **appear instantly** without refreshing the page. It will have an orange border (Status: **NEW**).

### Step 3: Update Status (Kitchen)
1.  On the Kitchen screen, click **Start Cooking**.
2.  *Result*: The card turns yellow (Status: **COOKING**).
3.  If you check the **Waiter App > Active Orders tab**, the status should update instantly to **COOKING**.

### Step 4: Mark Ready (Kitchen)
1.  Click **Mark Ready**.
2.  *Result*: The card turns green (Status: **READY**).

### Step 5: Payment (Counter)
1.  Open the **Counter App** in a new tab.
2.  You will see the order for `T1` with the total amount.
3.  Click **Mark Paid**.
4.  *Result*: The order should disappear from the Active list or turn green/archived depending on the filter.

## Troubleshooting

*   **"Network Error" in Frontend**:
    *   Ensure the Backend is running.
    *   Check if your IP address is `192.168.137.1`. If not, update `Frontend/src/service/api.js` and `Frontend/src/service/ws.js`.
*   **WebSocket not connecting**:
    *   If `console.log` shows WebSocket errors, ensure your firewall isn't blocking the connection.
