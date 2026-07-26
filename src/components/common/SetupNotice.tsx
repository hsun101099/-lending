import { Settings2 } from 'lucide-react'

const STEPS = [
  '到 Firebase Console 建立專案，並新增一個「網頁應用程式」',
  '在「建構 → Authentication」啟用「電子郵件/密碼」登入方式，並建立同仁帳號',
  '在「建構 → Firestore Database」建立資料庫，並貼上專案內 firestore.rules 的規則',
  '把專案設定頁的 firebaseConfig 內容填入 src/services/firebaseConfig.ts',
]

export default function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-card p-8 shadow-card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-warning">
            <Settings2 size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-ink">尚未完成雲端設定</h1>
            <p className="mt-0.5 text-xs text-ink-faint">完成以下設定後，案件資料就會存到雲端並可多人共用</p>
          </div>
        </div>

        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm text-ink-soft">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-ink-soft">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-ink-faint">
          設定完成前，先前存在這台電腦瀏覽器裡的案件資料不會消失，完成設定並登入後系統會詢問是否要一併搬到雲端。
        </p>
      </div>
    </div>
  )
}
