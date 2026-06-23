import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { storeService } from '../../db'
import PageHeader from '../../components/PageHeader'
import ImagePicker from '../../components/ImagePicker'
import Toggle from '../../components/Toggle'

export default function StoreFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [image_base64, setImage] = useState('')
  const [is_active, setActive] = useState(true)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [nameError, setNameError] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    storeService.getById(Number(id)).then(store => {
      if (!store) return
      setName(store.name)
      setPhone(store.phone)
      setAddress(store.address)
      setImage(store.image_base64)
      setActive(store.is_active)
    })
  }, [id, isEdit])

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(true)
      return
    }
    const data = { name: name.trim(), phone, address, image_base64, is_active }
    if (isEdit) {
      await storeService.update(Number(id), data)
    } else {
      await storeService.add(data)
    }
    navigate(-1)
  }

  const handleDelete = async () => {
    await storeService.remove(Number(id))
    navigate('/management/stores', { replace: true })
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? '編輯店家' : '新增店家'}
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
          <label className="text-sm text-gray-600 mb-1 block">店家名稱 *</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setNameError(false) }}
            placeholder="輸入店家名稱"
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 ${nameError ? 'border-red-400' : 'border-gray-300'}`}
          />
          {nameError && <p className="text-xs text-red-500 mt-1">請輸入店家名稱</p>}
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">電話</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            type="tel"
            placeholder="輸入電話"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">地址</label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="輸入地址"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
          />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <span className="text-sm text-gray-700">啟用狀態</span>
          <Toggle value={is_active} onChange={setActive} />
        </div>

        {isEdit && (
          <div className="pt-2 border-t border-gray-100 space-y-2">
            {!showConfirmDelete ? (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="w-full py-2.5 text-red-500 text-sm border border-red-200 rounded-lg"
              >
                刪除店家
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
            <p className="text-xs text-gray-400 text-center">刪除店家將同時刪除所有相關菜單</p>
          </div>
        )}
      </div>
    </div>
  )
}
