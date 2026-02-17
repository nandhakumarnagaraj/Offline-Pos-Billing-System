import React, { useEffect, useState } from 'react';
import { getPendingSyncs, removePendingSync } from '../db';
import { createOrder, processPayment } from '../service/api';
import { toast } from 'react-hot-toast';

const SyncManager = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    updatePendingCount();

    // Interval sync
    const interval = setInterval(() => {
      if (isOnline && !syncing) {
        syncAllData();
      }
      updatePendingCount();
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline, syncing]);

  const updatePendingCount = async () => {
    const pending = await getPendingSyncs();
    setPendingCount(pending.length);
  };

  const syncAllData = async () => {
    const pending = await getPendingSyncs();
    if (pending.length === 0) return;

    setSyncing(true);
    console.log(`🔄 Syncing ${pending.length} pending actions...`);

    for (const action of pending) {
      try {
        if (action.type === 'CREATE_ORDER') {
          await createOrder(action.data);
        } else if (action.type === 'PROCESS_PAYMENT') {
          await processPayment(action.data);
        }

        await removePendingSync(action.id);
        console.log(`✅ ${action.type} synced successfully.`);
      } catch (err) {
        console.error(`❌ Failed to sync ${action.type}:`, err);
        // If it's a server error but we're online, we might want to stop sync to avoid spamming
        break;
      }
    }

    setSyncing(false);
    if (pending.length > 0) {
      toast.success('Successfully synced offline data to server!', { id: 'sync-success' });
    }
    updatePendingCount();
  };

  if (pendingCount === 0 && isOnline) return null;

  return (
    <div className={`sync-status-bar ${!isOnline ? 'offline' : 'syncing'}`}>
      <div className="sync-info">
        {!isOnline ? (
          <>
            <span className="sync-icon">📡</span>
            <span>Offline Mode: Data saved locally ({pendingCount} pending)</span>
          </>
        ) : (
          <>
            <span className="sync-icon animate-spin">🔄</span>
            <span>Syncing {pendingCount} pending actions to server...</span>
          </>
        )}
      </div>
    </div>
  );
};

export default SyncManager;
