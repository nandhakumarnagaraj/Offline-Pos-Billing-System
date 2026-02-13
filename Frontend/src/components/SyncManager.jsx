import React, { useEffect, useState } from 'react';
import { getUnsyncedOrders, markOrderSynced } from '../db';
import { createOrder } from '../service/api';

const SyncManager = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    updateUnsyncedCount();

    // Interval sync
    const interval = setInterval(() => {
      if (isOnline && !syncing) {
        syncOrders();
      }
      updateUnsyncedCount();
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline, syncing]);

  const updateUnsyncedCount = async () => {
    const orders = await getUnsyncedOrders();
    setUnsyncedCount(orders.length);
  };

  const syncOrders = async () => {
    const orders = await getUnsyncedOrders();
    if (orders.length === 0) return;

    setSyncing(true);
    console.log(`🔄 Syncing ${orders.length} offline orders...`);

    for (const offlineOrder of orders) {
      try {
        // Remove the internal DB fields before sending to API
        const { id, synced, createdAt, ...orderData } = offlineOrder;

        await createOrder(orderData);
        await markOrderSynced(offlineOrder.id);
        console.log(`✅ Order #${offlineOrder.id} synced successfully.`);
      } catch (err) {
        console.error(`❌ Failed to sync order #${offlineOrder.id}:`, err);
        // If it's a server error but we're online, we might want to stop sync to avoid spamming
        break;
      }
    }

    setSyncing(false);
    updateUnsyncedCount();
  };

  if (unsyncedCount === 0 && isOnline) return null;

  return (
    <div className={`sync-status-bar ${!isOnline ? 'offline' : 'syncing'}`}>
      <div className="sync-info">
        {!isOnline ? (
          <>
            <span className="sync-icon">📡</span>
            <span>Offline Mode: Orders are being saved locally ({unsyncedCount} pending)</span>
          </>
        ) : (
          <>
            <span className="sync-icon animate-spin">🔄</span>
            <span>Syncing {unsyncedCount} pending orders to server...</span>
          </>
        )}
      </div>
    </div>
  );
};

export default SyncManager;
