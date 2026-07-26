/**
 * Firebase 專案設定
 *
 * 請到 Firebase Console → 專案設定 → 一般 → 你的應用程式 → SDK 設定和配置，
 * 把那段 firebaseConfig 的內容複製過來取代下面的 PLACEHOLDER。
 *
 * 註：Firebase 的 Web apiKey 依官方設計本來就會出現在前端程式碼中，不是機密；
 * 資料安全是由 Authentication 登入機制與 Firestore Security Rules 把關
 * （規則內容見專案根目錄的 firestore.rules）。
 */
export const firebaseConfig = {
  apiKey: 'PLACEHOLDER_API_KEY',
  authDomain: 'PLACEHOLDER.firebaseapp.com',
  projectId: 'PLACEHOLDER_PROJECT_ID',
  storageBucket: 'PLACEHOLDER.firebasestorage.app',
  messagingSenderId: 'PLACEHOLDER_SENDER_ID',
  appId: 'PLACEHOLDER_APP_ID',
}

/** 設定尚未填入時為 false，此時系統會顯示設定指引而不是直接壞掉。 */
export const isFirebaseConfigured = !Object.values(firebaseConfig).some((v) => v.startsWith('PLACEHOLDER'))
