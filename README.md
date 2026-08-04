# 銀行放款流程管理系統 (Loan Workflow Dashboard)

企業級銀行放款案件流程管理系統，案件資料存放於 Firebase Firestore，可多人共用、即時同步。

設計語言參考 Apple / Notion / Linear / Stripe Dashboard：極簡、留白、卡片式、柔和陰影、圓角、微動畫。

## 技術棧

- React 19 + TypeScript + Vite
- Tailwind CSS v4（自訂 design tokens：`--color-primary` #2563EB、`--color-success` #16A34A、`--color-warning` #F59E0B、`--color-danger` #DC2626）
- Framer Motion（進場動畫、Drawer 滑入、進度條動畫、Timeline 展開）
- Lucide Icons
- Recharts（主管報表圖表）
- Firebase（Firestore 資料庫 + Authentication；同仁以「員編＋密碼」登入）

## 開發

```bash
npm install
npm run dev      # 本機開發伺服器
npm run build    # 產出 production build
```

## Firebase 設定（首次上線必做）

未完成設定時，系統會顯示設定指引畫面而不會直接壞掉。

**1. 建立專案**
到 [Firebase Console](https://console.firebase.google.com) 建立專案，並在專案內新增一個「網頁應用程式」。

**2. 啟用登入**
「建構 → Authentication → Sign-in method」啟用 **電子郵件/密碼**。
同仁自行在登入畫面建立帳號，不需要管理者一個一個開；
但建立帳號時必須輸入單位註冊碼（見下一步）。

**3. 建立資料庫並套用安全規則**
「建構 → Firestore Database」建立資料庫，接著：

1. 在「資料」頁籤建立集合 `config`、文件 ID `registration`，
   新增一個字串欄位 `code`，值就是你要發給同仁的單位註冊碼。
2. 到「規則」頁籤，把專案根目錄 [`firestore.rules`](./firestore.rules)
   的內容整份貼上並發布。

> ⚠️ 這步不可略過。預設的測試模式規則會讓任何人都能讀寫案件資料。
> 若跳過第 1 小步，系統會請第一位登入的人在畫面上設定註冊碼。

**4. 填入專案設定**
把 Firebase 專案設定頁的 `firebaseConfig` 內容填入 [`src/services/firebaseConfig.ts`](./src/services/firebaseConfig.ts)，取代其中的 `PLACEHOLDER` 值。

> Firebase 的 Web `apiKey` 依官方設計本來就會出現在前端程式碼中，不是機密資訊；
> 資料安全由上一步的 Authentication 與 Security Rules 把關。

### 資料結構

| 集合 | 說明 |
|---|---|
| `cases/{caseId}` | 一筆案件，文件 ID 即案件編號（如 `LN-2026-1001`）。刪除的案件不會消失，而是加上 `deletedAt` 移到「已刪除案件」 |
| `counters/caseId-{year}` | 案件編號流水號，以 Firestore transaction 配發，避免多人同時新增時編號重複 |
| `members/{uid}` | 通過單位註冊碼驗證的同仁名冊。不在名冊裡就讀不到任何案件 |
| `config/registration` | 單位註冊碼。外人讀不到，只有安全規則本身比對得到 |

### 為什麼網址公開也不怕

網址是公開的，任何人都能在 Authentication 建立帳號，這一層擋不住；
因此門檻放在 Security Rules：**不在 `members` 名冊裡就讀不到任何一筆案件**，
而要進名冊必須附上正確的單位註冊碼。這是資料庫端的把關，不是只擋在畫面上。

規則本身有自動測試（在本機模擬器上跑，不會碰到正式資料）：

```bash
npm i --no-save firebase-tools @firebase/rules-unit-testing
npx firebase emulators:exec --only firestore --project demo-lending \
  --config .firebase-test.json "npx tsx scripts/rules-test.ts"
```

## 資料夾架構

```
src/
├── App.tsx                     # 主頁面組合：Sidebar + Header + 內容區 + Drawer
├── main.tsx
├── index.css                   # Tailwind 匯入與 design tokens
├── types.ts                    # LoanCase / TimelineStep / StageKey 型別定義
├── data/
│   ├── stages.ts                # 流程階段設定（順序、顏色、Badge 樣式）
│   ├── categories.ts            # 案件類別選項（新貸／展期／動舊／追加）
│   └── loanTypes.ts             # 貸款種類選項
├── services/
│   ├── firebaseConfig.ts         # Firebase 專案設定（需自行填入）
│   ├── firebase.ts               # Firebase App / Auth / Firestore 初始化
│   ├── membership.ts             # 單位註冊碼與成員名冊
│   └── caseRepository.ts         # 案件的 Firestore 讀寫與即時訂閱
├── hooks/
│   └── useAuth.ts                # 登入狀態、登入 / 登出、錯誤訊息轉譯
├── utils/
│   ├── format.ts                 # 金額（萬）/ 日期格式化
│   ├── metrics.ts                 # 統計數據計算（Summary / 主管報表指標 / 圖表序列）
│   ├── today.ts                   # 取得今日日期
│   ├── recycleBin.ts              # 已刪除案件的分流與顯示
│   └── caseActions.ts             # 建立案件 / 更新流程 / 撤件邏輯
└── components/
    ├── auth/
    │   ├── LoginScreen.tsx        # 登入 / 建立帳號畫面
    │   ├── JoinScreen.tsx         # 首次使用時輸入單位註冊碼
    │   └── AccountModal.tsx       # 設定登入密碼、查看與更改單位註冊碼
    ├── layout/
    │   ├── Sidebar.tsx            # 左側導覽
    │   └── Header.tsx             # 上方列：標題、日期、通知、使用者、登出
    ├── dashboard/
    │   ├── DashboardCard.tsx       # Summary / 主管報表 指標卡片
    │   ├── StageOverview.tsx       # 流程統計彩色長條圖
    │   └── ManagerPanel.tsx        # 主管報表頁面組合
    ├── table/
    │   ├── LoanTable.tsx            # 案件列表企業級 Table（含逾期提醒、刪除）
    │   ├── StatusBadge.tsx           # 案件狀態彩色 Badge
    │   ├── ProgressBar.tsx           # 案件進度百分比條
    │   ├── SearchBar.tsx             # 搜尋框
    │   └── FilterTabs.tsx            # 流程篩選 Tabs
    ├── forms/
    │   └── NewCaseModal.tsx         # 新增案件登打表單
    ├── drawer/
    │   ├── CaseDrawer.tsx            # 案件詳情右側 Drawer（不跳頁）
    │   └── Timeline.tsx               # 流程時間軸（可展開細節）
    ├── trash/
    │   └── DeletedCasesPanel.tsx     # 已刪除案件與復原
    ├── common/
    │   ├── ConfirmDialog.tsx         # 刪除確認對話框
    │   ├── UndoToast.tsx             # 刪除後的復原提示列
    │   └── SetupNotice.tsx           # Firebase 未設定時的指引畫面
    └── charts/
        ├── StageDistributionChart.tsx # 案件流程分布（甜甜圈圖）
        ├── MonthlyVolumeChart.tsx      # 本月案件數（長條圖）
        └── DailyCompletionChart.tsx    # 每日完成案件（趨勢圖）
```

## 功能對應

- **登入**：以員編＋密碼登入。同仁可自行建立帳號，但必須輸入單位註冊碼，否則看不到任何案件資料。
- **已刪除案件**：刪除的案件會移到「已刪除案件」頁，可完整復原；刪除當下也會出現復原提示列。要徹底移除須再確認一次。
- **案件總覽（首頁）**：案件列表 Table、搜尋（客戶姓名／金額／承辦人／案件編號）、流程 Filter、案件進度百分比、新增案件、刪除案件。
- **新增案件**：登打客戶姓名、貸款金額（以萬為單位，上下鍵每次 10 萬）、貸款種類、承辦人（下拉選單）、建立日期、目前進度、備註。可直接指定案件已辦到哪個階段。
- **逾期提醒**：處理中案件超過 7 天未更新 → 整列淡紅底、Badge 加紅框、顯示「⚠ 已逾7天」。
- **案件 Drawer**：點擊任一案件列，右側滑出詳情，不跳頁；含流程 Timeline（完成／進行中 Pulse／未開始）、可展開每個流程細節、備註輸入區、更新流程 / 撤件 / 刪除。
- **主管報表**：4 張 Summary Card、流程統計長條圖、今日新增／完成案件、今日撥款金額、待批示、卡件、平均處理天數，搭配案件流程分布、本月案件數、每日完成案件三張圖表，以及可搜尋的案件列表（同樣可點開詳情）。
- **多人即時同步**：任一位同仁新增或更新案件，其他人開著的畫面會即時更新。

## 附註

- 側邊欄「案件管理」「客戶資料」「系統設定」為預留入口（標示「即將推出」），尚未實作。
- 早期版本以一組數字登入、且密碼為選填；那些帳號仍可登入（員編填原本那組數字、密碼留空），新建立的帳號則一律要設密碼。
- 舊版資料存在瀏覽器 localStorage；升級到 Firebase 後首次登入時，系統會偵測並詢問是否將這些資料一併匯入雲端。
