
export type ShotDirection = string;
export type ShotAngle = string;
export type ShotSize = string;

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
