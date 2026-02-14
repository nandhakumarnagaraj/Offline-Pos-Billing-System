import Dexie from 'dexie';

export const db = new Dexie('POS_Offline_DB');

db.version(2).stores({
  offline_orders: '++id, tableNumber, totalAmount, status, createdAt, synced',
  offline_settings: 'key, value',
  pending_syncs: '++id, type, data, createdAt'
});

export const saveOfflineOrder = async (order) => {
  return await db.offline_orders.add({
    ...order,
    createdAt: new Date().toISOString(),
    synced: 0
  });
};

export const getUnsyncedOrders = async () => {
  return await db.offline_orders.where('synced').equals(0).toArray();
};

export const markOrderSynced = async (id) => {
  return await db.offline_orders.update(id, { synced: 1 });
};

// Generic Sync Handling
export const addPendingSync = async (type, data) => {
  return await db.pending_syncs.add({
    type,
    data,
    createdAt: new Date().toISOString()
  });
};

export const getPendingSyncs = async () => {
  return await db.pending_syncs.toArray();
};

export const removePendingSync = async (id) => {
  return await db.pending_syncs.delete(id);
};
