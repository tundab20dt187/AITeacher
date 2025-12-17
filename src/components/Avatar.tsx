'use client';
import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

/** Simple cheap noise (similar to Perlin 1D) */
function noise1D(t: number) {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f); // smoothstep
  const rand = (x: number) => Math.sin(x * 127.1) * 43758.5453123 % 1;
  return rand(i) * (1 - u) + rand(i + 1) * u;
}

export default function Avatar() {
  const gltf = useGLTF('/models/avatar.glb');

  const headRef = useRef<any>(null);
  const teethRef = useRef<any>(null);

  useEffect(() => {
    gltf.scene.traverse((obj: any) => {
      if (obj.name === "Wolf3D_Head") {
        headRef.current = obj;
        console.log("Found HEAD morphs:", obj.morphTargetDictionary);
      }
      if (obj.name === "Wolf3D_Teeth") {
        teethRef.current = obj;
        console.log("Found TEETH morphs:", obj.morphTargetDictionary);
      }
    });
  }, [gltf]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Noise-based speaking animation → giống đang nói
    const v = noise1D(t * 3) * 0.6 + 0.2;
    const smile = 0.15;

    const applyMorph = (mesh: any) => {
      if (!mesh) return;

      const dict = mesh.morphTargetDictionary;
      const inf = mesh.morphTargetInfluences;
      if (!dict || !inf) return;

      if (dict["mouthOpen"] !== undefined)
        inf[dict["mouthOpen"]] = v;

      if (dict["mouthSmile"] !== undefined)
        inf[dict["mouthSmile"]] = smile;
    };

    applyMorph(headRef.current);
    applyMorph(teethRef.current);
  });

  return (
    <primitive
      object={gltf.scene}
      scale={1}
      position={[0, -1, 0]}
    />
  );
}
