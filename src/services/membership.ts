import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { getDb } from './firebase'

const MEMBERS = 'members'
const CONFIG = 'config'
const REGISTRATION = 'registration'

/**
 * 誰可以看到案件資料，由 members 名冊決定。
 *
 * 網址是公開的，任何人都能在 Firebase 建立帳號，這一步擋不住；
 * 但要把自己寫進 members 名冊必須附上正確的單位註冊碼，
 * 而規則規定「不在名冊裡就讀不到任何案件」，門檻因此擋在資料庫端，
 * 不是只擋在畫面上。
 */
export type MembershipStatus =
  /** 已在名冊中，可以正常使用 */
  | 'member'
  /** 尚未加入，需要輸入單位註冊碼 */
  | 'needsCode'
  /** 新版安全性規則尚未發布，暫時比照舊版放行 */
  | 'rulesNotReady'

function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
}

/**
 * 持續追蹤自己是否已在名冊中。回傳取消訂閱的函式。
 *
 * 用訂閱而不是讀一次：建立帳號時是「先開帳號、再寫入名冊」，
 * 讀一次的話會在名冊還沒寫好的瞬間判定為未加入，
 * 於是剛剛才輸入過註冊碼的人又被問一次。
 */
export function watchMembership(uid: string, onStatus: (status: MembershipStatus) => void): () => void {
  return onSnapshot(
    doc(getDb(), MEMBERS, uid),
    (snap) => onStatus(snap.exists() ? 'member' : 'needsCode'),
    // 讀自己的名冊資料被拒絕，代表新規則還沒發布（舊規則沒有這個路徑）
    () => onStatus('rulesNotReady')
  )
}

export async function checkMembership(uid: string): Promise<MembershipStatus> {
  try {
    const snap = await getDoc(doc(getDb(), MEMBERS, uid))
    return snap.exists() ? 'member' : 'needsCode'
  } catch {
    // 讀自己的名冊資料被拒絕，代表新規則還沒發布（舊規則沒有這個路徑）。
    // 此時沿用舊行為讓大家照常使用，真正的把關等規則發布後由資料庫端接手。
    return 'rulesNotReady'
  }
}

/**
 * 建立帳號時是「先開帳號、再把註冊碼寫進名冊」，中間會有短暫的空窗。
 * 用這個記號讓主畫面在空窗期顯示載入中，而不是又跳出一次註冊碼畫面。
 */
const JOINING_KEY = 'loan-join-in-progress'
const JOINING_MAX_MS = 15000

export function markJoinInProgress(): void {
  try {
    sessionStorage.setItem(JOINING_KEY, String(Date.now()))
  } catch {
    // 私密瀏覽等情況不支援 sessionStorage，忽略即可
  }
}

export function clearJoinInProgress(): void {
  try {
    sessionStorage.removeItem(JOINING_KEY)
  } catch {
    // 同上
  }
}

/** 是否正在建立帳號並加入名冊。逾時後自動失效，避免中途關掉網頁卡住。 */
export function isJoinInProgress(): boolean {
  try {
    const started = Number(sessionStorage.getItem(JOINING_KEY) ?? 0)
    return started > 0 && Date.now() - started < JOINING_MAX_MS
  } catch {
    return false
  }
}

export interface JoinInput {
  uid: string
  code: string
  name: string
  employeeId: string
}

/** 以單位註冊碼把自己加入名冊。註冊碼不對會被資料庫規則擋下。 */
export async function joinWithCode({ uid, code, name, employeeId }: JoinInput): Promise<void> {
  await setDoc(doc(getDb(), MEMBERS, uid), {
    code: code.trim(),
    name,
    employeeId,
    joinedAt: new Date().toISOString(),
  })
}

/** 第一次啟用時設定單位註冊碼；已經設定過的話會被規則擋下。 */
export async function createRegistrationCode(code: string): Promise<void> {
  await setDoc(doc(getDb(), CONFIG, REGISTRATION), {
    code: code.trim(),
    updatedAt: new Date().toISOString(),
  })
}

export async function getRegistrationCode(): Promise<string> {
  const snap = await getDoc(doc(getDb(), CONFIG, REGISTRATION))
  return snap.exists() ? String(snap.data().code ?? '') : ''
}

export async function updateRegistrationCode(code: string): Promise<void> {
  await updateDoc(doc(getDb(), CONFIG, REGISTRATION), {
    code: code.trim(),
    updatedAt: new Date().toISOString(),
  })
}

export function describeMembershipError(error: unknown, context: 'join' | 'setup'): string {
  const code = errorCode(error)
  if (code === 'permission-denied') {
    return context === 'join'
      ? '註冊碼不正確，請向單位內已在使用的同仁確認'
      : '註冊碼已經由其他同仁設定過了，請向他索取後再輸入'
  }
  if (code === 'unavailable') return '網路連線失敗，請檢查網路後再試'
  return context === 'join' ? '加入失敗，請稍後再試' : '設定失敗，請稍後再試'
}
