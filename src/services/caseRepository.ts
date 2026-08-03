import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { getDb } from './firebase'
import { buildCase, type NewCaseInput } from '../utils/caseActions'
import { normalizeCase } from '../utils/normalizeCase'
import type { LoanCase } from '../types'

const CASES = 'cases'
const COUNTERS = 'counters'

/** 案件編號由後端計數器配發，確保多人同時新增也不會拿到重複編號。 */
async function allocateCaseId(): Promise<string> {
  const db = getDb()
  const year = new Date().getFullYear()
  const counterRef = doc(db, COUNTERS, `caseId-${year}`)

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const current = snap.exists() ? (snap.data().value as number) : 1000
    const next = current + 1
    tx.set(counterRef, { value: next }, { merge: true })
    return `LN-${year}-${next}`
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
      // 編號遞增，因此反向排序即為最新在前
      cases.sort((a, b) => b.id.localeCompare(a.id))
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

export async function removeCase(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), CASES, id))
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
