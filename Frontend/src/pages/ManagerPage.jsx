import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  getDashboard, getSalesReport, getDailyReport,
  getMenuItems, createMenuItem, updateMenuItem, toggleMenuItemAvailability, deleteMenuItem,
  getCategories, createCategory, deleteCategory,
  getStockItems, getLowStockItems, createStockItem, recordStockTransaction, getWasteTransactions,
  getExpenses, getTodayExpenses, createExpense, deleteExpense,
  getTables, createTable,
  triggerBackup,
  getAllUsers, createUser, resetUserPassword, toggleUserActive,
  getExpiringStockItems, getAllSuppliers, getAllRecipeCosting,
  getExpensesBySupplier,
  updateRecipe, removeRecipeIngredient, clearRecipe
} from '../service/api';
import { connectWebSocket } from '../service/ws';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal from '../components/Modal';
import { toast } from 'react-hot-toast';
import './ManagerPage.css';

// Local Modal component removed - using shared component
const VARIATION_UNITS = ['Cms', 'Piece', 'scoop', 'grams', 'inches', 'ml', 'ounces', 'serves', 'slices', 'kg', 'Litre'];


function ManagerPage() {
  const { logout, user } = useAuth();
  const { config: shopConfig } = useConfig();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiringStock, setExpiringStock] = useState([]);
  const [wasteData, setWasteData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [recipeCosts, setRecipeCosts] = useState([]);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipePage, setRecipePage] = useState(1);
  const RECIPES_PER_PAGE = 9;
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expensePage, setExpensePage] = useState(1);
  const EXPENSES_PER_PAGE = 9;
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [tables, setTables] = useState([]);
  const [users, setUsers] = useState([]);
  const [salesReport, setSalesReport] = useState(null);
  const [dateRange, setDateRange] = useState({ start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });

  // Menu Filtering
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuActiveCategory, setMenuActiveCategory] = useState('All');

  // Forms
  const [newItem, setNewItem] = useState({
    name: '', description: '', price: '', category: 'Royal Biryani Selection',
    imageUrl: '', vegetarian: false, prepTimeMinutes: 15,
    variations: [], trackStock: false, stockLevel: 0
  });
  const [newExpense, setNewExpense] = useState({
    category: 'UTILITY', description: '', amount: '', paymentMethod: 'CASH',
    gstAmount: '', supplierId: '', isRecurring: false, recurringInterval: 'MONTHLY'
  });
  const [newStock, setNewStock] = useState({ name: '', unit: 'KG', reorderLevel: '', costPerUnit: '', supplierId: '' });
  const [newUser, setNewUser] = useState({ username: '', displayName: '', role: 'WAITER' });
  const [stockTx, setStockTx] = useState({
    stockItemId: '', transactionType: 'PURCHASE', quantity: '',
    reason: '', expiryDate: '', wasteCategory: 'SPOILAGE'
  });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newTable, setNewTable] = useState({ tableNumber: '', capacity: 4 });
  const [showForm, setShowForm] = useState('');
  const [showCategoryMgr, setShowCategoryMgr] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [editRecipeIngredients, setEditRecipeIngredients] = useState([]);

  useEffect(() => {
    loadDashboard();
    const sc = connectWebSocket(
      null,
      () => loadDashboard(),
      (msg) => {
        toast.error(msg, { duration: 6000 });
        loadStock(); // Refresh stock list when an alert happens
      }
    );
    return () => sc.deactivate();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReport();
    }
  }, [activeTab, dateRange]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await getDashboard();
      setDashboard(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const loadMenu = async () => {
    setLoading(true);
    const [menuRes, catRes] = await Promise.all([getMenuItems(), getCategories()]);
    setMenuItems(menuRes.data);
    setCategories(catRes.data);
    setLoading(false);
  };

  const loadStock = async () => {
    setLoading(true);
    const [stockRes, lowRes, wasteRes, expiringRes] = await Promise.all([
      getStockItems(), getLowStockItems(), getWasteTransactions(), getExpiringStockItems(7)
    ]);
    setStockItems(stockRes.data);
    setLowStock(lowRes.data);
    setWasteData(wasteRes.data);
    setExpiringStock(expiringRes.data);
    setLoading(false);
  };

  const loadExpenses = async (supplierId) => {
    setLoading(true);
    let expRes;
    if (supplierId) {
      expRes = await getExpensesBySupplier(supplierId);
    } else {
      expRes = await getTodayExpenses();
    }
    const supRes = await getAllSuppliers();
    setExpenses(expRes.data);
    setSuppliers(supRes.data);
    setLoading(false);
  };

  const loadTables = async () => {
    setLoading(true);
    const res = await getTables();
    setTables(res.data);
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  const loadReport = async () => {
    const res = await getSalesReport(dateRange.start, dateRange.end);
    setSalesReport(res.data);
  };

  const downloadReportPDF = () => {
    if (!salesReport) return;
    const doc = new jsPDF();
    const primaryColor = [15, 23, 42]; // Slate 900

    // Header section
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('POS SALES REPORT', 24, 25);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 24, 32);
    doc.text(`Reporting Period: ${dateRange.start} to ${dateRange.end}`, 24, 37);

    // Summary Section
    doc.setTextColor(...primaryColor);
    doc.setFontSize(16);
    doc.text('1. Business Performance Summary', 20, 60);

    autoTable(doc, {
      startY: 65,
      head: [['Metric', 'Value']],
      body: [
        ['Total Gross Revenue', `INR ${salesReport.totalRevenue?.toFixed(2)}`],
        ['Total Net Profit', `INR ${salesReport.netProfit?.toFixed(2)}`],
        ['Total GST Collected', `INR ${salesReport.totalGst?.toFixed(2)}`],
        ['Total Orders Processed', `${salesReport.totalOrders}`],
        ['Successful (Paid) Orders', `${salesReport.paidOrders || 0}`],
        ['Cancelled Orders', `${salesReport.cancelledOrders || 0}`],
        ['Dine-In Orders', `${salesReport.dineInOrders || 0}`],
        ['Takeaway Orders', `${salesReport.takeawayOrders || 0}`],
        ['Total Discounts Given', `INR ${salesReport.totalDiscount?.toFixed(2)}`],
        ['Operational Expenses', `INR ${salesReport.totalExpenses?.toFixed(2)}`]
      ],
      headStyles: { fillColor: primaryColor },
      theme: 'grid'
    });

    // Payment Section
    doc.text('2. Revenue Distribution by Payment Mode', 20, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Mode', 'Amount (INR)']],
      body: Object.entries(salesReport.paymentBreakdown || {}).map(([mode, amt]) => [mode, amt.toFixed(2)]),
      headStyles: { fillColor: primaryColor }
    });

    // Inventory Section
    doc.addPage();
    doc.text('3. Menu Item Performance (Volume & Value)', 20, 25);
    autoTable(doc, {
      startY: 30,
      head: [['Item Name', 'Units Sold', 'Total Revenue (INR)']],
      body: salesReport.topItems?.map(i => [i.name, i.quantity, i.revenue.toFixed(2)]),
      headStyles: { fillColor: primaryColor },
      theme: 'striped'
    });

    // Footer with Page Numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Offline POS System | Confidential | Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`POS_Sales_Report_${dateRange.start}.pdf`);
  };

  const addVariation = () => {
    setNewItem({
      ...newItem,
      variations: [...newItem.variations, { name: '', unit: '', price: 0 }]
    });
  };

  const removeVariation = (index) => {
    const updated = newItem.variations.filter((_, i) => i !== index);
    setNewItem({ ...newItem, variations: updated });
  };

  const updateVariation = (index, field, value) => {
    const updated = [...newItem.variations];
    updated[index] = { ...updated[index], [field]: value };
    setNewItem({ ...newItem, variations: updated });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowForm('');
    setRecipePage(1);
    setExpensePage(1);
    if (tab === 'menu') loadMenu();
    if (tab === 'stock') loadStock();
    if (tab === 'expenses') loadExpenses();
    if (tab === 'tables') loadTables();
    if (tab === 'users') loadUsers();
    if (tab === 'reports') loadReport();
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'recipes') loadRecipeCosts();
  };

  const loadRecipeCosts = async () => {
    const [costRes, stockRes] = await Promise.all([getAllRecipeCosting(), getStockItems()]);
    setRecipeCosts(costRes.data);
    setStockItems(stockRes.data);
  };

  const handleEditRecipe = (rc) => {
    setEditingRecipeId(rc.menuItemId);
    // Create deep copy to avoid mutation
    setEditRecipeIngredients(
      rc.ingredients.map(ing => ({
        stockItemId: ing.stockItemId,
        quantity: ing.quantity,
        name: ing.name,
        unit: ing.unit
      }))
    );
  };

  const handleSaveRecipe = async () => {
    try {
      setLoading(true);
      const payload = editRecipeIngredients
        .filter(i => i.stockItemId && i.quantity > 0)
        .map(i => ({ stockItemId: i.stockItemId, quantity: parseFloat(i.quantity) }));

      await updateRecipe(editingRecipeId, payload);
      await loadRecipeCosts();

      setEditingRecipeId(null);
      setEditRecipeIngredients([]);
      toast.success('Recipe saved successfully');
    } catch (err) {
      toast.error('Failed to save recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipeIngredient = async (menuItemId, ingredientId) => {
    try {
      await removeRecipeIngredient(menuItemId, ingredientId);
      loadRecipeCosts();
      toast.success('Ingredient removed');
    } catch (err) { toast.error('Failed to remove ingredient'); }
  };

  const handleDeleteRecipe = async (menuItemId) => {
    if (!window.confirm('Remove all ingredients from this recipe?')) return;
    try {
      await clearRecipe(menuItemId);
      loadRecipeCosts();
      toast.success('Recipe cleared');
    } catch (err) { toast.error('Failed to clear recipe'); }
  };

  const addEditIngredient = () => {
    setEditRecipeIngredients([...editRecipeIngredients, { stockItemId: '', quantity: 0 }]);
  };

  const updateEditIngredient = (index, field, value) => {
    const updated = [...editRecipeIngredients];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'stockItemId') {
      const stock = stockItems.find(s => s.id === parseInt(value));
      if (stock) {
        updated[index].name = stock.name;
        updated[index].unit = stock.unit;
      }
    }
    setEditRecipeIngredients(updated);
  };

  const removeEditIngredient = (index) => {
    setEditRecipeIngredients(editRecipeIngredients.filter((_, i) => i !== index));
  };

  const handleSaveMenuItem = async () => {
    try {
      const itemData = {
        ...newItem,
        price: parseFloat(newItem.price) || 0,
        variations: newItem.variations.map(v => ({
          ...v,
          name: v.unit ? `${v.name} ${v.unit}`.trim() : v.name,
          price: parseFloat(v.price) || 0
        })),
        available: true,
        gstPercent: 5.0
      };

      if (editingItemId) {
        await updateMenuItem(editingItemId, itemData);
      } else {
        await createMenuItem(itemData);
      }

      setNewItem({ name: '', description: '', price: '', category: 'Royal Biryani Selection', imageUrl: '', vegetarian: false, prepTimeMinutes: 15, variations: [] });
      setEditingItemId(null);
      setShowForm('');
      loadMenu();
      toast.success(editingItemId ? 'Item updated' : 'Item created');
    } catch (err) { toast.error('Failed to save menu item'); }
  };

  const handleEditClick = (item) => {
    setNewItem({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || '',
      vegetarian: item.vegetarian,
      prepTimeMinutes: item.prepTimeMinutes || 15,
      variations: item.variations ? item.variations.map(v => ({ ...v, price: v.price.toString() })) : []
    });
    setEditingItemId(item.id);
    setShowForm('menu');
  };

  const handleToggleAvail = async (id) => {
    await toggleMenuItemAvailability(id);
    loadMenu();
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this item?')) return;
    await deleteMenuItem(id);
    loadMenu();
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      loadExpenses(selectedSupplier);
      toast.success('Expense deleted');
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const handleAddExpense = async () => {
    try {
      await createExpense({
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        gstAmount: parseFloat(newExpense.gstAmount) || 0,
        supplierId: newExpense.supplierId ? parseInt(newExpense.supplierId) : null,
        expenseDate: new Date().toISOString().split('T')[0]
      });
      setNewExpense({
        category: 'UTILITY', description: '', amount: '',
        paymentMethod: 'CASH', gstAmount: '', supplierId: '',
        isRecurring: false, recurringInterval: 'MONTHLY',
        receiptImageUrl: ''
      });
      setShowForm('');
      loadExpenses();
      toast.success('Expense added');
    } catch (err) { toast.error('Failed to save expense'); }
  };

  const handleAddStock = async () => {
    try {
      await createStockItem({ ...newStock, reorderLevel: parseFloat(newStock.reorderLevel), costPerUnit: parseFloat(newStock.costPerUnit), active: true });
      setNewStock({ name: '', unit: 'KG', reorderLevel: '', costPerUnit: '', supplierId: '' });
      setShowForm('');
      loadStock();
      toast.success('Stock item added');
    } catch (err) { toast.error('Failed to add stock item'); }
  };

  const handleStockTx = async () => {
    try {
      await recordStockTransaction({
        ...stockTx,
        stockItemId: parseInt(stockTx.stockItemId),
        quantity: parseFloat(stockTx.quantity)
      });
      setStockTx({ stockItemId: '', transactionType: 'PURCHASE', quantity: '', reason: '', expiryDate: '', wasteCategory: 'SPOILAGE' });
      setShowForm('');
      loadStock();
      toast.success('Transaction recorded');
    } catch (err) { toast.error('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const handleAddCategory = async () => {
    try {
      await createCategory(newCategory);
      setNewCategory({ name: '', description: '' });
      loadMenu();
      toast.success('Category created');
    } catch (err) { toast.error('Failed to create category'); }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      loadMenu();
      toast.success('Category deleted');
    } catch (err) { toast.error('Failed to delete category'); }
  };

  const handleCreateTable = async () => {
    try {
      await createTable({ ...newTable, capacity: parseInt(newTable.capacity) });
      setNewTable({ tableNumber: '', capacity: 4 });
      setShowForm('');
      loadTables();
      toast.success('Table created');
    } catch (err) { toast.error('Failed to create table'); }
  };

  const handleBackup = async () => {
    try {
      const res = await triggerBackup();
      toast.success(res.data);
    } catch (err) { toast.error('Backup failed'); }
  };

  const handleCreateUser = async () => {
    try {
      const res = await createUser(newUser);
      setNewUser({ username: '', displayName: '', role: 'WAITER' });
      setShowForm('');
      loadUsers();
      toast.success('User created!');
    } catch (err) { toast.error('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const handleResetPassword = async (id) => {
    if (!confirm('Are you sure you want to reset this user\'s password?')) return;
    try {
      const res = await resetUserPassword(id);
      loadUsers();
      toast.success('Password reset successfully');
    } catch (err) { toast.error('Failed to reset password'); }
  };

  const handleToggleActive = async (id) => {
    try {
      await toggleUserActive(id);
      loadUsers();
      toast.success('User status updated');
    } catch (err) { toast.error('Failed to update status'); }
  };

  return (
    <div className="manager-page">
      <aside className="manager-sidebar">
        <div className="sidebar-brand">
          <Link to="/" className="sidebar-logo">
            <img src={shopConfig.logo} alt={shopConfig.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          </Link>
          <span className="sidebar-title">{shopConfig.softwareName}</span>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'menu', icon: '🍽️', label: 'Menu' },
            { id: 'tables', icon: '🪑', label: 'Tables' },
            { id: 'users', icon: '👤', label: 'Users' },
            { id: 'stock', icon: '📦', label: 'Inventory' },
            { id: 'recipes', icon: '🥘', label: 'Recipes' },
            { id: 'expenses', icon: '💸', label: 'Expenses' },
            { id: 'reports', icon: '📈', label: 'Reports' },
          ].map(tab => (
            <button key={tab.id}
              className={`sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}>
              <span className="sb-icon">{tab.icon}</span>
              <span className="sb-label">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">

          <button className="btn btn-outline btn-sm" onClick={handleBackup}>💾 Backup DB</button>
          <button className="btn btn-danger btn-sm" onClick={logout} style={{ marginTop: '8px' }}>🚪 Sign Out</button>
        </div>
      </aside>

      <main className="manager-main">
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="m-section animate-fadeIn">
            <h2>Dashboard</h2>


            {dashboard.lowStockCount > 0 && (
              <div className="alert-banner">⚠️ {dashboard.lowStockCount} items are low on stock!</div>
            )}
            {dashboard.expiringItemsCount > 0 && (
              <div className="alert-banner" style={{ background: '#fff3cd', color: '#856404', borderColor: '#ffeeba' }}>
                ⏰ {dashboard.expiringItemsCount} items are expiring within a week!
              </div>
            )}

            <div className="dash-grid">
              <div className="glass-card dash-section">
                <h3>🔥 Top Sellers</h3>
                {dashboard.topSellingItems?.map((item, i) => (
                  <div key={i} className="top-item">
                    <span className="top-rank">#{i + 1}</span>
                    <span className="top-name">{item.name}</span>
                    <span className="top-qty">{item.quantity} sold</span>
                    <span className="top-rev">₹{item.revenue?.toFixed(0)}</span>
                  </div>
                ))}
                {(!dashboard.topSellingItems || dashboard.topSellingItems.length === 0) && (
                  <div className="empty-state-sm">No data yet</div>
                )}
              </div>

              <div className="glass-card dash-section">
                <h3>💳 Payment Modes</h3>
                {dashboard.paymentModeBreakdown && Object.entries(dashboard.paymentModeBreakdown).map(([mode, amt]) => (
                  <div key={mode} className="pay-mode-row">
                    <span>{mode}</span>
                    <span className="pay-amt">₹{amt.toFixed(0)}</span>
                  </div>
                ))}
                {(!dashboard.paymentModeBreakdown || Object.keys(dashboard.paymentModeBreakdown).length === 0) && (
                  <div className="empty-state-sm">No payments today</div>
                )}
              </div>

              <div className="glass-card dash-section">
                <h3>🕐 Recent Orders</h3>
                {dashboard.recentOrders?.slice(0, 5).map(order => (
                  <div key={order.id} className="recent-order-row">
                    <span>{order.id} · {order.tableNumber}</span>
                    <span className={`badge badge-${order.status?.toLowerCase()}`}>{order.status}</span>
                    <span>₹{order.totalAmount?.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MENU MANAGEMENT */}
        {activeTab === 'menu' && (
          <div className="m-section animate-fadeIn">
            <h2>Menu Management</h2>
            <div className="header-actions">
              <button className="btn btn-outline" onClick={() => setShowCategoryMgr(!showCategoryMgr)}>
                {showCategoryMgr ? 'Hide Categories' : 'Manage Categories'}
              </button>
              <button className="btn btn-primary" onClick={() => setShowForm(showForm === 'menu' ? '' : 'menu')}>
                + Add Item
              </button>
            </div>


            <Modal isOpen={showCategoryMgr} onClose={() => setShowCategoryMgr(false)} title="Manage Categories">
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 150px' }}>
                <div className="form-group">
                  <label>Name</label>
                  <input className="input" placeholder="Category Name" value={newCategory.name}
                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input className="input" placeholder="Description (optional)" value={newCategory.description}
                    onChange={e => setNewCategory({ ...newCategory, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>&nbsp;</label>
                  <button className="btn btn-success" onClick={handleAddCategory}>Add Category</button>
                </div>
              </div>
              <div className="category-chips" style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {categories.map(c => (
                  <div key={c.id} className="cat-chip" style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{c.name}</span>
                    <button onClick={() => handleDeleteCategory(c.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>&times;</button>
                  </div>
                ))}
              </div>
            </Modal>

            <Modal isOpen={showForm === 'menu'} onClose={() => { setShowForm(''); setEditingItemId(null); }} title={editingItemId ? "Edit Menu Item" : "Add New Menu Item"}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Item Name</label>
                  <input className="input" placeholder="e.g. Chicken Biryani" value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select className="select" value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                    <span>Pricing / Variations</span>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addVariation}>+ Add</button>
                  </label>
                  {newItem.variations && newItem.variations.length > 0 ? (
                    <div className="variations-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {newItem.variations.map((v, idx) => (
                        <div key={idx} className="variation-row" style={{ display: 'flex', gap: '6px' }}>
                          <input className="input" placeholder="Name/Qty" value={v.name} style={{ flex: 1.2 }}
                            onChange={e => updateVariation(idx, 'name', e.target.value)} />
                          <select className="select" value={v.unit || ''} style={{ flex: 1 }}
                            onChange={e => updateVariation(idx, 'unit', e.target.value)}>
                            <option value="">Unit</option>
                            {VARIATION_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input className="input" type="number" placeholder="₹" value={v.price} style={{ flex: 0.8 }}
                            onChange={e => updateVariation(idx, 'price', e.target.value)} />
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => removeVariation(idx)} style={{ padding: '0 8px' }}>×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input className="input" type="number" placeholder="Base Price" value={newItem.price}
                      onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                  )}
                  <small style={{ color: '#bbb' }}>Leave 0 if using variations</small>
                </div>
                <div className="form-group">
                  <label>Image URL</label>
                  <input className="input" placeholder="https://..." value={newItem.imageUrl || ''}
                    onChange={e => setNewItem({ ...newItem, imageUrl: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="input" rows="2" placeholder="Item details..." value={newItem.description}
                    onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                </div>
                <div className="form-group checkbox-group" style={{ flexDirection: 'row', gap: '20px' }}>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={newItem.vegetarian}
                      onChange={e => setNewItem({ ...newItem, vegetarian: e.target.checked })} />
                    Vegetarian
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={newItem.trackStock}
                      onChange={e => setNewItem({ ...newItem, trackStock: e.target.checked })} />
                    Track Stock
                  </label>
                </div>
                {newItem.trackStock && (
                  <div className="form-group animate-slideUp">
                    <label>Current Stock Level</label>
                    <input className="input" type="number" value={newItem.stockLevel}
                      onChange={e => setNewItem({ ...newItem, stockLevel: e.target.value })} />
                  </div>
                )}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <button className="btn btn-success" onClick={handleSaveMenuItem} style={{ width: '100%' }}>
                    {editingItemId ? 'Update Menu Item' : 'Create Menu Item'}
                  </button>
                </div>
              </div>
            </Modal>

            <div className="menu-grid-container">
              <div className="menu-management-sidebar">
                <input
                  className="input search-input"
                  placeholder="🔍 Search menu..."
                  value={menuSearchQuery}
                  onChange={e => setMenuSearchQuery(e.target.value)}
                />
                <div className="category-list">
                  <button
                    className={`cat-btn ${menuActiveCategory === 'All' ? 'active' : ''}`}
                    onClick={() => setMenuActiveCategory('All')}
                  >
                    All Items
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      className={`cat-btn ${menuActiveCategory === cat.name ? 'active' : ''}`}
                      onClick={() => setMenuActiveCategory(cat.name)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="menu-cards-grid">

                {menuItems
                  .filter(item => {
                    const matchesCategory = menuActiveCategory === 'All' || item.category === menuActiveCategory;
                    const matchesSearch = item.name.toLowerCase().includes(menuSearchQuery.toLowerCase());
                    return matchesCategory && matchesSearch;
                  })
                  .map(item => (
                    <div key={item.id} className={`manager-menu-card ${!item.available ? 'unavailable' : ''} animate-fadeIn`}>
                      <div className="card-img-wrap">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} />
                        ) : (
                          <div className="placeholder-img">🍲</div>
                        )}
                        <div className="card-badges">
                          <span className={`veg-indicator ${item.vegetarian ? 'veg' : 'non-veg'}`}></span>
                        </div>
                        <div className="card-status-overlay">
                          <span className={`status-pill ${item.available ? 'available' : 'unavailable'}`}>
                            {item.available ? 'Available' : 'Sold Out'}
                          </span>
                          {item.trackStock && (
                            <span className={`status-pill stock-badge ${item.stockLevel < 5 ? 'low-stock' : 'in-stock'}`}>
                              📦 {item.stockLevel} left
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="card-content">
                        <div className="card-header">
                          <h3 className="card-title">{item.name}</h3>
                          <div className="card-price">
                            {item.variations && item.variations.length > 0
                              ? `₹${Math.min(...item.variations.map(v => v.price))}+`
                              : `₹${item.price}`}
                          </div>
                        </div>
                        {item.variations && item.variations.length > 0 && (
                          <div className="variation-chips">
                            {item.variations.map(v => (
                              <span key={v.id} className="variation-chip">
                                {v.name}: ₹{v.price}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="card-actions-wrapper">
                          <div className="quick-toggle">
                            <label className="switch">
                              <input type="checkbox" checked={item.available} onChange={() => handleToggleAvail(item.id)} />
                              <span className="slider round"></span>
                            </label>
                            <span className="toggle-label">{item.available ? 'Active' : 'Hidden'}</span>
                          </div>
                          <div className="action-buttons">
                            <button className="icon-btn" title="Edit Item" onClick={() => handleEditClick(item)}>✏️</button>
                            <button className="icon-btn delete" title="Delete Item" onClick={() => handleDeleteItem(item.id)}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {menuItems.length === 0 && <div className="empty-state">No menu items found.</div>}
              </div>
            </div>
          </div>
        )
        }

        {/* TABLES */}
        {
          activeTab === 'tables' && (
            <div className="m-section animate-fadeIn">
              <div className="section-header">
                <h2>Table Management</h2>
                <button className="btn btn-primary" onClick={() => setShowForm(showForm === 'table' ? '' : 'table')}>+ Add Table</button>
              </div>

              <Modal isOpen={showForm === 'table'} onClose={() => setShowForm('')} title="Add New Table">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Table Number</label>
                    <input className="input" placeholder="e.g. T1" value={newTable.tableNumber}
                      onChange={e => setNewTable({ ...newTable, tableNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Capacity</label>
                    <input className="input" placeholder="Number of seats" type="number" value={newTable.capacity}
                      onChange={e => setNewTable({ ...newTable, capacity: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <button className="btn btn-success" onClick={handleCreateTable} style={{ width: '100%' }}>Create Table</button>
                  </div>
                </div>
              </Modal>
              <div className="tables-overview">
                {tables.map(t => (
                  <div key={t.id} className={`table-overview-card ${t.status?.toLowerCase()}`}>
                    <div className="to-number">{t.tableNumber}</div>
                    <div className="to-cap">{t.capacity} seats</div>
                    <span className={`badge badge-${t.status?.toLowerCase()}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        }

        {/* USERS */}
        {
          activeTab === 'users' && (
            <div className="m-section animate-fadeIn">
              <div className="section-header">
                <h2>User Management</h2>
                <button className="btn btn-primary" onClick={() => setShowForm(showForm === 'user' ? '' : 'user')}>+ Add User</button>
              </div>

              <Modal isOpen={showForm === 'user'} onClose={() => setShowForm('')} title="Create New User">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Username</label>
                    <input className="input" placeholder="Login username" value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Display Name</label>
                    <input className="input" placeholder="Full Name" value={newUser.displayName}
                      onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>System Role</label>
                    <select className="select" value={newUser.role}
                      onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                      <option value="WAITER">Waiter</option>
                      <option value="KITCHEN">Kitchen Staff</option>
                      <option value="CASHIER">Cashier</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                    <button className="btn btn-success" onClick={handleCreateUser} style={{ width: '100%' }}>Create Account</button>
                  </div>
                </div>
                <div className="form-hint" style={{ marginTop: '10px' }}>
                  ℹ️ A secure random password will be generated for the new user.
                </div>
              </Modal>

              <table className="data-table">
                <thead>
                  <tr><th>Username</th><th>Name</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={!u.active ? 'row-muted' : ''}>
                      <td className="name-cell">{u.username}</td>
                      <td>{u.displayName}</td>
                      <td><span className="type-tag">{u.role}</span></td>
                      <td>
                        <span className={`badge ${u.active ? 'badge-ready' : 'badge-cancelled'}`}>
                          {u.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                      <td className="action-cell">
                        <button className="btn btn-sm btn-outline" onClick={() => handleResetPassword(u.id)}>Reset Pwd</button>
                        <button className={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-success'}`} onClick={() => handleToggleActive(u.id)}>
                          {u.active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        {/* STOCK/INVENTORY */}
        {
          activeTab === 'stock' && (
            <div className="m-section animate-fadeIn">
              <div className="section-header">
                <h2>Inventory & Stock</h2>
                <div className="header-actions">
                  <button className="btn btn-primary" onClick={() => setShowForm(showForm === 'stock' ? '' : 'stock')}>+ Add Item</button>
                  <button className="btn btn-outline" onClick={() => setShowForm(showForm === 'stocktx' ? '' : 'stocktx')}>📦 Record Transaction</button>
                </div>
              </div>

              {lowStock.length > 0 && (
                <div className="alert-banner">⚠️ Low Stock Alert: {lowStock.map(s => s.name).join(', ')}</div>
              )}

              <Modal isOpen={showForm === 'stock'} onClose={() => setShowForm('')} title="Add Stock Item">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Item Name</label>
                    <input className="input" placeholder="e.g. Chicken" value={newStock.name}
                      onChange={e => setNewStock({ ...newStock, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <select className="select" value={newStock.unit}
                      onChange={e => setNewStock({ ...newStock, unit: e.target.value })}>
                      <option>KG</option><option>LITRE</option><option>PIECE</option><option>PACKET</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reorder Level</label>
                    <input className="input" placeholder="Alert below this" type="number" value={newStock.reorderLevel}
                      onChange={e => setNewStock({ ...newStock, reorderLevel: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Cost Per Unit</label>
                    <input className="input" placeholder="₹ Amount" type="number" value={newStock.costPerUnit}
                      onChange={e => setNewStock({ ...newStock, costPerUnit: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Vendor / Supplier</label>
                    <select className="select" value={newStock.supplierId || ''}
                      onChange={e => setNewStock({ ...newStock, supplierId: e.target.value })}>
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                    <button className="btn btn-success" onClick={handleAddStock} style={{ width: '100%' }}>Save Item</button>
                  </div>
                </div>
              </Modal>

              <Modal isOpen={showForm === 'stocktx'} onClose={() => setShowForm('')} title="Record Stock Transaction">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Stock Item</label>
                    <select className="select" value={stockTx.stockItemId}
                      onChange={e => setStockTx({ ...stockTx, stockItemId: e.target.value })}>
                      <option value="">Select Item</option>
                      {stockItems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Transaction Type</label>
                    <select className="select" value={stockTx.transactionType}
                      onChange={e => setStockTx({ ...stockTx, transactionType: e.target.value })}>
                      <option value="PURCHASE">Purchase (Add Stock)</option>
                      <option value="ISSUE_TO_KITCHEN">Issue to Kitchen</option>
                      <option value="WASTE">Waste / Expired</option>
                      <option value="ADJUSTMENT">Stock Take (Audit)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{stockTx.transactionType === 'ADJUSTMENT' ? "Physical Count Found" : "Quantity"}</label>
                    <input className="input" placeholder="Enter amount" type="number" value={stockTx.quantity}
                      onChange={e => setStockTx({ ...stockTx, quantity: e.target.value })} />
                    <small style={{ color: '#bbb', fontSize: '0.7rem' }}>{stockTx.transactionType === 'ADJUSTMENT' ? "Entering count will override system stock" : ""}</small>
                  </div>
                  {stockTx.transactionType === 'PURCHASE' && (
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input className="input" type="date" value={stockTx.expiryDate || ''}
                        onChange={e => setStockTx({ ...stockTx, expiryDate: e.target.value })} />
                    </div>
                  )}
                  {stockTx.transactionType === 'WASTE' && (
                    <div className="form-group">
                      <label>Waste Category</label>
                      <select className="select" value={stockTx.wasteCategory || 'SPOILAGE'}
                        onChange={e => setStockTx({ ...stockTx, wasteCategory: e.target.value })}>
                        <option value="SPOILAGE">Spoilage (Rotten/Expired)</option>
                        <option value="PREP_ERROR">Prep Error (Burnt/Spilled)</option>
                        <option value="DAMAGED">Damaged (Broken Packaging)</option>
                        <option value="CUSTOMER_RETURN">Customer Return</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Reason / Notes</label>
                    <input className="input" placeholder="Any comments..." value={stockTx.reason}
                      onChange={e => setStockTx({ ...stockTx, reason: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <button className="btn btn-success" onClick={handleStockTx} style={{ width: '100%' }}>Record Transaction</button>
                  </div>
                </div>
              </Modal>

              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Unit</th><th>Current Stock</th><th>Last Audit</th><th>Cost/Unit</th><th>Supplier</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {stockItems.map(s => (
                    <tr key={s.id} className={s.currentStock <= s.reorderLevel ? 'row-warning' : ''}>
                      <td className="name-cell">{s.name}</td>
                      <td>{s.unit}</td>
                      <td className="amount-cell">{s.currentStock}</td>
                      <td>{s.lastAuditDate ? new Date(s.lastAuditDate).toLocaleDateString() : 'Never'}</td>
                      <td>₹{s.costPerUnit}</td>
                      <td>{s.supplier || '—'}</td>
                      <td>
                        <span className={`badge ${s.currentStock <= s.reorderLevel ? 'badge-new' : 'badge-ready'}`}>
                          {s.currentStock <= s.reorderLevel ? 'Low Stock' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {wasteData.length > 0 && (
                <>
                  <h3 style={{ marginTop: '32px' }}>🗑️ Waste Log</h3>
                  <table className="data-table">
                    <thead><tr><th>Item</th><th>Qty</th><th>Reason</th><th>Date</th></tr></thead>
                    <tbody>
                      {wasteData.map(w => (
                        <tr key={w.id}>
                          <td>{w.stockItem?.name}</td>
                          <td>{w.quantity}</td>
                          <td>{w.reason}</td>
                          <td>{w.transactionDate ? new Date(w.transactionDate).toLocaleDateString() : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {expiringStock.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                  <h3>⚠️ Expiring Soon (Next 7 Days)</h3>
                  <table className="data-table">
                    <thead><tr><th>Item</th><th>Qty</th><th>Expiry Date</th><th>Action</th></tr></thead>
                    <tbody>
                      {expiringStock.map(ex => (
                        <tr key={ex.id} className="row-warning">
                          <td>{ex.stockItem?.name}</td>
                          <td>{ex.quantity}</td>
                          <td>{ex.expiryDate}</td>
                          <td>
                            <button className="btn btn-sm btn-outline" onClick={() => {
                              setStockTx({ stockItemId: ex.stockItem.id, transactionType: 'WASTE', quantity: ex.quantity, reason: 'Expired', wasteCategory: 'SPOILAGE' });
                              setShowForm('stocktx');
                            }}>Mark as Waste</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        }

        {/* EXPENSES */}
        {
          activeTab === 'expenses' && (
            <div className="m-section animate-fadeIn">
              <div className="section-header">
                <h2>Expense Management</h2>
                <div className="header-actions">
                  <div className="flex items-center gap-10">
                    <div className="search-box">
                      <input
                        type="text"
                        placeholder="Search expenses..."
                        value={expenseSearch}
                        onChange={(e) => { setExpenseSearch(e.target.value); setExpensePage(1); }}
                        className="input input-sm"
                        style={{ width: '200px' }}
                      />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#bbb' }}>Vendor:</span>
                    <select className="select select-sm" value={selectedSupplier}
                      onChange={e => {
                        const sid = e.target.value;
                        setSelectedSupplier(sid);
                        loadExpenses(sid);
                        setExpensePage(1);
                      }}>
                      <option value="">Today's All</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowForm(showForm === 'expense' ? '' : 'expense')}>+ Add Expense</button>
                </div>
              </div>

              <Modal isOpen={showForm === 'expense'} onClose={() => setShowForm('')} title="Add New Expense">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Category</label>
                    <select className="select" value={newExpense.category}
                      onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
                      <option>UTILITY</option><option>SALARY</option><option>SUPPLIES</option>
                      <option>RENT</option><option>MAINTENANCE</option><option>OTHER</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input className="input" placeholder="e.g. Electricity Bill" value={newExpense.description}
                      onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Amount (Total)</label>
                    <input className="input" placeholder="Amount" type="number" value={newExpense.amount}
                      onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>GST Amount (Paid)</label>
                    <input className="input" placeholder="GST Amount" type="number" value={newExpense.gstAmount || ''}
                      onChange={e => setNewExpense({ ...newExpense, gstAmount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Payment Mode</label>
                    <select className="select" value={newExpense.paymentMethod}
                      onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value })}>
                      <option>CASH</option><option>UPI</option><option>BANK_TRANSFER</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Receipt Image URL</label>
                    <input className="input" placeholder="https://..." value={newExpense.receiptImageUrl || ''}
                      onChange={e => setNewExpense({ ...newExpense, receiptImageUrl: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Supplier (Optional)</label>
                    <select className="select" value={newExpense.supplierId || ''}
                      onChange={e => setNewExpense({ ...newExpense, supplierId: e.target.value })}>
                      <option value="">None / Manual</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Recurring</label>
                    <div className="flex items-center gap-10">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={newExpense.isRecurring}
                          onChange={e => setNewExpense({ ...newExpense, isRecurring: e.target.checked })} />
                        Yes
                      </label>
                      {newExpense.isRecurring && (
                        <select className="select select-sm" value={newExpense.recurringInterval}
                          onChange={e => setNewExpense({ ...newExpense, recurringInterval: e.target.value })}>
                          <option value="MONTHLY">Monthly</option>
                          <option value="WEEKLY">Weekly</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <button className="btn btn-success" onClick={handleAddExpense} style={{ width: '100%' }}>Save Expense</button>
                  </div>
                </div>
              </Modal>

              <table className="data-table">
                <thead>
                  <tr><th>Category</th><th>Description</th><th>Amount</th><th>GST</th><th>Mode</th><th>Recurring</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = expenses.filter(exp =>
                      (exp.description || '').toLowerCase().includes(expenseSearch.toLowerCase()) ||
                      (exp.category || '').toLowerCase().includes(expenseSearch.toLowerCase()) ||
                      (exp.paymentMethod || '').toLowerCase().includes(expenseSearch.toLowerCase())
                    );
                    const totalPages = Math.ceil(filtered.length / EXPENSES_PER_PAGE);
                    const displayData = filtered.slice((expensePage - 1) * EXPENSES_PER_PAGE, expensePage * EXPENSES_PER_PAGE);

                    if (filtered.length === 0) {
                      return <tr><td colSpan="8" className="empty-state-sm">No expenses found.</td></tr>;
                    }

                    return (
                      <>
                        {displayData.map(exp => (
                          <tr key={exp.id}>
                            <td className="name-cell"><span className="badge badge-prep">{exp.category}</span></td>
                            <td>{exp.description}</td>
                            <td style={{ fontWeight: 700 }}>₹{exp.amount.toFixed(2)}</td>
                            <td style={{ color: '#bbb' }}>₹{(exp.gstAmount || 0).toFixed(2)}</td>
                            <td><span className="badge badge-ready">{exp.paymentMethod}</span></td>
                            <td>{exp.isRecurring ? `Periodic (${exp.recurringInterval})` : 'One-time'}</td>
                            <td style={{ fontSize: '0.8rem' }}>{new Date(exp.expenseDate).toLocaleDateString()}</td>
                            <td>
                              <button className="icon-btn delete" onClick={() => handleDeleteExpense(exp.id)}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                        {totalPages > 1 && (
                          <tr className="pagination-row">
                            <td colSpan="8">
                              <div className="pagination">
                                <button
                                  className="btn-icon"
                                  disabled={expensePage === 1}
                                  onClick={() => setExpensePage(p => p - 1)}
                                >
                                  ‹
                                </button>
                                {[...Array(totalPages)].map((_, i) => (
                                  <button
                                    key={i}
                                    className={`page-num ${expensePage === i + 1 ? 'active' : ''}`}
                                    onClick={() => setExpensePage(i + 1)}
                                  >
                                    {i + 1}
                                  </button>
                                ))}
                                <button
                                  className="btn-icon"
                                  disabled={expensePage === totalPages}
                                  onClick={() => setExpensePage(p => p + 1)}
                                >
                                  ›
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )
        }

        {/* REPORTS */}
        {
          activeTab === 'reports' && (
            <div className="m-section animate-fadeIn">
              <div className="section-header">
                <h2>Sales Reports</h2>
                <div className="date-range-picker">
                  <input type="date" className="input" value={dateRange.start}
                    onChange={e => setDateRange({ ...dateRange, start: e.target.value })} />
                  <span>to</span>
                  <input type="date" className="input" value={dateRange.end}
                    onChange={e => setDateRange({ ...dateRange, end: e.target.value })} />
                  {salesReport && (
                    <button className="btn btn-outline" onClick={downloadReportPDF}>📥 Export PDF</button>
                  )}
                </div>
              </div>

              {salesReport && (
                <div className="report-results animate-fadeIn">
                  {/* Summary Metric Grid */}
                  <div className="report-metrics-grid">
                    <div className="metric-card">
                      <div className="metric-label">Total Revenue</div>
                      <div className="metric-value">₹{salesReport.totalRevenue?.toFixed(2)}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Net Profit</div>
                      <div className="metric-value text-success">₹{salesReport.netProfit?.toFixed(2)}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Total Gst</div>
                      <div className="metric-value">₹{salesReport.totalGst?.toFixed(2)}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-label">Total Orders</div>
                      <div className="metric-value">{salesReport.totalOrders}</div>
                    </div>
                  </div>

                  {/* GST Reconciliation Section */}
                  <div className="report-detail-columns animate-fadeIn" style={{ marginBottom: '24px' }}>
                    <div className="report-detail-sec glass-card" style={{ gridColumn: '1 / -1' }}>
                      <div className="flex justify-between items-center" style={{ marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
                        <h3 className="m-0" style={{ fontSize: '1.4rem' }}>🧾 GST Reconciliation</h3>
                        <div className="badge badge-ready" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                          Net Payable: ₹{salesReport.netGstPayable?.toFixed(2)}
                        </div>
                      </div>
                      <div className="report-metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        <div className="metric-card-sm">
                          <div className="metric-label">Output CGST (Sales)</div>
                          <div className="metric-value-sm">₹{salesReport.outputCgst?.toFixed(2)}</div>
                        </div>
                        <div className="metric-card-sm">
                          <div className="metric-label">Output SGST (Sales)</div>
                          <div className="metric-value-sm">₹{salesReport.outputSgst?.toFixed(2)}</div>
                        </div>
                        <div className="metric-card-sm">
                          <div className="metric-label">Input GST (Expenses)</div>
                          <div className="metric-value-sm text-danger">₹{salesReport.inputGst?.toFixed(2)}</div>
                        </div>
                        <div className="metric-card-sm" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                          <div className="metric-label">Net GST Payable</div>
                          <div className="metric-value-sm text-success">₹{salesReport.netGstPayable?.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="report-detail-columns">
                    {/* Left: Stats Table */}
                    <div className="report-detail-sec glass-card">
                      <h3>📊 General Stats</h3>
                      <div className="stat-lines">
                        <div className="stat-line"><span>Paid Orders:</span> <b>{salesReport.paidOrders}</b></div>
                        <div className="stat-line"><span>Cancelled Orders:</span> <b className="text-danger">{salesReport.cancelledOrders}</b></div>
                        <div className="stat-line"><span>Dine-In:</span> <b>{salesReport.dineInOrders}</b></div>
                        <div className="stat-line"><span>Takeaway:</span> <b>{salesReport.takeawayOrders}</b></div>
                        <div className="stat-line"><span>Total Discount:</span> <b>₹{salesReport.totalDiscount?.toFixed(2)}</b></div>
                        <div className="stat-line"><span>Total Expenses:</span> <b className="text-danger">₹{salesReport.totalExpenses?.toFixed(2)}</b></div>
                      </div>

                      <h3 style={{ marginTop: '24px' }}>💳 Payment Modes</h3>
                      <div className="payment-pills">
                        {Object.entries(salesReport.paymentBreakdown || {}).map(([mode, amt]) => (
                          <div key={mode} className="payment-pill">
                            <span className="pill-mode">{mode}</span>
                            <span className="pill-amt">₹{amt.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Top Items */}
                    <div className="report-detail-sec glass-card">
                      <h3>🔥 Top Selling Items</h3>
                      <table className="data-table mt-0">
                        <thead><tr><th>Item</th><th>Qty</th><th>Revenue</th></tr></thead>
                        <tbody>
                          {salesReport.topItems?.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.name}</td>
                              <td>{item.quantity}</td>
                              <td className="amount-cell">₹{item.revenue.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        }

        {/* RECIPES */}
        {
          activeTab === 'recipes' && (
            <div className="m-section animate-fadeIn">
              <div className="section-header">
                <h2>Recipe Costing & Profit Margins</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Search recipes..."
                      value={recipeSearch}
                      onChange={(e) => { setRecipeSearch(e.target.value); setRecipePage(1); }}
                      className="input input-sm"
                      style={{ width: '250px' }}
                    />
                  </div>
                </div>
              </div>

              <div className="recipes-grid">
                <table className="data-table recipe-table">
                  <thead>
                    <tr>
                      <th>Menu Item</th>
                      <th>Selling Price</th>
                      <th>Recipe Cost</th>
                      <th>Profit</th>
                      <th>Margin %</th>
                      <th>Complexity</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = recipeCosts.filter(rc =>
                        rc.menuItemName.toLowerCase().includes(recipeSearch.toLowerCase())
                      );
                      const totalPages = Math.ceil(filtered.length / RECIPES_PER_PAGE);
                      const displayData = filtered.slice((recipePage - 1) * RECIPES_PER_PAGE, recipePage * RECIPES_PER_PAGE);

                      if (filtered.length === 0) {
                        return <tr><td colSpan="7" className="empty-state-sm">No recipes found.</td></tr>;
                      }

                      return (
                        <>
                          {displayData.map(rc => (
                            <React.Fragment key={rc.menuItemId}>
                              <tr className="recipe-row">
                                <td className="name-cell">{rc.menuItemName}</td>
                                <td>₹{rc.sellingPrice}</td>
                                <td>₹{rc.estimatedCost.toFixed(2)}</td>
                                <td style={{ color: rc.profitAmount > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>₹{rc.profitAmount.toFixed(2)}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '60px', height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.min(100, Math.max(0, rc.marginPercentage))}%`, height: '100%', background: rc.marginPercentage > 30 ? '#10b981' : rc.marginPercentage > 15 ? '#f59e0b' : '#ef4444', transition: 'width 0.5s ease' }}></div>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{rc.marginPercentage.toFixed(1)}%</span>
                                  </div>
                                </td>
                                <td>
                                  <div className="recipe-complexity-cell">
                                    <div className="complexity-rating">
                                      <div className="complexity-icons">
                                        {[...Array(3)].map((_, i) => (
                                          <span key={i} className={`complexity-icon ${i < (rc.ingredients.length <= 3 ? 1 : rc.ingredients.length <= 6 ? 2 : 3) ? 'active' : ''}`}>
                                            👨‍🍳
                                          </span>
                                        ))}
                                      </div>
                                      <span className="complexity-label">
                                        {rc.ingredients.length <= 3 ? 'Simple' : rc.ingredients.length <= 6 ? 'Intermediate' : 'Professional'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div className="recipe-actions">
                                    <button className="icon-btn" title="Edit Recipe" onClick={() => handleEditRecipe(rc)}>✏️</button>
                                    <button className="icon-btn delete" title="Delete Recipe" onClick={() => handleDeleteRecipe(rc.menuItemId)}>🗑️</button>
                                  </div>
                                </td>
                              </tr>
                              {editingRecipeId === rc.menuItemId && (
                                <tr className="recipe-edit-row animate-slideUp">
                                  <td colSpan="7">
                                    <div className="recipe-edit-panel glass-card">
                                      <div className="recipe-edit-header">
                                        <h4>✏️ Edit Recipe — {rc.menuItemName}</h4>
                                        <button className="btn-text btn-sm" onClick={addEditIngredient}>+ Add Ingredient</button>
                                      </div>
                                      <div className="recipe-edit-ingredients">
                                        {editRecipeIngredients.map((ing, idx) => (
                                          <div key={idx} className="recipe-edit-ingredient-row animate-fadeIn">
                                            <select className="select select-sm" value={ing.stockItemId}
                                              onChange={e => updateEditIngredient(idx, 'stockItemId', e.target.value)}>
                                              <option value="">Select Stock Item</option>
                                              {stockItems.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
                                            </select>
                                            <input className="input input-sm" type="number" step="0.01" placeholder="Qty"
                                              value={ing.quantity} onChange={e => updateEditIngredient(idx, 'quantity', e.target.value)} />
                                            <button className="btn-icon btn-sm text-danger" onClick={() => removeEditIngredient(idx)}>×</button>
                                          </div>
                                        ))}
                                        {editRecipeIngredients.length === 0 && (
                                          <div className="empty-state-sm">No ingredients. Click "+ Add Ingredient" to start.</div>
                                        )}
                                      </div>
                                      <div className="recipe-edit-actions">
                                        <button className="btn btn-primary btn-sm" onClick={handleSaveRecipe}>💾 Save Recipe</button>
                                        <button className="btn btn-outline btn-sm" onClick={() => { setEditingRecipeId(null); setEditRecipeIngredients([]); }}>Cancel</button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                          {totalPages > 1 && (
                            <tr className="pagination-row">
                              <td colSpan="7">
                                <div className="pagination">
                                  <button
                                    className="btn-icon"
                                    disabled={recipePage === 1}
                                    onClick={() => setRecipePage(p => p - 1)}
                                  >
                                    ‹
                                  </button>
                                  {[...Array(totalPages)].map((_, i) => (
                                    <button
                                      key={i}
                                      className={`page-num ${recipePage === i + 1 ? 'active' : ''}`}
                                      onClick={() => setRecipePage(i + 1)}
                                    >
                                      {i + 1}
                                    </button>
                                  ))}
                                  <button
                                    className="btn-icon"
                                    disabled={recipePage === totalPages}
                                    onClick={() => setRecipePage(p => p + 1)}
                                  >
                                    ›
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }
      </main >
      {loading && <LoadingOverlay />}
    </div >
  );
}

export default ManagerPage;
