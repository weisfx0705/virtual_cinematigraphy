# 攝影語言提示詞生成器

![GHBanner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

這是一個基於 Web 的 **3D 互動式電影攝影教學與提示詞編譯工具**。

本專案專為影視創作者與 AI 藝術家設計，透過直觀的 3D 介面模擬真實攝影機運鏡與構圖，並引入獨特的 **「雙階段生成工作流」**，能將用戶的運鏡設計轉化為專業的攝影教學解析，進而編譯成適用於 Runway, Midjourney, Sora 等模型的高精度 AI 提示詞 (Image-to-Image Optimized)。

**由 義守大學電影與電視學系 陳嘉暐老師 設計 (2026)**
[https://weisfx0705.github.io/chiawei/](https://weisfx0705.github.io/chiawei/)

---

## 🌟 核心理念 (Core Philosophy)

本工具建立在一個核心指導原則之上：**「圖片是骨架，故事是靈魂」**。

1.  **視覺骨架 (The Bones)**：由 3D 視窗截圖決定。這張參考圖 (Reference Image) 負責定義嚴格的 **構圖 (Composition)** 與 **角色位置 (Placement)**。
2.  **敘事靈魂 (The Soul)**：由用戶輸入的 Story Intent 決定。故事內容擁有 **表演的最高指導權**，決定角色的動作 (Sitting, Running, Crawling)、情緒與表演細節，完全覆蓋 3D 模型原本僵硬的姿態。

---

## ✨ 主要功能 (Features)

### 1. 3D 互動視角與光學模擬
- **精確光軸控制**：透過 Azimuth (方位角)、Elevation (俯仰角)、Distance (物距) 參數，精確模擬攝影機位置。
- **Gizmo 輔助系統**：將操作軸心鎖定於角色軀幹 (Torso)，保留角色落地感的同時提供符合直覺的操作體驗。
- **實時視窗預覽**：所見即所得 (WYSIWYG) 的 16:9 構圖視窗，直接作為生成模型的視覺參考錨點。

### 2. 雙階段生成工作流 (Two-Step Workflow)
本系統採用獨創的兩階段生成邏輯：

*   **階段一：攝影設計教學解析 (Educational Cinematography Brief)**
    *   **功能**：生成一份繁體中文的詳細教學文件。
    *   **內容**：分析當前的鏡頭語言、判定面部朝向 (Face Orientation)、視線落點 (Gaze Direction)，並整合用戶的敘事意圖。
    *   **教育意義**：如同專業攝影指導 (DoP) 為您拆解鏡頭設計。

*   **階段二：最終 AI 提示詞編譯 (Final Prompt Compilation)**
    *   **功能**：將教學解析轉譯為高保真英文提示詞。
    *   **優化**：專為 **Image-to-Image (墊圖)** 工作流優化。強制模型參考圖片的幾何構圖，但從文字中提取表演與細節。

### 3. 智慧鏡頭語言庫
- **多樣化運鏡**：內建 26+ 種專業運鏡術語（Dolly, Truck, Pan, Tilt, Rack Focus, Dutch Angle 等）。
- **智慧過濾**：根據選擇的模式 (Video/Image) 自動顯示或隱藏適用的運鏡選項。
- **視覺化預覽**：滑鼠懸停時即時顯示該運鏡的參考示意圖。

### 4. 嚴謹的邏輯判定系統
- **Face Orientation Rule**: 嚴格依據 Azimuth 數值判定臉部朝向，避免 AI 誤判低模 (Low-poly) 模型的陰影。
- **Visual Priority**: 在仰俯角判斷上，優先依據「視覺感受」而非純數據，確保生成的描述符合人類視覺經驗。

---



## 📝 使用指南 (User Guide)

1.  **構圖設計 (Composition)**：在 3D 視窗中移動攝影機，尋找最佳視角。
    *   *Tip*: 拖曳滑桿調整 Azimuth/Elevation/Distance。
2.  **敘事輸入 (Story Intent)**：
    *   **Story**: 描述角色的 **動作** (例如：坐在長椅上哭泣)、情緒與環境氛圍。**這是表演的唯一依據**。
    *   **Style**: 輸入風格關鍵字 (例如：Cyberpunk, Noir, Wes Anderson)。
3.  **鏡頭選擇 (Selection)**：勾選適合的鏡頭運動 (Camera Motion)。
4.  **生成解析 (Generate Analysis)**：點擊按鈕，獲得詳細的中文攝影分析。您可以編輯這份分析以微調細節。
5.  **編譯提示詞 (Compile Prompt)**：將解析轉譯為最終英文提示詞。
6.  **生成影像/影片**：
    *   複製提示詞。
    *   下載 3D 預覽截圖 (`截圖視角`)。
    *   將兩者同時輸入至 Runway, Midjourney 或其他 AI 生成工具 (Image Prompt + Text Prompt)。

---

## 📄 License

Project designed by **Chia-Wei Chen**, Department of Film and Television, I-Shou University.
2026 All Rights Reserved.
