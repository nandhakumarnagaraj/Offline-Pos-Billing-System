import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, getActiveOrders, processPayment, getBill, updateOrderStatus } from '../service/api';
import { connectWebSocket } from '../service/ws';
import { useAuth } from '../context/AuthContext';
import ThermalReceipt from '../components/ThermalReceipt';
import './CounterPage.css';

function CounterPage() {
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
  const [loading, setLoading] = useState(false);

  const [stockAlerts, setStockAlerts] = useState([]);

  useEffect(() => {
    loadOrders();
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
        setStockAlerts(prev => [alert, ...prev].slice(0, 3));
      }
    );
    return () => { if (stompClient) stompClient.deactivate(); };
  }, []);

  const loadOrders = async () => {
    try {
      const [activeRes, allRes] = await Promise.all([getActiveOrders(), getOrders()]);
      setOrders(activeRes.data);
      setAllOrders(allRes.data);
    } catch (err) { console.error(err); }
  };

  const selectForBilling = async (order) => {
    setSelectedOrder(order);
    try {
      const res = await getBill(order.id);
      setBillData(res.data);
      setView('bill');
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

      await processPayment(payload);

      // Auto-trigger print if needed, or just show success
      // window.print(); // We can trigger here

      alert('✅ Payment processed!');
      setSelectedOrder(null);
      setBillData(null);
      setView('pending');
      loadOrders();
    } catch (err) {
      alert('❌ Payment failed: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const calculateBill = () => {
    if (!billData) return {};
    const disc = parseFloat(discount) || 0;

    // Calculate tax based on item-specific GST rates
    let totalCgst = 0;
    let totalSgst = 0;

    billData.items?.forEach(item => {
      const itemGst = item.gstPercent || 5.0;
      const itemTax = (item.total * (itemGst / 100));
      totalCgst += itemTax / 2;
      totalSgst += itemTax / 2;
    });

    const sub = billData.subtotal - disc;
    const cgst = Math.round(totalCgst * 100) / 100;
    const sgst = Math.round(totalSgst * 100) / 100;
    const total = sub + cgst + sgst;
    const received = parseFloat(amountReceived) || 0;
    const change = received > total ? received - total : 0;

    // For MultiPay
    const totalPaidSoFar = addedPayments.reduce((sum, p) => sum + p.amount, 0);
    const multiPayRemaining = Math.max(0, total - totalPaidSoFar);

    return { sub, cgst, sgst, total, change, multiPayRemaining, totalPaidSoFar };
  };

  const calc = calculateBill();
  const todayRevenue = allOrders
    .filter(o => o.status === 'PAID')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const pendingBillOrders = orders.filter(o => o.status === 'READY' || o.status === 'SERVED');
  const activeOrdersList = orders.filter(o => o.status !== 'PAID' && o.status !== 'CANCELLED');

  return (
    <div className="counter-page">
      {stockAlerts.length > 0 && (
        <div className="counter-alerts">
          {stockAlerts.map((alert, i) => (
            <div key={i} className="counter-alert-item animate-slideRight">
              <span>🛑 {alert}</span>
              <button className="close-alert" onClick={() => setStockAlerts(prev => prev.filter((_, idx) => idx !== i))}>×</button>
            </div>
          ))}
        </div>
      )}
      <header className="counter-header">
        <div className="counter-header-left">
          <Link to="/" className="back-btn">←</Link>
          <h1>💰 Cashier / Billing</h1>
        </div>
        <div className="counter-stats">
          <div className="c-stat">
            <span className="c-stat-val">₹{todayRevenue.toFixed(0)}</span>
            <span className="c-stat-label">Today's Revenue</span>
          </div>
          <div className="c-stat">
            <span className="c-stat-val">{pendingBillOrders.length}</span>
            <span className="c-stat-label">Pending Bills</span>
          </div>
        </div>
        <nav className="counter-tabs">
          <button className={`tab ${view === 'pending' ? 'active' : ''}`} onClick={() => { setView('pending'); setSelectedOrder(null); }}>
            Pending Orders
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
                    <span className="co-id">#{order.id}</span>
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

        {/* BILL VIEW */}
        {view === 'bill' && billData && (
          <div className="bill-view animate-fadeIn">
            <div className="bill-container">
              {/* Bill Preview */}
              <div className="bill-preview glass-card">
                <div className="bill-header-sec">
                  <div className="flex-between">
                    <h2>🧾 Invoice</h2>
                    <button className="btn btn-outline btn-sm print-btn-ui" onClick={handlePrint}>
                      🖨️ Print
                    </button>
                  </div>
                  <div className="bill-meta">
                    <div>Order #{billData.orderId}</div>
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
                  <div className="bill-row"><span>CGST (2.5%)</span><span>₹{calc.cgst?.toFixed(2)}</span></div>
                  <div className="bill-row"><span>SGST (2.5%)</span><span>₹{calc.sgst?.toFixed(2)}</span></div>
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
                  <button className="btn btn-xs btn-outline" onClick={() => { setIsMultiPay(!isMultiPay); setAddedPayments([]); }}>
                    {isMultiPay ? 'Switch to Single Mode' : 'Enable Split Payment'}
                  </button>
                </div>

                {!isMultiPay ? (
                  <>
                    <div className="payment-modes">
                      {['CASH', 'CARD', 'UPI'].map(mode => (
                        <button key={mode}
                          className={`payment-mode-btn ${paymentMode === mode ? 'active' : ''}`}
                          onClick={() => setPaymentMode(mode)}>
                          {mode === 'CASH' ? '💵' : mode === 'CARD' ? '💳' : '📱'} {mode}
                        </button>
                      ))}
                    </div>

                    <div className="payment-fields">
                      <label>Discount (₹)</label>
                      <input className="input" type="number" placeholder="0" value={discount}
                        onChange={e => setDiscount(e.target.value)} />

                      {paymentMode === 'CASH' && (
                        <>
                          <label>Amount Received (₹)</label>
                          <input className="input" type="number" placeholder="0" value={amountReceived}
                            onChange={e => setAmountReceived(e.target.value)} />
                          {calc.change > 0 && (
                            <div className="change-display">Change: ₹{calc.change.toFixed(2)}</div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="multi-pay-section animate-fadeIn">
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
                      <select className="input" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
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
                  <button className="btn btn-success btn-lg" onClick={handlePayment}
                    disabled={loading || (isMultiPay && calc.multiPayRemaining > 0)}>
                    {loading ? '⏳ Processing...' : (isMultiPay ? '✅ Settle Bill' : `✅ Pay ₹${calc.total?.toFixed(2)}`)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ORDER HISTORY */}
        {view === 'history' && (
          <div className="history-view animate-fadeIn">
            <h2>Order History</h2>
            <table className="history-table">
              <thead>
                <tr>
                  <th>#</th><th>Table</th><th>Customer</th><th>Type</th>
                  <th>Items</th><th>Total</th><th>Status</th><th>Time</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map(order => (
                  <tr key={order.id} className={`row-${order.status?.toLowerCase()}`}
                    onClick={() => order.status === 'PAID' ? selectForBilling(order) : null}>
                    <td>{order.id}</td>
                    <td>{order.tableNumber}</td>
                    <td>{order.customerName || '—'}</td>
                    <td><span className="type-tag">{order.orderType?.replace('_', ' ')}</span></td>
                    <td>{order.items?.length}</td>
                    <td className="amount-cell">₹{order.totalAmount?.toFixed(2)}</td>
                    <td><span className={`badge badge-${order.status?.toLowerCase()}`}>{order.status}</span></td>
                    <td className="time-cell">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : ''}</td>
                    <td>
                      {order.status === 'PAID' && (
                        <button className="btn btn-xs btn-outline" onClick={(e) => {
                          e.stopPropagation();
                          selectForBilling(order);
                          setTimeout(() => window.print(), 500);
                        }}>Print</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
