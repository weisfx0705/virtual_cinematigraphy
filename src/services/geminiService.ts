
import { GoogleGenAI } from "@google/genai";
import { PromptState } from "../types";

export async function generateMasterPrompt(state: PromptState, apiKey?: string): Promise<string> {
  const finalApiKey = apiKey || process.env.API_KEY;
  if (!finalApiKey) {
    return "錯誤: 未設定 API Key。請在設定中輸入您的 Google Gemini API Key。";
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });

  const az = state.metadata.azimuth % 360;
  let sideDescription = "";

  if (az === 0 || az === 360) {
    sideDescription = "正對鏡頭 (Frontal view)";
  } else if (az > 0 && az < 180) {
    // 1~179: Camera on Left, showing Left Face
    if (az === 90) {
      sideDescription = "完全左側面 (Full Left Profile)";
    } else if (az < 90) {
      sideDescription = `前左側 (Front-Left / 3/4 Left View, ${az}°)`;
    } else {
      sideDescription = `後左側 (Back-Left View, ${az}°)`;
    }
  } else if (az === 180) {
    sideDescription = "完全背面 (Full Back view)";
  } else if (az > 180 && az < 360) {
    // 181~359: Camera on Right, showing Right Face
    if (az === 270) {
      sideDescription = "完全右側面 (Full Right Profile)";
    } else if (az < 270) {
      sideDescription = `後右側 (Back-Right View, ${az}°)`;
    } else {
      sideDescription = `前右側 (Front-Right / 3/4 Right View, ${az}°)`;
    }
  }

  let systemInstruction = "";
  let userPrompt = "";

  if (state.promptMode === 'video') {
    // === VIDEO GENERATION LOGIC (Camera Patch Compiler) ===
    systemInstruction = `
    Role: 你是專業的電影攝影師，你清楚要怎麼協助撰寫電影攝影的提示詞。
    Sub-Role: High-End Video Prompt Director (Sora/Runway/KLING expert).
    Task: Transform user inputs into a lush, detailed, cinematic video generation prompt.
    
    CRITICAL RULE: OUTPUT MUST BE IN ENGLISH ONLY.

    1) Strict Output Structure (Merged Narrative Order):
    - **PART 1: THE OPTICAL BLUEPRINT (High Priority)**
      - **START with the Camera Angle & Framing**.
      - STRICTLY enforce the Optical Axis data: **Azimuth (View Angle)**, **Elevation (Height)**, and **Distance**.
      - Define the lens perspective first (e.g., "A specific [Angle] view from [Distance]...").
    
    - **PART 2: CHARACTER & ENVIRONMENT (The Context)**
      - Describe the Subject's Pose and action within the Scene.
      - Elaborate on the Environment, Lighting, and Atmosphere.
      - Connect the character to the world (e.g., "standing amidst...").
    
    - **PART 3: THE MOVEMENT (Camera Dynamics)**
      - Describe the camera's journey based on "Selected Camera Language".
      - How does the view change? (e.g., "The camera tracks backward...", "A slow push in...").
      - If static, describe the stability.

    2) Quality Guidelines:
    - **Start the prompt with the camera visual**: "From a high-angle rear view..." or "A low-angle frontal close-up...".
    - **Avoid concise/dry summaries.** Write in a descriptive, evocative style.
    - **Focus on Dynamics**: Mention wind, dust particles, light shifts.
    
    3) Output Format:
    Please output using Markdown formatting.
    
    Structure:
    ### Video Prompt
    **Optical Setup:** [Framing & Angle details]
    **Visuals & Action:** [Scene, Char, Env]
    **Movement:** [Camera Motion]
    
    **Merged Raw Prompt:**
    \`[The full single paragraph prompt here for easy copying]\`
    `;

    userPrompt = `
    Input Data:
    1. **Optical Axis Data (PRIORITY)**:
       - Azimuth: ${az}° (${sideDescription})
       - Elevation: ${state.metadata.elevation}°
       - Distance: ${state.metadata.distance.toFixed(1)}m
       - Computed Terms: ${state.terms.size}, ${state.terms.angle}, ${state.terms.direction}
    2. Character & Environment:
       - Story: ${state.description || "A cinematic scene"}
       - Pose: ${state.includePoseInPrompt ? state.characterPose : "Context Dependent"}
    3. Selected Camera Language: ${state.selectedMotions.length > 0 ? state.selectedMotions.join(', ') : 'None (Static/Minimal Motion)'}
    4. Style & Aesthetics: ${state.style || "High-end Cinematic"}
    
    Directives:
    - Compile a MASTERPIECE video prompt in ENGLISH.
    - Be descriptive, specific, and cinematic.
    - Include keywords: 8k resolution, photorealistic, cinematic lighting, motion blur (if moving), high fidelity.
    `;

  } else {
    // === IMAGE GENERATION LOGIC (Cinematic Still) ===
    systemInstruction = `
    Role: 你是專業的電影攝影師，你清楚要怎麼協助撰寫電影攝影的提示詞。
    Sub-Role: Cinematic Image Prompt Architect.
    Task: Convert inputs into a photorealistic midjourney/flux prompt.
    
    CRITICAL RULE: OUTPUT MUST BE IN ENGLISH ONLY.

    1) Strict Output Structure (Order Matters):
    - **1. Optical Geometry (HIGHEST PRIORITY)**:
      - **START** the prompt with the visual angle and framing.
      - Use the Optical Axis data: "A [Size] shot from [Angle] and [Side View]...".
      - E.g. "Low-angle full shot, side profile..."
    - **2. Character & Environment**:
      - Describe the Subject, their Pose (Standing/Walking/Running), and the Interaction with the Environment.
      - Scene context, lighting, and atmosphere.
    - **3. Camera Language & Style**:
      - Apply "Camera Language" as compositional modifiers (e.g., Dutch Angle -> Tilted).
      - Apply "Style" to the film look, color, and texture.

    2) Handling Inputs:
    - **Optical Axis is King**: The first few words must establish the spatial relationship.
    - If "Character Pose" is provided, ensure it fits the framing.

    3) Output Format:
    A comma-separated list of high-weight tags and descriptive phrases, STARTING with the compositional tags.
    `;

    userPrompt = `
    Input Data:
    1. **Optical Axis Data (PRIORITY)**:
       - Azimuth: ${az}° (${sideDescription})
       - Elevation: ${state.metadata.elevation}°
       - Distance: ${state.metadata.distance.toFixed(1)}m
       - Computed Terms: ${state.terms.size}, ${state.terms.angle}, ${state.terms.direction}
    2. Content & Story: ${state.description || "Cinematic shot of a subject"}
    3. Character Pose: ${state.includePoseInPrompt ? state.characterPose : "Context Dependent"}
    4. Selected Camera Language: ${state.selectedMotions.length > 0 ? state.selectedMotions.join(', ') : 'None'}
    5. Style & Aesthetics: ${state.style || "Photorealistic Cinematic"}
    
    Directives:
    - Compile into a rich, detailed ENGLISH prompt.
    - Structure: **Composition/Angle** -> Subject/Action -> Environment -> Style.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      },
    });

    return response.text || "無法生成提示詞。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `錯誤: ${error instanceof Error ? error.message : "發生未知錯誤"}`;
  }
}
