'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import React, { Suspense, Fragment } from 'react';
import Avatar from './Avatar'; 
import CameraDebugger from './CameraDebugger';  // ⬅ ADD THIS

export default function Scene({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 1.9, 1], fov: 28  }} shadows>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} />

        <Suspense fallback={<Fragment />}>
          <group position={[0, 1.5, 0]} scale={[0.6, 0.6, 0.6]}>
            <Avatar />
          </group>
        </Suspense>

        {/* OrbitControls disabled for presentation view */}
        {/* <CameraDebugger />  ⬅ ADD THIS HERE */}
      </Canvas>
    </div>
  );
}
