import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { vendorService, memberService } from '../../db'
import { balanceService } from '../../db/balance'
import PageHeader from '../../components/PageHeader'

type ModalState = { vendorId: number; mode: 'deposit' | 'withdraw' } | null

export default function VendorListPage() {
  const [modal, setModal] = useState<ModalState>(null)
  const [amountInput, setAmountInput] = useState('')

  const data = useLiveQuery(async () => {
    const [vendors, members] = await Promise.all([
      vendorService.getAll(),
      memberService.getAll(),
    ])
    const memberCountByVendor: Record<number, number> = {}
    for (const m of members) {
      memberCountByVendor[m.vendor_id] = (memberCountByVendor[m.vendor_id] ?? 0) + 1
    }
    return { vendors, memberCountByVendor }
  })

  const openModal = (vendorId: number, mode: 'deposit' | 'withdraw') => {
    setAmountInput('')
    setModal({ vendorId, mode })
  }

  const handleConfirm = async () => {
    if (!modal) return
    const amount = Number(amountInput)
    if (!amount || amount <= 0) return
    if (modal.mode === 'deposit') {
      await balanceService.deposit('vendor', modal.vendorId, amount)
    } else {
      await balanceService.withdraw('vendor', modal.vendorId, amount)
    }
    setModal(null)
  }

  return (
    <div>
      <PageHeader
        title="廠商管理"
        showBack
        action={
          <Link to="/management/vendors/new" className="text-orange-500 text-sm font-medium">
            新增
          </Link>
        }
      />
      <div className="p-4 space-y-3">
        {data?.vendors.map(vendor => {
          const hasMembers = (data.memberCountByVendor[vendor.id!] ?? 0) > 0
          const balance = vendor.balance ?? 0
          return (
            <div key={vendor.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                {vendor.image_base64 ? (
                  <img src={vendor.image_base64} alt={vendor.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl shrink-0">🏭</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">{vendor.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{vendor.headcount} 人</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${vendor.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {vendor.is_active ? '啟用' : '停用'}
                  </span>
                  <Link to={`/management/vendors/${vendor.id}/edit`} className="text-gray-300 text-xl leading-none">›</Link>
                </div>
              </div>
              {!hasMembers && (
                <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                  <span className="text-xs text-gray-500">餘額</span>
                  <span className={`text-sm font-semibold flex-1 ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    NT$ {balance}
                  </span>
                  <button
                    onClick={() => openModal(vendor.id!, 'deposit')}
                    className="text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-600 border border-green-200 active:bg-green-100"
                  >
                    存錢 +
                  </button>
                  <button
                    onClick={() => openModal(vendor.id!, 'withdraw')}
                    className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-500 border border-red-200 active:bg-red-100"
                  >
                    提領 −
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {data?.vendors.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">尚無廠商，點右上角新增</p>
        )}
      </div>

      {/* 存錢／提領 Modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-gray-800">
              {modal.mode === 'deposit' ? '存錢 +' : '提領 −'}
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">金額 (NT$)</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                placeholder="輸入金額"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 text-gray-500 text-sm border border-gray-200 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={!Number(amountInput) || Number(amountInput) <= 0}
                className={`flex-1 py-2.5 text-white text-sm font-medium rounded-lg disabled:opacity-40 ${
                  modal.mode === 'deposit' ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
