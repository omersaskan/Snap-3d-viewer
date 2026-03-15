import { useGLTF } from '@react-three/drei'
import { useEffect } from 'react'

interface ModelProps {
  url: string
}

export const Model = ({ url }: ModelProps) => {
  const { scene } = useGLTF(url)

  useEffect(() => {
    // Optionally handle scene adjustments here
    scene.traverse((obj) => {
      if ((obj as any).isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
  }, [scene])

  return <primitive object={scene} />
}

// Pre-load if needed (optional)
// useGLTF.preload(url)
