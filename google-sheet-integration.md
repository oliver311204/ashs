# Google 試算表 / Google Apps Script 串接說明

這份文件詳細說明如何將「多科目讀書時間統計番茄鐘」單頁 Web App，與 Google Apps Script + Google 試算表串接，讓管理者透過「儲存紀錄」按鈕將番茄鐘資料送到後端。

---

## 1. 前端功能說明

### 1.1 新增管理者登記表單

在 `index.html` 的「管理統計看板」區塊中，已新增以下表單欄位：

- `登記時間`：使用 `<input type="datetime-local">`
- `讀書科目`：使用 `select` 下拉選單，會與主畫面科目選單同步
- `儲存紀錄` 按鈕：點擊後送出資料給後端

### 1.2 JavaScript 事件綁定

在 `script.js` 中，已新增：

- `const recordForm = document.querySelector('#record-form');`
- `const recordDatetime = document.querySelector('#record-datetime');`
- `const recordSubjectSelect = document.querySelector('#record-subject-select');`

並在 `bindEvents()` 中綁定：

- `recordForm.addEventListener('submit', handleRecordSubmit);`

### 1.3 送出資料流程

使用者點擊「儲存紀錄」後，會執行 `handleRecordSubmit()`：

1. 讀取 `recordDatetime.value` 與 `recordSubjectSelect.value`
2. 檢查時間是否已填寫
3. 呼叫 `addHistoryRecord(subject, 25, timestamp)` 將紀錄寫入本地歷史資料
4. 呼叫 `saveToGoogleSheet(subject, 25, timestamp)` 將資料送到後端
5. 表單清除並提示「已儲存番茄鐘紀錄並送出後端。」

### 1.4 Google Apps Script POST 範例

`saveToGoogleSheet(subject, duration, timestamp)` 目前已實作為：

```js
function saveToGoogleSheet(subject, duration, timestamp = new Date().toISOString()) {
  const payload = {
    subject,
    duration,
    timestamp,
  };

  fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Google Apps Script 儲存失敗');
      }
      return response.text();
    })
    .then(() => {
      console.log('已送出資料到 Google Sheets');
    })
    .catch((error) => {
      console.warn(error);
    });
}
```

請將 `script.js` 中的 `GAS_URL` 常數替換為您部署後的 Apps Script Web App URL。

---

## 2. Google Apps Script 後端設定步驟

### 2.1 建立 Google 試算表

1. 開啟 Google Drive
2. 新增一個 Google 試算表
3. 將第一列標題設定為：
   - `登記時間`
   - `讀書科目`
   - `專注時間(分鐘)`
   - `建立時間`

例如：A1 = `登記時間`、B1 = `讀書科目`、C1 = `專注時間(分鐘)`、D1 = `建立時間`

### 2.2 建立 Apps Script 專案

1. 在試算表中選單點選：`擴充功能` → `應用程式腳本`
2. 進入 Apps Script 編輯器後，替換預設程式碼為：

```javascript
const SPREADSHEET_ID = '請填入你的試算表 ID';
const SHEET_NAME = '工作表1';

function doPost(e) {
  try {
    const requestBody = JSON.parse(e.postData.contents);
    const subject = requestBody.subject || '';
    const duration = requestBody.duration || 0;
    const timestamp = requestBody.timestamp || new Date().toISOString();

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput('找不到指定工作表').setMimeType(ContentService.MimeType.TEXT);
    }

    sheet.appendRow([timestamp, subject, duration, new Date()]);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

> `SPREADSHEET_ID` 可以從試算表網址中取出，例如：`https://docs.google.com/spreadsheets/d/XXXXXXXXXXXX/edit`，`XXXXXXXXXXXX` 即為 ID。

### 2.3 部署為 Web App

1. 點選右上角 `部署` → `新增部署`
2. 選擇 `Web 應用程式`
3. 設定：
   - `說明`：`Pomodoro 錄入 API`
   - `執行身分`：`我`（或適合的帳戶）
   - `誰有權存取`：`任何人（甚至匿名使用者）`
4. 部署並複製產生的 URL
5. 將 `script.js` 裡的 `GAS_URL` 常數換成這個 URL

---

## 3. 前端與後端對應欄位說明

| 前端欄位 | POST 欄位名稱 | 說明 |
| --- | --- | --- |
| `record-datetime` | `timestamp` | 登記時間，會以 ISO 字串送出 |
| `record-subject-select` | `subject` | 選中的讀書科目 |
| 固定值 | `duration` | 本專案固定為 25 分鐘 |

後端 `doPost` 將收到 JSON 物件後，寫入 Google 試算表。

---

## 4. 測試流程

1. 先開啟 `index.html` 網頁
2. 切換到「管理統計看板」
3. 在「登記時間」欄位選擇時間
4. 選擇「讀書科目」
5. 點擊「儲存紀錄」
6. 確認瀏覽器中是否成功送出，並檢查 Console 是否沒有錯誤
7. 開啟 Google 試算表，確認是否新增一筆新紀錄
8. 若未成功，檢查 Apps Script 部署 URL、CORS、以及 `GAS_URL` 常數是否正確

---

## 5. 若需要進一步強化

- 可以將 `saveToGoogleSheet()` 改為 `async/await` 的寫法
- 可以在 `doPost` 中加入資料驗證，避免空科目或錯誤時間格式
- 可以在 Google 試算表中新增更多欄位，例如 `備註`、`學習主題`、`完成狀態`
- 若需設定更嚴格安全性，可改為 `誰有權存取：僅限我的帳戶`，並在前端加入授權流程

---

## 6. 注意事項

- 本專案等待部署後，務必替換 `script.js` 中的 `GAS_URL`
- 若要讓前端可在 HTTPS 環境下正常呼叫，請確保 Apps Script Web App URL 為 HTTPS
- 如果本地端預覽時出現 CORS 問題，可先將程式放在簡單靜態伺服器上開啟（例如 `live-server` 或 `python -m http.server`）
