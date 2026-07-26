/**
 * Firebase 專案設定
 *
 * 內容取自 Firebase Console → 專案設定 → 一般 → 你的應用程式 → SDK 設定和配置。
 *
 * 註：Firebase 的 Web apiKey 依官方設計本來就會出現在前端程式碼中，不是機密；
 * 資料安全是由 Authentication 登入機制與 Firestore Security Rules 把關
 * （規則內容見專案根目錄的 firestore.rules）。
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyAxlIfbLmhCQgXFAP4UHNhP_pzfF4P3j_E',
  authDomain: 'lending-b74ae.firebaseapp.com',
  projectId: 'lending-b74ae',
  storageBucket: 'lending-b74ae.firebasestorage.app',
  messagingSenderId: '1021699251044',
  appId: '1:1021699251044:web:32fbb62d5bfb80a9c23871',
}

/** 設定尚未填入時為 false，此時系統會顯示設定指引而不是直接壞掉。 */
export const isFirebaseConfigured = !Object.values(firebaseConfig).some((v) => v.startsWith('PLACEHOLDER'))
