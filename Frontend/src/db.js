import Dexie from 'dexie';

export const db = new Dexie('POS_Offline_DB');

db.version(1).stores({
  offline_orders: '++id, tableNumber, totalAmount, status, createdAt, synced',
  offline_settings: 'key, value'
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
