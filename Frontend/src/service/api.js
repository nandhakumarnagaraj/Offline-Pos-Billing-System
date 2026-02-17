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
export const getRecipeCosting = (id) => api.get(`/menu-items/${id}/costing`);
export const getAllRecipeCosting = () => api.get('/menu-items/costing');
export const updateRecipe = (menuItemId, ingredients) => api.put(`/menu-items/${menuItemId}/recipe`, ingredients);
export const addRecipeIngredient = (menuItemId, ingredient) => api.post(`/menu-items/${menuItemId}/recipe/ingredient`, ingredient);
export const removeRecipeIngredient = (menuItemId, ingredientId) => api.delete(`/menu-items/${menuItemId}/recipe/ingredient/${ingredientId}`);
export const clearRecipe = (menuItemId) => api.delete(`/menu-items/${menuItemId}/recipe`);

// Orders
export const createOrder = (order) => api.post('/orders', order);
export const getOrders = () => api.get('/orders');
export const getActiveOrders = () => api.get('/orders/active');
export const getKitchenOrders = () => api.get('/orders/kitchen');
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const updateOrderStatus = (id, status) => api.put(`/orders/${id}/status?status=${status}`);
export const addItemsToOrder = (id, items) => api.post(`/orders/${id}/items`, items);
export const cancelOrder = (id) => api.put(`/orders/${id}/cancel`);
export const extendOrderTime = (id, minutes) => api.put(`/orders/${id}/extend-time?minutes=${minutes}`);
export const getOrdersByDate = (start, end) => api.get(`/orders/by-date?start=${start}&end=${end}`);

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
export const initiateDigitalPayment = (orderId, discount = 0, mode, upiId = null) => {
  const data = {
    orderId,
    discount,
    mode,
  };
  if (upiId) {
    data.upiId = upiId;
  }
  return api.post(`/payments/initiate-digital`, data);
};

export const verifyEasebuzzPayment = (payload) => api.post('/payments/easebuzz/verify', payload);

// Expenses
export const createExpense = (expense) => api.post('/expenses', expense);
export const getExpenses = () => api.get('/expenses');
export const getTodayExpenses = () => api.get('/expenses/today');
export const getExpensesByDateRange = (start, end) => api.get(`/expenses/by-date?start=${start}&end=${end}`);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

// Stock
export const getStockItems = () => api.get('/stock/items');
export const getLowStockItems = () => api.get('/stock/items/low-stock');
export const getExpiringStockItems = (days = 7) => api.get(`/stock/transactions/expiring?days=${days}`);
export const createStockItem = (item) => api.post('/stock/items', item);
export const updateStockItem = (id, item) => api.put(`/stock/items/${id}`, item);
export const deleteStockItem = (id) => api.delete(`/stock/items/${id}`);
export const recordStockTransaction = (tx) => api.post('/stock/transactions', tx);
export const getWasteTransactions = () => api.get('/stock/transactions/waste');

// Suppliers
export const getAllSuppliers = () => api.get('/procurement/suppliers');
export const createSupplier = (s) => api.post('/procurement/suppliers', s);
export const getExpensesBySupplier = (id) => api.get(`/expenses/supplier/${id}`);

// Reports
export const getDashboard = () => api.get('/reports/dashboard');
export const getSalesReport = (start, end) => api.get(`/reports/sales?start=${start}&end=${end}`);
export const getDailyReport = () => api.get('/reports/daily');

// System
export const triggerBackup = () => api.post('/system/backup');
