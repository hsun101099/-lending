/**
 * 安全性規則測試（在本機 Firestore 模擬器上跑，不會碰到正式資料）。
 *
 * 驗證重點：網址是公開的，任何人都能建立帳號，
 * 但沒有正確的單位註冊碼就不該讀到任何一筆案件。
 *
 * 這兩個套件只在驗證規則時才需要，因此不放進 package.json（避免拖慢部署）：
 *   npm i --no-save firebase-tools @firebase/rules-unit-testing
 *
 * 執行方式：
 *   npx firebase emulators:exec --only firestore --project demo-lending \
 *     --config .firebase-test.json "npx tsx scripts/rules-test.ts"
 */
import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

const CODE = 'branch-2026'
let pass = 0
let fail = 0

async function check(label: string, run: () => Promise<unknown>) {
  try {
    await run()
    pass++
    console.log(`  ✓ ${label}`)
  } catch (e) {
    fail++
    console.error(`  ✗ ${label} — ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`)
  }
}

async function main() {
  const env: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'demo-lending',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8088,
    },
  })
  await env.clearFirestore()

  const outsider = env.authenticatedContext('outsider').firestore()
  const staff = env.authenticatedContext('staff').firestore()
  const staff2 = env.authenticatedContext('staff2').firestore()
  const guest = env.unauthenticatedContext().firestore()

  console.log('\n=== 1. 未登入者一律擋下 ===')
  await check('未登入無法讀案件', () => assertFails(getDoc(doc(guest, 'cases/LN-1'))))
  await check('未登入無法寫案件', () => assertFails(setDoc(doc(guest, 'cases/LN-1'), { customerName: 'x' })))
  await check('未登入無法讀註冊碼', () => assertFails(getDoc(doc(guest, 'config/registration'))))

  console.log('\n=== 2. 第一位使用者設定註冊碼 ===')
  await check('尚未設定時可以建立註冊碼', () =>
    assertSucceeds(setDoc(doc(staff, 'config/registration'), { code: CODE }))
  )
  await check('已設定後別人不能覆蓋', () =>
    assertFails(setDoc(doc(outsider, 'config/registration'), { code: 'hack' }))
  )
  await check('設定者用正確註冊碼加入名冊', () =>
    assertSucceeds(setDoc(doc(staff, 'members/staff'), { code: CODE, name: '王先生' }))
  )

  console.log('\n=== 3. 陌生人自行註冊也看不到資料 ===')
  await check('註冊碼錯誤無法加入名冊', () =>
    assertFails(setDoc(doc(outsider, 'members/outsider'), { code: '0000', name: '路人' }))
  )
  await check('不在名冊就讀不到案件', () => assertFails(getDoc(doc(outsider, 'cases/LN-1'))))
  await check('不在名冊就寫不了案件', () =>
    assertFails(setDoc(doc(outsider, 'cases/LN-1'), { customerName: '偷寫' }))
  )
  await check('不在名冊就讀不到註冊碼', () => assertFails(getDoc(doc(outsider, 'config/registration'))))
  await check('不在名冊就動不了案件編號計數器', () =>
    assertFails(setDoc(doc(outsider, 'counters/caseId-2026'), { value: 9999 }))
  )
  await check('不能偷看別人的名冊資料（藉此得知註冊碼）', () =>
    assertFails(getDoc(doc(outsider, 'members/staff')))
  )
  await check('不能幫別人建立名冊資料', () =>
    assertFails(setDoc(doc(outsider, 'members/staff2'), { code: CODE }))
  )

  console.log('\n=== 4. 名冊內的同仁可正常使用 ===')
  await check('可寫入案件', () =>
    assertSucceeds(setDoc(doc(staff, 'cases/LN-1'), { customerName: '陳大明', loanAmount: 100 }))
  )
  await check('可讀取案件', () => assertSucceeds(getDoc(doc(staff, 'cases/LN-1'))))
  await check('可刪除案件（永久刪除）', () => assertSucceeds(deleteDoc(doc(staff, 'cases/LN-1'))))
  await check('可使用案件編號計數器', () =>
    assertSucceeds(setDoc(doc(staff, 'counters/caseId-2026'), { value: 1001 }))
  )
  await check('可讀取註冊碼', () => assertSucceeds(getDoc(doc(staff, 'config/registration'))))
  await check('可更改註冊碼', () => assertSucceeds(updateDoc(doc(staff, 'config/registration'), { code: 'new-2027' })))

  console.log('\n=== 5. 新同仁用新註冊碼加入 ===')
  await check('用新的註冊碼可以加入', () =>
    assertSucceeds(setDoc(doc(staff2, 'members/staff2'), { code: 'new-2027', name: '盧小姐' }))
  )
  await check('加入後看得到案件', () => assertSucceeds(getDoc(doc(staff2, 'cases/LN-1'))))
  await check('舊註冊碼已不能再用', () =>
    assertFails(setDoc(doc(outsider, 'members/outsider'), { code: CODE }))
  )
  await check('已加入的同仁不受註冊碼更改影響', () => assertSucceeds(getDoc(doc(staff, 'cases/LN-1'))))

  console.log('\n=== 6. 在 Console 手動輸入常見的小差異，不該把同仁擋在門外 ===')
  const setCode = (value: unknown) =>
    env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'config/registration'), { code: value })
    })
  const staff3 = env.authenticatedContext('staff3').firestore()
  const tryJoin = (value: unknown) => setDoc(doc(staff3, 'members/staff3'), { code: value, name: '新同仁' })
  const leave = () =>
    env.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), 'members/staff3'))
    })

  await setCode('branch-2026 ')
  await check('Console 的值多了一個空格也能加入', () => assertSucceeds(tryJoin('branch-2026')))
  await leave()

  await setCode('Branch-2026')
  await check('大小寫不同也能加入', () => assertSucceeds(tryJoin('branch-2026')))
  await leave()

  await setCode(20260804)
  await check('型別被存成數字也能加入', () => assertSucceeds(tryJoin('20260804')))
  await leave()

  await setCode('branch-2026')
  await check('註冊碼真的打錯還是要擋下', () => assertFails(tryJoin('branch-2027')))

  console.log('\n=== 7. 註冊碼被誤刪或清空時要鎖住，不能變成人人可進 ===')
  await check('清空註冊碼', () => assertSucceeds(updateDoc(doc(staff, 'config/registration'), { code: '' })))
  await check('註冊碼是空的時候，送空字串也進不來', () =>
    assertFails(setDoc(doc(outsider, 'members/outsider'), { code: '' }))
  )
  await check('註冊碼是空的時候，送 null 也進不來', () =>
    assertFails(setDoc(doc(outsider, 'members/outsider'), { code: null }))
  )
  await check('code 欄位整個不見時，送 null 也進不來', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'config/registration'), { updatedAt: 'x' })
    })
    await assertFails(setDoc(doc(outsider, 'members/outsider'), { code: null }))
  })
  await check('已經在名冊裡的同仁仍能正常使用', () => assertSucceeds(getDoc(doc(staff, 'cases/LN-1'))))
  // 還原註冊碼，繼續後面的測試
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'config/registration'), { code: 'new-2027' })
  })
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'members/staff2'), { code: 'new-2027' })
  })

  console.log('\n=== 8. 其他路徑一律拒絕 ===')
  await check('不能寫入未定義的集合', () => assertFails(setDoc(doc(staff, 'whatever/x'), { a: 1 })))
  await check('不能把別人移出名冊', () => assertFails(deleteDoc(doc(outsider, 'members/staff'))))
  await check('可以把自己移出名冊', () => assertSucceeds(deleteDoc(doc(staff2, 'members/staff2'))))
  await check('移出名冊後就讀不到案件了', () => assertFails(getDoc(doc(staff2, 'cases/LN-1'))))

  await env.cleanup()
  console.log(`\n${fail === 0 ? '✅ 全部通過' : '❌ 有失敗項目'}：${pass} 項成功、${fail} 項失敗\n`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
