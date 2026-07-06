import { db } from './db'

export const balanceService = {
  deposit: async (target_type: 'vendor' | 'member', target_id: number, amount: number) => {
    const table = target_type === 'vendor' ? db.vendors : db.members
    const record = await table.get(target_id)
    if (!record) return
    await table.update(target_id, { balance: (record.balance ?? 0) + amount })
    await db.balance_logs.add({ target_type, target_id, amount, note: '存錢', created_at: Date.now() })
  },

  withdraw: async (target_type: 'vendor' | 'member', target_id: number, amount: number) => {
    const table = target_type === 'vendor' ? db.vendors : db.members
    const record = await table.get(target_id)
    if (!record) return
    await table.update(target_id, { balance: (record.balance ?? 0) - amount })
    await db.balance_logs.add({ target_type, target_id, amount: -amount, note: '提領', created_at: Date.now() })
  },
}
