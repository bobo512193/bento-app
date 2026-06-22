import { db, type Member } from './db'

export const memberService = {
  getAll: () => db.members.orderBy('name').toArray(),

  getByVendor: (vendor_id: number) =>
    db.members.where('vendor_id').equals(vendor_id).sortBy('name'),

  getOrderingByVendor: (vendor_id: number) =>
    db.members
      .where('vendor_id').equals(vendor_id)
      .filter(m => m.want_order)
      .sortBy('name'),

  getById: (id: number) => db.members.get(id),

  add: (data: Omit<Member, 'id'>) =>
    db.members.add(data),

  update: (id: number, data: Partial<Omit<Member, 'id'>>) =>
    db.members.update(id, data),

  remove: (id: number) => db.members.delete(id),

  toggleWantOrder: async (id: number) => {
    const member = await db.members.get(id)
    if (member) await db.members.update(id, { want_order: !member.want_order })
  },
}
