import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { memberService, vendorService } from '../../db'
import type { Vendor } from '../../db'
import PageHeader from '../../components/PageHeader'
import ImagePicker from '../../components/ImagePicker'
import Toggle from '../../components/Toggle'

export default function MemberFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [vendorId, setVendorId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [image_base64, setImage] = useState('')
  const [want_order, setWantOrder] = useState(true)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [errors, setErrors] = useState<{ name?: boolean; vendor?: boolean }>({})

  useEffect(() => {
    vendorService.getAll().then(setVendors)
  }, [])

  useEffect(() => {
    if (!isEdit) return
    memberService.getById(Number(id)).then(member => {
      if (!member) return
      setVendorId(member.vendor_id)
      setName(member.name)
      setPhone(member.phone)
      setImage(member.image_base64)
      setWantOrder(member.want_order)
    })
  }, [id, isEdit])

  const handleSave = async () => {
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = true
    if (vendorId === '') errs.vendor = true
    if (Object.keys(errs).length) { setErrors(errs); return }

    const data = {
      vendor_id: Number(vendorId),
      name: name.trim(),
      phone,
      image_base64,
      want_order,
    }
    if (isEdit) {
      await memberService.update(Number(id), data)
    } else {
      await memberService.add(data)
    }
    navigate(-1)
  }

  const handleDelete = async () => {
    await memberService.remove(Number(id))
    navigate('/management/members', { replace: true })
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? '編輯人員' : '新增人員'}
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
          <label className="text-sm text-gray-600 mb-1 block">所屬廠商 *</label>
          <select
            value={vendorId}
            onChange={e => { setVendorId(Number(e.target.value)); setErrors(p => ({ ...p, vendor: false })) }}
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 bg-white ${errors.vendor ? 'border-red-400' : 'border-gray-300'}`}
          >
            <option value="">選擇廠商</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          {errors.vendor && <p className="text-xs text-red-500 mt-1">請選擇所屬廠商</p>}
        </div>

        <div>
          <label className="text-sm text-gray-600 mb-1 block">姓名 *</label>
          <input
            value={name}
            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: false })) }}
            placeholder="輸入姓名"
            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">請輸入姓名</p>}
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

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <span className="text-sm text-gray-700">要訂便當</span>
            <p className="text-xs text-gray-400">關閉後不列入訂單建立</p>
          </div>
          <Toggle value={want_order} onChange={setWantOrder} />
        </div>

        {isEdit && (
          <div className="pt-2 border-t border-gray-100 space-y-2">
            {!showConfirmDelete ? (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="w-full py-2.5 text-red-500 text-sm border border-red-200 rounded-lg"
              >
                刪除人員
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
