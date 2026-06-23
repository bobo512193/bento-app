import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { vendorService } from '../../db'
import PageHeader from '../../components/PageHeader'
import ImagePicker from '../../components/ImagePicker'
import Toggle from '../../components/Toggle'

export default function VendorFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [name, setName] = useState('')
  const [headcount, setHeadcount] = useState('')
  const [image_base64, setImage] = useState('')
  const [is_active, setActive] = useState(true)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [nameError, setNameError] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    vendorService.getById(Number(id)).then(vendor => {
      if (!vendor) return
      setName(vendor.name)
      setHeadcount(String(vendor.headcount))
      setImage(vendor.image_base64)
      setActive(vendor.is_active)
    })
  }, [id, isEdit])

  const handleSave = async () => {
    if (!name.trim()) { setNameError(true); return }
    const data = {
      name: name.trim(),
      headcount: Number(headcount) || 0,
      image_base64,
      is_active,
    }
    if (isEdit) {
      await vendorService.update(Number(id), data)
    } else {
      await vendorService.add(data)
    }
    navigate(-1)
  }

  const handleDelete = async () => {
    await vendorService.remove(Number(id))
    navigate('/management/vendors', { replace: true })
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? '編輯廠商' : '新增廠商'}
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
          <label className="text-sm text-gray-600 mb-1 block">廠商名稱 *</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setNameError(false) }}
            placeholder="輸入廠商名稱"
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 ${nameError ? 'border-red-400' : 'border-gray-300'}`}
          />
          {nameError && <p className="text-xs text-red-500 mt-1">請輸入廠商名稱</p>}
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">人數</label>
          <input
            value={headcount}
            onChange={e => setHeadcount(e.target.value)}
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
          />
          <p className="text-xs text-gray-400 mt-1">訂單建立時作為參考人數</p>
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
                刪除廠商
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
            <p className="text-xs text-gray-400 text-center">刪除廠商將同時刪除所有相關人員</p>
          </div>
        )}
      </div>
    </div>
  )
}
