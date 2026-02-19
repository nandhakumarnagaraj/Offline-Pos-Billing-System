import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAvailableMenuItems, createOrder, addItemsToOrder, getActiveOrders, getTables, getActiveCategories, getOrdersByDate, processPayment, getBill, initiateDigitalPayment, verifyEasebuzzPayment } from '../service/api';
import { connectWebSocket } from '../service/ws';
import { addPendingSync } from '../db';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import LoadingOverlay from '../components/LoadingOverlay';
import Modal from '../components/Modal';
import { toast } from 'react-hot-toast';
import './WaiterPage.css';

function WaiterPage() {
  const navigate = useNavigate();
  const { config: shopConfig } = useConfig();
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
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [billData, setBillData] = useState(null);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [isMultiPay, setIsMultiPay] = useState(false);
  const [addedPayments, setAddedPayments] = useState([]);
  const [upiId, setUpiId] = useState('');
  const [qrCodeData, setQrCodeData] = useState(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [multiPayMode, setMultiPayMode] = useState('CASH');

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
        toast.error(alert, { duration: 6000 });
      }
    );
    return () => { if (stompClient) stompClient.deactivate(); };
  }, []);

  useEffect(() => {
    const { total } = calculateBill();
    // Only prefill in Single Payment mode (where isMultiPay is false)
    if (!isMultiPay && paymentMode === 'CASH' && total) {
      setAmountReceived(total.toFixed(2));
    } else if (!isMultiPay) {
      setAmountReceived('');
    }
  }, [paymentMode, billData, discount, isMultiPay]);

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


  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

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

  const editOrder = (order) => {
    setSelectedTable(order.tableNumber);
    setCustomerName(order.customerName || '');
    setCustomerPhone(order.customerPhone || '');
    setView('menu');
  };

  const submitOrder = async () => {
    if (orderType === 'DINE_IN' && !selectedTable) {
      toast.error('Please select a table first.');
      return;
    }
    if (Object.keys(cart).length === 0) {
      toast.error('Please add items to the order.');
      return;
    }
    if (!customerName || customerName.trim() === '') {
      toast.error('Customer Name is required');
      return;
    }
    if (!customerPhone || customerPhone.trim().length < 10) {
      toast.error('Customer WhatsApp number is required');
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
        toast.success(`Items added to Order #${existingOrder.id}!`);
      } else {
        await createOrder({
          customerName,
          customerPhone,
          tableNumber: orderType === 'DINE_IN' ? selectedTable : 'TAKEAWAY',
          orderType,
          createdBy: 'Waiter',
          items: orderItems
        });
        toast.success('Order placed successfully!');
      }

      setCart({});
      setCustomerName('');
      setCustomerPhone('');
      setSelectedTable('');
      setView('orders');
      loadData();
    } catch (err) {
      if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        const orderData = {
          customerName,
          customerPhone,
          tableNumber: orderType === 'DINE_IN' ? selectedTable : 'TAKEAWAY',
          orderType,
          createdBy: 'Waiter',
          items: orderItems
        };
        await addPendingSync('CREATE_ORDER', orderData);
        toast('Network error: Order saved LOCALLY. It will sync automatically when online.', { icon: '📡' });

        setCart({});
        setCustomerName('');
        setCustomerPhone('');
        setSelectedTable('');
        setView('orders');
      } else {
        toast.error('Failed to place order: ' + (err.response?.data?.message || err.message));
      }
    }
    setLoading(false);
  };

  const selectForBilling = async (order) => {
    setSelectedOrder(order);
    try {
      const res = await getBill(order.id);
      setBillData(res.data);
      setWhatsappPhone(res.data.customerPhone || '');
      setView('bill');
      setDiscount('');
      setAmountReceived('');
      setIsMultiPay(false);
      setAddedPayments([]);
      setPaymentMode('CASH');
    } catch (err) { console.error(err); }
  };

  const handlePayment = async () => {
    if (!selectedOrder) return;
    const isOnline = !isMultiPay ? (paymentMode === 'ONLINE') : addedPayments.some(p => p.mode === 'ONLINE');
    if (isOnline && (!whatsappPhone || whatsappPhone.trim().length < 10)) {
      toast.error('Customer WhatsApp number is required for digital payments');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        orderId: selectedOrder.id,
        discount: parseFloat(discount) || 0,
        transactionRef: ''
      };

      if (isMultiPay) {
        payload.paymentModes = addedPayments;
        payload.amountReceived = addedPayments.reduce((sum, p) => sum + p.amount, 0);
      } else {
        payload.paymentMode = paymentMode;
        payload.amountReceived = parseFloat(amountReceived) || 0;
      }

      // Compute the total bill amount fresh (not from stale calc)
      const disc = parseFloat(discount) || 0;
      let freshTotal = 0;
      if (billData) {
        let totalCgst = 0, totalSgst = 0;
        billData.items?.forEach(item => {
          const itemGst = item.gstPercent || shopConfig.gstPercentage;
          const itemTax = (item.total * (itemGst / 100));
          totalCgst += itemTax / 2;
          totalSgst += itemTax / 2;
        });
        const sub = billData.subtotal - disc;
        const cgst = shopConfig.gstEnabled ? Math.round(totalCgst * 100) / 100 : 0;
        const sgst = shopConfig.gstEnabled ? Math.round(totalSgst * 100) / 100 : 0;
        freshTotal = Math.round(sub + cgst + sgst);
      }

      // Check if digital payment is needed
      let onlinePay = isMultiPay ? addedPayments.find(p => p.mode === 'ONLINE') : null;

      // If in Split Mode and Easebuzz is selected in dropdown but NOT added to list yet,
      // compute remaining balance directly from addedPayments
      if (isMultiPay && !onlinePay && multiPayMode === 'ONLINE') {
        const totalPaidSoFar = addedPayments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = Math.max(0, freshTotal - totalPaidSoFar);
        if (remaining > 0) {
          onlinePay = { mode: 'ONLINE', amount: remaining };
        }
      }

      const isDigital = (!isMultiPay && paymentMode === 'ONLINE') || (isMultiPay && onlinePay);

      if (isDigital) {
        try {
          const splitAmt = isMultiPay ? onlinePay.amount : freshTotal;
          // Metadata: all non-ONLINE payments in the addedPayments list
          const nonOnlineParts = addedPayments.filter(p => p.mode !== 'ONLINE');
          const metadata = isMultiPay && nonOnlineParts.length > 0
            ? nonOnlineParts.map(p => `${p.mode}:${p.amount}`).join(',')
            : '';

          console.log('[Split Payment] splitAmt:', splitAmt, '| metadata:', metadata, '| freshTotal:', freshTotal, '| addedPayments:', addedPayments);

          const res = await initiateDigitalPayment(selectedOrder.id, disc, 'ONLINE', splitAmt, metadata);

          if (res.data.status === 'success') {
            const capturedOrderId = selectedOrder.id;
            const capturedDiscount = parseFloat(discount) || 0;

            // Easebuzz Checkout v2
            const easebuzzCheckout = new window.EasebuzzCheckout(res.data.accessKey, 'test');
            const options = {
              access_key: res.data.accessKey,
              onResponse: async (response) => {
                console.log('Easebuzz response:', response);
                if (response.status === 'success') {
                  setLoading(true);
                  try {
                    const verifyRes = await verifyEasebuzzPayment({
                      txnid: response.txnid,
                      status: response.status,
                      easepay_id: response.easepay_id,
                      hash: response.hash,
                      amount: response.amount,
                      productinfo: response.productinfo,
                      firstname: response.firstname,
                      email: response.email,
                      order_id: capturedOrderId,
                      discount: capturedDiscount
                    });

                    if (verifyRes.data.status === 'success') {
                      toast.success('Payment Verified Successfully!');
                      navigate(`/payment-success?orderId=${capturedOrderId}&txnid=${response.txnid}`);
                    } else {
                      toast.error('Verification failed: ' + verifyRes.data.message);
                      setLoading(false);
                    }
                  } catch (err) {
                    console.error('Verification API Error:', err);
                    toast.error(err.response?.data?.message || 'Payment verification failed');
                    setLoading(false);
                  }
                } else if (response.status === 'failure') {
                  toast.error('Payment Failed: ' + (response.error_Message || 'Transaction failed'));
                  setLoading(false);
                } else if (response.status === 'userCancelled') {
                  toast('Payment cancelled. You can try again.', { icon: '⚠️' });
                  setLoading(false);
                } else {
                  toast.error('Payment status: ' + response.status);
                  setLoading(false);
                }
              },
              theme: '#3399cc'
            };

            easebuzzCheckout.initiatePayment(options);

          } else {
            toast.error('Easebuzz Error: ' + res.data.message);
            setLoading(false);
          }
        } catch (err) {
          toast.error('Failed to initiate digital payment: ' + (err.response?.data?.message || err.message));
          setLoading(false);
        }
        return;
      }

      await processPayment(payload);
      toast.success('Payment processed!');
      setSelectedOrder(null);
      setBillData(null);
      setView('orders');
      loadData();
    } catch (err) {
      if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        const paymentData = {
          orderId: selectedOrder.id,
          discount: parseFloat(discount) || 0,
          transactionRef: '',
          paymentModes: isMultiPay ? addedPayments : undefined,
          paymentMode: isMultiPay ? undefined : paymentMode,
          amountReceived: isMultiPay ? addedPayments.reduce((sum, p) => sum + p.amount, 0) : (parseFloat(amountReceived) || 0)
        };
        await addPendingSync('PROCESS_PAYMENT', paymentData);
        toast('Network error: Payment saved LOCALLY. It will sync automatically when online.', { icon: '📡' });

        setSelectedOrder(null);
        setBillData(null);
        setView('orders');
      } else {
        toast.error('Payment failed: ' + (err.response?.data?.message || err.message));
      }
    }
    setLoading(false);
  };

  const calculateBill = () => {
    if (!billData) return {};
    const disc = parseFloat(discount) || 0;
    let totalCgst = 0;
    let totalSgst = 0;

    billData.items?.forEach(item => {
      const itemGst = item.gstPercent || shopConfig.gstPercentage;
      const itemTax = (item.total * (itemGst / 100));
      totalCgst += itemTax / 2;
      totalSgst += itemTax / 2;
    });

    const sub = billData.subtotal - disc;
    const cgst = shopConfig.gstEnabled ? Math.round(totalCgst * 100) / 100 : 0;
    const sgst = shopConfig.gstEnabled ? Math.round(totalSgst * 100) / 100 : 0;
    const total = Math.round(sub + cgst + sgst);
    const received = parseFloat(amountReceived) || 0;
    const change = received > total ? received - total : 0;
    const totalPaidSoFar = addedPayments.reduce((sum, p) => sum + p.amount, 0);
    const multiPayRemaining = Math.max(0, total - totalPaidSoFar);

    return { sub, cgst, sgst, total, change, multiPayRemaining, totalPaidSoFar };
  };

  const calc = calculateBill();

  return (
    <div className="waiter-page">
      {/* Header mapped from CounterPage */}
      <header className="waiter-header counter-header">
        <div className="counter-header-left">
          <Link to="/" className="back-btn">←</Link>
          <div className="header-title-group">
            <h1>🧑‍🍳 Waiter</h1>
          </div>
        </div>


        <nav className="counter-tabs">
          <button className={`tab ${view === 'tables' ? 'active' : ''}`} onClick={() => setView('tables')}>
            Tables
          </button>
          <button className={`tab ${view === 'menu' ? 'active' : ''}`} onClick={() => setView('menu')}>
            DineIn Order
          </button>
          <button className={`tab ${view === 'orders' ? 'active' : ''}`} onClick={() => setView('orders')}>
            Active Orders <span className="tab-count">{activeOrders.length}</span>
          </button>
          <button className="btn btn-outline btn-sm logout-btn-header" onClick={logout} style={{ marginLeft: '16px' }}>Sign Out</button>
        </nav>
      </header>

      <div className="waiter-body">
        {/* TABLE SELECTION VIEW */}
        {view === 'tables' && (
          <div className="tables-view animate-fadeIn">
            <h2 className="view-title">Select a Table</h2>
            <div className="tables-grid-modern">
              {tables.map(table => (
                <div
                  key={table.id}
                  className={`modern-table-card ${table.status.toLowerCase()} ${selectedTable === table.tableNumber ? 'selected' : ''}`}
                  onClick={() => selectTable(table)}
                >
                  <div className="m-table-header">
                    <span className="m-table-number">{table.tableNumber}</span>
                    <span className={`m-table-status-dot ${table.status.toLowerCase()}`}></span>
                  </div>
                  <div className="m-table-body">
                    <div className="m-table-capacity">{table.capacity} Seats</div>
                    <div className="m-table-status-text">{table.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENU VIEW (Mirrors Cashier Takeaway Hub) */}
        {view === 'menu' && (
          <div className="counter-takeaway animate-fadeIn">
            <div className="takeaway-layout">
              {/* Left Side: Dynamic Menu Selection */}
              <div className="takeaway-menu">
                <div className="menu-header-c">
                  <input className="search-c" placeholder="🔍 Search menu..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  <div className="cat-scroll">
                    <button className={`cat-btn-c ${activeCategory === 'All' ? 'active' : ''}`}
                      onClick={() => setActiveCategory('All')}>All</button>
                    {categories.map(cat => (
                      <button key={cat.id} className={`cat-btn-c ${activeCategory === cat.name ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.name)}>{cat.name}</button>
                    ))}
                  </div>
                </div>

                <div className="takeaway-grid">
                  {filteredItems.map(item => {
                    const hasVariations = item.variations && item.variations.length > 0;
                    const displayPrice = hasVariations
                      ? Math.min(...item.variations.map(v => v.price))
                      : item.price;
                    const inCartQty = !hasVariations && cart[item.id] ? cart[item.id].qty : 0;

                    return (
                      <div key={item.id} className={`c-item-card ${inCartQty > 0 ? 'active' : ''}`} onClick={() => addToCart(item)}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="c-item-img" loading="lazy" />
                        ) : (
                          <div className="image-placeholder">
                            <img src={shopConfig.logo} alt="Logo" style={{ width: '30px', opacity: 0.5 }} />
                          </div>
                        )}
                        <div className="c-item-details">
                          <div className="c-item-title">{item.name}</div>
                          <div className="c-item-price">₹{displayPrice}{hasVariations ? '+' : ''}</div>
                        </div>
                        {inCartQty > 0 && <div className="cart-badge-qty">{inCartQty}</div>}
                      </div>
                    );
                  })}
                  {filteredItems.length === 0 && <div className="empty-state">No items found</div>}
                </div>
              </div>

              {/* Right Side: New Order Cart (Identical to Cashier) */}
              <div className="takeaway-cart glass-card">
                <div className="flex-between">
                  <h3>DineIn Order</h3>
                  <div className="selected-info">
                    {selectedTable ? (
                      <span className="badge badge-success">Table {selectedTable}</span>
                    ) : (
                      <span className="badge badge-error">Table Not Selected</span>
                    )}
                  </div>
                </div>

                <div className="customer-inputs-c">
                  <div style={{ position: 'relative' }}>
                    <input className="input" placeholder="Customer Name *" value={customerName}
                      onChange={e => setCustomerName(e.target.value)} required />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#EF4444', fontSize: '14px' }}>*</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input className="input" placeholder="WhatsApp Number *" value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)} required />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#EF4444', fontSize: '14px' }}>*</span>
                  </div>
                </div>

                <div className="cart-list-c">
                  {/* Existing KDS Items */}
                  {activeOrders.find(o => o.tableNumber === selectedTable && o.status !== 'PAID' && o.status !== 'CANCELLED')?.items?.length > 0 && (
                    <div className="existing-items-section">
                      <div className="section-label" style={{ padding: '8px 4px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        🔥 In Kitchen (KDS)
                      </div>
                      {activeOrders.find(o => o.tableNumber === selectedTable && o.status !== 'PAID' && o.status !== 'CANCELLED').items.map(item => (
                        <div key={'existing-' + item.id} className="cart-item-c existing-kds-item" style={{ borderLeft: '3px solid var(--warning)', background: 'rgba(245, 158, 11, 0.1)' }}>
                          <div className="item-details-c">
                            <span className="item-name-c">{item.menuItem?.name} <small style={{ opacity: 0.7 }}>(Saved)</small></span>
                            <div className="item-qty-c">
                              <span style={{ fontWeight: 'bold' }}>{item.quantity}x</span>
                            </div>
                          </div>
                          <span className="item-total-c">₹{(item.price * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                      <div className="divider" style={{ borderBottom: '1px dashed var(--border)', margin: '12px 0' }}></div>
                    </div>
                  )}

                  {Object.keys(cart).length === 0 ? (
                    <div className="empty-cart-c">Add new items...</div>
                  ) : (
                    Object.entries(cart).map(([key, c]) => (
                      <div key={key} className="cart-item-c">
                        <div className="item-details-c">
                          <span className="item-name-c">{c.item.name} {c.variation ? `(${c.variation.name})` : ''}</span>
                          <div className="item-qty-c">
                            <button className="qty-btn-c" onClick={() => removeFromCart(key)}>−</button>
                            <span>{c.qty}</span>
                            <button className="qty-btn-c" onClick={() => addToCart(c.item, c.variation)}>+</button>
                          </div>
                        </div>
                        <span className="item-total-c">₹{((c.variation ? c.variation.price : c.item.price) * c.qty).toFixed(0)}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="cart-footer-c">
                  <div className="cart-grand-total">Total: ₹{cartTotal.toFixed(2)}</div>
                  <button className="btn btn-success btn-block btn-lg" onClick={submitOrder} disabled={loading || !selectedTable || Object.keys(cart).length === 0}>
                    {loading ? '⏳ Creating...' : '🍳 Place Order Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE ORDERS VIEW */}
        {view === 'orders' && (
          <div className="orders-view animate-fadeIn">
            <h2 className="view-title">Active Orders Tracking</h2>
            {activeOrders.length === 0 && (
              <div className="empty-state-orders">
                <div className="empty-icon">📝</div>
                <p>No active orders at the moment</p>
              </div>
            )}
            <div className="orders-grid-modern">
              {activeOrders.map(order => (
                <div key={order.id} className={`modern-order-card status-${order.status?.toLowerCase()}`} onClick={() => editOrder(order)}>
                  <div className="m-order-header">
                    <div className="m-order-id-group">
                      <span className="m-order-id">{order.id}</span>
                      <span className="m-order-table">Table {order.tableNumber}</span>
                    </div>
                    <span className={`m-order-status-pill ${order.status?.toLowerCase()}`}>{order.status}</span>
                  </div>
                  <div className="m-order-body">
                    {order.items?.map(i => (
                      <div key={i.id} className="m-order-item">
                        <span className="m-item-qty">{i.quantity}x</span>
                        <span className="m-item-name">{i.menuItem?.name}</span>
                        <span className="m-item-price">₹{(i.price * i.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="m-order-footer">
                    <div className="m-order-time">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                    <div className="m-order-total">₹{order.totalAmount?.toFixed(0)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* BILL VIEW (Identical to Cashier Invoice/Payment) */}
        {view === 'bill' && billData && (
          <div className="bill-view animate-fadeIn">
            <div className="bill-container">
              {/* Bill Preview */}
              <div className="bill-preview glass-card">
                <div className="bill-header-sec">
                  <div className="flex-between">
                    <h2>🧾 Invoice</h2>
                  </div>
                  <div className="bill-meta">
                    <div>Order {billData.orderId}</div>
                    <div>Table: {billData.tableNumber}</div>
                    <div>Type: {billData.orderType?.replace('_', ' ')}</div>
                    {billData.customerName && <div>Customer: {billData.customerName}</div>}
                    <div>Date: {billData.createdAt}</div>
                  </div>
                </div>

                <table className="bill-table">
                  <thead>
                    <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {billData.items?.map((item, i) => (
                      <tr key={i}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>₹{item.unitPrice.toFixed(2)}</td>
                        <td>₹{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="bill-totals">
                  <div className="bill-row"><span>Subtotal</span><span>₹{billData.subtotal?.toFixed(2)}</span></div>
                  {parseFloat(discount) > 0 && (
                    <div className="bill-row discount"><span>Discount</span><span>-₹{parseFloat(discount).toFixed(2)}</span></div>
                  )}
                  {shopConfig.gstEnabled && (
                    <>
                      <div className="bill-row"><span>CGST ({shopConfig.gstPercentage / 2}%)</span><span>₹{calc.cgst?.toFixed(2)}</span></div>
                      <div className="bill-row"><span>SGST ({shopConfig.gstPercentage / 2}%)</span><span>₹{calc.sgst?.toFixed(2)}</span></div>
                    </>
                  )}
                  <div className="bill-row bill-grand-total">
                    <span>Grand Total</span>
                    <span>₹{calc.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Panel */}
              <div className="payment-panel glass-card">
                <div className="flex-between">
                  <h3>Payment</h3>
                </div>

                {paymentMode !== 'SPLIT' ? (
                  <>
                    <div className="payment-modes">
                      {['CASH', 'ONLINE', 'SPLIT'].map(mode => (
                        <button key={mode}
                          className={`payment-mode-btn ${paymentMode === mode ? 'active' : ''}`}
                          onClick={() => {
                            setPaymentMode(mode);
                            if (mode === 'SPLIT') {
                              setIsMultiPay(true);
                              setAddedPayments([]);
                            } else {
                              setIsMultiPay(false);
                            }
                          }}>
                          <span className="mode-icon">
                            {mode === 'CASH' ? '💵' : mode === 'ONLINE' ? '🌐' : '⚖️'}
                          </span>
                          <span className="mode-name">
                            {mode === 'ONLINE' ? 'Easebuzz' : mode === 'SPLIT' ? 'Split Payment' : mode}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="payment-fields">
                      {paymentMode === 'ONLINE' && (
                        <div className="whatsapp-field" style={{ marginBottom: '16px' }}>
                          <label>Customer WhatsApp <span style={{ color: '#EF4444' }}>*</span></label>
                          <input className="input" type="text" placeholder="10-digit number" value={whatsappPhone}
                            onChange={e => setWhatsappPhone(e.target.value)} required />
                        </div>
                      )}

                      <label>Discount (₹)</label>
                      <input className="input" type="number" placeholder="0" value={discount}
                        onChange={e => setDiscount(e.target.value)} />

                      {paymentMode === 'CASH' && (
                        <>
                          <label>Amount Received (₹)</label>
                          <input className="input" type="number" placeholder="0" value={amountReceived}
                            onChange={e => setAmountReceived(e.target.value)} />
                          {calc.change > 0 && (
                            <div className="change-display" style={{ marginTop: '10px', color: '#10B981', fontWeight: 'bold' }}>
                              Change: ₹{calc.change.toFixed(2)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="multi-pay-section animate-fadeIn">
                    <div className="payment-modes" style={{ marginBottom: '20px' }}>
                      {['CASH', 'ONLINE', 'SPLIT'].map(mode => (
                        <button key={mode}
                          className={`payment-mode-btn ${paymentMode === mode ? 'active' : ''}`}
                          onClick={() => {
                            setPaymentMode(mode);
                            if (mode === 'SPLIT') {
                              setIsMultiPay(true);
                            } else {
                              setIsMultiPay(false);
                              setAddedPayments([]);
                            }
                          }}>
                          <span className="mode-icon">
                            {mode === 'CASH' ? '💵' : mode === 'ONLINE' ? '🌐' : '⚖️'}
                          </span>
                          <span className="mode-name">
                            {mode === 'ONLINE' ? 'Easebuzz' : mode === 'SPLIT' ? 'Split Payment' : mode}
                          </span>
                        </button>
                      ))}
                    </div>
                    <label>Discount (₹)</label>
                    <input className="input" type="number" placeholder="0" value={discount}
                      onChange={e => setDiscount(e.target.value)} />

                    <div className="payment-summary-box">
                      <div>Total Due: <strong>₹{calc.total.toFixed(2)}</strong></div>
                      <div style={{ color: calc.multiPayRemaining > 0 ? '#EF4444' : '#10B981' }}>
                        Remaining: <strong>₹{calc.multiPayRemaining.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="add-payment-row">
                      <select className="input" value={multiPayMode} onChange={e => {
                        const val = e.target.value;
                        setMultiPayMode(val);
                        if (val === 'ONLINE') {
                          setAmountReceived(calc.multiPayRemaining.toFixed(2));
                        }
                      }}>
                        <option value="CASH">Cash</option>
                        <option value="ONLINE">Easebuzz</option>
                      </select>
                      <input className="input" type="number" placeholder="Amount"
                        value={amountReceived} onChange={e => setAmountReceived(e.target.value)} />
                      <button className="btn btn-sm btn-primary" onClick={() => {
                        const amt = parseFloat(amountReceived);
                        if (isNaN(amt) || amt <= 0) return;
                        setAddedPayments([...addedPayments, { mode: multiPayMode, amount: amt }]);
                        setAmountReceived('');
                      }} disabled={!amountReceived}>Add</button>
                    </div>
                  </div>
                )}


                <div className="payment-actions">
                  <button className="btn btn-outline" onClick={() => { setView('orders'); setSelectedOrder(null); }}>
                    Cancel
                  </button>
                  <button className="btn btn-success btn-lg" onClick={handlePayment}
                    disabled={loading || (isMultiPay && calc.multiPayRemaining > 0 && multiPayMode !== 'ONLINE')}>
                    {loading ? '⏳ Processing...' : (
                      isMultiPay
                        ? (multiPayMode === 'ONLINE' && calc.multiPayRemaining > 0
                          ? `✅ Settle (₹${calc.multiPayRemaining.toFixed(2)} via Easebuzz)`
                          : '✅ Settle Bill')
                        : `✅ Pay ₹${calc.total?.toFixed(2)}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Variation Selection Modal */}
      <Modal
        isOpen={!!showVariationModal}
        onClose={() => setShowVariationModal(null)}
        title={showVariationModal?.name || 'Select Variation'}
      >
        <div style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Select your favorite variation</div>
        <div className="variation-options-modern">
          {showVariationModal?.variations?.map(v => (
            <div key={v.id} className="variation-card-modern" onClick={() => addToCart(showVariationModal, v)}>
              <div className="v-card-info">
                <span className="v-name">{v.name}</span>
                <span className="v-price">₹{v.price}</span>
              </div>
              <div className="v-add-icon">+</div>
            </div>
          ))}
        </div>
      </Modal>

      {loading && <LoadingOverlay message="Processing Order..." />}
    </div >
  );
}

export default WaiterPage;
