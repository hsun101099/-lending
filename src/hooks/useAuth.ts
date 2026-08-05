import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth } from '../services/firebase'
import { isFirebaseConfigured } from '../services/firebaseConfig'

/** 員編至少需要的長度。 */
export const MIN_EMPLOYEE_ID_LENGTH = 3

/**
 * 把使用者輸入的員編整理成一致的形式。
 *
 * 大小寫不同、前後有空白，都應該視為同一個人，
 * 因此一律去掉空白並轉成小寫再送給 Firebase。
 * 純數字的員編轉換後與輸入相同，先前建立的帳號不受影響。
 */
export function normalizeEmployeeId(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toLowerCase()
}

/**
 * 系統以「員編」作為登入識別。
 *
 * Firebase Authentication 僅提供帳號密碼登入，因此把員編轉成內部專用的
 * 信箱格式送給 Firebase；使用者不需要、也不會看到這個信箱。
 * 這同時讓 Firebase 的信箱唯一性替我們確保「同一個員編不會被兩個人使用」。
 */
/**
 * 忘記密碼時無法寄送重設信（內部信箱不是真的信箱），因此改為
 * 用同一個員編再開一組新的內部帳號，並以「第幾代」區分。
 * 登入時會依序嘗試，所以使用者完全感覺不到這件事。
 */
export const MAX_ACCOUNT_GENERATION = 3

function toInternalEmail(employeeId: string, generation = 1): string {
  const id = normalizeEmployeeId(employeeId)
  return generation <= 1 ? `u${id}@loan.local` : `u${id}.g${generation}@loan.local`
}

/** 密碼最少需要的長度。密碼是選填的，設定了才會檢查。 */
export const MIN_PASSWORD_LENGTH = 4

/**
 * 決定真正拿去驗證的那串字。
 *
 * 密碼是選填的：有設定密碼就用密碼，沒有設定就沿用員編本身，
 * 這樣先前只用員編（或只用一組數字）建立的帳號完全不受影響。
 */
export function resolveSecret(employeeId: string, password: string): string {
  const pw = password.trim()
  return pw || normalizeEmployeeId(employeeId)
}

/**
 * Firebase 規定密碼至少 6 個字元，因此在內部補上固定前綴，
 * 讓使用者可以自由設定較短的密碼。此前綴不會顯示給使用者。
 */
function toInternalPassword(secret: string): string {
  return `loanpin-${secret}`
}

function isCredentialError(error: unknown): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  return code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
}

export interface AuthState {
  user: User | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isFirebaseConfigured)

  useEffect(() => {
    if (!isFirebaseConfigured) return
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setUser(next)
      setLoading(false)
    })
  }, [])

  return { user, loading }
}

export function validateEmployeeId(raw: string): string {
  const id = normalizeEmployeeId(raw)
  if (!id) return '請輸入員編'
  // 內部信箱格式只接受英數與連字號
  if (!/^[a-z0-9-]+$/.test(id)) return '員編只能輸入英文、數字或連字號'
  if (id.length < MIN_EMPLOYEE_ID_LENGTH) return `員編至少需要 ${MIN_EMPLOYEE_ID_LENGTH} 碼`
  return ''
}

/**
 * 檢查密碼。
 *
 * 建立新帳號時一定要設密碼；登入時則允許留空，
 * 因為先前建立的帳號本來就沒有密碼，不能把他們鎖在門外。
 */
export function validatePassword(password: string, required = false): string {
  const pw = password.trim()
  if (!pw) return required ? '請設定密碼' : ''
  if (pw.length < MIN_PASSWORD_LENGTH) return `密碼至少需要 ${MIN_PASSWORD_LENGTH} 個字`
  return ''
}

