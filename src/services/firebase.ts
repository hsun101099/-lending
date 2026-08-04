import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig'

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null

function ensureApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase 尚未設定，請先填寫 src/services/firebaseConfig.ts')
  }
  if (!app) app = initializeApp(firebaseConfig)
  return app
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(ensureApp())
  return authInstance
}

export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = initializeFirestore(ensureApp(), {
      // 開啟本機快取：再次開啟網頁時先以快取即時顯示，同時在背景與雲端同步。
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      // 忽略值為 undefined 的欄位，避免任一寫入路徑因此整筆存檔失敗。
      ignoreUndefinedProperties: true,
    })
  }
  return dbInstance
}
