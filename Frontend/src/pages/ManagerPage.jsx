import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getDashboard, getSalesReport, getDailyReport,
  getMenuItems, createMenuItem, updateMenuItem, toggleMenuItemAvailability, deleteMenuItem,
  getCategories, createCategory, deleteCategory,
  getStockItems, getLowStockItems, createStockItem, recordStockTransaction, getWasteTransactions,
  getExpenses, getTodayExpenses, createExpense, deleteExpense,
  getTables, createTable,
  triggerBackup,
  getAllUsers, createUser, resetUserPassword, toggleUserActive
} from '../service/api';
import { useAuth } from '../context/AuthContext';
import './ManagerPage.css';

function ManagerPage() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [tables, setTables] = useState([]);
  const [users, setUsers] = useState([]);
  const [wasteData, setWasteData] = useState([]);
  const [salesReport, setSalesReport] = useState(null);
  const [dateRange, setDateRange] = useState({ start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });

  // Forms
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: 'Biryani', imageUrl: '', vegetarian: false, prepTimeMinutes: 15 });
  const [newExpense, setNewExpense] = useState({ category: 'UTILITY', description: '', amount: '', paymentMethod: 'CASH' });
  const [newStock, setNewStock] = useState({ name: '', unit: 'KG', reorderLevel: '', costPerUnit: '', supplier: '' });
  const [newUser, setNewUser] = useState({ username: '', displayName: '', role: 'WAITER' });
  const [stockTx, setStockTx] = useState({ stockItemId: '', transactionType: 'PURCHASE', quantity: '', reason: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newTable, setNewTable] = useState({ tableNumber: '', capacity: 4 });
  const [showForm, setShowForm] = useState('');
  const [showCategoryMgr, setShowCategoryMgr] = useState(false);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await getDashboard();
      setDashboard(res.data);
    } catch (err) { console.error(err); }
  };

  const loadMenu = async () => {
    const [menuRes, catRes] = await Promise.all([getMenuItems(), getCategories()]);
    setMenuItems(menuRes.data);
    setCategories(catRes.data);
  };

  const loadStock = async () => {
    const [stockRes, lowRes, wasteRes] = await Promise.all([
      getStockItems(), getLowStockItems(), getWasteTransactions()
    ]);
    setStockItems(stockRes.data);
    setLowStock(lowRes.data);
    setWasteData(wasteRes.data);
  };

  const loadExpenses = async () => {
    const res = await getTodayExpenses();
    setExpenses(res.data);
  };

  const loadTables = async () => {
    const res = await getTables();
    setTables(res.data);
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowForm('');
    if (tab === 'menu') loadMenu();
    if (tab === 'stock') loadStock();
    if (tab === 'expenses') loadExpenses();
    if (tab === 'tables') loadTables();
    if (tab === 'users') loadUsers();
    if (tab === 'reports') loadReport();
    if (tab === 'dashboard') loadDashboard();
  };

  const handleAddMenuItem = async () => {
    try {
      await createMenuItem({ ...newItem, price: parseFloat(newItem.price), available: true, gstPercent: 5.0 });
      setNewItem({ name: '', description: '', price: '', category: 'Biryani', imageUrl: '', vegetarian: false, prepTimeMinutes: 15 });
      setShowForm('');
      loadMenu();
    } catch (err) { alert('Failed'); }
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

  const handleAddExpense = async () => {
    try {
      await createExpense({ ...newExpense, amount: parseFloat(newExpense.amount), expenseDate: new Date().toISOString().split('T')[0] });
      setNewExpense({ category: 'UTILITY', description: '', amount: '', paymentMethod: 'CASH' });
      setShowForm('');
      loadExpenses();
    } catch (err) { alert('Failed'); }
  };

  const handleAddStock = async () => {
    try {
      await createStockItem({ ...newStock, reorderLevel: parseFloat(newStock.reorderLevel), costPerUnit: parseFloat(newStock.costPerUnit), active: true });
      setNewStock({ name: '', unit: 'KG', reorderLevel: '', costPerUnit: '', supplier: '' });
      setShowForm('');
      loadStock();
    } catch (err) { alert('Failed'); }
  };

  const handleStockTx = async () => {
    try {
      await recordStockTransaction({ ...stockTx, stockItemId: parseInt(stockTx.stockItemId), quantity: parseFloat(stockTx.quantity) });
      setStockTx({ stockItemId: '', transactionType: 'PURCHASE', quantity: '', reason: '' });
      setShowForm('');
      loadStock();
    } catch (err) { alert('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const handleAddCategory = async () => {
    try {
      await createCategory(newCategory);
      setNewCategory({ name: '', description: '' });
      loadMenu();
    } catch (err) { alert('Failed to create category'); }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      loadMenu();
    } catch (err) { alert('Failed to delete category'); }
  };

  const handleCreateTable = async () => {
    try {
      await createTable({ ...newTable, capacity: parseInt(newTable.capacity) });
      setNewTable({ tableNumber: '', capacity: 4 });
      setShowForm('');
      loadTables();
    } catch (err) { alert('Failed to create table'); }
  };

  const handleBackup = async () => {
    try {
      const res = await triggerBackup();
      alert(res.data);
    } catch (err) { alert('Backup failed'); }
  };

  const handleCreateUser = async () => {
    try {
      await createUser(newUser);
      setNewUser({ username: '', displayName: '', role: 'WAITER' });
      setShowForm('');
      loadUsers();
      alert('User created! Default password is: welcome123');
    } catch (err) { alert('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const handleResetPassword = async (id) => {
    if (!confirm('Reset password to "welcome123"?')) return;
    try {
      await resetUserPassword(id);
      alert('Password reset to: welcome123');
      loadUsers();
    } catch (err) { alert('Failed'); }
  };

  const handleToggleActive = async (id) => {
    try {
      await toggleUserActive(id);
      loadUsers();
    } catch (err) { alert('Failed'); }
  };

  return (
    <div className="manager-page">
      <aside className="manager-sidebar">
        <div className="sidebar-brand">
          <Link to="/" className="sidebar-logo">🍛</Link>
          <span className="sidebar-title">KhanaBook</span>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'menu', icon: '🍽️', label: 'Menu' },
            { id: 'tables', icon: '🪑', label: 'Tables' },
            { id: 'users', icon: '👤', label: 'Users' },
            { id: 'stock', icon: '📦', label: 'Inventory' },
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
          <div className="user-info-sm">
            <small>Logged in as <b>{user?.username}</b></small>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleBackup}>💾 Backup DB</button>
          <button className="btn btn-danger btn-sm" onClick={logout} style={{ marginTop: '8px' }}>🚪 Sign Out</button>
        </div>
      </aside>

      <main className="manager-main">
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="m-section animate-fadeIn">
            <h2>Dashboard</h2>
            <div className="dash-cards">
              <div className="dash-card dc-revenue">
                <div className="dc-label">Today's Revenue</div>
                <div className="dc-value">₹{dashboard.todayRevenue?.toFixed(0)}</div>
              </div>
              <div className="dash-card dc-orders">
                <div className="dc-label">Today's Orders</div>
                <div className="dc-value">{dashboard.todayOrders}</div>
              </div>
              <div className="dash-card dc-active">
                <div className="dc-label">Active Orders</div>
                <div className="dc-value">{dashboard.activeOrders}</div>
              </div>
              <div className="dash-card dc-expenses">
                <div className="dc-label">Today's Expenses</div>
                <div className="dc-value">₹{dashboard.todayExpenses?.toFixed(0)}</div>
              </div>
            </div>

            {dashboard.lowStockCount > 0 && (
              <div className="alert-banner">⚠️ {dashboard.lowStockCount} items are low on stock!</div>
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
                {dashboard.recentOrders?.map(order => (
                  <div key={order.id} className="recent-order-row">
                    <span>#{order.id} · {order.tableNumber}</span>
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


            {showCategoryMgr && (
              <div className="form-card glass-card animate-slideUp" style={{ marginBottom: '20px' }}>
                <h4>Manage Categories</h4>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
                  <input className="input" placeholder="Category Name" value={newCategory.name}
                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} />
                  <input className="input" placeholder="Description (optional)" value={newCategory.description}
                    onChange={e => setNewCategory({ ...newCategory, description: e.target.value })} />
                  <button className="btn btn-success" onClick={handleAddCategory}>Add Category</button>
                </div>
                <div className="category-chips" style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {categories.map(c => (
                    <div key={c.id} className="cat-chip" style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{c.name}</span>
                      <button onClick={() => handleDeleteCategory(c.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showForm === 'menu' && (
              <div className="form-card glass-card animate-slideUp">
                <div className="form-grid">
                  <input className="input" placeholder="Item Name" value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                  <input className="input" placeholder="Price" type="number" value={newItem.price}
                    onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                  <select className="select" value={newItem.category}
                    onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <input className="input" placeholder="Description" value={newItem.description}
                    onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                  <input className="input" placeholder="Image URL (optional)" value={newItem.imageUrl || ''}
                    onChange={e => setNewItem({ ...newItem, imageUrl: e.target.value })} />
                  <label className="checkbox-label">
                    <input type="checkbox" checked={newItem.vegetarian}
                      onChange={e => setNewItem({ ...newItem, vegetarian: e.target.checked })} />
                    Vegetarian
                  </label>
                  <button className="btn btn-success" onClick={handleAddMenuItem}>Save Item</button>
                </div>
              </div>
            )}

            <div className="menu-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Category</th><th>Price</th><th>Veg</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map(item => (
                    <tr key={item.id}>
                      <td className="name-cell">{item.name}</td>
                      <td><span className="type-tag">{item.category}</span></td>
                      <td className="amount-cell">₹{item.price}</td>
                      <td>{item.vegetarian ? '🟢' : '🔴'}</td>
                      <td>
                        <span className={`badge ${item.available ? 'badge-ready' : 'badge-cancelled'}`}>
                          {item.available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button className="btn btn-sm btn-outline" onClick={() => handleToggleAvail(item.id)}>
                          {item.available ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteItem(item.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

              {showForm === 'table' && (
                <div className="form-card glass-card animate-slideUp">
                  <h4>Add New Table</h4>
                  <div className="form-grid">
                    <input className="input" placeholder="Table Number (e.g. T1)" value={newTable.tableNumber}
                      onChange={e => setNewTable({ ...newTable, tableNumber: e.target.value })} />
                    <input className="input" placeholder="Capacity" type="number" value={newTable.capacity}
                      onChange={e => setNewTable({ ...newTable, capacity: e.target.value })} />
                    <button className="btn btn-success" onClick={handleCreateTable}>Create Table</button>
                  </div>
                </div>
              )}
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

              {showForm === 'user' && (
                <div className="form-card glass-card animate-slideUp">
                  <h4>Create New User</h4>
                  <div className="form-grid">
                    <input className="input" placeholder="Username" value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                    <input className="input" placeholder="Display Name" value={newUser.displayName}
                      onChange={e => setNewUser({ ...newUser, displayName: e.target.value })} />
                    <select className="select" value={newUser.role}
                      onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                      <option value="WAITER">Waiter</option>
                      <option value="KITCHEN">Kitchen Staff</option>
                      <option value="CASHIER">Cashier</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button className="btn btn-success" onClick={handleCreateUser}>Create Account</button>
                  </div>
                  <div className="form-hint" style={{ marginTop: '10px' }}>
                    ℹ️ New users will have the default password: <code>welcome123</code>
                  </div>
                </div>
              )}

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

              {showForm === 'stock' && (
                <div className="form-card glass-card animate-slideUp">
                  <h4>Add Stock Item</h4>
                  <div className="form-grid">
                    <input className="input" placeholder="Item Name" value={newStock.name}
                      onChange={e => setNewStock({ ...newStock, name: e.target.value })} />
                    <select className="select" value={newStock.unit}
                      onChange={e => setNewStock({ ...newStock, unit: e.target.value })}>
                      <option>KG</option><option>LITRE</option><option>PIECE</option><option>PACKET</option>
                    </select>
                    <input className="input" placeholder="Reorder Level" type="number" value={newStock.reorderLevel}
                      onChange={e => setNewStock({ ...newStock, reorderLevel: e.target.value })} />
                    <input className="input" placeholder="Cost Per Unit" type="number" value={newStock.costPerUnit}
                      onChange={e => setNewStock({ ...newStock, costPerUnit: e.target.value })} />
                    <input className="input" placeholder="Supplier" value={newStock.supplier}
                      onChange={e => setNewStock({ ...newStock, supplier: e.target.value })} />
                    <button className="btn btn-success" onClick={handleAddStock}>Save</button>
                  </div>
                </div>
              )}

              {showForm === 'stocktx' && (
                <div className="form-card glass-card animate-slideUp">
                  <h4>Record Stock Transaction</h4>
                  <div className="form-grid">
                    <select className="select" value={stockTx.stockItemId}
                      onChange={e => setStockTx({ ...stockTx, stockItemId: e.target.value })}>
                      <option value="">Select Item</option>
                      {stockItems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select className="select" value={stockTx.transactionType}
                      onChange={e => setStockTx({ ...stockTx, transactionType: e.target.value })}>
                      <option value="PURCHASE">Purchase (Add Stock)</option>
                      <option value="ISSUE_TO_KITCHEN">Issue to Kitchen</option>
                      <option value="WASTE">Waste / Expired</option>
                      <option value="ADJUSTMENT">Manual Adjustment</option>
                    </select>
                    <input className="input" placeholder="Quantity" type="number" value={stockTx.quantity}
                      onChange={e => setStockTx({ ...stockTx, quantity: e.target.value })} />
                    <input className="input" placeholder="Reason / Notes" value={stockTx.reason}
                      onChange={e => setStockTx({ ...stockTx, reason: e.target.value })} />
                    <button className="btn btn-success" onClick={handleStockTx}>Record</button>
                  </div>
                </div>
              )}

              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Unit</th><th>Current Stock</th><th>Reorder Level</th><th>Cost/Unit</th><th>Supplier</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {stockItems.map(s => (
                    <tr key={s.id} className={s.currentStock <= s.reorderLevel ? 'row-warning' : ''}>
                      <td className="name-cell">{s.name}</td>
                      <td>{s.unit}</td>
                      <td className="amount-cell">{s.currentStock}</td>
                      <td>{s.reorderLevel}</td>
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
            </div>
          )
        }

        {/* EXPENSES */}
        {
          activeTab === 'expenses' && (
            <div className="m-section animate-fadeIn">
              <div className="section-header">
                <h2>Expense Management</h2>
                <button className="btn btn-primary" onClick={() => setShowForm(showForm === 'expense' ? '' : 'expense')}>+ Add Expense</button>
              </div>

              {showForm === 'expense' && (
                <div className="form-card glass-card animate-slideUp">
                  <div className="form-grid">
                    <select className="select" value={newExpense.category}
                      onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
                      <option>UTILITY</option><option>SALARY</option><option>SUPPLIES</option>
                      <option>RENT</option><option>MAINTENANCE</option><option>OTHER</option>
                    </select>
                    <input className="input" placeholder="Description" value={newExpense.description}
                      onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
                    <input className="input" placeholder="Amount" type="number" value={newExpense.amount}
                      onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
                    <select className="select" value={newExpense.paymentMethod}
                      onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value })}>
                      <option>CASH</option><option>UPI</option><option>BANK_TRANSFER</option>
                    </select>
                    <button className="btn btn-success" onClick={handleAddExpense}>Save</button>
                  </div>
                </div>
              )}

              <table className="data-table">
                <thead>
                  <tr><th>Category</th><th>Description</th><th>Amount</th><th>Payment</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td><span className="type-tag">{exp.category}</span></td>
                      <td>{exp.description}</td>
                      <td className="amount-cell">₹{exp.amount}</td>
                      <td>{exp.paymentMethod}</td>
                      <td>{exp.expenseDate}</td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={async () => { await deleteExpense(exp.id); loadExpenses(); }}>Delete</button>
                      </td>
                    </tr>
                  ))}
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
                  <button className="btn btn-primary" onClick={loadReport}>Generate</button>
                </div>
              </div>

              {salesReport && (
                <div className="report-results">
                  <div className="report-cards">
                    {Object.entries(salesReport).map(([key, val]) => (
                      <div key={key} className="report-card glass-card">
                        <div className="rc-label">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div>
                        <div className="rc-value">{typeof val === 'number' ? (key.includes('Revenue') || key.includes('Gst') || key.includes('Discount') || key.includes('Expenses') || key.includes('Profit') ? `₹${val.toFixed(2)}` : val) : val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        }
      </main >
    </div >
  );
}

export default ManagerPage;
