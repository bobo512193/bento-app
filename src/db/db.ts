import Dexie, { type EntityTable } from 'dexie'

// ── 型別定義 ──────────────────────────────────────────────

export interface Store {
  id?: number
  name: string
  phone: string
  address: string
  image_base64: string
  is_active: boolean
}

export interface Menu {
  id?: number
  store_id: number
  name: string
  price: number
  image_base64: string
}

export interface Vendor {
  id?: number
  name: string
  headcount: number
  image_base64: string
  is_active: boolean
}

export interface Member {
  id?: number
  vendor_id: number
  name: string
  phone: string
  image_base64: string
  want_order: boolean
}

export interface Order {
  id?: number
  order_date: string            // 'YYYY-MM-DD'
  status: 'pending' | 'completed'
  completed_at: number | null   // 完成時的 Unix 時間戳（毫秒），用於顯示完成時間
}

export interface OrderItem {
  id?: number
  order_id: number
  store_id: number
  menu_id: number
  vendor_id: number
  member_id: number | null      // null = 廠商未設人員，以廠商為單位
  quantity: number
  unit_price: number
}

export interface OrderPayment {
  id?: number
  order_id: number
  vendor_id: number
  member_id: number | null      // null = 廠商整體付款
  is_paid: boolean
}

// ── Dexie 資料庫 ──────────────────────────────────────────

class BentoDatabase extends Dexie {
  stores!: EntityTable<Store, 'id'>
  menus!: EntityTable<Menu, 'id'>
  vendors!: EntityTable<Vendor, 'id'>
  members!: EntityTable<Member, 'id'>
  orders!: EntityTable<Order, 'id'>
  order_items!: EntityTable<OrderItem, 'id'>
  order_payments!: EntityTable<OrderPayment, 'id'>

  constructor() {
    super('BentoDB')
    this.version(1).stores({
      stores:         '++id, name, is_active',
      menus:          '++id, store_id, name',
      vendors:        '++id, name, is_active',
      members:        '++id, vendor_id, want_order',
      orders:         '++id, order_date, status',
      order_items:    '++id, order_id, store_id, menu_id, vendor_id, member_id',
      order_payments: '++id, order_id, vendor_id, member_id',
    })
  }
}

export const db = new BentoDatabase()
