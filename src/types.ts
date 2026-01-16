
export type ShotDirection = '正面' | '四分之三側面' | '側面' | '後側側面' | '背面';
export type ShotAngle = '鳥瞰' | '高角度' | '平視' | '低角度' | '蟲瞻';
export type ShotSize = '大特寫 (ECU)' | '特寫 (CU)' | '胸上景 (MCU)' | '半身景 (MS)' | '中景 (MLS)' | '全景 (FS)' | '大全景 (WS)' | '遠景 (LS)' | '大遠景 (ELS)';

export interface CameraMetadata {
  azimuth: number; // 0 to 360
  elevation: number; // -90 to 90
  distance: number; // in meters
}

export interface CinematographyTerms {
  direction: ShotDirection;
  angle: ShotAngle;
  size: ShotSize;
}

export type CameraMotion =
  | 'POV' | 'OTS' | 'Dutch Angle' | 'Handheld' | 'Rack Focus'
  | 'Tilt Up' | 'Tilt Down' | 'Pan Right' | 'Pan Left' | 'Zoom In' | 'Zoom Out'
  | 'Dolly In' | 'Dolly Out' | 'Crane In' | 'Crane Out' | 'Tracking' | 'Following'
  | 'Arc Shot' | 'Push In + Reveal' | 'Whip Pan' | 'Boom Up' | 'Locked-off' | 'Reverse Follow' | 'Orbit' | 'Drone Shot';

export type CharacterPose = 'Standing' | 'Walking' | 'Running';

export interface PromptState {
  metadata: CameraMetadata;
  terms: CinematographyTerms;
  description: string;
  style: string;
  selectedMotions: CameraMotion[];
  promptMode: 'video' | 'image';
  characterPose: CharacterPose;
  includePoseInPrompt: boolean;
  finalPrompt: string;
}
