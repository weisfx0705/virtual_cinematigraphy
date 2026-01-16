# 攝影語言提示詞生成器

![GHBanner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

這是一個基於 Web 的 3D 互動工具，專為影視創作者與 AI 藝術家設計。透過直觀的 3D 介面模擬真實攝影機運鏡與構圖，自動生成精確的 AI 提示詞（Prompt），支援影片（Video）與圖像（Image）生成模式。

由 **義守大學電影與電視學系陳嘉暐老師** 設計 (2026)。
[https://weisfx0705.github.io/chiawei/](https://weisfx0705.github.io/chiawei/)

---

## ✨ 核心功能 (Features)

### 1. 3D 互動視角預覽 (3D Interactive Viewfinder)
- **實時渲染**：使用 React Three Fiber 構建的 3D 場景，包含角色、燈光與環境。
- **攝影機控制**：
  - **方位角 (Azimuth)**：360 度環繞運鏡控制。
  - **仰俯角 (Elevation)**：從蟲瞻到鳥瞰的全角度調整。
  - **距離 (Distance)**：模擬不同焦段與物距的構圖變化。
- **角色姿態**：切換 Standing (站立)、Walking (行走)、Running (奔跑) 等姿態。

### 2. 電影術語自動對應 (Automated Cinematography Mapping)
系統會根據 3D 攝影機的位置，自動計算並轉換為專業電影術語：
- **拍攝方向 (Shot Direction)**：正面、側面、背面等。
- **拍攝角度 (Shot Angle)**：平視、高角度、低角度等。
- **景別 (Shot Size)**：從大特寫 (ECU) 到大遠景 (ELS)。

### 3. 鏡頭語言選擇器 (Camera Language Selector)
提供完整的鏡頭運動語彙庫，支援多選與組合：
- **標準鏡頭**：POV, OTS, Dutch Angle, Handheld 等。
- **運鏡控制**：Pan, Tilt, Zoom, Whip Pan 等。
- **複雜運鏡**：Dolly, Crane, Tracking, Orbit, Drone Shot 等。

### 4. AI 提示詞編譯器 (Prompt Compiler)
- **雙模式支援**：
  - **Video Mode**：針對影片生成模型優化
  - **Image Mode**：針對圖像生成模型優化
- **Google Gemini 整合**：透過 Gemini API 將視覺參數、風格描述與敘事內容整合為結構化的 Master Prompt。
- **風格與敘事**：支援輸入具體的場景描述與視覺風格

### 5. 實用工具
- **截圖視角**：一鍵下載當前構圖的參考圖
- **Pose Overlay**：可選擇將骨架圖疊加於提示詞或是僅作為視覺參考

---

## 🛠 技術堆疊 (Tech Stack)

- **Frontend Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **3D Engine**: [Three.js](https://threejs.org/) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- **UI Styling**: [TailwindCSS](https://tailwindcss.com/)
- **AI Integration**: [Google Gemini API](https://ai.google.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Markdown Rendering**: [Marked](https://github.com/markedjs/marked)

---

## 📝 使用指南 (Usage Guide)

1. **調整構圖**：在右側面板調整 Azimuth, Elevation, Distance 滑桿，觀察左側 3D 視窗的變化。
2. **選擇模式**：在右上角切換 "Video" 或 "Image" 模式。
3. **設定動作**：選擇角色姿態 (Pose) 與鏡頭運動 (Camera Language)。
4. **輸入敘事**：在 "Story Intent" 區域輸入場景描述與風格關鍵字。
5. **產生提示詞**：點擊底部的 "Compile" 按鈕，等待 AI 生成專業提示詞。
6. **複製使用**：複製生成的 Prompt 到您喜歡的 AI 生成工具中使用。

---

## 📄 License

Project designed by Chia-Wei Chen, Department of Film and Television, I-Shou University.
2026 All Rights Reserved.
