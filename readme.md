# 便當訂購 APP

PWA（漸進式網頁應用程式），供員工訂購每日便當。  
資料完全存於**手機瀏覽器本地（IndexedDB）**，不需雲端資料庫，部署於 GitHub Pages。

---

## 技術選型

| 項目 | 選擇 | 說明 |
|------|------|------|
| 框架 | **React + Vite** | 快速建置，生態豐富 |
| 語言 | **TypeScript** | 型別安全，減少 runtime 錯誤 |
| 本地儲存 | **Dexie.js（IndexedDB）** | 瀏覽器原生本地資料庫，資料存手機不需雲端 |
| PWA | **vite-plugin-pwa** | 自動產生 Service Worker、manifest，支援加入主畫面 |
| UI 元件 | **Tailwind CSS + shadcn/ui** | 快速切版，元件精美 |
| 狀態管理 | **Zustand** | 輕量，簡單易用 |
| 路由 | **React Router v6** | SPA 頁面導覽 |
| 部署 | **GitHub Pages** | 免費靜態托管，push 即自動部署 |

> 使用者在 iOS Safari 開啟網址後，點選「加入主畫面」即可像 APP 一樣使用，資料存於手機瀏覽器 IndexedDB。

---

## 第一步：VS Code 必裝套件

### 必裝（開發核心）

| 套件名稱 | Extension ID | 用途 |
|----------|--------------|------|
| ESLint | `dbaeumer.vscode-eslint` | JavaScript/TypeScript 語法檢查 |
| Prettier | `esbenp.prettier-vscode` | 自動排版程式碼 |
| TypeScript Importer | `pmneo.tsimporter` | 自動補全 import |
| Path Intellisense | `christian-kohler.path-intellisense` | 路徑自動補全 |
| ES7+ React Snippets | `dsznajder.es7-react-js-snippets` | React 快速程式碼片段（`rfc` → 生成元件） |

### 必裝（PWA / 前端專用）

| 套件名稱 | Extension ID | 用途 |
|----------|--------------|------|
| Tailwind CSS IntelliSense | `bradlc.vscode-tailwindcss` | Tailwind class 自動補全、預覽色彩 |
| PostCSS Language Support | `csstools.postcss` | Tailwind 指令語法高亮 |

### 建議裝（提升效率）

| 套件名稱 | Extension ID | 用途 |
|----------|--------------|------|
| GitLens | `eamodio.gitlens` | Git 歷史、blame 顯示 |
| Error Lens | `usernamehw.errorlens` | 錯誤直接顯示在程式碼行上 |
| Todo Tree | `gruntfuggly.todo-tree` | 整理 TODO / FIXME 標記 |
| GitHub Actions | `github.vscode-github-actions` | 在 VS Code 內查看 CI/CD 部署狀態 |

