import { useGLTF } from '@react-three/drei'

interface ModelProps {
  url: string
}

export function Model({ url }: ModelProps) {
  const { scene } = useGLTF(url)
  
  return (
    <primitive 
      object={scene} 
      dispose={null} 
    />
  )
}

// Preload to improve performance
export const preloadModel = (url: string) => {
  useGLTF.preload(url)
}
