import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, vendorService, memberService } from '../../db'
import PageHeader from '../../components/PageHeader'

function formatDate(ts: number) {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function WalletLogPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const isVendor = type === 'vendor'
  const numId = Number(id)

  const data = useLiveQuery(async () => {
    const [entity, allLogs] = await Promise.all([
      isVendor ? vendorService.getById(numId) : memberService.getById(numId),
      db.balance_logs
        .where('target_id').equals(numId)
        .filter(l => l.target_type === (isVendor ? 'vendor' : 'member'))
        .toArray(),
    ])
    allLogs.sort((a, b) => b.created_at - a.created_at)
    return { entity, logs: allLogs }
  }, [type, numId])

  const name = data?.entity?.name ?? ''
  const balance = data?.entity?.balance ?? 0

  return (
    <div>
      <PageHeader title={`${name} 記錄`} showBack />
      <div className="p-4 space-y-3">

        {/* 目前餘額 */}
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 text-center">
          <p className="text-xs text-gray-400 mb-1">目前餘額</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            NT$ {balance.toLocaleString()}
          </p>
        </div>

        {/* 記錄列表 */}
        <div className="space-y-2">
          {data?.logs.map(log => (
            <div key={log.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800">{log.note}</div>
                <div className="text-xs text-gray-400 mt-0.5">{formatDate(log.created_at)}</div>
              </div>
              <span className={`text-sm font-semibold shrink-0 ${log.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {log.amount >= 0 ? '+' : ''}{log.amount.toLocaleString()}
              </span>
            </div>
          ))}
          {data?.logs.length === 0 && (
            <p className="text-center text-gray-400 py-16 text-sm">尚無記錄</p>
          )}
        </div>
      </div>
    </div>
  )
}
