'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import React, { Suspense, Fragment } from 'react';
import Avatar from './Avatar'; 
import CameraDebugger from './CameraDebugger';  // ⬅ ADD THIS

export default function Scene({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 1.5, 2], fov: 12 }} shadows>
        {/* @ts-ignore */}
        <ambientLight intensity={0.5} />
        {/* @ts-ignore */}
        <spotLight position={[10, 10, 10]} />

        <Suspense fallback={<Fragment />}>
          {/* @ts-ignore */}
          <group position={[-0.0, -0.7, 0]} scale={[1, 1, 1]} rotation={[-0.5, 0, 0]}>
            <Avatar />
            {/* @ts-ignore */}
          </group>
        </Suspense>

        {/* OrbitControls disabled for presentation view */}
        {/* <CameraDebugger />  ⬅ ADD THIS HERE */}
      </Canvas>
    </div>
  );
}
