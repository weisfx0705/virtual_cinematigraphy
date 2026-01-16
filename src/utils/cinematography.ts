
import { MAPPING } from '../constants';
import { CameraMetadata, CinematographyTerms, ShotDirection, ShotAngle, ShotSize } from '../types';

export function mapMetadataToTerms(meta: CameraMetadata): CinematographyTerms {
  // Normalize azimuth to 0-360
  let az = meta.azimuth % 360;
  if (az < 0) az += 360;

  // 使用符合 ShotDirection 類型的繁體中文預設值
  let direction: ShotDirection = '正面';
  for (const item of MAPPING.AZIMUTH) {
    if (az >= item.range[0] && az < item.range[1]) {
      direction = item.label;
      break;
    }
  }

  // 使用符合 ShotAngle 類型的繁體中文預設值
  let angle: ShotAngle = '平視';
  for (const item of MAPPING.ELEVATION) {
    if (meta.elevation >= item.threshold) {
      angle = item.label;
      break;
    }
  }

  // 使用符合 ShotSize 類型的繁體中文預設值
  let size: ShotSize = '中景 (MLS)';
  for (const item of MAPPING.DISTANCE) {
    if (meta.distance <= item.threshold) {
      size = item.label;
      break;
    }
  }

  return { direction, angle, size };
}
