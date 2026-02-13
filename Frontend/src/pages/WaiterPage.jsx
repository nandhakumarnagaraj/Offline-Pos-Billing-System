import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAvailableMenuItems, createOrder, addItemsToOrder, getActiveOrders, getTables, getActiveCategories } from '../service/api';
import { connectWebSocket } from '../service/ws';
import { saveOfflineOrder } from '../db';
import { useAuth } from '../context/AuthContext';
import './WaiterPage.css';

function WaiterPage() {
  const { logout } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [orderType, setOrderType] = useState('DINE_IN');
  const [loading, setLoading] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [view, setView] = useState('tables'); // 'tables', 'menu', 'orders'
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showVariationModal, setShowVariationModal] = useState(null); // { item }
  const [stockAlerts, setStockAlerts] = useState([]);

  useEffect(() => {
    loadData();
    const stompClient = connectWebSocket(
      (order) => {
        setActiveOrders(prev => {
          const index = prev.findIndex(o => o.id === order.id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = order;
            return updated;
          }
          return [order, ...prev];
        });
      },
      () => {
        // On table update, refresh table list
        getTables().then(res => setTables(res.data));
      },
      (alert) => {
        setStockAlerts(prev => [alert, ...prev].slice(0, 3));
      }
    );
    return () => { if (stompClient) stompClient.deactivate(); };
  }, []);

  const loadData = async () => {
    try {
      const [menuRes, catRes, tableRes, orderRes] = await Promise.all([
        getAvailableMenuItems(),
        getActiveCategories(),
        getTables(),
        getActiveOrders()
      ]);
      setMenuItems(menuRes.data);
      setCategories(catRes.data);
      setTables(tableRes.data);
      setActiveOrders(orderRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item, variation = null) => {
    if (item.variations && item.variations.length > 0 && !variation) {
      setShowVariationModal(item);
      return;
    }
    const cartKey = variation ? `${item.id}-${variation.id}` : `${item.id}`;
    setCart(prev => ({
      ...prev,
      [cartKey]: {
        item,
        variation,
        qty: (prev[cartKey]?.qty || 0) + 1
      }
    }));
    setShowVariationModal(null);
  };

  const removeFromCart = (cartKey) => {
    setCart(prev => {
      const updated = { ...prev };
      if (updated[cartKey]?.qty > 1) {
        updated[cartKey] = { ...updated[cartKey], qty: updated[cartKey].qty - 1 };
      } else {
        delete updated[cartKey];
      }
      return updated;
    });
  };

  const cartTotal = Object.values(cart).reduce((sum, c) => {
    const price = c.variation ? c.variation.price : c.item.price;
    return sum + price * c.qty;
  }, 0);
  const cartItemCount = Object.values(cart).reduce((sum, c) => sum + c.qty, 0);

  const selectTable = (table) => {
    // Allow selecting occupied tables to add more items
    setSelectedTable(table.tableNumber);
    setView('menu');
  };

  const submitOrder = async () => {
    if (orderType === 'DINE_IN' && !selectedTable) {
      alert('Please select a table first.');
      return;
    }
    if (Object.keys(cart).length === 0) {
      alert('Please add items to the order.');
      return;
    }

    const orderItems = Object.values(cart).map(c => ({
      menuItemId: c.item.id,
      variationId: c.variation ? c.variation.id : null,
      quantity: c.qty
    }));

    setLoading(true);
    try {
      // Check if there's an existing active order for this table
      const existingOrder = orderType === 'DINE_IN'
        ? activeOrders.find(o => o.tableNumber === selectedTable && o.status !== 'PAID' && o.status !== 'CANCELLED')
        : null;

      if (existingOrder) {
        await addItemsToOrder(existingOrder.id, orderItems);
        alert(`✅ Items added to existing Order #${existingOrder.id}!`);
      } else {
        await createOrder({
          customerName,
          customerPhone,
          tableNumber: orderType === 'DINE_IN' ? selectedTable : 'TAKEAWAY',
          orderType,
          createdBy: 'Waiter',
          items: orderItems
        });
        alert('✅ Order placed successfully!');
      }

      setCart({});
      setCustomerName('');
      setCustomerPhone('');
      setSelectedTable('');
      setView('orders');
      loadData();
    } catch (err) {
      if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        const offlineOrder = {
          customerName,
          customerPhone,
          tableNumber: orderType === 'DINE_IN' ? selectedTable : 'TAKEAWAY',
          orderType,
          createdBy: 'Waiter',
          items: orderItems,
          status: 'PENDING'
        };
        await saveOfflineOrder(offlineOrder);
        alert('📡 Network error: Order saved LOCALLY. It will sync automatically when online.');

        setCart({});
        setCustomerName('');
        setCustomerPhone('');
        setSelectedTable('');
        setView('orders');
      } else {
        alert('❌ Failed to place order: ' + (err.response?.data?.message || err.message));
      }
    }
    setLoading(false);
  };

  return (
    <div className="waiter-page">
      {stockAlerts.length > 0 && (
        <div className="waiter-alerts">
          {stockAlerts.map((alert, i) => (
            <div key={i} className="waiter-alert-item animate-slideRight">
              <span>🛑 {alert}</span>
              <button className="close-alert" onClick={() => setStockAlerts(prev => prev.filter((_, idx) => idx !== i))}>×</button>
            </div>
          ))}
        </div>
      )}
      {/* Header */}
      <header className="waiter-header">
        <div className="header-left">
          <Link to="/" className="back-btn">←</Link>
          <h1>🍽️ Waiter</h1>
        </div>
        <nav className="header-tabs">
          <button className={view === 'tables' ? 'tab active' : 'tab'} onClick={() => setView('tables')}>
            Tables
          </button>
          <button className={view === 'menu' ? 'tab active' : 'tab'} onClick={() => setView('menu')}>
            Menu
          </button>
          <button className={view === 'orders' ? 'tab active' : 'tab'} onClick={() => setView('orders')}>
            Active Orders <span className="tab-badge">{activeOrders.length}</span>
          </button>
        </nav>
        <div className="header-right">
          <div className="order-type-toggle">
            <button className={orderType === 'DINE_IN' ? 'toggle active' : 'toggle'}
              onClick={() => setOrderType('DINE_IN')}>Dine-In</button>
            <button className={orderType === 'TAKEAWAY' ? 'toggle active' : 'toggle'}
              onClick={() => setOrderType('TAKEAWAY')}>Takeaway</button>
          </div>
          <button className="btn btn-outline btn-sm logout-btn-header" onClick={logout} style={{ marginLeft: '10px' }}>Sign Out</button>
        </div>
      </header>

      <div className="waiter-body">
        {/* TABLE SELECTION VIEW */}
        {view === 'tables' && (
          <div className="tables-view animate-fadeIn">
            <h2>Select a Table</h2>
            <div className="tables-grid">
              {tables.map(table => (
                <div
                  key={table.id}
                  className={`table-card ${table.status.toLowerCase()} ${selectedTable === table.tableNumber ? 'selected' : ''}`}
                  onClick={() => selectTable(table)}
                >
                  <div className="table-number">{table.tableNumber}</div>
                  <div className="table-capacity">{table.capacity} seats</div>
                  <div className={`table-status badge-${table.status.toLowerCase()}`}>
                    {table.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENU VIEW */}
        {view === 'menu' && (
          <div className="menu-view animate-fadeIn">
            <div className="menu-top-bar">
              <div className="selected-info">
                {orderType === 'DINE_IN' && selectedTable && (
                  <span className="selected-table">
                    📍 Table: {selectedTable}
                    {activeOrders.some(o => o.tableNumber === selectedTable && o.status !== 'PAID' && o.status !== 'CANCELLED') &&
                      <span className="badge badge-warning ml-2" style={{ marginLeft: '10px', fontSize: '0.8em' }}>Adding to active order</span>}
                  </span>
                )}
                {orderType === 'TAKEAWAY' && (
                  <span className="selected-table">🛍️ Takeaway Order</span>
                )}
              </div>
              <div className="customer-inputs">
                <input className="input" placeholder="Customer Name (optional)" value={customerName}
                  onChange={e => setCustomerName(e.target.value)} />
                <input className="input" placeholder="Phone (optional)" value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)} />
              </div>
            </div>

            <div className="menu-content">
              <div className="menu-sidebar">
                <input className="input search-input" placeholder="🔍 Search menu..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                <div className="category-list">
                  <button className={`cat-btn ${activeCategory === 'All' ? 'active' : ''}`}
                    onClick={() => setActiveCategory('All')}>All Items</button>
                  {categories.map(cat => (
                    <button key={cat.id}
                      className={`cat-btn ${activeCategory === cat.name ? 'active' : ''}`}
                      onClick={() => setActiveCategory(cat.name)}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="menu-items-grid">
                {filteredItems.map(item => {
                  const hasVariations = item.variations && item.variations.length > 0;
                  const displayPrice = hasVariations
                    ? Math.min(...item.variations.map(v => v.price))
                    : item.price;

                  return (
                    <div key={item.id} className="menu-item-card" onClick={() => addToCart(item)} style={{ padding: 0, overflow: 'hidden' }}>
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                      )}
                      <div className="item-info" style={{ padding: '12px' }}>
                        <div className="item-name">
                          <span className={`veg-badge ${item.vegetarian ? 'veg' : 'non-veg'}`}></span>
                          {item.name}
                        </div>
                        <div className="item-desc">{item.description}</div>
                        <div className="item-price">
                          ₹{displayPrice}{hasVariations ? '+' : ''}
                        </div>
                      </div>

                      {!hasVariations && cart[item.id] && (
                        <div className="item-qty-controls" onClick={e => e.stopPropagation()}>
                          <button className="qty-btn" onClick={() => removeFromCart(item.id)}>−</button>
                          <span className="qty-count">{cart[item.id].qty}</span>
                          <button className="qty-btn" onClick={() => addToCart(item)}>+</button>
                        </div>
                      )}

                      {hasVariations && (
                        <div className="variation-indicator">
                          {Object.keys(cart).filter(k => k.startsWith(`${item.id}-`)).length > 0 ? 'Selected' : '+ ADD'}
                        </div>
                      )}

                      {!hasVariations && !cart[item.id] && <div className="add-label">+ ADD</div>}
                    </div>
                  );
                })}
                {filteredItems.length === 0 && (
                  <div className="empty-state">No items found</div>
                )}
              </div>
            </div>

            {/* Variation Selection Modal */}
            {showVariationModal && (
              <div className="modal-overlay" onClick={() => setShowVariationModal(null)}>
                <div className="modal-content variation-modal animate-slideUp" onClick={e => e.stopPropagation()}>
                  <h3>Select Variation: {showVariationModal.name}</h3>
                  <div className="variation-options">
                    {showVariationModal.variations.map(v => (
                      <div key={v.id} className="variation-option-card" onClick={() => addToCart(showVariationModal, v)}>
                        <div className="option-info">
                          <span className="option-name">{v.name}</span>
                          <span className="option-price">₹{v.price}</span>
                        </div>
                        <div className="option-action">+</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-outline btn-block mt-4" onClick={() => setShowVariationModal(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTIVE ORDERS VIEW */}
        {view === 'orders' && (
          <div className="orders-view animate-fadeIn">
            <h2>Active Orders</h2>
            {activeOrders.length === 0 && <div className="empty-state">No active orders</div>}
            <div className="orders-list">
              {activeOrders.map(order => (
                <div key={order.id} className={`order-card-w status-${order.status?.toLowerCase()}`}>
                  <div className="order-card-header">
                    <div>
                      <strong>#{order.id}</strong> · {order.tableNumber}
                      {order.customerName && <span> · {order.customerName}</span>}
                    </div>
                    <span className={`badge badge-${order.status?.toLowerCase()}`}>{order.status}</span>
                  </div>
                  <div className="order-card-items">
                    {order.items?.map(i => (
                      <div key={i.id} className="order-item-row">
                        <span>{i.quantity}x {i.menuItem?.name}</span>
                        <span>₹{(i.price * i.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="order-card-footer">
                    <span className="order-total">Total: ₹{order.totalAmount?.toFixed(2)}</span>
                    <span className="order-time">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FLOATING CART */}
      {cartItemCount > 0 && (
        <div className="floating-cart animate-slideUp">
          <div className="cart-info">
            <span className="cart-count">{cartItemCount} items</span>
            <span className="cart-total">₹{cartTotal.toFixed(2)}</span>
          </div>
          <button className="btn btn-primary btn-lg" onClick={submitOrder} disabled={loading}>
            {loading ? '⏳ Placing...' : '🍳 Place Order'}
          </button>
        </div>
      )}
    </div>
  );
}

export default WaiterPage;
