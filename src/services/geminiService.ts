
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
    Role: High-End Video Prompt Director (Sora/Runway/KLING expert).
    Task: Transform user inputs into a lush, detailed, cinematic video generation prompt.
    
    CRITICAL RULE: OUTPUT MUST BE IN ENGLISH ONLY.

    1) Strict Output Structure (Merged Narrative):
    - **PART 1: THE SCENE (Content, Lighting, Atmosphere)**
      - Elaborate on the Subject and Environment. Don't just say "A man"; say "A weathered man in a dim, fog-filled alley...".
      - Describe lighting quality (volumetric, harsh, soft, cinematic).
      - Describe textures and material details (wet pavement, silk fabric, rough stone).
      - **Integrate Character Pose**: explicitly describe the body mechanics (Standing/Walking/Running) with detail (e.g., "striding purposefully," "standing stoically").
    
    - **PART 2: THE STARTING FRAME (Optical Boundary)**
      - strictly enforce the Optical Axis data.
      - Describe the initial composition: "Framed in a Low Angle Medium Shot from the front-left..."
      - Use professional terms: Depth of field, bokeh, lens choice.
      - **Integrate User Style**: Apply keywords from the "Style" input to lens choice and film stock (e.g. if "Cyberpunk", implies neon, anamorphic, digital grain).
    
    - **PART 3: THE MOVEMENT (Camera Motion & Dynamics)**
      - Describe the *flow* of the camera over time based on "selected_camera_language".
      - Describe how the perspective changes.
      - Use dynamic verbs: "gliding," "sweeping," "pushing in slowly," "tracking roughly."
      - If "Locked-off", describe the stillness amidst the subject's motion.

    2) Quality Guidelines:
    - **Avoid concise/dry summaries.** Write in a descriptive, evocative style (Midjourney-style richness but for video).
    - **Focus on Dynamics**: Mention wind, dust particles, light shifts, or muscle movement to enhance video realism.
    - **Consistency**: Ensure the camera motion makes sense with the chosen pose (e.g., Tracking Shot fits Walking/Running perfectly).

    3) Output Format:
    Please output using Markdown formatting.
    
    Structure:
    ### Video Prompt
    **Visuals & Action:** [Rich description of scene and character]
    **Camera & Framing:** [Optical boundary details]
    **Movement & Dynamics:** [Motion flow and pacing]
    
    **Merged Raw Prompt:**
    \`[The full single paragraph prompt here for easy copying]\`
    `;

    userPrompt = `
    Input Data:
    1. Content & Story: ${state.description || "A cinematic scene"}
    2. Character Pose: ${state.includePoseInPrompt ? state.characterPose : "Context Dependent"}
    3. Optical Axis Data:
       - Azimuth: ${az}° (${sideDescription})
       - Elevation: ${state.metadata.elevation}°
       - Distance: ${state.metadata.distance.toFixed(1)}m
       - Computed Terms: ${state.terms.size}, ${state.terms.angle}, ${state.terms.direction}
    4. Selected Camera Language: ${state.selectedMotions.length > 0 ? state.selectedMotions.join(', ') : 'None (Static/Minimal Motion)'}
    5. Style & Aesthetics: ${state.style || "High-end Cinematic"}
    
    Directives:
    - Compile a MASTERPIECE video prompt in ENGLISH.
    - Be descriptive, specific, and cinematic.
    - Include keywords: 8k resolution, photorealistic, cinematic lighting, motion blur (if moving), high fidelity.
    `;

  } else {
    // === IMAGE GENERATION LOGIC (Cinematic Still) ===
    systemInstruction = `
    Role: Cinematic Image Prompt Architect.
    Task: Convert inputs into a photorealistic midjourney/flux prompt.
    
    CRITICAL RULE: OUTPUT MUST BE IN ENGLISH ONLY.

    1) Strict Output Structure (Order Matters):
    - **1. Subject & Pose**: Core subject, specific action, and the "Character Pose" (Standing/Walking/Running).
    - **2. Environment & Lighting**: Scene context, time of day, lighting style.
    - **3. Optical Composition**:
      - STRICTLY enforce the "Optical Axis" data.
      - Shot Size (Distance based), Camera Angle (Elevation based), Side View (Azimuth based).
    - **4. Technical Aesthetics**: 
      - **CRITICAL**: Shape the visual identity based on the User's "Style" input.
      - If user says "Noir", use high contrast B&W, shadow play.
      - Include Camera choice, Film stock, Color grading, Texture.

    2) Handling Inputs:
    - If "Character Pose" is provided, visual body mechanics must match (e.g., "Subject walking forward...").
    - If "Camera Language" provided (e.g. Dutch Angle), apply it as a static compositional geometric effect (e.g. "Tilted horizon").

    3) Output Format:
    A comma-separated list of high-weight tags and descriptive phrases.
    `;

    userPrompt = `
    Input Data:
    1. Content & Story: ${state.description || "Cinematic shot of a subject"}
    2. Character Pose: ${state.includePoseInPrompt ? state.characterPose : "Context Dependent"}
    3. Optical Axis Data:
       - Azimuth: ${az}° (${sideDescription})
       - Elevation: ${state.metadata.elevation}°
       - Distance: ${state.metadata.distance.toFixed(1)}m
       - Computed Terms: ${state.terms.size}, ${state.terms.angle}, ${state.terms.direction}
    4. Selected Camera Language: ${state.selectedMotions.length > 0 ? state.selectedMotions.join(', ') : 'None'} (Interpret as static composition)
    5. Style & Aesthetics: ${state.style || "Photorealistic Cinematic"}
    
    Directives:
    - Compile into a rich, detailed ENGLISH prompt.
    - Structure: Subject/Pose -> Environment -> Composition -> Technical.
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
