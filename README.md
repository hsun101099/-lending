# 銀行放款流程管理系統 (Loan Workflow Dashboard)

企業級銀行放款案件流程管理系統 Prototype，展示型儀表板，所有資料皆為 Mock Data，不串接真實核心系統。

設計語言參考 Apple / Notion / Linear / Stripe Dashboard：極簡、留白、卡片式、柔和陰影、圓角、微動畫。

## 技術棧

- React 19 + TypeScript + Vite
- Tailwind CSS v4（自訂 design tokens：`--color-primary` #2563EB、`--color-success` #16A34A、`--color-warning` #F59E0B、`--color-danger` #DC2626）
- Framer Motion（進場動畫、Drawer 滑入、進度條動畫、Timeline 展開）
- Lucide Icons
- Recharts（主管報表圖表）

## 開發

```bash
npm install
npm run dev      # 本機開發伺服器
npm run build    # 產出 production build
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
│   └── mockData.ts              # 35 筆案件 Mock Data 產生器
├── utils/
│   ├── format.ts                 # 金額 / 日期格式化
│   ├── metrics.ts                 # 統計數據計算（Summary / 主管報表指標 / 圖表序列）
│   └── caseActions.ts             # 更新流程 / 撤件邏輯
└── components/
    ├── layout/
    │   ├── Sidebar.tsx            # 左側導覽
    │   └── Header.tsx             # 上方列：標題、日期、通知、使用者
    ├── dashboard/
    │   ├── DashboardCard.tsx       # Summary / 主管報表 指標卡片
    │   ├── StageOverview.tsx       # 流程統計彩色長條圖
    │   └── ManagerPanel.tsx        # 主管模式頁面組合
    ├── table/
    │   ├── LoanTable.tsx            # 案件列表企業級 Table（含逾期提醒）
    │   ├── StatusBadge.tsx           # 案件狀態彩色 Badge
    │   ├── ProgressBar.tsx           # 案件進度百分比條
    │   ├── SearchBar.tsx             # 搜尋框
    │   └── FilterTabs.tsx            # 流程篩選 Tabs
    ├── drawer/
    │   ├── CaseDrawer.tsx            # 案件詳情右側 Drawer（不跳頁）
    │   └── Timeline.tsx               # 流程時間軸（可展開細節）
    └── charts/
        ├── StageDistributionChart.tsx # 案件流程分布（甜甜圈圖）
        ├── MonthlyVolumeChart.tsx      # 本月案件數（長條圖）
        └── DailyCompletionChart.tsx    # 每日完成案件（趨勢圖）
```

## 功能對應

- **首頁 Dashboard**：4 張 Summary Card、流程統計彩色進度條、案件列表 Table、搜尋、流程 Filter、案件進度百分比。
- **逾期提醒**：處理中案件超過 7 天未更新 → 整列淡紅底、Badge 加紅框、顯示「⚠ 已逾7天」。
- **案件 Drawer**：點擊任一案件列，右側滑出詳情，不跳頁；含流程 Timeline（完成／進行中 Pulse／未開始）、可展開每個流程細節、備註輸入區、更新流程 / 撤件按鈕。
- **主管模式**：今日新增／完成案件、今日撥款金額、待批示、卡件、平均處理天數，搭配案件流程分布、本月案件數、每日完成案件三張圖表。
- **Mock Data**：`src/data/mockData.ts` 內建 35 筆案件（14 處理中、18 已完成、3 撤件），涵蓋 7 種貸款類型、8 位承辦人。

## 附註

側邊欄「案件管理」「客戶資料」「系統設定」為展示用預留入口（標示「即將推出」），非本次 Prototype 範圍。
