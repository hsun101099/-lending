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

/** 使用者需輸入的最少位數。 */
export const MIN_PIN_LENGTH = 4

/**
 * 系統以「一組數字」作為帳號密碼。
 *
 * Firebase Authentication 僅提供帳號密碼登入，因此把數字轉成內部專用的
 * 信箱格式送給 Firebase；使用者不需要、也不會看到這個信箱。
 * 這同時讓 Firebase 的信箱唯一性替我們確保「同一組數字不會被兩個人使用」。
 */
function pinToInternalEmail(pin: string): string {
  return `u${pin}@loan.local`
}

/**
 * Firebase 規定密碼至少 6 個字元，因此在內部補上固定前綴，
 * 讓使用者只需要輸入 4 位數字。此前綴不會顯示給使用者。
 */
function pinToInternalPassword(pin: string): string {
  return `loanpin-${pin}`
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

export function validatePin(pin: string): string {
  if (!/^\d+$/.test(pin)) return '密碼請只輸入數字'
  if (pin.length < MIN_PIN_LENGTH) return `密碼至少需要 ${MIN_PIN_LENGTH} 位數字`
  return ''
}

/** 把 Firebase 的錯誤代碼轉成使用者看得懂的訊息。 */
export function describeAuthError(error: unknown, context: 'login' | 'register'): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  switch (code) {
    case 'auth/email-already-in-use':
      return '這組數字已經有人使用了，請換一組'
    case 'auth/weak-password':
      return `密碼至少需要 ${MIN_PIN_LENGTH} 位數字`
    case 'auth/user-disabled':
      return '此帳號已被停用，請聯絡管理者'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return context === 'login' ? '查無這組數字，請確認後再試，或先建立帳號' : '帳號資料有誤，請重新輸入'
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

export async function loginWithPin(pin: string): Promise<void> {
  const auth = getFirebaseAuth()
  const email = pinToInternalEmail(pin)
  try {
    await signInWithEmailAndPassword(auth, email, pinToInternalPassword(pin))
  } catch (error) {
    // 早期版本直接以數字本身作為密碼，這裡讓當時建立的帳號仍可登入
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
    const isCredentialError =
      code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
    if (!isCredentialError || pin.length < 6) throw error
    await signInWithEmailAndPassword(auth, email, pin)
  }
}

export async function registerWithPin(name: string, pin: string): Promise<void> {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    pinToInternalEmail(pin),
    pinToInternalPassword(pin)
  )
  await updateProfile(credential.user, { displayName: name })
}

export async function logout(): Promise<void> {
  await signOut(getFirebaseAuth())
}
