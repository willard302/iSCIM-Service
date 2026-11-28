# iSCIM-Service

圖表服務。`/api/charts` 的讀取請求（GET）公開，使用者端可直接開啟網址；建立、修改、刪除請求（POST／PUT／DELETE）只供前端專案（tsm-static-2.0）的 server 呼叫，須帶 `X-Charts-Api-Key`（`CHARTS_API_KEY`）。

```bash
npm run dev    # 本機開發
npm test       # 編譯並執行測試
npm start      # 編譯並啟動
```

## 環境變數

見 [.env.example](.env.example)。正式環境（`NODE_ENV=production`）必須設定 `CHARTS_API_KEY` 與 `CHART_KEY_SECRET`，`STORAGE_DIR` 須指向持久磁碟，否則重新部署後產生的圖卡會遺失。

## 數字圖卡組 `/api/charts/numbers`

| 種類 | 用途 | 圖卡組 ID | 保留 |
| --- | --- | --- | --- |
| `today` | 今日頁：以當天日期為生日，同一天全站共用 | `today-{YYYY-MM-DD}` | 到「今天 − `TODAY_CHART_KEEP_DAYS`」 |
| `calculation` | 試算頁：依輸入即時產生，相同輸入共用 | `calc-{HMAC(輸入)}` | 最後存取後 `CALCULATION_CHART_TTL_DAYS` 天 |
| `user` | 個人頁：每位會員各自一份 | `user-{uuid}` | 永久；資料變更時重建並刪除舊的 |

| 方法與路徑 | Request | Response |
| --- | --- | --- |
| `GET /today/:date` | Query `cardIds?`（逗號分隔） | `{ success, result: NumberChartSetResult }` |
| `POST /calculations` | Body `{ birthDate, birthTime?, gender?, cardIds? }` | 同上 |
| `PUT /users/:userId` | Body 同上 | 同上 |
| `DELETE /users/:userId` | 無 | `204`（帳號刪除時呼叫，不存在也回 `204`） |
| `GET /sets/:setId/:fileName` | 無 | 圖檔；不在該組 manifest 中時 `404` |

```ts
interface NumberChartSetResult {
  setId: string
  kind: 'today' | 'calculation' | 'user'
  createdAt: string
  cards: { cardId: string; url: string }[]  // url 為 /api/charts/numbers/sets/{setId}/{fileName}
}
```

- `birthDate` 為 `YYYY-MM-DD` 且不晚於明天；`birthTime` 為 `HH:mm`；`gender` 為 `male`／`female`／`other`。姓名不影響圖卡，不收也不存。
- `today` 的日期依使用者裝置時區判定，只接受與 UTC 今日相差一天以內的日期。
- `cardIds` 省略時為全部；未知的 ID 回 `400`。只產生被要求的卡片，之後要求新卡片時才補產生，因此前端只為已解鎖的會員要求付費卡片。
- 同一個圖卡組的請求依序處理，同時多個相同輸入只產生一次。
- 同一個圖卡網址的內容不會改變（`Cache-Control: immutable`）。
- 過期清理在啟動時與每小時執行一次（`services/numberChartCleanup.ts`）。

儲存結構：

```
storage/numbers/
├─ sets/{setId}/manifest.json、{cardId}.{ext}
└─ users/{userId}.json   # { setId, inputDigest }
```

目前的產生器（`services/numberChartGenerator.ts`）為 demo，依圖卡組種類複製範本圖：`today` → `public/charts/today/numbers`、`calculation` → `public/charts/calculation/numbers`、`user` → `public/charts/demo-user-01/numbers`；正式版只需替換 `generateCard`。`cardIds` 可用的 ID 為該種類範本資料夾中的檔名（不含副檔名）。

替換範本圖後，已產生的圖卡組不會自動更新（同一網址內容不變）：`today`、`calculation` 會依保留期限過期重建，`user` 為永久，需清除 `STORAGE_DIR/numbers/` 才會改用新範本。

## Demo 靜態圖

`public/charts/{scope}/{category}/{fileName}` 下的固定圖檔：

- `scope`：`today`（今日）、`calculation`（試算）、`demo-user-01`（demo 會員本人）
- `category`：`numbers`、`five-elements`

| 方法與路徑 | Response |
| --- | --- |
| `GET /api/charts` | `{ success, result: { scope, category, fileName, url }[] }` |
| `GET /api/charts/:scope/:category/:fileName` | 圖檔；不存在時 `404` |

tsm-static-2.0 的五行進階卡片以此取圖（本人 `self` 對應 `demo-user-01`）；數字進階卡片改用上方的圖卡組。
