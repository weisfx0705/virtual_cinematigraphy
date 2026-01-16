
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Box, Ring, Line, PerspectiveCamera, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS } from '../constants';

import { CharacterPose } from '../types';

interface SubjectProps {
  rotationY: number;
  pose: CharacterPose;
}

export const Subject: React.FC<SubjectProps> = ({ rotationY, pose }) => {
  // Config based on pose
  let legsContent = null;
  let torsoOffset = 0; // Displacement from standard Standing Height (0)

  // Standard Dimensions
  // Legs: height 0.85, Top at 0.85. Mid at 0.425.
  // Torso: height 0.7, Base at 0.85, Top at 1.55. Mid at 1.2.
  // Head: Base at 1.55. Center at 1.68.

  switch (pose) {




    case 'Walking':
      // Legs separated with pivot at hip (top).
      // Hip height at 0.85.
      legsContent = (
        <>
          {/* Left Leg - Forward */}
          <group position={[-0.12, 0.85, 0]} rotation={[THREE.MathUtils.degToRad(20), 0, 0]}>
            <Box args={[0.18, 0.85, 0.18]} position={[0, -0.425, 0]}>
              <meshStandardMaterial color="#222" />
            </Box>
          </group>
          {/* Right Leg - Backward */}
          <group position={[0.12, 0.85, 0]} rotation={[THREE.MathUtils.degToRad(-20), 0, 0]}>
            <Box args={[0.18, 0.85, 0.18]} position={[0, -0.425, 0]}>
              <meshStandardMaterial color="#222" />
            </Box>
          </group>
        </>
      );
      break;

    case 'Running':
      // Legs spread more with pivot at hip.
      torsoOffset = -0.1;
      legsContent = (
        <>
          {/* Left Leg - Forward */}
          <group position={[-0.12, 0.85, 0]} rotation={[THREE.MathUtils.degToRad(45), 0, 0]}>
            <Box args={[0.18, 0.85, 0.18]} position={[0, -0.425, 0]}>
              <meshStandardMaterial color="#222" />
            </Box>
          </group>
          {/* Right Leg - Backward */}
          <group position={[0.12, 0.85, 0]} rotation={[THREE.MathUtils.degToRad(-45), 0, 0]}>
            <Box args={[0.18, 0.85, 0.18]} position={[0, -0.425, 0]}>
              <meshStandardMaterial color="#222" />
            </Box>
          </group>
        </>
      );
      break;

    case 'Standing':
    default:
      legsContent = (
        <>
          <Box args={[0.18, 0.85, 0.18]} position={[-0.12, 0.425, 0]}>
            <meshStandardMaterial color="#222" />
          </Box>
          <Box args={[0.18, 0.85, 0.18]} position={[0.12, 0.425, 0]}>
            <meshStandardMaterial color="#222" />
          </Box>
        </>
      );
      break;
  }

  return (
    <group rotation={[0, THREE.MathUtils.degToRad(rotationY), 0]}>
      {legsContent}

      <group position={[0, torsoOffset, 0]}>
        {/* 軀幹 Center 1.2 in local space relative to group base? 
             No, if we shift group by offset, internal positions remain relative to World Origin 0 if group was at 0.
             So we keep original positions.
         */}
        <Box args={[0.45, 0.7, 0.25]} position={[0, 1.2, 0]}>
          <meshStandardMaterial color="#444" />
        </Box>

        {/* 雙手 - 垂放 */}
        <Box args={[0.12, 0.6, 0.12]} position={[-0.3, 1.15, 0]}>
          <meshStandardMaterial color="#333" />
        </Box>
        <Box args={[0.12, 0.6, 0.12]} position={[0.3, 1.15, 0]}>
          <meshStandardMaterial color="#333" />
        </Box>

        {/* 頭部 */}
        <group position={[0, 1.68, 0]}>
          <Sphere args={[0.13, 32, 32]}>
            <meshStandardMaterial color="#fbc2ab" roughness={0.4} />
          </Sphere>
          {/* 眼睛 */}
          <Box args={[0.03, 0.03, 0.03]} position={[-0.05, 0.03, -0.12]}>
            <meshStandardMaterial color="black" />
          </Box>
          <Box args={[0.03, 0.03, 0.03]} position={[0.05, 0.03, -0.12]}>
            <meshStandardMaterial color="black" />
          </Box>
          {/* 鼻子 */}
          <Box args={[0.015, 0.015, 0.06]} position={[0, 0, -0.14]}>
            <meshStandardMaterial color="#fbc2ab" />
          </Box>
        </group>
      </group>
    </group>
  );
};

export const CameraController: React.FC<{
  azimuth: number;
  elevation: number;
  distance: number;
  pose: CharacterPose;
}> = ({ azimuth, elevation, distance, pose }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  useFrame(() => {
    if (cameraRef.current) {
      // Determine base eye level based on pose
      let baseEyeLevel = 1.68;


      // Static camera logic based on optical axis
      const t = THREE.MathUtils.clamp((distance - 2) / (8 - 2), 0, 1);
      const targetY = THREE.MathUtils.lerp(baseEyeLevel, baseEyeLevel * 0.6, t); // Look slightly lower when far
      const lookAtTarget = new THREE.Vector3(0, targetY, 0);

      const phi = THREE.MathUtils.degToRad(90 - elevation);
      const theta = THREE.MathUtils.degToRad(azimuth + 180);

      const x = distance * Math.sin(phi) * Math.sin(theta);
      const y = distance * Math.cos(phi);
      const z = distance * Math.sin(phi) * Math.cos(theta);

      cameraRef.current.position.set(x, targetY + y, z);
      cameraRef.current.lookAt(lookAtTarget);

      // Default FOV
      if (cameraRef.current.fov !== 15) {
        cameraRef.current.fov = 15;
        cameraRef.current.updateProjectionMatrix();
      }
    }
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={15} far={200} />;
};

export const Gizmos: React.FC<{ azimuth: number; elevation: number; distance: number }> = ({ azimuth, elevation, distance }) => {
  return (
    <group position={[0, 0.9, 0]}>
      <Ring args={[distance - 0.05, distance, 64]} rotation={[Math.PI / 2, 0, 0]}>
        <meshBasicMaterial color={COLORS.AZIMUTH} transparent opacity={0.05} side={THREE.DoubleSide} />
      </Ring>
      <group rotation={[0, THREE.MathUtils.degToRad(-azimuth), 0]}>
        <Ring args={[distance - 0.05, distance, 64, 1, 0, Math.PI]} rotation={[0, Math.PI / 2, 0]}>
          <meshBasicMaterial color={COLORS.ELEVATION} transparent opacity={0.05} side={THREE.DoubleSide} />
        </Ring>
      </group>
      <Line
        points={[[0, 0, 0], [0, 0, -distance]]}
        color={COLORS.DISTANCE}
        lineWidth={0.5}
        rotation={[THREE.MathUtils.degToRad(elevation), THREE.MathUtils.degToRad(-azimuth), 0]}
      />
    </group>
  );
};
