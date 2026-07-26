import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { getFirebaseAuth } from '../services/firebase'
import { isFirebaseConfigured } from '../services/firebaseConfig'

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

/** 把 Firebase 的錯誤代碼轉成使用者看得懂的訊息。 */
export function describeAuthError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  switch (code) {
    case 'auth/invalid-email':
      return '電子郵件格式不正確'
    case 'auth/user-disabled':
      return '此帳號已被停用，請聯絡系統管理者'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '帳號或密碼錯誤'
    case 'auth/too-many-requests':
      return '嘗試次數過多，請稍後再試'
    case 'auth/network-request-failed':
      return '網路連線失敗，請檢查網路後再試'
    default:
      return '登入失敗，請稍後再試'
  }
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export async function logout(): Promise<void> {
  await signOut(getFirebaseAuth())
}
