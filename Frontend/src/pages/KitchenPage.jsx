import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getKitchenOrders, updateOrderStatus, extendOrderTime } from '../service/api';
import { connectWebSocket } from '../service/ws';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import './KitchenPage.css';

function KitchenPage() {
  const { logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);

  const mutedRef = useRef(muted);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    loadOrders();
    const stompClient = connectWebSocket((order) => {
      setOrders(prev => {
        const idx = prev.findIndex(o => o.id === order.id);
        if (order.status === 'PAID' || order.status === 'CANCELLED' || order.status === 'SERVED') {
          return prev.filter(o => o.id !== order.id);
        }
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = order;
          return updated;
        }
        // New order
        if (!mutedRef.current) {
          // Speak notification
          const msg = new SpeechSynthesisUtterance(`New order for ${order.tableNumber || 'Takeaway'}`);
          window.speechSynthesis.speak(msg);

          if (audioRef.current) {
            audioRef.current.play().catch(() => { });
          }
        }
        return [order, ...prev];
      });
    });
    return () => { if (stompClient) stompClient.deactivate(); };
  }, []);

  const loadOrders = async () => {
    try {
      const res = await getKitchenOrders();
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load kitchen orders:', err);
    }
  };

  const changeStatus = async (id, newStatus) => {
    try {
      await updateOrderStatus(id, newStatus);
      // Let WS handle the update if possible, but local update is faster for UI
      setOrders(prev => prev.map(o =>
        o.id === id ? { ...o, status: newStatus } : o
      ));
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleExtendTime = async (id, minutes) => {
    try {
      const res = await extendOrderTime(id, minutes);
      setOrders(prev => prev.map(o => o.id === id ? res.data : o));
    } catch (err) {
      console.error('Failed to extend time:', err);
    }
  };

  const KDSTimer = ({ order }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [urgency, setUrgency] = useState('on-time');

    useEffect(() => {
      const calculate = () => {
        if (!order.estimatedReadyTime) return;
        const now = new Date();
        const target = new Date(order.estimatedReadyTime);
        const diffMs = target - now;
        const diffMins = Math.floor(diffMs / 60000);
        const diffSecs = Math.floor((diffMs % 60000) / 1000);

        if (diffMs < 0) {
          setUrgency('overdue');
          setTimeLeft(`LATE ${Math.abs(diffMins)}m`);
        } else {
          if (diffMins < 3) setUrgency('warning');
          else setUrgency('on-time');
          setTimeLeft(`${diffMins}:${diffSecs.toString().padStart(2, '0')}`);
        }
      };

      calculate();
      const timer = setInterval(calculate, 1000);
      return () => clearInterval(timer);
    }, [order.estimatedReadyTime]);

    return (
      <div className={`kds-timer timer-${urgency}`}>
        {timeLeft || '---'}
      </div>
    );
  };

  const newOrders = orders.filter(o => o.status === 'NEW');
  const cookingOrders = orders.filter(o => o.status === 'COOKING');
  const readyOrders = orders.filter(o => o.status === 'READY');

  return (
    <div className="kitchen-page">
      {/* Hidden audio for notification */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkZqTi3x0dHt/goODg4OCgYGBgoKCgoKBgYGBgoKCgYGBgYGBgYGCgoKCgoKCgoGBgQ==" type="audio/wav" />
      </audio>

      <header className="kds-header">
        <div className="kds-header-left">
          <Link to="/" className="back-btn">←</Link>
          <h1>👨‍🍳 Kitchen Display</h1>
        </div>
        <div className="kds-stats">
          <div className="kds-stat">
            <span className="stat-num stat-new">{newOrders.length}</span>
            <span className="stat-label">New</span>
          </div>
          <div className="kds-stat">
            <span className="stat-num stat-cooking">{cookingOrders.length}</span>
            <span className="stat-label">Cooking</span>
          </div>
          <div className="kds-stat">
            <span className="stat-num stat-ready">{readyOrders.length}</span>
            <span className="stat-label">Ready</span>
          </div>
        </div>
        <div className="kds-controls">
          <button className={`btn btn-sm ${muted ? 'btn-danger' : 'btn-success'}`}
            onClick={() => setMuted(!muted)}>
            {muted ? '🔇 Muted' : '🔊 Sound On'}
          </button>
          <button className="btn btn-sm btn-outline" onClick={loadOrders} style={{ marginRight: '8px' }}>↻ Refresh</button>
          <button className="btn btn-outline btn-sm" onClick={logout}>Sign Out</button>
        </div>
      </header>

      <div className="kds-body">
        {/* NEW ORDERS */}
        <div className="kds-column">
          <div className="column-header col-new">
            <span className="col-dot new-dot"></span>
            NEW ({newOrders.length})
          </div>
          <div className="column-cards">
            {newOrders.map(order => (
              <div key={order.id} className="kds-card card-new animate-slideUp">
                <div className="kds-card-top">
                  <div className="kds-order-id">{order.id}</div>
                  <div className="kds-table">{order.tableNumber}</div>
                  <KDSTimer order={order} />
                </div>
                <div className="kds-items">
                  {order.items?.map(item => (
                    <div key={item.id} className={`kds-item ${item.status === 'SERVED' || item.status === 'READY' ? 'item-done' : ''}`}>
                      <span className="kds-qty">{item.quantity}x</span>
                      <span className="kds-item-name">
                        {item.menuItem?.name || 'Unknown'}
                        {item.status && item.status !== 'NEW' && <span className={`kds-item-status status-${item.status.toLowerCase()}`}>{item.status}</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="extend-time-controls">
                  <button className="btn btn-extend" onClick={() => handleExtendTime(order.id, 10)}>+10m</button>
                  <button className="btn btn-extend" onClick={() => handleExtendTime(order.id, 20)}>+20m</button>
                  <button className="btn btn-extend" onClick={() => handleExtendTime(order.id, 30)}>+30m</button>
                </div>
                <button className="btn btn-warning btn-block mt-2"
                  onClick={() => changeStatus(order.id, 'COOKING')}>
                  🔥 Start Cooking
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* COOKING */}
        <div className="kds-column">
          <div className="column-header col-cooking">
            <span className="col-dot cooking-dot"></span>
            COOKING ({cookingOrders.length})
          </div>
          <div className="column-cards">
            {cookingOrders.map(order => (
              <div key={order.id} className="kds-card card-cooking">
                <div className="kds-card-top">
                  <div className="kds-order-id">{order.id}</div>
                  <div className="kds-table">{order.tableNumber}</div>
                  <KDSTimer order={order} />
                </div>
                <div className="kds-items">
                  {order.items?.map(item => (
                    <div key={item.id} className="kds-item">
                      <span className="kds-qty">{item.quantity}x</span>
                      <span className="kds-item-name">{item.menuItem?.name || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
                <div className="extend-time-controls">
                  <button className="btn btn-extend" onClick={() => handleExtendTime(order.id, 10)}>+10m</button>
                  <button className="btn btn-extend" onClick={() => handleExtendTime(order.id, 20)}>+20m</button>
                  <button className="btn btn-extend" onClick={() => handleExtendTime(order.id, 30)}>+30m</button>
                </div>
                <button className="btn btn-success btn-block mt-2"
                  onClick={() => changeStatus(order.id, 'READY')}>
                  ✅ Mark Ready
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* READY */}
        <div className="kds-column">
          <div className="column-header col-ready">
            <span className="col-dot ready-dot"></span>
            READY ({readyOrders.length})
          </div>
          <div className="column-cards">
            {readyOrders.map(order => (
              <div key={order.id} className="kds-card card-ready">
                <div className="kds-card-top">
                  <div className="kds-order-id">{order.id}</div>
                  <div className="kds-table">{order.tableNumber}</div>
                  <KDSTimer order={order} />
                </div>
                <div className="kds-items">
                  {order.items?.map(item => (
                    <div key={item.id} className="kds-item">
                      <span className="kds-qty">{item.quantity}x</span>
                      <span className="kds-item-name">{item.menuItem?.name || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary btn-block"
                  onClick={() => changeStatus(order.id, 'SERVED')}>
                  🍽️ Mark Served
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default KitchenPage;
