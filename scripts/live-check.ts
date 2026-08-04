/**
 * 對正式 Firebase 專案執行的一次性驗證腳本。
 *
 * 目的：確認「更新流程」寫入失敗（Unsupported field value: undefined）確實已修復。
 * 使用可辨識的測試編號（TEST-DELETE-ME-*），不觸碰正式案件編號計數器，
 * 結束時會刪除所有測試資料與測試帳號。
 *
 * 執行：npx tsx scripts/live-check.ts
 */
import { initializeApp, deleteApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { deleteDoc, doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import { firebaseConfig } from '../src/services/firebaseConfig'
import { buildCase, advanceStage, withdrawCase } from '../src/utils/caseActions'
import { normalizeCase } from '../src/utils/normalizeCase'
import { STAGE_CONFIG, STAGE_ORDER } from '../src/data/stages'
import type { LoanCase } from '../src/types'

const PREFIX = 'TEST-DELETE-ME'
const TEST_PIN = String(Math.floor(100000 + Math.random() * 900000))
const TEST_EMAIL = `u${TEST_PIN}@loan.local`
const TEST_PASSWORD = `loanpin-${TEST_PIN}`

let pass = 0
let fail = 0
const ok = (label: string) => { pass++; console.log(`  ✓ ${label}`) }
const no = (label: string, err: unknown) => {
  fail++
  console.error(`  ✗ ${label} — ${err instanceof Error ? err.message : String(err)}`)
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const createdDocs: string[] = []

async function writeCase(c: LoanCase, label: string): Promise<boolean> {
  const { id, ...payload } = c
  try {
    await setDoc(doc(db, 'cases', id), payload)
    if (!createdDocs.includes(id)) createdDocs.push(id)
    ok(label)
    return true
  } catch (e) {
    no(label, e)
    return false
  }
}

async function readCase(id: string): Promise<LoanCase | null> {
  const snap = await getDoc(doc(db, 'cases', id))
  if (!snap.exists()) return null
  return normalizeCase({ ...(snap.data() as Omit<LoanCase, 'id'>), id: snap.id })
}

async function main() {
  console.log(`\n連線至專案：${firebaseConfig.projectId}\n`)

  console.log('=== 1. 建立測試帳號並登入 ===')
  try {
    await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    ok(`建立測試帳號（數字密碼 ${TEST_PIN}）`)
  } catch (e) {
    no('建立測試帳號', e)
    return
  }
  try {
    await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    ok('以數字密碼登入')
  } catch (e) {
    no('登入', e)
    return
  }

  console.log('\n=== 2. 新增案件並寫入 Firestore ===')
  let c = buildCase(
    {
      customerName: `${PREFIX} 測試客戶`,
      loanAmount: 5_000_000,
      loanType: '購置自用住宅',
      category: '新貸',
      officer: '測試承辦',
      createdDate: new Date().toISOString().slice(0, 10),
      remarks: '自動測試資料，可直接刪除',
      currentStage: 'intake',
    },
    `${PREFIX}-1`
  )
  if (!(await writeCase(c, '建立案件（受理）'))) return

  const readBack = await readCase(`${PREFIX}-1`)
  if (readBack) ok('讀回案件並套用資料轉換')
  else { no('讀回案件', '找不到文件'); return }
  c = readBack

  console.log('\n=== 3. 逐關更新流程（先前失敗的操作）===')
  for (let step = 1; step < STAGE_ORDER.length; step++) {
    c = advanceStage(c)
    const label = `更新流程至「${STAGE_CONFIG[c.currentStage].label}」`
    if (!(await writeCase(c, label))) break
    const again = await readCase(c.id)
    if (!again) { no(`${label} 後讀回`, '找不到文件'); break }
    c = again
  }
  if (c.currentStage === 'disbursement' && c.progress === 100) ok('抵達撥款且進度 100%')
  else no('抵達撥款', `目前為 ${c.currentStage} / ${c.progress}%`)

  console.log('\n=== 4. 撤件 ===')
  let w = buildCase(
    {
      customerName: `${PREFIX} 撤件測試`,
      loanAmount: 1_000_000,
      loanType: '信用貸款',
      category: '展期',
      officer: '測試承辦',
      createdDate: new Date().toISOString().slice(0, 10),
      remarks: '',
      currentStage: 'credit',
    },
    `${PREFIX}-2`
  )
  if (await writeCase(w, '建立案件（徵信）')) {
    const r = await readCase(w.id)
    if (r) {
      w = withdrawCase(r)
      await writeCase(w, '撤件後寫入')
    }
  }

  console.log('\n=== 5. 舊版 6 關資料相容（回報失敗的原始情境）===')
  const legacyId = `${PREFIX}-3`
  const legacyPayload = {
    customerName: `${PREFIX} 舊版案件`,
    loanAmount: 60_000_000,
    loanType: '信保基金',
    officer: '測試承辦',
    createdDate: '2026-07-23',
    currentStage: 'approval',
    progress: 67,
    lastUpdated: '2026-07-23',
    remarks: '',
    timeline: [
      { key: 'intake', label: '受理', status: 'completed', completedDate: '2026-07-23' },
      { key: 'appraisal', label: '估價', status: 'completed', completedDate: '2026-07-23' },
      { key: 'credit', label: '徵信', status: 'completed' },
      { key: 'approval', label: '批示', status: 'current' },
      { key: 'contract', label: '對保', status: 'pending' },
      { key: 'disbursement', label: '撥款', status: 'pending' },
    ],
  }
  try {
    await setDoc(doc(db, 'cases', legacyId), legacyPayload)
    createdDocs.push(legacyId)
    ok('寫入舊版格式案件')
  } catch (e) {
    no('寫入舊版格式案件', e)
  }
  const legacyRead = await readCase(legacyId)
  if (legacyRead) {
    ok(`舊案件時間軸補齊為 ${legacyRead.timeline.length} 關`)
    await writeCase(advanceStage(legacyRead), '舊案件更新流程並寫回 ← 先前失敗之處')
  }

  console.log('\n=== 6. 清理測試資料 ===')
  for (const id of createdDocs) {
    try {
      await deleteDoc(doc(db, 'cases', id))
      ok(`刪除 ${id}`)
    } catch (e) {
      no(`刪除 ${id}`, e)
    }
  }
  for (const id of createdDocs) {
    const left = await getDoc(doc(db, 'cases', id))
    if (left.exists()) no(`確認 ${id} 已刪除`, '文件仍存在')
  }
  ok('確認測試案件皆已刪除')

  try {
    if (auth.currentUser) await deleteUser(auth.currentUser)
    ok('刪除測試帳號')
  } catch (e) {
    no('刪除測試帳號', e)
  }
}

main()
  .catch((e) => { fail++; console.error('未預期的錯誤：', e) })
  .finally(async () => {
    await deleteApp(app).catch(() => {})
    console.log(`\n${fail === 0 ? '✅ 全部通過' : '❌ 有失敗項目'}：${pass} 項成功、${fail} 項失敗\n`)
    process.exit(fail === 0 ? 0 : 1)
  })
