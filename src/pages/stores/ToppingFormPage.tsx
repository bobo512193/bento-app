import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toppingService } from '../../db'
import PageHeader from '../../components/PageHeader'

export default function ToppingFormPage() {
  const { id, tid } = useParams()
  const navigate = useNavigate()
  const isEdit = !!tid

  const [name,  setName]  = useState('')
  const [price, setPrice] = useState('')
  const [nameError, setNameError] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    toppingService.getById(Number(tid)).then(t => {
      if (!t) return
      setName(t.name)
      setPrice(String(t.price))
    })
  }, [tid, isEdit])

  const handleSave = async () => {
    if (!name.trim()) { setNameError(true); return }
    const data = { store_id: Number(id), name: name.trim(), price: Number(price) || 0 }
    if (isEdit) {
      await toppingService.update(Number(tid), data)
    } else {
      await toppingService.add(data)
    }
    navigate(-1)
  }

  const handleDelete = async () => {
    await toppingService.remove(Number(tid))
    navigate(-1)
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? '編輯加料' : '新增加料'}
        showBack
        action={
          <button onClick={handleSave} className="text-orange-500 text-sm font-medium px-1">
            儲存
          </button>
        }
      />
      <div className="p-4 space-y-4">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">加料名稱 *</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setNameError(false) }}
            placeholder="例如：椰果、珍珠、仙草"
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 ${nameError ? 'border-red-400' : 'border-gray-300'}`}
          />
          {nameError && <p className="text-xs text-red-500 mt-1">請輸入加料名稱</p>}
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">費用 (NT$)</label>
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
                刪除加料
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
