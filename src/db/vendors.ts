import { db, type Vendor } from './db'

export const vendorService = {
  getAll: () => db.vendors.orderBy('name').toArray(),

  getActive: () => db.vendors.where('is_active').equals(1).sortBy('name'),

  getById: (id: number) => db.vendors.get(id),

  add: (data: Omit<Vendor, 'id'>) =>
    db.vendors.add(data),

  update: (id: number, data: Partial<Omit<Vendor, 'id'>>) =>
    db.vendors.update(id, data),

  remove: async (id: number) => {
    // 刪除廠商時，連同旗下人員一起刪除
    await db.members.where('vendor_id').equals(id).delete()
    await db.vendors.delete(id)
  },

  toggleActive: async (id: number) => {
    const vendor = await db.vendors.get(id)
    if (vendor) await db.vendors.update(id, { is_active: !vendor.is_active })
  },
}