/** 把 Firebase 的錯誤代碼轉成使用者看得懂的訊息。 */
export function describeAuthError(error: unknown, context: 'login' | 'register' | 'password' | 'reset'): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  switch (code) {
    case 'auth/email-already-in-use':
      return context === 'reset'
        ? '這個員編重設次數已達上限，請聯絡管理者'
        : '這個員編已經建立過帳號了，請改用「登入」；忘記密碼請點下方的「忘記密碼」'
    case 'auth/invalid-email':
      return '員編格式不正確，請只輸入英文、數字或連字號'
    case 'auth/weak-password':
      return `密碼至少需要 ${MIN_PASSWORD_LENGTH} 個字`
    case 'auth/user-disabled':
      return '此帳號已被停用，請聯絡管理者'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return context === 'login'
        ? '員編或密碼不正確。若還沒設定密碼，密碼欄請留空'
        : '帳號資料有誤，請重新輸入'
    case 'auth/requires-recent-login':
      return '為了安全起見，請先登出再重新登入，然後再設定密碼'
    case 'auth/too-many-requests':
      return '嘗試次數過多，請稍後再試'
    case 'auth/network-request-failed':
      return '網路連線失敗，請檢查網路後再試'
    case 'auth/operation-not-allowed':
      return '尚未在 Firebase 啟用「電子郵件/密碼」登入方式'
    default:
      if (context === 'login') return '登入失敗，請稍後再試'
      if (context === 'register') return '建立帳號失敗，請稍後再試'
      return context === 'reset' ? '重設密碼失敗，請稍後再試' : '設定密碼失敗，請稍後再試'
  }
}

export async function loginWithEmployeeId(employeeId: string, password = ''): Promise<void> {
  const auth = getFirebaseAuth()
  const id = normalizeEmployeeId(employeeId)
  const secret = resolveSecret(employeeId, password)
  let lastError: unknown = null

  // 重設過密碼的人帳號會在較新的一代，因此逐代嘗試
  for (let generation = 1; generation <= MAX_ACCOUNT_GENERATION; generation++) {
    try {
      await signInWithEmailAndPassword(auth, toInternalEmail(id, generation), toInternalPassword(secret))
      return
    } catch (error) {
      if (!isCredentialError(error)) throw error
      lastError = error
    }
  }

  // 早期版本直接以輸入的數字本身作為密碼，這裡讓當時建立的帳號仍可登入
  if (!password.trim() && id.length >= 6) {
    await signInWithEmailAndPassword(auth, toInternalEmail(id), id)
    return
  }
  throw lastError
}

export async function registerWithEmployeeId(
  name: string,
  employeeId: string,
  password = ''
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    toInternalEmail(employeeId),
    toInternalPassword(resolveSecret(employeeId, password))
  )
  await updateProfile(credential.user, { displayName: name })
  return credential.user
}

/**
 * 忘記密碼：以同一個員編開一組新的內部帳號並設定新密碼。
 *
 * 內部信箱不是真的信箱，寄不了重設信，因此改用「單位註冊碼」驗證身分——
 * 呼叫端建立帳號後必須立刻用註冊碼加入名冊，註冊碼不對就把帳號收回。
 *
 * 注意：舊的那一代帳號仍留在 Firebase，知道舊密碼的人還是進得去。
 * 前端無法刪除別的帳號，真要停用得由管理者到 Firebase Console 刪除，
 * 因此畫面上不宣稱「舊密碼會失效」。
 */
export async function resetPasswordWithNewAccount(
  name: string,
  employeeId: string,
  newPassword: string
): Promise<User> {
  const auth = getFirebaseAuth()
  const id = normalizeEmployeeId(employeeId)
  let lastError: unknown = null

  for (let generation = 2; generation <= MAX_ACCOUNT_GENERATION; generation++) {
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        toInternalEmail(id, generation),
        toInternalPassword(resolveSecret(id, newPassword))
      )
      await updateProfile(credential.user, { displayName: name })
      return credential.user
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
      if (code !== 'auth/email-already-in-use') throw error
      lastError = error
    }
  }
  throw lastError
}

/** 註冊碼不對時把剛建立的帳號收回，避免留下一堆進不去的空帳號。 */
export async function discardCurrentAccount(): Promise<void> {
  const user = getFirebaseAuth().currentUser
  if (user) await deleteUser(user)
}

/**
 * 從登入中的帳號取回員編。
 * 內部信箱格式為 u{員編}@loan.local；重設過密碼的帳號會多一段 .g2，要一併去掉。
 */
export function getEmployeeId(user: User | null): string {
  const email = user?.email ?? ''
  const match = /^u(.+?)(?:\.g\d+)?@loan\.local$/.exec(email)
  return match ? match[1] : ''
}

/**
 * 設定或更改密碼。傳入空字串代表取消密碼，之後只用員編登入。
 * Firebase 要求近期登入過才允許更改密碼，太久沒登入會要求重新登入。
 */
export async function changePassword(newPassword: string): Promise<void> {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  if (!user) throw new Error('尚未登入')
  const secret = resolveSecret(getEmployeeId(user), newPassword)
  await updatePassword(user, toInternalPassword(secret))
}

export async function logout(): Promise<void> {
  await signOut(getFirebaseAuth())
}
