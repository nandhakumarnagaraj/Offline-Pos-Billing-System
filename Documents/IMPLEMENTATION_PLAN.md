# KhanaBook V1 — Implementation Plan
## Building on Existing Biryani POS Codebase

### EXISTING CODEBASE INVENTORY
| Layer | What Exists | Files |
|---|---|---|
| **Backend Models** | MenuItem, Order, OrderItem, OrderStatus | 4 files |
| **Backend Services** | MenuItemService (CRUD + seed), OrderService (create/status), BackupService | 3 files |
| **Backend Controllers** | MenuItemController (GET only), OrderController (CRUD), SystemController (backup) | 3 files |
| **Backend Config** | CORS, WebSocket (STOMP), H2 DB | 3 files |
| **Frontend Pages** | WaiterPage, KitchenPage, CounterPage | 3 pages |
| **Frontend Services** | api.js (axios), ws.js (STOMP/SockJS) | 2 files |
| **Infra** | start_pos.bat, vite.config.js | 2 files |

### WHAT NEEDS TO BE BUILT

#### PHASE 1: Backend — New Models & Entities
1. `Category` — Menu categories (Biryani, Starters, Drinks, etc.)
2. `Table` — Restaurant tables with status (AVAILABLE, OCCUPIED)
3. `Payment` — Payment records (mode, amount, GST breakdown)
4. `Expense` — Daily expense records
5. `StockItem` — Inventory items
6. `StockTransaction` — Stock movements (IN/OUT/WASTE)
7. `DailySalesReport` — Aggregated daily data
8. Enhance `Order` — Add orderType (DINE_IN/TAKEAWAY), GST fields, freeze timer, payment status
9. Enhance `MenuItem` — Link to Category entity

#### PHASE 2: Backend — Services & APIs
1. TableService + Controller — CRUD, occupy/release
2. CategoryService + Controller — CRUD
3. Enhanced MenuItemController — Full CRUD, toggle availability, search, filter by category
4. Enhanced OrderService — Dine-in flow, takeaway flow, freeze logic, GST calc
5. PaymentService + Controller — Process payments, multiple modes
6. BillingService — GST computation, invoice generation
7. ExpenseService + Controller — CRUD, reports
8. StockService + Controller — Entry, issue, auto-deduct, alerts
9. ReportService + Controller — Daily/weekly/monthly, top items, payment analysis

#### PHASE 3: Frontend — Complete UI Overhaul
1. Premium Home Dashboard with KhanaBook branding
2. Enhanced Waiter Page — Table selection grid, category tabs, cart with quantities, freeze timer
3. Enhanced Kitchen Page — KDS with sound alerts, prep time, order cards
4. Enhanced Counter/Cashier Page — Bill generation, GST display, payment modes, invoice print
5. Manager/Admin Page — Menu CRUD, table config, reports dashboard, stock management, expenses
6. Responsive design for mobile (waiter tablets) and desktop (counter)

#### PHASE 4: Advanced Features
1. QR code generation per table
2. Simple cloud sync stub
3. PDF invoice generation
