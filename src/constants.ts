
export const COLORS = {
  AZIMUTH: '#22c55e', // green-500
  ELEVATION: '#ec4899', // pink-500
  DISTANCE: '#eab308', // yellow-500
  ACCENT: '#3b82f6', // blue-500
};

export const MAPPING = {
  AZIMUTH: [
    { range: [0, 30], label: '正面' as const },
    { range: [30, 60], label: '四分之三側面' as const },
    { range: [60, 120], label: '側面' as const },
    { range: [120, 150], label: '後側側面' as const },
    { range: [150, 210], label: '背面' as const },
    { range: [210, 240], label: '後側側面' as const },
    { range: [240, 300], label: '側面' as const },
    { range: [300, 330], label: '四分之三側面' as const },
    { range: [330, 360], label: '正面' as const },
  ],
  ELEVATION: [
    { threshold: 45, label: '鳥瞰' as const },
    { threshold: 15, label: '高角度' as const },
    { threshold: -15, label: '平視' as const },
    { threshold: -45, label: '低角度' as const },
    { threshold: -Infinity, label: '蟲瞻' as const },
  ],
  DISTANCE: [
    { threshold: 1.0, label: '大特寫 (ECU)' as const },
    { threshold: 2.0, label: '特寫 (CU)' as const },
    { threshold: 3.5, label: '胸上景 (MCU)' as const },
    { threshold: 4.5, label: '半身景 (MS)' as const },
    { threshold: 10.0, label: '中景 (MLS)' as const },
    { threshold: 15.0, label: '全景 (FS)' as const },
    { threshold: 20.0, label: '大全景 (WS)' as const },
    { threshold: 30.0, label: '遠景 (LS)' as const },
    { threshold: Infinity, label: '大遠景 (ELS)' as const },
  ]
};

export const MOTION_DESCRIPTIONS: Record<string, string> = {
  // Standard Shots
  'POV': '主觀視角，模擬角色的親眼所見，增強代入感。',
  'OTS': '過肩鏡頭，越過肩膀拍攝對話或視線互動。',
  'Dutch Angle': '荷蘭式傾斜，畫面歪斜營造不安、失衡或混亂感。',
  'Handheld': '手持攝影，晃動感強，增加臨場真實與緊張感。',
  'Rack Focus': '變焦轉移，焦點在前後景物間切換，引導觀眾視線。',
  'Locked-off': '固定鏡頭，攝影機完全靜止不動，強調構圖或動作。',

  // Pan / Tilt / Zoom
  'Tilt Up': '鏡頭上仰，由下往上掃視，展現高度、崇高或權威。',
  'Tilt Down': '鏡頭下俯，由上往下掃視，展現全貌、渺小或壓抑。',
  'Pan Right': '鏡頭右搖，水平向右轉動攝影機，展示環境。',
  'Pan Left': '鏡頭左搖，水平向左轉動攝影機，展示環境。',
  'Zoom In': '變焦推進，光學放大畫面，突出細節或製造緊張感。',
  'Zoom Out': '變焦拉遠，光學縮小畫面，展示環境關係或孤立感。',
  'Whip Pan': '甩鏡，極快速的水平搖攝，常林於轉場或強調動態。',

  // Dolly / Crane / Tracking
  'Dolly In': '軌道前推，攝影機實體接近主體，背景透視隨之改變。',
  'Dolly Out': '軌道後拉，攝影機實體遠離主體，背景透視隨之改變。',
  'Crane In': '升降機下降，從高處降落接近場景，進入故事。',
  'Crane Out': '升降機上升，從場景抽離升高，展現宏大或結束感。',
  'Tracking': '橫向跟拍，與主體保持平行移動，展現行進過程。',
  'Following': '跟隨拍攝，在主體後方跟隨移動，展現主體視角方向。',
  'Arc Shot': '弧形運動，圍繞主體旋轉拍攝，360度展示主體與環境。',
  'Push In + Reveal': '推進揭示，向前移動並越過遮擋物，揭示新訊息。',
  'Boom Up': '吊臂上升，垂直改變攝影機高度，擴展垂直視野。',
  'Reverse Follow': '倒退跟隨，在主體前方倒退拍攝，引導主體前進。',
  'Orbit': '環繞拍攝，圍繞主體進行連續旋轉，展現全方位立體感。',
  'Drone Shot': '空拍鏡頭，模擬無人機視角，進行高空或大範圍的自由穿梭。',

  // Character Poses
  'Standing': '站姿，最標準的基礎姿態，適合表達穩定或一般對話。',
  'Walking': '行走，雙腳交替移動，展現動態位移與生活感。',
  'Running': '奔跑，肢體幅度大，展現急迫、運動或高能量動態。',
};
