
import { GoogleGenAI } from "@google/genai";
import { PromptState } from "../types";

// Helper to determine side description from azimuth (reused logic)
function getSideDescription(azimuth: number): string {
  const az = azimuth % 360;
  if (az === 0 || az === 360) {
    return "正對鏡頭 (Frontal view)";
  } else if (az > 0 && az < 180) {
    // Camera is on the Left (-X), seeing the Subject's RIGHT side.
    if (az === 90) return "完全右側面 (Full Right Profile)";
    if (az < 90) return `前右側 (Front-Right / Showing Right Cheek, ${az}°)`;
    return `後右側 (Back-Right View / Showing Right Ear, ${az}°)`;
  } else if (az === 180) {
    return "完全背面 (Full Back view)";
  } else {
    // 181~359
    // Camera is on the Right (+X), seeing the Subject's LEFT side.
    if (az === 270) return "完全左側面 (Full Left Profile)";
    if (az < 270) return `後左側 (Back-Left View / Showing Left Ear, ${az}°)`;
    return `前左側 (Front-Left / Showing Left Cheek, ${az}°)`;
  }
}

/**
 * Step 1: Generate an Educational Cinematography Brief in Traditional Chinese.
 * This explains the user's choices and adds LLM-generated details.
 */
export async function generateEducationalBrief(state: PromptState, apiKey?: string, imageBase64?: string): Promise<string> {
  const finalApiKey = apiKey || process.env.API_KEY;
  if (!finalApiKey) {
    return "錯誤: 未設定 API Key。請在設定中輸入您的 Google Gemini API Key。";
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  // Ensure Az for display is clean
  const az = state.metadata.azimuth % 360;

  const systemInstruction = `
    Role: 你是專業的電影攝影師導師。
    Task: 分析用戶的攝影配置與「實時預覽截圖」，撰寫一份詳細的「攝影設計教學解析」 (Educational Cinematography Brief)。
    Output Language: 繁體中文 (Traditional Chinese).

    **CRITICAL TRUTH HIERARCHY (絕對判定權重階層)**:
    請嚴格遵守以下判定來源，不可混淆：

    1. **【必須依賴數值 (METADATA PRIORITY)】**：
       - **仰角/俯角 (High/Low Angle)**: 必須 **100% 依據 Elevation 數值**。
       - **面部朝向 (Face Orientation)**: 必須 **100% 依據 Azimuth 數值**。
       - **禁止**因為截圖的光影模糊、模型簡陋或透視不明顯而推翻數值。**數值就是真理**。

    2. **【必須依賴視覺 (VISUAL PRIORITY)】**：
       - **景別 (Shot Size)**: 如特寫、中景、全景。必須 **100% 依據截圖中人物在畫面的佔比**。請忽略 Metadata 中的 Distance 數值，因為不同焦段會影響構圖，**只看圖**。
       - **構圖 (Composition)**: 人物在畫面的位置、留白空間。**只看圖**。

    ---

    **Analysis Structure & Rules**:

    1. **鏡頭語言 (Camera Language)**
       - 解析用戶選擇的運鏡術語（如 ${state.selectedMotions.join(', ') || '固定鏡頭'}）。

    2. **光軸與視角 (Optical Axis)**

       **(A) 垂直視角 (Vertical Angle) - [依據數值 Elevation]**:
       *   **Elevation > 0 (+1 ~ +80)**: 定義為 **俯角 (High Angle)**。
       *   **Elevation < 0 (-1 ~ -80)**: 定義為 **仰角 (Low Angle)**。
       *   **Elevation = 0**: 定義為 **平視 (Eye Level)**。
       *   *進階判斷*: 若數值絕對值很大 (如 >60 或 <-60) 且畫面透視強烈，可加註 "鳥瞰 (Overhead/God's Eye)" 或 "蟲視 (Worm's Eye)"，但**基礎屬性必須跟隨數值正負號**。

       **(B) 水平朝向 (Horizontal Orientation) - [依據數值 Azimuth]**:
       請根據 Azimuth (${az}°) 判斷：
       *   **355 ~ 5 (Cross 0)**: 正面 (Front View)。
       *   **5 ~ 85**: 露出左臉 (Front-Left / Looking Screen Left)。
       *   **85 ~ 95**: 正左側 (Full Left Profile)。
       *   **95 ~ 175**: 左後側 (Back-Left)。
       *   **175 ~ 185**: 背面 (Back View)。
       *   **185 ~ 265**: 右後側 (Back-Right)。
       *   **265 ~ 275**: 正右側 (Full Right Profile)。
       *   **275 ~ 355**: 露出右臉 (Front-Right / Looking Screen Right)。

       **(C) 景別與鏡頭感 (Shot Size & Lens) - [依據截圖 Visuals]**:
       請忽略 Distance 數據，**只看截圖畫面**判定：
       *   **Extreme Close Up (ECU)**: 只有眼睛/嘴巴/局部。
       *   **Close Up (CU)**: 頭部充滿畫面，頂多到肩膀。
       *   **Medium Close Up (MCU)**: 胸部以上。
       *   **Medium Shot (MS)**: 腰部以上。
       *   **Cowboy Shot (American)**: 大腿/膝蓋以上。
       *   **Full Shot (FS)**: 全身完整 (頭頂到腳底)。
       *   **Wide Shot (WS)**: 人物變小，環境變多。
       *   **Extreme Wide Shot (EWS)**: 人物極小，強調大環境。
       *   **描述**: 目前人物在畫面中的具體位置（左/中/右）與留白感。

    3. **角色與場景 (Character & Scene)**
       - 整合故事描述："${state.description}"。
       - 描述場景氛圍。

    4. **補充細節 (Details)**
       - 如果使用了風格 "${state.style}"，提供相應建議。

    Tone: 權威、精準。
    Output Format: 條列式重點解析。
  `;

  const userPrompt = `
    請撰寫攝影解析：
    - **METADATA (Truth for Angle/Orientation)**: Azimuth=${az}°, Elevation=${state.metadata.elevation}°
    - **IMAGE (Truth for Shot Size)**: 請看附圖。
    - User Story: ${state.description || "無"}
    - Style: ${state.style || "無"}
  `;

  try {
    const contents: any[] = [userPrompt];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      contents.push({
        inlineData: {
          mimeType: "image/png",
          data: cleanBase64
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "無法生成解析。";
  } catch (error) {
    console.error("Gemini API Error (Brief):", error);
    return `錯誤: ${error instanceof Error ? error.message : "發生未知錯誤"}`;
  }
}

/**
 * Step 2: Compile the Final English Prompt based on the (potentially edited) Brief.
 */
export async function generateFinalPromptFromBrief(brief: string, mode: 'video' | 'image', apiKey?: string): Promise<string> {
  const finalApiKey = apiKey || process.env.API_KEY;
  if (!finalApiKey) {
    return "Error: API Key missing.";
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });

  const systemInstruction = `
    Role: Expert AI Prompt Engineer (Midjourney/Runway/Sora Specialist).
    Task: Translate the "Cinematography Brief" into a **perfect, high-fidelity ENGLISH PROMPT** designed to work alongside a **REFERENCE IMAGE (I2I)**.

    Input Context: The user will provide the generated prompt AND the original screenshot to the generation model.
    Target Tool: ${mode === 'video' ? 'Video Generation (Runway Gen-2 / Pika / Sora)' : 'Image Generation (Midjourney v6 / Flux)'}.

    CRITICAL STRATEGY for REFERENCE IMAGE WORKFLOW:
    1. **Visual Anchor & User Guide**: This prompt is designed for a user who will upload the screenshot ("Image Prompt"). You must explicitly instruct the downstream model on *how* to read that image. 
    2. **Explicit Relative Orientation**: Do not just say "looking left". Say: "Reference the image for exact spatial composition: Subject is positioned on the [Left/Right/Center], with head/body oriented as shown (Azimuth). Match this framing geometry exactly."
    3. **Start with Instruction**: The output MUST start with the exact phrase: "**Reference the provided image for character placement only. The figure in the first provided image is a fake mannequin; the two black squares represent the eyes and also indicate the facing direction. Please follow the mannequin’s on-screen position and orientation.**" followed by the description.
    4. **No Length Limits**: Do not summarize. Be exhaustively descriptive about details that might differ from standard training data.
    5. **Hypnotic Detail**: Use "dense description" style. Instead of "man sitting", use "a man sitting in the bottom-left corner, body angled 45 degrees away, sharp side profile showing right eye looking up towards the top-right light source".

    MANDATORY "OPTICAL AXIS" TRANSLATION:
    1. **Shot Size (CRITICAL)**: You MUST include the specific cinematographic shot size term defined in the brief (e.g., "Extreme Close-Up", "Medium Shot", "Wide Shot"). This is non-negotiable.
    2. **Eye & Face Direction (CRITICAL)**: You MUST explicitly translate the gaze direction found in the brief. (e.g. "Eyes staring directly into the lens", "Gaze fixed on an off-screen point to the far left", "Head turned away, no eye contact").
    3. **Camera Geometry**: Describe the "Geometric Feeling" of the shot. (e.g. "Oppressive low-angle looking up from ground level", "Distant voyeuristic high-angle").
    4. **Frame Geography**: "Subject occupying the left third", "Vast empty negative space on the right".

    MANDATORY "STORY & AESTHETICS" INJECTION:
    The "Story Intent" from the brief is the **Director's Script** and the **Sole Authority for Performance**.
    1. **Define Action & Pose**: The Story Intent determines whether the character is Sitting, Standing, Running, or Crawling. **Ignore the stiff mannequin pose in the reference image if the story contradicts it.** Use the image only for *where* they are, not *what* they are doing.
    2. **Amplify Character Details**: If the story says "A weary soldier", describe dirty armor, sweat, scars, and a thousand-yard stare.
    3. **Define Performance**: Describe the specific emotion and acting. (e.g. "Screaming in terror", "subtle smirk").
    4. **Enforce Style**: If a style is mentioned (e.g. "Noir", "Wes Anderson"), apply its specific color grading and set design keywords deeply into the prompt.
    **Note**: The reference image provides the *bones* (composition), but the Story provides the *flesh, soul, and action*.

    Structure for Final Output:
    [Subject Action & Exact Pose & Gaze] + [Precise Frame Composition & Camera Angle] + [Lighting & Atmosphere] + [Lens & Film Esthetics] + [Motion (if Video)]

    Rule:
    - **Output Format**: Markdown. Use bolding for key terms (e.g. **Extreme Close-Up**, **Low Angle**).
    - 100% English.
    - Prioritize **GAZE DIRECTION** and **GEOMETRY**. 
    - Output must be robust enough to serve as the ground truth even if the reference image influence is weak.
  `;

  const userPrompt = `
    Here is the Cinematography Brief (in Chinese):
    """
    ${brief}
    """

    Generate the final English prompt now.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text || "Failed to compile prompt.";
  } catch (error) {
    console.error("Gemini API Error (Compile):", error);
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

// Keep the original function for backward compatibility if needed, 
// or repurpose it to call the new flow internally (optional, but we'll leave it for now or remove if we change the UI completely).
// For this request, we are changing the flow, so we might not need the old function exposed directly to the UI button anymore,
// but keeping it as a fallback is fine.
export async function generateMasterPrompt(state: PromptState, apiKey?: string): Promise<string> {
  // This function can simply chain the two new functions if we wanted a "one-click" experience,
  // but the user specificially asked for a two-step process in the UI.
  // So we will leave this as legacy or unused for the new flow.
  const brief = await generateEducationalBrief(state, apiKey);
  return generateFinalPromptFromBrief(brief, state.promptMode, apiKey);
}
