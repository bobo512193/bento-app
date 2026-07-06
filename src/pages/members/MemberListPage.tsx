import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { vendorService, memberService } from '../../db'
import type { Member } from '../../db'
import { balanceService } from '../../db/balance'
import PageHeader from '../../components/PageHeader'

type ModalState = { memberId: number; mode: 'deposit' | 'withdraw' } | null

export default function MemberListPage() {
  const [modal, setModal] = useState<ModalState>(null)
  const [amountInput, setAmountInput] = useState('')

  const data = useLiveQuery(async () => {
    const [vendors, members] = await Promise.all([
      vendorService.getAll(),
      memberService.getAll(),
    ])
    return { vendors, members }
  })

  const membersByVendor = data?.members.reduce<Record<number, Member[]>>((acc, m) => {
    if (!acc[m.vendor_id]) acc[m.vendor_id] = []
    acc[m.vendor_id].push(m)
    return acc
  }, {})

  const openModal = (memberId: number, mode: 'deposit' | 'withdraw') => {
    setAmountInput('')
    setModal({ memberId, mode })
  }

  const handleConfirm = async () => {
    if (!modal) return
    const amount = Number(amountInput)
    if (!amount || amount <= 0) return
    if (modal.mode === 'deposit') {
      await balanceService.deposit('member', modal.memberId, amount)
    } else {
      await balanceService.withdraw('member', modal.memberId, amount)
    }
    setModal(null)
  }

  return (
    <div>
      <PageHeader
        title="人員管理"
        showBack
        action={
          <Link to="/management/members/new" className="text-orange-500 text-sm font-medium">
            新增
          </Link>
        }
      />
      <div className="p-4 space-y-5">
        {data?.vendors.map(vendor => {
          const vendorMembers = membersByVendor?.[vendor.id!] ?? []
          const orderingCount = vendorMembers.filter(m => m.want_order).length
          return (
            <div key={vendor.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">{vendor.name}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {vendorMembers.length} 人
                </span>
                {vendorMembers.length > 0 && (
                  <span className="text-xs text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                    訂餐 {orderingCount} 人
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {vendorMembers.map(member => {
                  const balance = member.balance ?? 0
                  return (
                    <div key={member.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <div className="p-3 flex items-center gap-3">
                        {member.image_base64 ? (
                          <img src={member.image_base64} alt={member.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">👤</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{member.name}</div>
                          {member.phone && <div className="text-xs text-gray-400">{member.phone}</div>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${member.want_order ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                            {member.want_order ? '訂餐' : '不訂'}
                          </span>
                          <Link to={`/management/members/${member.id}/edit`} className="text-gray-300 text-xl leading-none">›</Link>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50">
                        <span className="text-xs text-gray-500">餘額</span>
                        <span className={`text-sm font-semibold flex-1 ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          NT$ {balance}
                        </span>
                        <button
                          onClick={() => openModal(member.id!, 'deposit')}
                          className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 active:bg-green-100"
                        >
                          存錢 +
                        </button>
                        <button
                          onClick={() => openModal(member.id!, 'withdraw')}
                          className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-500 border border-red-200 active:bg-red-100"
                        >
                          提領 −
                        </button>
                      </div>
                    </div>
                  )
                })}
                {vendorMembers.length === 0 && (
                  <p className="text-xs text-gray-400 pl-1">尚無人員</p>
                )}
              </div>
            </div>
          )
        })}
        {data?.vendors.length === 0 && (
          <p className="text-center text-gray-400 py-16 text-sm">請先新增廠商，再新增人員</p>
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
