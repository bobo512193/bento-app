import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { storeService, menuService } from '../../db'
import type { Menu } from '../../db'
import PageHeader from '../../components/PageHeader'

export default function MenuListPage() {
  const data = useLiveQuery(async () => {
    const [stores, menus] = await Promise.all([
      storeService.getAll(),
      menuService.getAll(),
    ])
    return { stores, menus }
  })

  const menusByStore = data?.menus.reduce<Record<number, Menu[]>>((acc, menu) => {
    const key = menu.store_id
    if (!acc[key]) acc[key] = []
    acc[key].push(menu)
    return acc
  }, {})

  return (
    <div>
      <PageHeader
        title="菜單管理"
        showBack
        action={
          <Link to="/management/menus/new" className="text-orange-500 text-sm font-medium">
            新增
          </Link>
        }
      />
      <div className="p-4 space-y-5">
        {data?.stores.map(store => {
          const storeMenus = menusByStore?.[store.id!] ?? []
          return (
            <div key={store.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">{store.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {storeMenus.length} 項
                </span>
              </div>
              <div className="space-y-2">
                {storeMenus.map(menu => (
                  <div
                    key={menu.id}
                    className="bg-white rounded-xl p-3 border border-gray-100 flex items-center gap-3"
                  >
                    {menu.image_base64 ? (
                      <img src={menu.image_base64} alt={menu.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">🍱</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{menu.name}</div>
                      <div className="text-xs text-orange-500">NT$ {menu.price}</div>
                    </div>
                    <Link to={`/management/menus/${menu.id}/edit`} className="text-gray-300 text-xl leading-none shrink-0">›</Link>
                  </div>
                ))}
                {storeMenus.length === 0 && (
                  <p className="text-xs text-gray-400 pl-1">尚無品項</p>
                )}
              </div>
            </div>
          )
        })}
        {data?.stores.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">請先新增店家，再新增菜單</p>
        )}
      </div>
    </div>
  )
}