### 一鍵安裝指令（在 VS Code 終端機執行）

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension pmneo.tsimporter
code --install-extension christian-kohler.path-intellisense
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension bradlc.vscode-tailwindcss
code --install-extension csstools.postcss
code --install-extension eamodio.gitlens
code --install-extension usernamehw.errorlens
code --install-extension gruntfuggly.todo-tree
code --install-extension github.vscode-github-actions
```

---

## APP 功能規劃

### 1. 店家管理
- [ ] 新增／編輯／刪除店家
- [ ] 欄位：名稱、電話、地址、圖片、**啟用狀態**（啟用／停用）
- [ ] 停用店家不出現在訂單建立的選擇清單中

### 2. 菜單管理
- [ ] 新增／編輯／刪除品項，**需綁定所屬店家**
- [ ] 欄位：品項名稱、價格、圖片（無啟用狀態）

### 3. 廠商管理
- [ ] 新增／編輯／刪除廠商
- [ ] 欄位：名稱、人數、圖片、**啟用狀態**（啟用／停用）
- [ ] 停用廠商不出現在訂單建立的選擇清單中

### 4. 人員管理
- [ ] 新增／編輯／刪除人員，**需綁定所屬廠商**
- [ ] 欄位：姓名、電話、圖片、**要訂便當**（是／否）
- [ ] 人員為選配（廠商可不設定人員，改用廠商人數計算）
- [ ] `要訂便當 = 否` 的人員不列入訂單建立，但仍顯示於人員管理清單中

### 5. 訂單建立
- [ ] 選擇日期
- [ ] 選擇廠商（僅顯示啟用中的廠商）
  - **有設定人員**：列出 `要訂便當 = 是` 的人員，每位人員各自選擇品項與數量
  - **未設定人員**：以廠商人數為單位，直接選擇品項與數量
- [ ] 增減數量時，廠商人數／要訂便當人數**僅供參考**，允許多點或少點
- [ ] 送出前自動比對：**目前點餐總數量** vs **廠商人數 或 要訂便當人數**
  - 若數量不符，彈出提示：「目前點餐 N 份，與實際人數 M 人不符，是否繼續訂餐？」
  - 使用者可選擇**繼續送出**或**返回修改**
- [ ] 建立當日訂單

### 6. 訂單列表
- [ ] 依日期篩選，由新到舊由上而下顯示
- [ ] 每筆訂單顯示**狀態標籤**：`未完成` / `已完成`
- [ ] 每筆訂單展開後顯示兩個維度：

#### 6-1. 依店家檢視
- 列出各店家的品項總數量、總金額
- 顯示店家電話按鈕，點擊可直接撥打電話

#### 6-2. 依廠商檢視
- 列出各廠商向各店家的總金額
- 列出各廠商的各品項總數量
- 點擊廠商展開明細：
  - **廠商有綁定人員**：列出每位人員已點品項、個人總金額、已付款（checkbox 可勾選）
  - **廠商未綁定人員**：列出所有品項總金額、已付款（checkbox 可勾選）

#### 6-3. 訂單狀態與完成機制
- 當該日訂單**所有付款項目均已勾選**（is_paid = true），底部出現「**完成訂單**」按鈕
- 點擊「完成訂單」後，訂單狀態變更為 `已完成`，同時：
  - 付款 checkbox 全部鎖定，無法再勾選／取消
  - 訂單內容（品項、數量）無法再編輯
  - 「完成訂單」按鈕消失，改顯示 `已完成` 標籤
- `未完成` 狀態下，訂單品項、數量、付款 checkbox 皆可自由編輯

### 7. 訂單管理（資料清除）
- [ ] 從資料庫讀取**實際有訂單的日期**，以清單列出（無訂單的日期不顯示）
- [ ] 使用者從清單中勾選要刪除的日期（可多選）
- [ ] 預覽已勾選的筆數，供使用者確認
- [ ] 刪除前彈出二次確認對話框，防止誤刪
- [ ] 確認後刪除所選日期的所有訂單及相關明細（orders、order_items、order_payments）
- [ ] 顯示目前 IndexedDB 佔用容量（MB），讓使用者判斷是否需要清理

> 注意：此操作僅清除**訂單紀錄**，店家、菜單、廠商、人員等基本資料不受影響。

---

### 資料結構（IndexedDB / Dexie.js）

```
stores         → id, name, phone, address, image_base64, is_active, created_at
menus          → id, store_id, name, price, image_base64, created_at
vendors        → id, name, headcount, image_base64, is_active, balance(nullable), created_at
members        → id, vendor_id, name, phone, image_base64, want_order, balance(nullable), created_at
orders         → id, order_date, status(pending|completed), completed_at(nullable), created_at
order_items    → id, order_id, store_id, menu_id, vendor_id, member_id(nullable), quantity, unit_price
order_payments → id, order_id, vendor_id, member_id(nullable), is_paid, payment_method('cash'|'wallet'|null)
balance_logs   → id, target_type('vendor'|'member'), target_id, amount, note, created_at
```

**關聯說明**
- `menus.store_id` → 品項屬於哪間店家
- `members.vendor_id` → 人員屬於哪間廠商
- `stores.is_active` / `vendors.is_active` → false 時不出現在訂單建立選單
- `members.want_order` → false 時不列入訂單建立人員清單
- `order_items.member_id` 為 NULL 時，代表該廠商未設人員，以廠商為單位計算
- `order_payments` 記錄每筆廠商（或人員）的付款狀態
- 圖片以 **Base64** 字串存入 IndexedDB（無需檔案系統）

---

## 部署方式（GitHub Pages）

```
本機開發 → git push → GitHub Actions 自動執行 vite build → 部署至 gh-pages 分支
```

1. 建立 GitHub repository
2. 設定 GitHub Actions workflow（`deploy.yml`）
3. Repository Settings → Pages → 來源設為 `gh-pages` 分支
4. 每次 push main 分支，自動重新部署

---

## 環境需求

- Node.js 18+
- VS Code
- GitHub 帳號（用於 Pages 部署）
- iOS Safari：開啟網址後「加入主畫面」即可離線使用

---

## 開發步驟

1. **第一步** ✅ VS Code 套件安裝（本文件）
2. **第二步** 安裝 Node.js，用 Vite 建立 React + TypeScript 專案
3. **第三步** 設定 vite-plugin-pwa、Tailwind CSS、Dexie.js
4. **第四步** 設定 GitHub Actions 自動部署至 GitHub Pages
5. **第五步** 實作 Dexie.js 資料表 Schema
6. **第六步** 實作店家管理、菜單管理
7. **第七步** 實作廠商管理、人員管理
8. **第八步** 實作訂單建立流程
9. **第九步** 實作訂單列表（依店家／依廠商檢視、付款 checkbox）
10. **第十步** 實作訂單管理（日期清單勾選刪除、容量顯示）

---

## 功能：紀錄金額（餘額管理）✅ 已實作

### 概述

每位**人員**或**廠商**（無人員時）可各自持有一個**可為負數的餘額帳戶**。  
存錢 (+) / 提領 (-) 手動操作；訂單付款選擇「錢包」時自動扣款，取消時自動退回；選擇「現金」則不影響餘額。  
餘額資料獨立存於廠商或人員身上，刪除訂單不影響餘額。

---

### 規則一：廠商管理

| 條件 | 行為 |
|------|------|
| 廠商**有**綁定人員 | 不顯示餘額功能（餘額改由人員層級管理） |
| 廠商**無**綁定人員 | 顯示目前餘額（可為負數）、存錢(+) / 提領(-) 按鈕 |
| 廠商無人員 + 餘額 ≠ 0 | **不可新增人員**，彈出提示「此廠商尚有餘額，需先提領後才能新增人員」 |
| 廠商餘額 ≠ 0 | **不可刪除廠商**，提示「廠商尚有餘額，無法刪除」 |

> 「有餘額」定義：`balance ≠ 0`（負數同樣視為有餘額，需歸零才可刪除）

---

### 規則二：人員管理

| 條件 | 行為 |
|------|------|
| 每位人員 | 顯示目前餘額（可為負數）、存錢(+) / 提領(-) 按鈕 |
| 人員餘額 ≠ 0 | **不可刪除人員**，提示「人員尚有餘額，無法刪除」 |

---

### 規則三：訂單列表 — 付款方式連動餘額

付款時顯示兩個按鈕 **[現金]** 和 **[錢包]**，扣款對象依廠商是否有綁定人員決定：

| 廠商狀態 | 扣款對象 |
|----------|----------|
| 廠商有綁定人員 | 對應的**人員**餘額 |
| 廠商無綁定人員 | **廠商**本身的餘額 |

**付款方式與餘額：**

| 動作 | 金額變動 |
|------|----------|
| 點選 **[現金]**（未付 → 現金已付） | 餘額**不變**（現金交易不影響錢包） |
| 點選 **[錢包]**（未付 → 錢包已付） | 餘額 **−** 該筆付款金額（扣款） |
| 再次點選同方式（已付 → 未付） | 若原為錢包則退回餘額；現金則無變動 |
| 切換方式（現金 ↔ 錢包） | 依新方式重新計算（舊方式餘額效果先撤回） |

訂單**完成後**付款方式以唯讀標籤顯示（現金／錢包／未付）。

---

### 規則四：訂單管理

- 訂單管理頁只顯示**已完成**的訂單（`status = 'completed'`）
- 刪除已完成訂單時，**不回補、不扣除**任何餘額
- 餘額是綁在廠商/人員身上的獨立數字，與訂單記錄分離

---

### DB Schema 異動

在現有 Schema 基礎上新增以下欄位與資料表：

```
-- 現有資料表異動
vendors  → 新增 balance: number  (預設 0，可為負數)
members  → 新增 balance: number  (預設 0，可為負數)

