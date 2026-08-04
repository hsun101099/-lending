import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
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
function toInternalEmail(employeeId: string): string {
  return `u${normalizeEmployeeId(employeeId)}@loan.local`
}

/**
 * Firebase 規定密碼至少 6 個字元，因此在內部補上固定前綴，
 * 讓使用者只需要輸入員編。此前綴不會顯示給使用者。
 */
function toInternalPassword(employeeId: string): string {
  return `loanpin-${normalizeEmployeeId(employeeId)}`
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

/** 把 Firebase 的錯誤代碼轉成使用者看得懂的訊息。 */
export function describeAuthError(error: unknown, context: 'login' | 'register'): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  switch (code) {
    case 'auth/email-already-in-use':
      return '這個員編已經建立過帳號了，請改用「登入」'
    case 'auth/invalid-email':
      return '員編格式不正確，請只輸入英文、數字或連字號'
    case 'auth/weak-password':
      return `員編至少需要 ${MIN_EMPLOYEE_ID_LENGTH} 碼`
    case 'auth/user-disabled':
      return '此帳號已被停用，請聯絡管理者'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return context === 'login' ? '查無這個員編，請確認後再試，或先建立帳號' : '帳號資料有誤，請重新輸入'
    case 'auth/too-many-requests':
      return '嘗試次數過多，請稍後再試'
    case 'auth/network-request-failed':
      return '網路連線失敗，請檢查網路後再試'
    case 'auth/operation-not-allowed':
      return '尚未在 Firebase 啟用「電子郵件/密碼」登入方式'
    default:
      return context === 'login' ? '登入失敗，請稍後再試' : '建立帳號失敗，請稍後再試'
  }
}

export async function loginWithEmployeeId(employeeId: string): Promise<void> {
  const auth = getFirebaseAuth()
  const email = toInternalEmail(employeeId)
  const id = normalizeEmployeeId(employeeId)
  try {
    await signInWithEmailAndPassword(auth, email, toInternalPassword(employeeId))
  } catch (error) {
    // 早期版本直接以輸入的數字本身作為密碼，這裡讓當時建立的帳號仍可登入
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
    const isCredentialError =
      code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
    if (!isCredentialError || id.length < 6) throw error
    await signInWithEmailAndPassword(auth, email, id)
  }
}

export async function registerWithEmployeeId(name: string, employeeId: string): Promise<void> {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    toInternalEmail(employeeId),
    toInternalPassword(employeeId)
  )
  await updateProfile(credential.user, { displayName: name })
}

export async function logout(): Promise<void> {
  await signOut(getFirebaseAuth())
}
