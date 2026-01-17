---
name: Mirror VP
description: 啟動 Virtual Cinematographer 專案的實時鏡像開發模式 (Mirror Mode)。此模式會自動修復 index.html 並啟動 Vite Watch Build，將變更實時編譯至 dist/index.html。
---

# Mirror VP Skill

此 Skill 專門用於啟動本專案 (Virtual Cinematographer) 的開發鏡像模式。
由於本專案使用 `vite-plugin-singlefile` 將所有資源內嵌至單一 `dist/index.html`，開發時需確保根目錄的 `index.html` 保持乾淨（僅作為 Entry Point），而非被覆蓋為 Bundle 檔案。

## 執行步驟

1.  **檢查並修復 `index.html`**
    *   **目的**: 確保根目錄的 `index.html` 是原始碼入口，而不是被誤存的巨大 Bundle 檔。
    *   **檢查標準**: 檔案大小應小於 5KB。
    *   **修復動作**: 如果檔案過大，強制重寫為以下標準內容：

    ```html
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>The Virtual Cinematographer</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { margin: 0; background: #0a0a0a; color: white; font-family: -apple-system, sans-serif; }
            canvas { display: block; }
            .prose-custom { line-height: 1.6; color: rgba(219, 234, 254, 0.8); }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/src/index.tsx"></script>
      </body>
    </html>
    ```

2.  **啟動 Mirror Mode**
    *   執行指令: `npm run mirror`
    *   對應指令: `vite build --watch`
    *   **預期行為**:
        *   Vite 啟動並開始監聽 `src/` 目錄。
        *   初次編譯後，`dist/index.html` 會被更新（檔案大小通常 > 3MB，因為包含了所有 React 程式碼與 Three.js 函式庫）。
        *   終端機顯示 `watching for file changes...`。

3.  **驗證狀態**
    *   檢查終端機輸出是否無錯誤。
    *   確認 `dist/index.html` 的修改時間已更新。

## 常見問題排除

*   **問題**: 指令執行後馬上停止，或 `index.html` 被覆蓋為亂碼/巨大檔案。
    *   **解法**: 重新執行步驟 1，強制恢復 `index.html` 為乾淨版本，再重啟 `npm run mirror`。
