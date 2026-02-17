import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getOrders, getActiveOrders, processPayment, getBill, updateOrderStatus, getAvailableMenuItems, getActiveCategories, createOrder, getOrdersByDate, initiateDigitalPayment, verifyEasebuzzPayment } from '../service/api';
import { connectWebSocket } from '../service/ws';
import { useAuth } from '../context/AuthContext';
import ThermalReceipt from '../components/ThermalReceipt';
import { addPendingSync } from '../db';
import { useConfig } from '../context/ConfigContext';
import { toast } from 'react-hot-toast';
import './CounterPage.css';

function CounterPage() {
  const navigate = useNavigate();
  const { config: shopConfig } = useConfig();
  const { logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [billData, setBillData] = useState(null);
  const [view, setView] = useState('pending'); // 'pending', 'bill', 'history'
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [isMultiPay, setIsMultiPay] = useState(false);
  const [addedPayments, setAddedPayments] = useState([]); // { mode: 'CASH', amount: 500 }
  const [upiId, setUpiId] = useState('');
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');

  // History Pagination State
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(12);

  const [stockAlerts, setStockAlerts] = useState([]);

  // Takeaway State
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    loadOrders();
    loadTakeawayData();
    const stompClient = connectWebSocket(
      (order) => {
        setOrders(prev => {
          const idx = prev.findIndex(o => o.id === order.id);
          if (order.status === 'PAID' || order.status === 'CANCELLED') {
            return prev.filter(o => o.id !== order.id);
          }
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = order;
            return updated;
          }
          return [...prev, order];
        });

        // Update history state for PAID orders
        if (order.status === 'PAID') {
          setAllOrders(prev => {
            const exists = prev.find(o => o.id === order.id);
            if (exists) return prev.map(o => o.id === order.id ? order : o);
            return [order, ...prev];
          });
        }
      },
      null, // No table updates for counter
      (alert) => {
        toast.error(alert, { duration: 6000 });
      }
    );
    return () => { if (stompClient) stompClient.deactivate(); };
  }, []);

  useEffect(() => {
    const { total } = calculateBill();
    if (paymentMode === 'CASH' && total) {
      setAmountReceived(total.toFixed(2));
    } else {
      setAmountReceived('');
    }
  }, [paymentMode, billData, discount]);

  const loadOrders = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [activeRes, allRes] = await Promise.all([
        getActiveOrders(),
        getOrdersByDate(today, today)
      ]);
      setOrders(activeRes.data);
      // Sort history to show newest first
      setAllOrders(allRes.data.filter(o => o.status === 'PAID').sort((a, b) => b.id - a.id));
    } catch (err) { console.error(err); }
  };

  const loadTakeawayData = async () => {
    try {
      const [menuRes, catRes] = await Promise.all([getAvailableMenuItems(), getActiveCategories()]);
      setMenuItems(menuRes.data);
      setCategories(catRes.data);
    } catch (err) { console.error(err); }
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

  const handleReprint = async (order) => {
    try {
      const res = await getBill(order.id);
      setBillData(res.data);
      // For PAID orders, we should use the actual discount from the order
      setDiscount(order.discount || 0);
      setTimeout(() => window.print(), 500);
    } catch (err) {
      console.error("Reprint failed", err);
      toast.error("Failed to fetch bill data for reprint.");
    }
  };

  const handlePayment = async () => {
    if (!selectedOrder) return;
    if (!whatsappPhone || whatsappPhone.trim().length < 10) {
      toast.error('Customer WhatsApp number is required for digital billing');
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
        payload.amountReceived = addedPayments.reduce((sum, p) => sum + p.amount, 0); // Total paid
      } else {
        payload.paymentMode = paymentMode;
        payload.amountReceived = parseFloat(amountReceived) || 0;
      }

      if (paymentMode === 'ONLINE' || paymentMode === 'UPI_ID' || paymentMode === 'UPI_SCAN') {
        try {
          const res = await initiateDigitalPayment(selectedOrder.id, parseFloat(discount) || 0, 'ONLINE');

          if (res.data && res.data.action && res.data.fields) {
            // Create hidden form and submit
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = res.data.action;
            form.style.display = 'none'; // Ensure form is hidden

            Object.entries(res.data.fields).forEach(([key, value]) => {
              const input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = value;
              form.appendChild(input);
            });

            document.body.appendChild(form);
            console.log('Submitting Easebuzz form to:', res.data.action);
            form.submit();
            // Optional: Remove form after submit to clean up DOM, though page redirect will happen
            // document.body.removeChild(form); 
            return;

          } else {
            toast.error('Invalid response from payment server');
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

      // Automatically trigger WhatsApp PDF Share
      await autoShareWhatsAppBill();

      setSelectedOrder(null);
      setBillData(null);
      setView('pending');
      loadOrders();
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
        setView('pending');
      } else {
        toast.error('Payment failed: ' + (err.response?.data?.message || err.message));
      }
    }
    setLoading(false);
  };

  const submitTakeawayOrder = async () => {
    if (Object.keys(cart).length === 0) {
      toast.error('Please add items to the order.');
      return;
    }
    if (!customerPhone || customerPhone.trim().length < 10) {
      toast.error('Customer WhatsApp number is required');
      return;
    }
    setLoading(true);
    try {
      const orderItems = Object.values(cart).map(c => ({
        menuItemId: c.item.id,
        variationId: c.variation ? c.variation.id : null,
        quantity: c.qty
      }));

      const res = await createOrder({
        customerName,
        customerPhone,
        tableNumber: 'TAKEAWAY',
        orderType: 'TAKEAWAY',
        createdBy: 'Cashier',
        items: orderItems
      });

      toast.success('Takeaway order created!');
      setCart({});
      setCustomerName('');
      setCustomerPhone('');
      loadOrders();

      // Auto-select for billing
      selectForBilling(res.data);
    } catch (err) {
      if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        const orderData = {
          customerName,
          customerPhone,
          tableNumber: 'TAKEAWAY',
          orderType: 'TAKEAWAY',
          createdBy: 'Cashier',
          items: Object.values(cart).map(c => ({
            menuItemId: c.item.id,
            variationId: c.variation ? c.variation.id : null,
            quantity: c.qty
          }))
        };
        await addPendingSync('CREATE_ORDER', orderData);
        toast('Network error: Takeaway order saved LOCALLY. It will sync automatically when online.', { icon: '📡' });

        setCart({});
        setCustomerName('');
        setCustomerPhone('');
        setView('pending');
      } else {
        toast.error('Failed to create takeaway order: ' + (err.response?.data?.message || err.message));
      }
    }
    setLoading(false);
  };

  const addToCart = (item, variation = null) => {
    const cartKey = variation ? `${item.id}-${variation.id}` : `${item.id}`;
    setCart(prev => ({
      ...prev,
      [cartKey]: {
        item,
        variation,
        qty: (prev[cartKey]?.qty || 0) + 1
      }
    }));
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

  const handlePrint = () => {
    window.print();
  };

  const getBillPDFFile = () => {
    if (!billData) return null;
    const doc = new jsPDF({ format: [80, 150] }); // Thermal size
    const primaryColor = [15, 23, 42]; // Slate 900

    // Branding
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('KhanaBook', 40, 15, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Delicious Food, Delivered Fast', 40, 20, { align: 'center' });
    doc.setDrawColor(200);
    doc.line(10, 25, 70, 25);

    // Meta
    doc.setFontSize(7);
    doc.text(`Invoice #: ${billData.orderId}`, 10, 32);
    doc.text(`Table: ${billData.tableNumber}`, 10, 36);
    doc.text(`Date: ${billData.createdAt}`, 10, 40);
    if (billData.customerName) doc.text(`Customer: ${billData.customerName}`, 10, 44);

    // Items Table
    autoTable(doc, {
      startY: 48,
      margin: { left: 5, right: 5 },
      head: [['Item', 'Qty', 'Total']],
      body: billData.items.map(i => [i.name, i.quantity, i.total.toFixed(2)]),
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fontStyle: 'bold', borderBottom: [0.1, 0, 0, 0] }
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY + 5;
    doc.line(10, finalY, 70, finalY);
    doc.setFontSize(8);
    doc.text(`Subtotal: INR ${billData.subtotal.toFixed(2)}`, 70, finalY + 8, { align: 'right' });
    if (parseFloat(discount) > 0) {
      doc.text(`Discount: -INR ${parseFloat(discount).toFixed(2)}`, 70, finalY + 12, { align: 'right' });
    }
    doc.text(`GST (${shopConfig.gstPercentage}%): INR ${(calc.cgst + calc.sgst).toFixed(2)}`, 70, finalY + 16, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: INR ${calc.total.toFixed(2)}`, 70, finalY + 22, { align: 'right' });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Thank you for dining with us!', 40, finalY + 32, { align: 'center' });
    doc.text('Visit again!', 40, finalY + 36, { align: 'center' });

    const pdfBlob = doc.output('blob');
    return new File([pdfBlob], `KhanaBook_Bill_${billData.orderId}.pdf`, { type: 'application/pdf' });
  };

  const autoShareWhatsAppBill = async () => {
    if (!billData) return;
    try {
      const file = getBillPDFFile();
      if (!file) return;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice #${billData.orderId}`,
          text: `Here is your bill from KhanaBook for ₹${calc.total.toFixed(2)}. Have a great day!`,
        });
      }
    } catch (err) {
      console.error("Auto-share failed", err);
    }
  };

  const calculateBill = () => {
    if (!billData) return {};
    const disc = parseFloat(discount) || 0;

    // Calculate tax based on item-specific GST rates
    let totalCgst = 0;
    let totalSgst = 0;

    billData.items?.forEach(item => {
      const itemGst = item.gstPercent || shopConfig.gstPercentage;
      const itemTax = (item.total * (itemGst / 100));
      totalCgst += itemTax / 2;
      totalSgst += itemTax / 2;
    });

    const sub = billData.subtotal - disc;
    const cgst = shopConfig.gstEnabled ? (totalCgst) : 0;
    const sgst = shopConfig.gstEnabled ? (totalSgst) : 0;
    const total = sub + cgst + sgst;
    const received = parseFloat(amountReceived) || 0;
    const change = received > total ? received - total : 0;

    // For MultiPay
    const totalPaidSoFar = addedPayments.reduce((sum, p) => sum + p.amount, 0);
    const multiPayRemaining = Math.max(0, total - totalPaidSoFar);

    return { sub, cgst, sgst, total, change, multiPayRemaining, totalPaidSoFar };
  };

  const calc = calculateBill();
  const activeOrdersList = orders.filter(o => o.status !== 'PAID' && o.status !== 'CANCELLED');

  return (
    <div className="counter-page">
      <header className="counter-header">
        <div className="counter-header-left">
          <Link to="/" className="back-btn">←</Link>
          <h1>💰 Counter</h1>
        </div>
        <nav className="counter-tabs">
          <button className={`tab ${view === 'pending' ? 'active' : ''}`} onClick={() => { setView('pending'); setSelectedOrder(null); }}>
            Pending Bills
          </button>
          <button className={`tab ${view === 'takeaway' ? 'active' : ''}`} onClick={() => { setView('takeaway'); setSelectedOrder(null); }}>
            Takeaway
          </button>
          <button className={`tab ${view === 'history' ? 'active' : ''}`} onClick={() => { setView('history'); setSelectedOrder(null); }}>
            All Orders
          </button>
          <button className="btn btn-outline btn-sm logout-btn-header" onClick={logout} style={{ marginLeft: '16px' }}>Sign Out</button>
        </nav>
      </header>

      <div className="counter-body">
        {/* PENDING ORDERS */}
        {view === 'pending' && (
          <div className="counter-orders animate-fadeIn">
            <h2>Orders Ready for Billing</h2>
            {activeOrdersList.length === 0 && <div className="empty-state">No pending orders</div>}
            <div className="counter-orders-grid">
              {activeOrdersList.map(order => (
                <div key={order.id} className={`counter-order-card status-${order.status?.toLowerCase()}`}
                  onClick={() => selectForBilling(order)}>
                  <div className="co-top">
                    <span className="co-id">{order.id}</span>
                    <span className={`badge badge-${order.status?.toLowerCase()}`}>{order.status}</span>
                  </div>
                  <div className="co-info">
                    <div>📍 {order.tableNumber}</div>
                    {order.customerName && <div>👤 {order.customerName}</div>}
                    <div>🍽️ {order.orderType?.replace('_', ' ')}</div>
                  </div>
                  <div className="co-items">
                    {order.items?.map(i => (
                      <span key={i.id} className="co-item-tag">{i.quantity}x {i.menuItem?.name}</span>
                    ))}
                  </div>
                  <div className="co-bottom">
                    <span className="co-total">₹{order.totalAmount?.toFixed(2)}</span>
                    <span className="co-time">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAKEAWAY ORDERING */}
        {view === 'takeaway' && (
          <div className="counter-takeaway animate-fadeIn">
            <div className="takeaway-layout">
              <div className="takeaway-menu">
                <div className="menu-header-c">
                  <input className="input search-c" placeholder="🔍 Search menu..."
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
                  {menuItems.filter(item => {
                    const matchCat = activeCategory === 'All' || item.category === activeCategory;
                    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchCat && matchSearch;
                  }).map(item => {
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
                          <div className="image-placeholder">🍛</div>
                        )}
                        <div className="c-item-details">
                          <div className="c-item-title">{item.name}</div>
                          <div className="c-item-price">₹{displayPrice}{hasVariations ? '+' : ''}</div>
                        </div>
                        {inCartQty > 0 && <div className="cart-badge-qty">{inCartQty}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="takeaway-cart glass-card">
                <h3>New Order</h3>
                <div className="customer-inputs-c">
                  <input className="input" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  <div style={{ position: 'relative' }}>
                    <input className="input" placeholder="WhatsApp Number *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#EF4444', fontSize: '14px' }}>*</span>
                  </div>
                </div>
                <div className="cart-list-c">
                  {Object.keys(cart).length === 0 ? (
                    <div className="empty-cart-c">Cart is empty</div>
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
                        <span className="item-total-c">₹{((c.variation?.price || c.item.price) * c.qty).toFixed(0)}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="cart-footer-c">
                  <div className="cart-grand-total">Total: ₹{cartTotal.toFixed(2)}</div>

                  <button className="btn btn-success btn-block btn-lg" onClick={submitTakeawayOrder} disabled={loading || Object.keys(cart).length === 0}>
                    {loading ? '⏳ Creating...' : '🍳 Place Takeaway Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BILL VIEW */}
        {view === 'bill' && billData && (
          <div className="bill-view animate-fadeIn">
            <div className="bill-container">
              {/* Bill Preview */}
              <div className="bill-preview glass-card">
                <div className="bill-header-sec">
                  <div className="flex-between">
                    <h2>Invoice</h2>
                    <button className="btn btn-outline" onClick={handlePrint}>
                      Print Receipt
                    </button>
                  </div>
                  <div className="bill-meta">
                    <div><span className="meta-label">Order ID:</span> {billData.orderId}</div>
                    {billData.orderType !== 'TAKEAWAY' && <div><span className="meta-label">Table:</span> {billData.tableNumber}</div>}
                    <div><span className="meta-label">Type:</span> {billData.orderType?.replace('_', ' ')}</div>
                    {billData.customerName && <div className="span-2"><span className="meta-label">Customer:</span> {billData.customerName}</div>}
                  </div>
                </div>

                <div className="bill-main-content">
                  <table className="bill-table">
                    <thead>
                      <tr><th>SL</th><th>Item</th><th>QTY</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                      {billData.items?.map((item, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="bill-totals">
                    <div className="bill-row"><span>Subtotal</span><span>₹{billData.subtotal?.toFixed(2)}</span></div>
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
              </div>

              {/* Payment Panel */}
              <div className="payment-panel glass-card">
                <div className="flex-between">
                  <h3>Payment</h3>
                  <button className="btn btn-xs btn-outline" onClick={() => { setIsMultiPay(!isMultiPay); setAddedPayments([]); }}>
                    {isMultiPay ? 'Switch to Single Mode' : 'Enable Split Payment'}
                  </button>
                </div>

                {!isMultiPay ? (
                  <>
                    <div className="payment-modes">
                      {['CASH', 'ONLINE', 'UPI_ID', 'UPI_SCAN'].map(mode => (
                        <button key={mode}
                          className={`payment-mode-btn ${paymentMode === mode ? 'active' : ''}`}
                          onClick={() => setPaymentMode(mode)}>
                          <span className="mode-icon">
                            {mode === 'CASH' ? '💵' : mode === 'ONLINE' ? '🌐' : '📱'}
                          </span>
                          <span className="mode-name">
                            {mode === 'ONLINE' ? 'Easebuzz' : mode.replace('_', ' ')}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="payment-fields">
                      <div className="whatsapp-field" style={{ marginBottom: '16px' }}>
                        <label>Customer WhatsApp <span style={{ color: '#EF4444' }}>*</span></label>
                        <input className="input" type="text" placeholder="10-digit number" value={whatsappPhone}
                          onChange={e => setWhatsappPhone(e.target.value)} required />
                      </div>

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

                      {paymentMode === 'UPI_ID' && (
                        <>
                          <label>Enter Customer UPI ID</label>
                          <input className="input" type="text" placeholder="e.g., customer@bank" value={upiId}
                            onChange={e => setUpiId(e.target.value)} />
                        </>
                      )}

                      {paymentMode === 'UPI_SCAN' && (
                        <>
                          <label>Scan QR for Payment</label>
                          {qrCodeData ? (
                            <div className="qr-container-outer" style={{ textAlign: 'center' }}>
                              <div className="qr-code-display" style={{ padding: '15px', background: 'white', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <img src={qrCodeData} alt="Scan to Pay" style={{ width: '200px', height: '200px', display: 'block' }} />
                                <div style={{ color: '#666', fontSize: '12px', marginTop: '8px', fontWeight: 'bold' }}>
                                  Easebuzz Powered
                                </div>
                              </div>
                              <p style={{ fontSize: '13px', marginTop: '10px', opacity: 0.8 }}>Scan this QR using any UPI App (GPay, PhonePe, etc.)</p>
                            </div>
                          ) : (
                            <div className="empty-state-sm">Click the button below to generate QR</div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="multi-pay-section animate-fadeIn">


                    <div className="payment-summary-box">
                      <div>Total Due: <strong>₹{calc.total.toFixed(2)}</strong></div>
                      <div style={{ color: calc.multiPayRemaining > 0 ? '#EF4444' : '#10B981' }}>
                        Remaining: <strong>₹{calc.multiPayRemaining.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="add-payment-row">
                      <select className="input" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                        <option value="CASH">Cash</option>
                        <option value="UPI_ID">UPI ID</option>
                        <option value="UPI_SCAN">UPI Scan</option>
                      </select>
                      <input className="input" type="number" placeholder="Amount"
                        value={amountReceived} onChange={e => setAmountReceived(e.target.value)} />
                      <button className="btn btn-sm btn-primary" onClick={() => {
                        if (!amountReceived || parseFloat(amountReceived) <= 0) return;
                        const amt = parseFloat(amountReceived);
                        setAddedPayments([...addedPayments, { mode: paymentMode, amount: amt }]);
                        setAmountReceived('');
                      }} disabled={!amountReceived}>Add</button>
                    </div>

                    <div className="added-payments-list">
                      {addedPayments.map((p, i) => (
                        <div key={i} className="added-payment-item">
                          <span>{p.mode}</span>
                          <span>₹{p.amount}</span>
                          <button className="delete-btn" onClick={() => setAddedPayments(addedPayments.filter((_, idx) => idx !== i))}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}



                <div className="payment-actions">
                  <button className="btn btn-outline" onClick={() => { setView('pending'); setSelectedOrder(null); }}>
                    Cancel
                  </button>
                  <button className="btn btn-success" onClick={handlePayment}
                    disabled={loading || (isMultiPay && calc.multiPayRemaining > 0)}>
                    {loading ? '⏳ Processing...' : (isMultiPay ? '✅ Settle Bill' : (paymentMode === 'UPI_SCAN' && !qrCodeData ? '🔍 Generate QR' : `✅ Pay ₹${calc.total?.toFixed(2)}`))}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDER HISTORY */}
        {view === 'history' && (
          <div className="history-view animate-fadeIn">
            <div className="glass-card history-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>OrderID</th><th>Type</th>
                    <th>Items</th><th>Total</th><th>Status</th><th>Time</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize).map((order, idx) => (
                    <tr key={order.id} className={`row-${order.status?.toLowerCase()} animate-fadeIn`} style={{ animationDelay: `${idx * 0.05}s` }}>
                      <td><span className="order-id-badge">{order.id}</span></td>
                      <td><span className="type-tag">{order.orderType?.replace('_', ' ')}</span></td>
                      <td>{order.items?.length} items</td>
                      <td className="amount-cell">₹{order.totalAmount?.toFixed(2)}</td>
                      <td><span className={`badge badge-${order.status?.toLowerCase()}`}>{order.status}</span></td>
                      <td className="time-cell">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</td>
                      <td>
                        <div className="action-cell">
                          {order.status === 'PAID' && (
                            <button className="btn btn-xs btn-primary" onClick={(e) => {
                              e.stopPropagation();
                              handleReprint(order);
                            }}>Reprint</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {allOrders.length === 0 && (
                    <tr><td colSpan="8" className="empty-state">No orders for today yet.</td></tr>
                  )}
                </tbody>
              </table>

              {allOrders.length > historyPageSize && (
                <div className="pagination">
                  <button className="page-btn" disabled={historyPage === 1} onClick={() => setHistoryPage(p => p - 1)}>←</button>
                  <span className="page-info">Page {historyPage} of {Math.ceil(allOrders.length / historyPageSize)}</span>
                  <button className="page-btn" disabled={historyPage === Math.ceil(allOrders.length / historyPageSize)} onClick={() => setHistoryPage(p => p + 1)}>→</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden for screen, shown for printer */}
      <ThermalReceipt
        billData={billData}
        calc={{ ...calc, discount: parseFloat(discount) || 0 }}
      />
    </div>
  );
}

export default CounterPage;
