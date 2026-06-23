import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { menuService, storeService } from '../../db'
import type { Store } from '../../db'
import PageHeader from '../../components/PageHeader'
import ImagePicker from '../../components/ImagePicker'

export default function MenuFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [storeId, setStoreId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [image_base64, setImage] = useState('')
  const [stores, setStores] = useState<Store[]>([])
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [errors, setErrors] = useState<{ name?: boolean; store?: boolean }>({})

  useEffect(() => {
    storeService.getAll().then(setStores)
  }, [])

  useEffect(() => {
    if (!isEdit) return
    menuService.getById(Number(id)).then(menu => {
      if (!menu) return
      setStoreId(menu.store_id)
      setName(menu.name)
      setPrice(String(menu.price))
      setImage(menu.image_base64)
    })
  }, [id, isEdit])

  const handleSave = async () => {
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = true
    if (storeId === '') errs.store = true
    if (Object.keys(errs).length) { setErrors(errs); return }

    const data = {
      store_id: Number(storeId),
      name: name.trim(),
      price: Number(price) || 0,
      image_base64,
    }
    if (isEdit) {
      await menuService.update(Number(id), data)
    } else {
      await menuService.add(data)
    }
    navigate(-1)
  }

  const handleDelete = async () => {
    await menuService.remove(Number(id))
    navigate('/management/menus', { replace: true })
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? '編輯品項' : '新增品項'}
        showBack
        action={
          <button onClick={handleSave} className="text-orange-500 text-sm font-medium px-1">
            儲存
          </button>
        }
      />
      <div className="p-4 space-y-4">
        <ImagePicker value={image_base64} onChange={setImage} />

        <div>
          <label className="text-sm text-gray-600 mb-1 block">所屬店家 *</label>
          <select
            value={storeId}
            onChange={e => { setStoreId(Number(e.target.value)); setErrors(p => ({ ...p, store: false })) }}
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 bg-white ${errors.store ? 'border-red-400' : 'border-gray-300'}`}
          >
            <option value="">選擇店家</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.store && <p className="text-xs text-red-500 mt-1">請選擇所屬店家</p>}
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">品項名稱 *</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: false })) }}
            placeholder="輸入品項名稱"
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">請輸入品項名稱</p>}
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">價格 (NT$)</label>
          <input
            value={price}
            onChange={e => setPrice(e.target.value)}
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
          />
        </div>

        {isEdit && (
          <div className="pt-2 border-t border-gray-100 space-y-2">
            {!showConfirmDelete ? (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="w-full py-2.5 text-red-500 text-sm border border-red-200 rounded-lg"
              >
                刪除品項
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-2.5 text-gray-500 text-sm border border-gray-200 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 text-white text-sm bg-red-500 rounded-lg"
                >
                  確認刪除
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
