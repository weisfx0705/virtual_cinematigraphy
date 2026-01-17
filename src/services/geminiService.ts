
import { GoogleGenAI } from "@google/genai";
import { PromptState } from "../types";

// Helper to determine side description from azimuth (reused logic)
function getSideDescription(azimuth: number): string {
  const az = azimuth % 360;
  if (az === 0 || az === 360) {
    return "正對鏡頭 (Frontal view)";
  } else if (az > 0 && az < 180) {
    if (az === 90) return "完全左側面 (Full Left Profile)";
    if (az < 90) return `前左側 (Front-Left / 3/4 Left View, ${az}°)`;
    return `後左側 (Back-Left View, ${az}°)`;
  } else if (az === 180) {
    return "完全背面 (Full Back view)";
  } else {
    // 181~359
    if (az === 270) return "完全右側面 (Full Right Profile)";
    if (az < 270) return `後右側 (Back-Right View, ${az}°)`;
    return `前右側 (Front-Right / 3/4 Right View, ${az}°)`;
  }
}

/**
 * Step 1: Generate an Educational Cinematography Brief in Traditional Chinese.
 * This explains the user's choices and adds LLM-generated details.
 */
export async function generateEducationalBrief(state: PromptState, apiKey?: string): Promise<string> {
  const finalApiKey = apiKey || process.env.API_KEY;
  if (!finalApiKey) {
    return "錯誤: 未設定 API Key。請在設定中輸入您的 Google Gemini API Key。";
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  const az = state.metadata.azimuth % 360;
  const sideDescription = getSideDescription(az);

  const systemInstruction = `
    Role: 你是專業的電影攝影師導師。
    Task: 分析用戶的攝影配置，撰寫一份詳細的「攝影設計教學解析」 (Educational Cinematography Brief)。
    Output Language: 繁體中文 (Traditional Chinese).

    Structure:
    1. **鏡頭語言 (Camera Language)**
       - 解析用戶選擇的運鏡術語（如 ${state.selectedMotions.join(', ') || '固定鏡頭'}）。
       - 解釋這些運鏡如何影響敘事氛圍。

    2. **光軸與視角 (Optical Axis) - KEY SECTION**
       - **面部與角度**: 必須明確指出看見的是「左臉」還是「右臉」，是「正面」還是「背面」。(Azimuth: ${az}°, 目前定義為: ${sideDescription})。
       - **構圖與留白**: 描述主體在畫面中的位置（如：位於右側三分線，向左看），以及留白區域（Negative Space）的大小與位置。
       - **鏡頭情感幾何 (Elevation + Distance)**: 
         - 必須將「仰角/俯角 (${state.metadata.elevation}°)」與「距離 (${state.metadata.distance}m)」結合解釋。
         - 例如：「低角度 (${state.metadata.elevation}°) 搭配 近距離 (${state.metadata.distance}m)」創造的壓迫感或威嚴感；或是「鳥瞰 (${state.metadata.elevation}°) 搭配 遠景 (${state.metadata.distance}m)」帶來的上帝視角或渺小感。
         - 對應術語：${state.terms.size}, ${state.terms.angle}, ${state.terms.direction}。

    3. **角色與場景 (Character & Scene)**
       - 整合用戶的故事描述："${state.description}"。
       - 整合角色姿態：${state.characterPose}。
       - 描述場景中的光影、氛圍與美術細節，這些細節是由你根據上文想像並補充的。

    4. **補充細節與建議 (Details & Suggestions)**
       - 提供關於風格 (${state.style}) 的具體執行建議。
       - 建議的燈光佈局或其他技術參數。

    Tone: 專業、啟發性、教學引導，對光軸的描述要極度精確畫面感。
  `;

  const userPrompt = `
    請根據以下數據生成攝影解析：
    - Optical Data: Az: ${az}, El: ${state.metadata.elevation}, Dist: ${state.metadata.distance}
    - Story: ${state.description || "N/A"}
    - Style: ${state.style || "N/A"}
    - Pose: ${state.includePoseInPrompt ? state.characterPose : "N/A"}
    - Motions: ${state.selectedMotions.join(', ')}
    - Mode: ${state.promptMode}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: userPrompt,
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
    Task: Translate and condense the provided "Cinematography Brief" (which is in Chinese) into a high-quality, streamlined ENGLISH prompt.

    Target Tool: ${mode === 'video' ? 'Video Generation (Runway Gen-2 / Pika / Sora)' : 'Image Generation (Midjourney v6 / Flux)'}.

    CRITICAL REQUIREMENTS for OPTICAL AXIS:
    1. **Face/Body Angle**: You MUST explicitly state if we see the LEFT or RIGHT side of the face/body, or Front/Back (e.g. "Side profile showing left cheek", "3/4 view from behind").
    2. **Composition**: Describe placement in frame (e.g. "Subject placed on right third", "Centered composition") and negative space.
    3. **Perspective Emotion**: Combine Angle + Distance into the description (e.g. "Intimate low-angle close-up", "Detached high-angle extreme long shot").

    Rules:
    1. **ENGLISH ONLY**: The output must be 100% English.
    2. **Structure**: 
       - Start with **Subject + Angle/Composition** (Include the specific Optical Axis details here!).
       - Follow with **Action & Environment**.
       - Add **Cinematography Keywords** (Lighting, Lens, Stock).
       - (If Video) End with **Camera Movement**.
    3. **Tone**: Evocative, precise, photorealistic, cinematic.
    4. **No Fluff**: Remove educational explanations; keep only the visual descriptions.
    
    Input Brief Context: The user has provided a structured analysis of their desired shot. heavily prioritize the "Optical Axis" section for the camera description.
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
