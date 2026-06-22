import { db, type Store } from './db'

export const storeService = {
  getAll: () => db.stores.orderBy('name').toArray(),

  getActive: () => db.stores.where('is_active').equals(1).sortBy('name'),

  getById: (id: number) => db.stores.get(id),

  add: (data: Omit<Store, 'id'>) =>
    db.stores.add(data),

  update: (id: number, data: Partial<Omit<Store, 'id'>>) =>
    db.stores.update(id, data),

  remove: async (id: number) => {
    // 刪除店家時，連同旗下菜單一起刪除
    await db.menus.where('store_id').equals(id).delete()
    await db.stores.delete(id)
  },

  toggleActive: async (id: number) => {
    const store = await db.stores.get(id)
    if (store) await db.stores.update(id, { is_active: !store.is_active })
  },
}
