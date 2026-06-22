import { db, type Menu } from './db'

export const menuService = {
  getAll: () => db.menus.orderBy('name').toArray(),

  getByStore: (store_id: number) =>
    db.menus.where('store_id').equals(store_id).sortBy('name'),

  getById: (id: number) => db.menus.get(id),

  add: (data: Omit<Menu, 'id'>) =>
    db.menus.add(data),

  update: (id: number, data: Partial<Omit<Menu, 'id'>>) =>
    db.menus.update(id, data),

  remove: (id: number) => db.menus.delete(id),
}
