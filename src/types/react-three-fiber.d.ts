import { extend } from '@react-three/fiber'

// This extends the JSX namespace to include Three.js elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      primitive: any
      group: any
      ambientLight: any
      spotLight: any
      pointLight: any
      directionalLight: any
      mesh: any
      boxGeometry: any
      meshStandardMaterial: any
    }
  }
}

export {}