-- 新增資料表
balance_logs → id, target_type('vendor'|'member'), target_id, amount, note, created_at
```

**`balance_logs` 欄位說明：**

| 欄位 | 說明 |
|------|------|
| `target_type` | `'vendor'` 或 `'member'` |
| `target_id` | 對應廠商或人員的 id |
| `amount` | 金額（正 = 增加，負 = 減少） |
| `note` | 說明，如 `'存錢'`、`'提領'`、`'訂單付款 2026-07-03'`、`'取消付款 2026-07-03'` |
| `created_at` | 時間戳記 |

---

### UI 互動流程

#### 廠商管理（廠商無人員）

```
[廠商卡片]
  ├─ 目前餘額：NT$ -120  ← 可為負數
  ├─ [存錢 +]  → 彈出輸入金額 → 確認 → balance += 金額
  └─ [提領 -]  → 彈出輸入金額 → 確認 → balance -= 金額
```

#### 人員管理

```
[人員卡片]
  ├─ 目前餘額：NT$ 350
  ├─ [存錢 +]  → 彈出輸入金額 → 確認 → balance += 金額
  └─ [提領 -]  → 彈出輸入金額 → 確認 → balance -= 金額
```

#### 訂單付款操作

```
依人名 / 依廠商 → 點選 [現金]
  → is_paid = true, payment_method = 'cash'
  → 餘額不變

