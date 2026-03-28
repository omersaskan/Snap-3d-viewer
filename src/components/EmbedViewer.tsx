import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Center, Bvh, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei'
import { Suspense } from 'react'
import { Model } from './Model'

interface EmbedViewerProps {
  modelUrl: string | null
  autoRotate?: boolean
  environment?: string
}

export const EmbedViewer = ({ 
  modelUrl, 
  autoRotate = true, 
  environment = "city" 
}: EmbedViewerProps) => {
  const envPreset = (environment as any) || "city"

  return (
    <div style={{ width: '100%', height: '100vh', background: 'transparent' }}>
      <Canvas 
        shadows 
        camera={{ position: [0, 0, 5], fov: 45 }} 
        gl={{ 
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true
        }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Bvh firstHitOnly>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            <Center top>
              {modelUrl && <Model url={modelUrl} />}
            </Center>
            
            <Environment preset={envPreset} />
            
            <ContactShadows 
              opacity={0.4} 
              scale={15} 
              blur={2} 
              far={1.5} 
              resolution={256} 
              color="#000000"
            />
          </Bvh>
        </Suspense>
        
        <OrbitControls 
          makeDefault 
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          enablePan={true}
          enableZoom={true}
        />
        
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
      </Canvas>
    </div>
  )
}
