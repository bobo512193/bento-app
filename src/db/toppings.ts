import { db, type Topping } from './db'

export const toppingService = {
  getByStore: (store_id: number) =>
    db.toppings.where('store_id').equals(store_id).sortBy('name'),

  getById: (id: number) => db.toppings.get(id),

  add: (data: Omit<Topping, 'id'>) => db.toppings.add(data),

  update: (id: number, data: Partial<Omit<Topping, 'id'>>) =>
    db.toppings.update(id, data),

  remove: (id: number) => db.toppings.delete(id),

  removeByStore: (store_id: number) =>
    db.toppings.where('store_id').equals(store_id).delete(),
}
