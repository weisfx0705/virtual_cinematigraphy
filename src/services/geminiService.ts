
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
  const az = state.metadata.azimuth % 360;
  const sideDescription = getSideDescription(az);

  const systemInstruction = `
    Role: 你是專業的電影攝影師導師。
    Task: 分析用戶的攝影配置與「實時預覽截圖」，撰寫一份詳細的「攝影設計教學解析」 (Educational Cinematography Brief)。
    Output Language: 繁體中文 (Traditional Chinese).

    CRITICAL INSTRUCTION:
    1. **Visual Priority**: 你會收到一張預覽截圖。**這張圖是最高準則**。
    2. 如果截圖中的「角色位置」、「拍攝角度」、「留白空間」與文字數據有出入，**請完全依據截圖為準**。
    3. 你的任務是精確描述那張截圖看起來像是什麼（包含透視變形、實際感受到的視角）。

    Structure:
    1. **鏡頭語言 (Camera Language)**
       - 解析用戶選擇的運鏡術語（如 ${state.selectedMotions.join(', ') || '固定鏡頭'}）。

    2. **光軸與視角 (Optical Axis) - MUST BE BASED ON IMAGE**
       - **面部與視線朝向 (Face & Gaze Direction)**: **極度重要**。判定「臉部的正面」是指向畫框的哪個方向？
         **絕對判定標準 (Rule of Truth)**: 請直接根據提供的 Azimuth 數值判定，**忽略你對截圖的視覺猜測**（因為低模光影容易誤導）。
         *   **Azimuth 0 (or 360)**: 正對觀眾/鏡頭 (Front)。
         *   **Azimuth 1 ~ 89**: 朝向畫面左側與左前方 (Looking Left/Front-Left)，露出左臉。
         *   **Azimuth 90**: 正左側臉 (Full Left Profile)。
         *   **Azimuth 91 ~ 179**: 朝向畫面左側與左後方 (Looking Left/Back-Left)，背影較多。
         *   **Azimuth 180**: 背對觀眾 (Back View)。
         *   **Azimuth 181 ~ 269**: 朝向畫面右側與右後方 (Looking Right/Back-Right)，背影較多。
         *   **Azimuth 270**: 正右側臉 (Full Right Profile)。
         *   **Azimuth 271 ~ 359**: 朝向畫面右側與右前方 (Looking Right/Front-Right)，露出右臉。
         **垂直朝向規則 (Vertical Orientation Rule)**:
         *   **Elevation -80 ~ -1**: 這是仰視鏡頭 (Low Angle)，因此角色的臉部/身體趨向於指向**畫框上方 (Upper Frame)**。
         *   **Elevation 1 ~ 80**: 這是俯視鏡頭 (High Angle)，因此角色的臉部/身體趨向於指向**畫框下方 (Lower Frame)**。
         *   **例外**: 當 **Azimuth = 90 或 270** (完全側面) 時，忽略上述垂直規則，視為水平指向左右。
         請綜合 Azimuth (左右) 與 Elevation (上下) 做出最終判定（例如：『臉部朝向左上方』或『臉部朝向右下方』）。
         請先看數據，再用這個結論去描述截圖。
       - **實際視角 (Visual Perspective)**: 雖然數據顯示仰角 ${state.metadata.elevation}°，但請根據截圖描述實際的視覺感受。
         **視覺判斷技巧 (Visual Check)**:
         1. **俯視判斷 (High Angle)**: 如果你能看到角色頭頂的「頂部圓弧」或「肩膀的上平面」，這就是俯視（High Angle/God's Eye View），即使數據顯示是水平。
         2. **仰視判斷 (Low Angle)**: 如果你能看到下巴底面或身體顯得巨大高聳，這就是仰視。
         **請務必修正數據偏差**：如果畫面看起來是俯視，請直接寫「視覺上呈現明顯俯視視角」。
       - **景別與鏡頭感 (Shot Size & Lens)**: 這非常重要。根據畫面中人物佔比判斷是：
         *   **Extreme Close Up (ECU/大特寫)**: 僅看到眼睛或局部。
         *   **Close Up (CU/特寫)**: 頭部到肩膀。
         *   **Medium Close Up (MCU/胸上景)**: 胸部以上。
         *   **Medium Shot (MS/中景)**: 腰部以上。
         *   **American Shot (Cowboy/七分身)**: 大腿以上。
         *   **Full Shot (FS/全身)**: 腳底到頭頂完整。
         *   **Wide Shot (WS/全景)** or **Extreme Wide Shot (EWS/大全景)**: 人物渺小，強調環境。
         請明確寫出對應的英文術語。
       - **構圖 (Composition)**: 描述角色在 16:9 框內的準確位置（如：左下角、偏右、置中），以及留白的空間感。

    3. **角色與場景 (Character & Scene)**
       - 整合用戶的故事描述："${state.description}"。
       - 描述場景中的光影、氛圍與美術細節。

    4. **補充細節與建議 (Details & Suggestions)**
       - 提供關於風格 (${state.style}) 的具體執行建議。

    Tone: 專業、啟發性、教學引導，對光軸與眼神的描述要極度精確畫面感。
  `;

  const userPrompt = `
    請根據這張預覽截圖與以下數據生成攝影解析：
    - **CRITICAL DATA**: Azimuth = ${az} (請務必使用此數值判定臉部朝向)
    - Optical Data: Az: ${az}, El: ${state.metadata.elevation}, Dist: ${state.metadata.distance}
    - Story: ${state.description || "N/A"}
    - Style: ${state.style || "N/A"}
    - Motions: ${state.selectedMotions.join(', ')}
    - Mode: ${state.promptMode}

    **再次強調：請以圖片中的視覺呈現為最優先描述依據。**
  `;

  try {
    const contents: any[] = [userPrompt];

    if (imageBase64) {
      // Clean base64 string if it contains the header
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
    3. **Start with Instruction**: The output MUST start with the exact phrase: "**Reference the provided image for the composition and character placement.**" followed by the description.
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
