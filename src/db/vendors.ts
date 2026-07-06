import { db, type Vendor } from './db'

export const vendorService = {
  getAll: () => db.vendors.orderBy('name').toArray(),

  getActive: () => db.vendors.orderBy('name').filter(v => v.is_active).toArray(),

  getById: (id: number) => db.vendors.get(id),

  add: (data: Omit<Vendor, 'id'>) =>
    db.vendors.add(data),

  update: (id: number, data: Partial<Omit<Vendor, 'id'>>) =>
    db.vendors.update(id, data),

  remove: async (id: number) => {
    const vendor = await db.vendors.get(id)
    if (vendor && (vendor.balance ?? 0) !== 0) {
      throw new Error('廠商尚有餘額，無法刪除')
    }
    await db.members.where('vendor_id').equals(id).delete()
    await db.vendors.delete(id)
  },

  toggleActive: async (id: number) => {
    const vendor = await db.vendors.get(id)
    if (vendor) await db.vendors.update(id, { is_active: !vendor.is_active })
  },
}
