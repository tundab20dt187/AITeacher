'use client';

import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

export default function CameraDebugger() {
  const { camera } = useThree();
  const last = useRef([0, 0, 0]);

  useEffect(() => {
    console.log("🔥 CameraDebugger Mounted!", camera);
  }, [camera]);

  useFrame(() => {
    const pos = camera.position.toArray();
    if (pos.some((v: number, i: number) => v !== last.current[i])) {
      console.log("📸 Camera Moved:", pos);
      last.current = pos;
    }
  });

  return null;
}
