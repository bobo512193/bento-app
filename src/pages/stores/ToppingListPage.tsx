import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router-dom'
import { toppingService, storeService } from '../../db'
import PageHeader from '../../components/PageHeader'

export default function ToppingListPage() {
  const { id } = useParams()
  const storeId = Number(id)

  const store    = useLiveQuery(() => storeService.getById(storeId), [storeId])
  const toppings = useLiveQuery(() => toppingService.getByStore(storeId), [storeId])

  return (
    <div>
      <PageHeader
        title={`${store?.name ?? ''} 加料管理`}
        showBack
        action={
          <Link
            to={`/management/stores/${id}/toppings/new`}
            className="text-orange-500 text-sm font-medium"
          >
            新增
          </Link>
        }
      />
      <div className="p-4 space-y-3">
        {toppings?.map(topping => (
          <div
            key={topping.id}
            className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800">{topping.name}</div>
              <div className="text-xs text-orange-500 mt-0.5">+NT$ {topping.price}</div>
            </div>
            <Link
              to={`/management/stores/${id}/toppings/${topping.id}/edit`}
              className="text-gray-300 text-xl leading-none px-2"
            >
              ›
            </Link>
          </div>
        ))}
        {toppings?.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">尚無加料，點右上角新增</p>
        )}
      </div>
    </div>
  )
}
