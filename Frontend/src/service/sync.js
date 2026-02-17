import { createOrder, processPayment } from './api';
import { getPendingSyncs, removePendingSync } from '../db';

let isSyncing = false;

export const startSyncService = () => {
  console.log('📡 Offline Sync Service Started');

  // Listen for online events
  window.addEventListener('online', () => {
    console.log('🌐 Back online! Starting sync...');
    syncData();
  });

  // Periodically check if online and sync
  setInterval(() => {
    if (navigator.onLine) {
      syncData();
    }
  }, 30000); // Every 30 seconds

  // Initial sync attempt
  if (navigator.onLine) {
    syncData();
  }
};

export const syncData = async () => {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  const pending = await getPendingSyncs();
  if (pending.length === 0) return;

  isSyncing = true;
  console.log(`🔄 Syncing ${pending.length} pending actions...`);

  for (const action of pending) {
    try {
      if (action.type === 'CREATE_ORDER') {
        await createOrder(action.data);
        console.log(`✅ Order synced:`, action.data);
      } else if (action.type === 'PROCESS_PAYMENT') {
        await processPayment(action.data);
        console.log(`✅ Payment synced:`, action.data);
      }

      // Remove from offline DB after successful sync
      await removePendingSync(action.id);
    } catch (err) {
      console.error(`❌ Failed to sync action ${action.id}:`, err);
      // If server returns error, we might want to stop or continue
      // For now, we continue but keep the item in DB
      break;
    }
  }

  isSyncing = false;
};