依人名 / 依廠商 → 點選 [錢包]
  → is_paid = true, payment_method = 'wallet'
  → 查找對應 balance 對象（人員 or 廠商）
  → balance -= 付款金額
  → 寫入 balance_logs（note: '訂單付款 YYYY-MM-DD'）

再次點選同方式（toggle off）→ is_paid = false, payment_method = null
  → 若原為 wallet，balance += 付款金額
  → 寫入 balance_logs（note: '取消付款 YYYY-MM-DD'）
```

---

### 已同步完成的相關功能調整

| # | 位置 | 說明 | 狀態 |
|---|------|------|------|
| 1 | 訂單列表 | 只顯示**未完成**訂單（`status = 'pending'`） | ✅ |
| 2 | 廠商管理 / 人員管理 | 餘額正數綠色、負數紅色 | ✅ |
| 3 | 廠商管理 / 人員管理 | 餘額、存錢(+)、提領(-) 直接顯示在列表卡片上 | ✅ |
| 4 | 管理頁面 | 新增**錢包**入口，顯示所有廠商 + 人員餘額合計 | ✅ |
| 5 | 訂單管理 | 只顯示**已完成**訂單，新增**明細**按鈕可展開查看訂單內容 | ✅ |
| 6 | 廠商刪除 | 有餘額時無法刪除，提示錯誤 | ✅ |
| 7 | 人員刪除 | 有餘額時無法刪除，提示錯誤 | ✅ |
| 8 | 新增人員 | 廠商尚有餘額且無人員時，不可新增（需先提領） | ✅ |
