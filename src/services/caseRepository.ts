import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { getDb } from './firebase'
import { buildCase, type NewCaseInput } from '../utils/caseActions'
import { normalizeCase } from '../utils/normalizeCase'
import { compareCaseIdDesc } from '../utils/caseId'
import { planRenumber } from '../utils/renumberCases'
import type { LoanCase } from '../types'

const CASES = 'cases'
const COUNTERS = 'counters'
/** 編號改為單純的流水號 1、2、3……，這個計數器與早期的 LN-年份-編號 分開計算 */
const CASE_NO_COUNTER = 'caseNo'

/** 案件編號由後端計數器配發，確保多人同時新增也不會拿到重複編號。 */
async function allocateCaseId(): Promise<string> {
  const db = getDb()
  const counterRef = doc(db, COUNTERS, CASE_NO_COUNTER)

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const current = snap.exists() ? (snap.data().value as number) : 0
    const next = current + 1
    tx.set(counterRef, { value: next }, { merge: true })
    return String(next)
  })
}

/**
 * 訂閱案件集合。回傳取消訂閱的函式。
 * 任何人新增或修改案件，所有開著的畫面都會即時更新。
 */
export function subscribeToCases(
  onData: (cases: LoanCase[]) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    collection(getDb(), CASES),
    (snapshot) => {
      const cases = snapshot.docs.map((d) =>
        normalizeCase({ ...(d.data() as Omit<LoanCase, 'id'>), id: d.id })
      )
      // 編號遞增，因此由大到小排序即為最新在前
      cases.sort((a, b) => compareCaseIdDesc(a.id, b.id))
      onData(cases)
    },
    (error) => onError(error)
  )
}

export async function createCase(input: NewCaseInput): Promise<void> {
  const id = await allocateCaseId()
  const { id: _omit, ...payload } = buildCase(input, id)
  await setDoc(doc(getDb(), CASES, id), payload)
}

export async function saveCase(loanCase: LoanCase): Promise<void> {
  const { id, ...payload } = loanCase
  await setDoc(doc(getDb(), CASES, id), payload)
}

/**
 * 刪除案件＝移到回收桶。
 * 資料仍留在雲端，只是加上刪除標記，誤刪時可以完整復原。
 */
export async function softDeleteCase(id: string, deletedBy: string): Promise<void> {
  await updateDoc(doc(getDb(), CASES, id), {
    deletedAt: new Date().toISOString(),
    deletedBy: deletedBy || '未知',
  })
}

/** 從回收桶復原案件。 */
export async function restoreCase(id: string): Promise<void> {
  await updateDoc(doc(getDb(), CASES, id), {
    deletedAt: deleteField(),
    deletedBy: deleteField(),
  })
}

/** 永久刪除，資料無法再復原。僅供回收桶內明確確認後使用。 */
export async function purgeCase(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), CASES, id))
}

/**
 * 把舊格式的案件編號（LN-2026-1001）整批換成流水號，依建立時間由 1 開始。
 * 整批一次寫入，中途失敗不會只改一半。
 */
export async function renumberAllCases(cases: LoanCase[]): Promise<number> {
  const { moves, nextCounter } = planRenumber(cases)
  if (moves.length === 0) return 0

  const db = getDb()
  const batch = writeBatch(db)
  const byId = new Map(cases.map((c) => [c.id, c]))
  const newIds = new Set(moves.map((m) => m.to))

  moves.forEach(({ from, to }) => {
    const loanCase = byId.get(from)
    if (!loanCase) return
    const { id: _omit, ...payload } = loanCase
    batch.set(doc(db, CASES, to), payload)
  })

  // 只刪除沒有被新編號用到的舊文件，避免把剛寫好的資料又刪掉
  moves
    .filter(({ from }) => !newIds.has(from))
    .forEach(({ from }) => batch.delete(doc(db, CASES, from)))

  // 發號計數器要跟著調整，之後新增的案件才會從下一號開始
  batch.set(doc(db, COUNTERS, CASE_NO_COUNTER), { value: nextCounter }, { merge: true })

  await batch.commit()
  return moves.length
}

/** 一次性把舊版存在瀏覽器的案件搬上雲端。 */
export async function importCases(cases: LoanCase[]): Promise<void> {
  const db = getDb()
  const batch = writeBatch(db)
  cases.forEach((loanCase) => {
    const { id, ...payload } = loanCase
    batch.set(doc(db, CASES, id), payload)
  })
  await batch.commit()
}
