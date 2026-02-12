import axios from 'axios';

const API_BASE_URL = `http://${window.location.hostname}:8080/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Handle 401 (Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear storage and redirect to login if token matches
      // Avoid loops if already on login
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('kb_token');
        localStorage.removeItem('kb_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (creds) => api.post('/auth/login', creds);
export const changePassword = (data) => api.post('/auth/change-password', data);
export const createUser = (user) => api.post('/auth/create-user', user);
export const getAllUsers = () => api.get('/auth/users');
export const resetUserPassword = (userId) => api.put(`/auth/reset-password/${userId}`);
export const toggleUserActive = (userId) => api.put(`/auth/toggle-active/${userId}`);

// Menu Items
export const getMenuItems = () => api.get('/menu-items');
export const getAvailableMenuItems = () => api.get('/menu-items/available');
export const getMenuItemsByCategory = (category) => api.get(`/menu-items/category/${category}`);
export const searchMenuItems = (query) => api.get(`/menu-items/search?q=${query}`);
export const createMenuItem = (item) => api.post('/menu-items', item);
export const updateMenuItem = (id, item) => api.put(`/menu-items/${id}`, item);
export const toggleMenuItemAvailability = (id) => api.put(`/menu-items/${id}/toggle-availability`);
export const deleteMenuItem = (id) => api.delete(`/menu-items/${id}`);

// Orders
export const createOrder = (order) => api.post('/orders', order);
export const getOrders = () => api.get('/orders');
export const getActiveOrders = () => api.get('/orders/active');
export const getKitchenOrders = () => api.get('/orders/kitchen');
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const updateOrderStatus = (id, status) => api.put(`/orders/${id}/status?status=${status}`);
export const addItemsToOrder = (id, items) => api.post(`/orders/${id}/items`, items);
export const cancelOrder = (id) => api.put(`/orders/${id}/cancel`);

// Tables
export const getTables = () => api.get('/tables');
export const getAvailableTables = () => api.get('/tables/available');
export const createTable = (table) => api.post('/tables', table);
export const updateTableStatus = (id, status) => api.put(`/tables/${id}/status?status=${status}`);

// Categories
export const getCategories = () => api.get('/categories');
export const getActiveCategories = () => api.get('/categories/active');
export const createCategory = (cat) => api.post('/categories', cat);
export const updateCategory = (id, cat) => api.put(`/categories/${id}`, cat);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);

// Payments
export const processPayment = (payment) => api.post('/payments', payment);
export const getBill = (orderId) => api.get(`/payments/bill/${orderId}`);

// Expenses
export const createExpense = (expense) => api.post('/expenses', expense);
export const getExpenses = () => api.get('/expenses');
export const getTodayExpenses = () => api.get('/expenses/today');
export const getExpensesByDateRange = (start, end) => api.get(`/expenses/by-date?start=${start}&end=${end}`);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

// Stock
export const getStockItems = () => api.get('/stock/items');
export const getLowStockItems = () => api.get('/stock/items/low-stock');
export const createStockItem = (item) => api.post('/stock/items', item);
export const updateStockItem = (id, item) => api.put(`/stock/items/${id}`, item);
export const deleteStockItem = (id) => api.delete(`/stock/items/${id}`);
export const recordStockTransaction = (tx) => api.post('/stock/transactions', tx);
export const getWasteTransactions = () => api.get('/stock/transactions/waste');

// Reports
export const getDashboard = () => api.get('/reports/dashboard');
export const getSalesReport = (start, end) => api.get(`/reports/sales?start=${start}&end=${end}`);
export const getDailyReport = () => api.get('/reports/daily');

// System
export const triggerBackup = () => api.post('/system/backup');
